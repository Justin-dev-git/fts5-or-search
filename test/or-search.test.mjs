// Unit checks for the fts5-or-search primitives (match builders and the measured re-rank helpers).
// Run: node --test test/or-search.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, sanitizeMatch, buildOrMatch, coverageRerank, hybridSearch } from '../lib/or-search.mjs';

test('tokenize: strips punctuation, keeps hyphenated compounds, drops stopwords/1-char', () => {
  assert.deepEqual(tokenize('Install the memory-lancedb plugin!'), ['install', 'memory-lancedb', 'plugin']);
  assert.deepEqual(tokenize('a the of x'), []);
});

test('buildOrMatch: quotes every token so operators cannot leak as syntax', () => {
  assert.equal(buildOrMatch('AND OR NOT'), '""'); // filtered as stopwords
  assert.equal(buildOrMatch('andor notor xor'), '("andor" OR "notor" OR "xor")');
  assert.equal(buildOrMatch('memory-lancedb'), '("memory-lancedb")');
  assert.equal(buildOrMatch(''), '""');
});

test('buildOrMatch: code-like tokens survive quoting intact', () => {
  assert.equal(buildOrMatch('127.0.0.1:8080 v1.2.3-beta'), '("127.0.0.1" OR "8080" OR "v1.2.3-beta")');
});

test('sanitizeMatch: strict AND baseline, same quoting guarantees', () => {
  assert.equal(sanitizeMatch('gateway restart'), '"gateway" AND "restart"');
  assert.equal(sanitizeMatch('the'), '""');
});

test('coverageRerank: coverage dominates BM25 order', () => {
  const rows = [
    { content: 'gateway only', rank: -9 },   // BM25 best, covers 1/2
    { content: 'gateway restart flow', rank: -1 }, // covers 2/2
  ];
  const out = coverageRerank(rows, 'gateway restart', (r) => r.content);
  assert.equal(out[0].content, 'gateway restart flow');
  assert.equal(out[0]._cov, 2);
});

test('coverageRerank: empty query is a no-op passthrough', () => {
  const rows = [{ content: 'a' }, { content: 'b' }];
  assert.deepEqual(coverageRerank(rows, 'the of', (r) => r.content), rows);
});

// NOTE (review fix B2, 2026-10-28): the old version of this test asserted
// every search() call used an OR match with limit k*5. With the andFloor
// default there are two calls (OR pool at k*5, AND floor at k); the test now
// checks both explicitly, and a sibling test pins the andFloor:false
// single-call behavior exactly.
test('hybridSearch: widens the OR pool (k*5), adds the AND floor (k), cuts to k', () => {
  const calls = [];
  const search = (match, limit) => {
    calls.push({ match, limit });
    return Array.from({ length: limit }, (_, i) => ({ id: i, content: `beta a-z-token doc ${i}` }));
  };
  const out = hybridSearch(search, 'a-z-token beta', (r) => r.content, { k: 3 });
  const orCall = calls.find((c) => /^\("a-z-token" OR "beta"\)$/.test(c.match));
  const andCall = calls.find((c) => /^"a-z-token" AND "beta"$/.test(c.match));
  assert.ok(orCall, `missing OR call in ${JSON.stringify(calls)}`);
  assert.equal(orCall.limit, 15);
  assert.ok(andCall, `missing AND-floor call in ${JSON.stringify(calls)}`);
  assert.equal(andCall.limit, 3);
  assert.equal(out.length, 3);
});

test('hybridSearch: andFloor:false is exactly one OR search call (old behavior)', () => {
  const calls = [];
  const search = (match, limit) => {
    calls.push({ match, limit });
    return Array.from({ length: limit }, (_, i) => ({ id: i, content: `beta a-z-token doc ${i}` }));
  };
  const out = hybridSearch(search, 'a-z-token beta', (r) => r.content, { k: 3, andFloor: false });
  assert.equal(calls.length, 1);
  assert.match(calls[0].match, /^\("a-z-token" OR "beta"\)$/);
  assert.equal(calls[0].limit, 15);
  assert.equal(out.length, 3);
});

test('injection safety: adversarial inputs never emit unquoted syntax', () => {
  const SAFE = /^\(("[^"]+")( OR "[^"]+")*\)$/;
  for (const q of ['col:tok', 'NEAR(a b)', '"unbalanced', '-leading', 'a" OR "b" OR "c', '多语言 token', 'AND OR NOT']) {
    const m = buildOrMatch(q);
    assert.ok(m === '""' || SAFE.test(m), `syntax leaked from: ${q} -> ${m}`);
  }
});
