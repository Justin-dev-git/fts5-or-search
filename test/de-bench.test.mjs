// German mode of scripts/beir-bench.mjs (T16), run with the stub stemmer.
// Reference values on test/fixtures/beir-de-mini, by hand and identical with
// german-fts5-stemmer 17e6413 in review:
//   q1 "beantragte Reisepässe" (rel c): or/trigram rank the shorter d first
//      (0.6309); or-stem adds "beantragen", so c is first (1).
//   q2 "Ausweis" (rel f "Personalausweis"): only trigram matches (1).
//   q3 "Hundesteuer bezahlen" (rel a): no doc has both terms, so and = 0;
//      every OR lane ranks a first (1).
// test/fixtures/beir-de-lanes = beir-de-mini + q4 (T17):
//   q4 "Fahrrad Termin Anmeldung" (rel g2, the only doc with all three
//      terms): BM25 puts g1 "Fahrrad, Fahrrad, Fahrrad." first (-2.8987 vs
//      -2.1502), so every plain lane gets 0.6309; the coverage re-rank lanes
//      hybrid and hybrid-expanded move g2 to rank 1 (coverage 3 vs 1).
// hybrid-trigram (T18) = or-trigram pool + the same re-rank: beir-de-mini
//   0.877 (as or-trigram), beir-de-lanes 0.9077 (q2 via trigram, q4 via
//   re-rank; only q1 stays at 0.6309).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bench = fileURLToPath(new URL('../scripts/beir-bench.mjs', import.meta.url));
const data = fileURLToPath(new URL('./fixtures/beir-de-mini', import.meta.url));
const stub = fileURLToPath(new URL('./fixtures/de/stub-stemmer.mjs', import.meta.url));
const mini = fileURLToPath(new URL('./fixtures/beir-mini', import.meta.url));
const lanesFx = fileURLToPath(new URL('./fixtures/beir-de-lanes', import.meta.url));
const LANES = ['and', 'or', 'or-stem', 'or-stem-paradigm', 'or-trigram', 'hybrid', 'hybrid-expanded', 'hybrid-trigram'];

function run(args) {
  try {
    return { code: 0, stdout: execFileSync(process.execPath, ['--no-warnings', bench, ...args], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status ?? -1, stdout: e.stdout ?? '', stderr: String(e.stderr ?? '') };
  }
}
const lastJson = (s) => JSON.parse(s.trim().split('\n').at(-1));

test('lang de: lanes and reference nDCG@10 on beir-de-mini', () => {
  const r = run(['--data', data, '--lang', 'de', '--stemmer', stub, '--repeat', '1', '--json']);
  assert.equal(r.code, 0, r.stderr);
  const j = lastJson(r.stdout);
  assert.equal(j.lang, 'de');
  assert.deepEqual(Object.keys(j.lanes), LANES);
  const nd = Object.fromEntries(Object.entries(j.lanes).map(([k, v]) => [k, v.ndcg10]));
  assert.deepEqual(nd, {
    and: 0, or: 0.5436, 'or-stem': 0.6667, 'or-stem-paradigm': 0.6667, 'or-trigram': 0.877,
    hybrid: 0.5436, 'hybrid-expanded': 0.6667, 'hybrid-trigram': 0.877,
  });
  assert.equal(j.lanes['or-trigram'].recall100, 1);
  assert.equal(j.lanes.or.recall100, 0.6667);
});

test('lang de: every lane family is exercised on beir-de-lanes (re-rank must change q4)', () => {
  const r = run(['--data', lanesFx, '--lang', 'de', '--stemmer', stub, '--repeat', '1', '--json']);
  assert.equal(r.code, 0, r.stderr);
  const j = lastJson(r.stdout);
  assert.deepEqual(Object.keys(j.lanes), LANES);
  const nd = Object.fromEntries(Object.entries(j.lanes).map(([k, v]) => [k, v.ndcg10]));
  assert.deepEqual(nd, {
    and: 0.25, or: 0.5655, 'or-stem': 0.6577, 'or-stem-paradigm': 0.6577, 'or-trigram': 0.8155,
    hybrid: 0.6577, 'hybrid-expanded': 0.75, 'hybrid-trigram': 0.9077,
  });
});

test('lang de needs --stemmer and rejects --title-weights; English output has no lang field', () => {
  assert.match(run(['--data', data, '--lang', 'de', '--repeat', '1']).stderr, /needs --stemmer/);
  assert.match(run(['--data', data, '--lang', 'de', '--stemmer', stub, '--title-weights', '1', '--repeat', '1']).stderr, /English-only/);
  assert.match(run(['--data', data, '--lang', 'fr', '--repeat', '1']).stderr, /--lang must be en or de/);
  const en = lastJson(run(['--data', mini, '--repeat', '1', '--json']).stdout);
  assert.equal('lang' in en, false);
  assert.equal(Object.keys(en.lanes).some((n) => n.startsWith('or-stem') || n === 'or-trigram'), false);
});
