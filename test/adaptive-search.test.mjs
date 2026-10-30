// T25: adaptiveSearch (library). Small unicode61 table; the expansion is a
// stub, so the test checks the switch, the stopword filter and the re-rank.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { adaptiveSearch, buildOrMatch, STOPWORDS_DE } from '../lib/or-search.mjs';

const db = new DatabaseSync(':memory:');
db.exec("CREATE VIRTUAL TABLE docs USING fts5(id UNINDEXED, content, tokenize='unicode61')");
const docs = {
  d1: 'Termin vereinbaren Bürgerbüro', d2: 'Termin absagen Termin', d3: 'Antrag beantragen online', d4: 'in in in', d5: 'Wetter heute',
  // long, covers termin and wetter: low BM25, highest coverage
  d6: `Termin ${'Füllwort '.repeat(60)}Wetter`, d7: 'Wetter Wetter Wetter',
};
for (const [id, c] of Object.entries(docs)) db.prepare('INSERT INTO docs (id, content) VALUES (?, ?)').run(id, c);
const stmt = db.prepare('SELECT id, content FROM docs WHERE docs MATCH ? ORDER BY rank LIMIT ?');
const search = (m, n) => stmt.all(m, n);
const countStmt = db.prepare('SELECT count(*) AS c FROM (SELECT 1 FROM docs WHERE docs MATCH ? LIMIT ?)');
const calls = [];
const countUpTo = (m, n) => { calls.push(n); return countStmt.get(m, n).c; };
const ids = (rows) => rows.map((r) => r.id);
const de = { stopwords: STOPWORDS_DE };
const getText = (r) => r.content;

test('without expand, or when the OR match is dense: plain OR', () => {
  assert.deepEqual(ids(adaptiveSearch(search, countUpTo, 'Termin', getText, { ...de })), ids(search(buildOrMatch('Termin', de), 10)));
  const expand = () => { throw new Error('dense queries must not be expanded'); };
  calls.length = 0;
  assert.deepEqual(ids(adaptiveSearch(search, countUpTo, 'Termin', getText, { tau: 1, expand, ...de })), ['d2', 'd1', 'd6']);
  assert.deepEqual(calls, [2], 'counts up to tau + 1');
});

test('sparse query: expanded groups, stopword variants dropped, coverage re-rank', () => {
  // "beantragte" hits nothing; its variant "beantragen" finds d3; the variant "in" is a stopword
  const expand = (t) => (t === 'beantragte' ? [['beantragte', 'beantragen', 'in']] : []);
  assert.deepEqual(ids(adaptiveSearch(search, countUpTo, 'beantragte', getText, { tau: 10, expand, ...de })), ['d3']);
  // "Termin Wetter" hits 5 documents; BM25 ranks d6 (long, both words) last,
  // coverage (2 groups) moves it first; with k = 1 only the k*5 pool reaches it
  const two = () => [['termin'], ['wetter']];
  assert.deepEqual(ids(search(buildOrMatch('Termin Wetter', de), 10)), ['d7', 'd2', 'd5', 'd1', 'd6']);
  assert.deepEqual(ids(adaptiveSearch(search, countUpTo, 'Termin Wetter', getText, { tau: 10, expand: two, ...de })), ['d6', 'd7', 'd2', 'd5', 'd1']);
  assert.deepEqual(ids(adaptiveSearch(search, countUpTo, 'Termin Wetter', getText, { k: 1, tau: 10, expand: two, ...de })), ['d6']);
  assert.equal(ids(adaptiveSearch(search, countUpTo, 'Termin Wetter', getText, { tau: 5, expand: two, ...de }))[0], 'd6', 'at most tau hits: sparse');
  assert.equal(ids(adaptiveSearch(search, countUpTo, 'Termin Wetter', getText, { tau: 4, expand: two, ...de }))[0], 'd7', 'more than tau hits: plain OR');
  // expansion yields no group: plain OR
  assert.deepEqual(ids(adaptiveSearch(search, countUpTo, 'Wetter', getText, { tau: 10, expand: () => [['in']], ...de })), ids(search(buildOrMatch('Wetter', de), 10)));
});
