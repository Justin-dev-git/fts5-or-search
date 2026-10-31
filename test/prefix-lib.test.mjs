// T31: buildOrMatch(q, { prefixMin }) – words of at least n letters as FTS5 prefix queries, everything else exact.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { buildOrMatch, hybridSearch, adaptiveSearch, STOPWORDS_DE } from '../lib/or-search.mjs';

const de = { stopwords: STOPWORDS_DE };

test('prefixMin: letters-only words of at least n letters get *, codes and short words stay exact', () => {
  assert.equal(buildOrMatch('Wo beantrage ich den Hundeausweis', { ...de, prefixMin: 4 }), '("beantrage"* OR "hundeausweis"*)');
  assert.equal(buildOrMatch('Fehler E4512 e-mail v1.2', { ...de, prefixMin: 4 }), '("fehler"* OR "e4512" OR "e-mail" OR "v1.2")');
  assert.equal(buildOrMatch('hund katzen', { prefixMin: 5 }), '("hund" OR "katzen"*)');
  assert.equal(buildOrMatch('Größe', { prefixMin: 5 }), '("größe"*)', 'counts letters, not bytes');
});

test('prefixMin: without it (or 0) the output is byte-identical to before; empty queries stay ""', () => {
  for (const q of ['Wo beantrage ich den Hundeausweis', 'how do solar panels work', '-- ...', '']) {
    assert.equal(buildOrMatch(q, { ...de, prefixMin: 0 }), buildOrMatch(q, de));
  }
  assert.equal(buildOrMatch('-- ...', { prefixMin: 4 }), '""');
});

test('prefixMin: invalid values throw; user input cannot add its own * or syntax', () => {
  for (const v of [-1, 1.5, '4', NaN]) assert.throws(() => buildOrMatch('x', { prefixMin: v }), RangeError);
  assert.equal(buildOrMatch('col:abcd* NEAR(x y) "evil', { prefixMin: 9 }), '("col" OR "abcd" OR "near" OR "evil")');
});

test('prefixMin in SQLite: finds compounds that start with the word (also with an FTS5 prefix index), not those that end with it', () => {
  for (const prefix of ['', ", prefix='4 5'"]) {
    const db = new DatabaseSync(':memory:');
    db.exec(`CREATE VIRTUAL TABLE docs USING fts5(content, tokenize='unicode61'${prefix})`);
    for (const c of ['Hundehalter melden', 'Personalausweis beantragen', 'Katzen füttern']) db.prepare('INSERT INTO docs (content) VALUES (?)').run(c);
    const find = (q, o) => db.prepare('SELECT content FROM docs WHERE docs MATCH ? ORDER BY rank').all(buildOrMatch(q, o)).map((r) => r.content);
    assert.deepEqual(find('Hund', { ...de, prefixMin: 4 }), ['Hundehalter melden'], prefix);
    assert.deepEqual(find('Hund', de), [], prefix);
    assert.deepEqual(find('Ausweis', { ...de, prefixMin: 4 }), [], prefix);
    db.close();
  }
});

test('prefixMin with hostile input: only the library adds *, and only after a closing quote', () => {
  assert.equal(buildOrMatch('col:abcd* NEAR(x y) "evil', { prefixMin: 2 }), '("col"* OR "abcd"* OR "near"* OR "evil"*)');
  assert.equal(buildOrMatch('ab"cd* OR ef^gh', { prefixMin: 2 }), '("ab"* OR "cd"* OR "ef"* OR "gh"*)');
});

test('prefixMin is a buildOrMatch option only: hybridSearch and adaptiveSearch ignore it (as in 0.3.0)', () => {
  const run = (fn) => { const seen = []; fn((m, n) => { seen.push(m); return []; }); return seen; };
  const q = 'Wo beantrage ich den Hundeausweis';
  for (const o of [{}, { prefixMin: 4 }, { prefixMin: '4' }]) {
    assert.deepEqual(run((s) => hybridSearch(s, q, (r) => r.content, { stopwords: STOPWORDS_DE, ...o })),
      ['("beantrage" OR "hundeausweis")', '"beantrage" AND "hundeausweis"']);
    assert.deepEqual(run((s) => adaptiveSearch(s, () => 0, q, (r) => r.content, { stopwords: STOPWORDS_DE, ...o })),
      ['("beantrage" OR "hundeausweis")']);
  }
});
