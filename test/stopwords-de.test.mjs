// T21: STOPWORDS_DE = the 94 words of T16-T18 + the Snowball German list +
// its spellings without umlaut, and beir-bench --stopwords lib.
// Reference values on test/fixtures/beir-de-stop, by hand (FTS5 bm25,
// k1 = 1.2, b = 0.75, avgdl = 13/5): q1 "Hundesteuer in Berlin" (rel a).
// "in" is not in the stub stemmer's STOPWORDS, and a and b both have df 1,
// so they get the same idf. b "in in in" (tf 3, 3 tokens) scores
// 6.6 / 4.3385 = 1.5213 and outranks a (tf 1, 4 tokens, 2.2 / 2.6846 =
// 0.8195): or and or-stem = 1 / log2(3) = 0.6309. With --stopwords lib "in"
// is dropped, only a matches: 1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildOrMatch, STOPWORDS_DE } from '../lib/or-search.mjs';

const bench = fileURLToPath(new URL('../scripts/beir-bench.mjs', import.meta.url));
const data = fileURLToPath(new URL('./fixtures/beir-de-stop', import.meta.url));
const stub = fileURLToPath(new URL('./fixtures/de/stub-stemmer.mjs', import.meta.url));

function run(args) {
  try {
    return { code: 0, stdout: execFileSync(process.execPath, ['--no-warnings', bench, ...args], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status ?? -1, stdout: e.stdout ?? '', stderr: String(e.stderr ?? '') };
  }
}
const lastJson = (s) => JSON.parse(s.trim().split('\n').at(-1));

test('STOPWORDS_DE: 259 entries, the former 94 kept, Snowball words and folded spellings added', () => {
  assert.equal(STOPWORDS_DE.size, 259);
  for (const w of ['der', 'die', 'das', 'für', 'fur', 'über', 'uber', 'fuer', 'wann', 'beim', 'the']) assert.ok(STOPWORDS_DE.has(w), w);
  for (const w of ['in', 'sie', 'es', 'wird', 'ich', 'er', 'einem', 'durch', 'können', 'konnen', 'während', 'wahrend', 'daß']) assert.ok(STOPWORDS_DE.has(w), w);
  for (const w of ['schon', 'wer', 'gibt', 'ausweis']) assert.equal(STOPWORDS_DE.has(w), false, w);
  assert.equal(buildOrMatch('Wo beantrage ich den Ausweis in Berlin?', { stopwords: STOPWORDS_DE }), '("beantrage" OR "ausweis" OR "berlin")');
});

test('beir-bench --stopwords: stemmer (default) keeps "in", lib drops it', () => {
  const base = ['--data', data, '--lang', 'de', '--stemmer', stub, '--repeat', '1', '--lanes', 'or,or-stem', '--json'];
  const def = lastJson(run(base).stdout);
  const stem = lastJson(run([...base, '--stopwords', 'stemmer']).stdout);
  const lib = lastJson(run([...base, '--stopwords', 'lib']).stdout);
  for (const lane of ['or', 'or-stem']) {
    assert.equal(def.lanes[lane].ndcg10, 0.6309, lane);
    assert.equal(stem.lanes[lane].ndcg10, 0.6309, lane);
    assert.equal(lib.lanes[lane].ndcg10, 1, lane);
  }
  assert.equal(def.stopwords, undefined, 'default output unchanged');
  assert.equal(lib.stopwords, 'lib');
  assert.match(run(['--data', data, '--stopwords', 'lib', '--repeat', '1']).stderr, /--stopwords is German-only/);
  assert.match(run([...base, '--stopwords', 'snowball']).stderr, /--stopwords must be stemmer or lib/);
});

// test/fixtures/beir-de-stop-lanes, every German lane (review of T21): q1
// "Hundesteuer wird", q2 "Hundesteuer ausmachen", q3 "Hundesteuer Vor-",
// all rel a. With the stemmer's list "wird" and "vor" stay terms (b "wird
// wird wird" and g "vor vor vor" outrank a, as in q1 above; AND needs a doc
// with both terms: none), and the stemmer variant "machen" of "ausmachen"
// pulls f "machen machen machen" above a in the stemmer lanes (0.6309 each).
// hybrid-expanded keeps a first on q3: its substring coverage looks for
// "vor-", which g lacks. With --stopwords lib "wird" and "vor" (trailing
// hyphen stripped) are gone in every lane and the variant "machen" (in
// STOPWORDS_DE) is dropped: every lane ranks a first; only `and` still needs
// "ausmachen" for q2 (2/3).
test('beir-bench --stopwords lib reaches every German lane, stemmer variants included', () => {
  const lanes = fileURLToPath(new URL('./fixtures/beir-de-stop-lanes', import.meta.url));
  const base = ['--data', lanes, '--lang', 'de', '--stemmer', stub, '--repeat', '1', '--json'];
  const want = {
    stemmer: { and: 0, or: 0.754, 'or-stem': 0.6309, 'or-stem-paradigm': 0.6309, 'or-trigram': 0.754, hybrid: 0.754, 'hybrid-expanded': 0.754, 'hybrid-trigram': 0.754 },
    lib: { and: 0.6667, or: 1, 'or-stem': 1, 'or-stem-paradigm': 1, 'or-trigram': 1, hybrid: 1, 'hybrid-expanded': 1, 'hybrid-trigram': 1 },
  };
  for (const [mode, lanesWant] of Object.entries(want)) {
    const got = lastJson(run([...base, '--stopwords', mode]).stdout).lanes;
    for (const [lane, v] of Object.entries(lanesWant)) assert.equal(got[lane].ndcg10, v, `${mode} ${lane}`);
  }
});
