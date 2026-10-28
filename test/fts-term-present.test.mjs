// Regression tests for T14: makeFtsTermPresent must answer for THE row.
// node:sqlite binds JS numbers as REAL, and FTS5 drops a `rowid = <REAL>`
// constraint next to MATCH. The hook then said "present" whenever the term
// occurred in ANY row, so FTS-exact coverage was constant.
// Pending until T14 step 1 copies it to test/fts-term-present.test.mjs unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { makeFtsTermPresent, coverageRerank } from '../lib/hybrid.mjs';

function mkdb(texts) {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE VIRTUAL TABLE d USING fts5(content, tokenize='porter unicode61')");
  const ins = db.prepare('INSERT INTO d (content) VALUES (?)');
  for (const t of texts) ins.run(t);
  return db;
}

test('term that occurs only in another row is not present (number rowid)', () => {
  const tp = makeFtsTermPresent(mkdb(['solar panels', 'wind power']), 'd', { idKey: 'rid' });
  assert.equal(tp('wind', { rid: 1 }), false);
  assert.equal(tp('wind', { rid: 2 }), true);
  assert.equal(tp('solar', { rid: 2 }), false);
});

test('BigInt and numeric-string rowids give the same answers', () => {
  const tp = makeFtsTermPresent(mkdb(['solar panels', 'wind power']), 'd', { idKey: 'rid' });
  assert.equal(tp('wind', { rid: 1n }), false);
  assert.equal(tp('wind', { rid: '2' }), true);
});

test('Porter-aware only within its own row (restarting ~ restarts)', () => {
  const tp = makeFtsTermPresent(mkdb(['service restarts nightly', 'docs page']), 'd', { idKey: 'rid' });
  assert.equal(tp('restarting', { rid: 1 }), true);
  assert.equal(tp('restarting', { rid: 2 }), false);
});

test('coverageRerank with the hook sees per-row coverage, not a constant', () => {
  const db = mkdb(['solar solar solar', 'solar and wind supply electricity', 'wind', 'electricity']);
  const rows = db
    .prepare('SELECT rowid AS rid, content FROM d WHERE d MATCH ? ORDER BY rank')
    .all('("solar" OR "wind" OR "electricity")');
  const out = coverageRerank(rows, 'solar wind electricity', (r) => r.content, {
    termPresent: makeFtsTermPresent(db, 'd', { idKey: 'rid' }),
  });
  assert.equal(out[0].rid, 2);
  assert.deepEqual(out.map((r) => r._cov).sort(), [1, 1, 1, 3]);
});
