// Regression tests from external review (2026-10-28). Each test reproduces a
// confirmed defect; all must FAIL on 0561578 and PASS after the fixes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import * as H from '../lib/or-search.mjs';

function mkdb(docs) {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE VIRTUAL TABLE d USING fts5(content, tokenize='porter unicode61')");
  const ins = db.prepare('INSERT INTO d VALUES (?)');
  for (const x of docs) ins.run(x);
  const search = (m, limit) =>
    db.prepare('SELECT rowid AS id, content, rank FROM d WHERE d MATCH ? ORDER BY rank LIMIT ?').all(m, limit);
  return { db, search };
}

test('B2: hybridSearch never loses a document that AND@k returns (LIMIT pool)', () => {
  const filler = Array.from({ length: 200 }, (_, i) => `filler${i}`).join(' ');
  const docs = ['alpha beta ' + filler];                    // rowid 1: only doc with BOTH terms
  for (let i = 0; i < 10; i++) docs.push('beta beta beta');  // short docs, strong BM25 for "beta"
  for (let i = 0; i < 50; i++) docs.push('alpha common text');
  const { search } = mkdb(docs);
  const andIds = search(H.sanitizeMatch('alpha beta'), 1).map((r) => r.id);
  const hybIds = H.hybridSearch(search, 'alpha beta', (r) => r.content, { k: 1 }).map((r) => r.id);
  assert.deepEqual(andIds, [1]);
  assert.ok(hybIds.includes(1), `AND@1 found doc 1, hybrid@1 returned ${JSON.stringify(hybIds)}`);
});

test('B3: coverage is token-based, not substring ("Frank"/"airport" do not cover "rank"/"port")', () => {
  const out = H.coverageRerank(
    [{ content: 'Frank reported a support ticket at the airport' }],
    'rank port', (r) => r.content);
  assert.equal(out[0]._cov, 0);
});

test('B3: optional tokenizer-exact coverage via FTS5 (porter: restarting~restarts, crashed~crashes)', () => {
  assert.equal(typeof H.makeFtsTermPresent, 'function', 'export makeFtsTermPresent(db, table)');
  const { db, search } = mkdb(['the service restarts after crashes', 'service restarting docs page']);
  const q = 'restarting crashed service';
  const rows = search(H.buildOrMatch(q), 10);
  const out = H.coverageRerank(rows, q, (r) => r.content, { termPresent: H.makeFtsTermPresent(db, 'd') });
  assert.equal(out[0].content, 'the service restarts after crashes');
  assert.equal(out[0]._cov, 3);
});

test('B3: coverage counts DISTINCT query terms', () => {
  const out = H.coverageRerank([{ content: 'backup restore verify' }], 'backup backup restore', (r) => r.content);
  assert.equal(out[0]._cov, 2);
});

test('B4: trailing/leading punctuation is stripped from terms', () => {
  assert.deepEqual(H.tokenize('restart the gateway.'), ['restart', 'gateway']);
  assert.deepEqual(H.tokenize('-leading trailing-'), ['leading', 'trailing']);
});

test('B4: punctuation-only tokens are dropped (they silently kill AND queries)', () => {
  assert.equal(H.sanitizeMatch('restart gateway ...'), '"restart" AND "gateway"');
  assert.equal(H.buildOrMatch('-- ...'), '""');
});

test('B4: code-like tokens keep their inner dots/hyphens (no regression)', () => {
  assert.deepEqual(H.tokenize('v1.2.3-beta 127.0.0.1 memory-lancedb'), ['v1.2.3-beta', '127.0.0.1', 'memory-lancedb']);
});
