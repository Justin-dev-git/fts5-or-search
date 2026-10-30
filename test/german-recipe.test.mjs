// The German recipe from the README: a trigram FTS5 table plus
// buildOrMatch(q, { stopwords: STOPWORDS_DE }), ORDER BY rank. This is the
// `or-trigram` lane of scripts/beir-bench.mjs --lang de (T16-T18).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { buildOrMatch, STOPWORDS_DE } from '../lib/or-search.mjs';

test('STOPWORDS_DE: raw and folded spellings (size and T21 words: test/stopwords-de.test.mjs)', () => {
  for (const w of ['der', 'die', 'das', 'für', 'fur', 'über', 'uber', 'wie', 'wo']) assert.ok(STOPWORDS_DE.has(w), w);
  assert.equal(STOPWORDS_DE.has('schon'), false, 'folded it equals "schön"');
  assert.equal(buildOrMatch('Wo beantrage ich den Ausweis?', { stopwords: STOPWORDS_DE }), '("beantrage" OR "ausweis")');
});

test('trigram recipe finds sub-words and folds umlauts; stopwords keep "die" out of "Dienst"', () => {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE VIRTUAL TABLE docs USING fts5(content, tokenize='trigram remove_diacritics 1')");
  const ins = db.prepare('INSERT INTO docs (content) VALUES (?)');
  for (const t of ['Personalausweis verloren: Melden Sie den Verlust.', 'Der Dienst ist montags geschlossen.', 'Müllabfuhr: Gebühren und Termine']) ins.run(t);
  const search = (q) => db.prepare('SELECT content FROM docs WHERE docs MATCH ? ORDER BY rank LIMIT 10')
    .all(buildOrMatch(q, { stopwords: STOPWORDS_DE })).map((r) => r.content);
  assert.deepEqual(search('Ausweis'), ['Personalausweis verloren: Melden Sie den Verlust.']);
  assert.deepEqual(search('Mullabfuhr'), ['Müllabfuhr: Gebühren und Termine']);
  assert.deepEqual(search('die'), [], '"die" is a stopword, so it never becomes a trigram phrase');
});
