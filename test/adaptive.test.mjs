// T24: adaptive German lanes (beir-bench --adaptive-tau). Reference values on
// test/fixtures/beir-de-adaptive, by hand, with the stub stemmer:
//   q1 "Ausweis" (rel a "Personalausweis beantragen"): the unicode61 OR match
//      hits no document, so q1 is sparse for every tau; only trigram finds the
//      compound (or 0, or-trigram 1, hybrid-expanded 0).
//   q2 "Termin" (rel t2 "Termin absagen Termin"): unicode61 hits t1 and t2 (2
//      documents); `or` ranks t2 first (1); trigram ranks t3
//      "Terminterminterminkalender" (three substring hits) first (0.6309).
//      Dense for tau 1, sparse for tau 2 (at most tau hits) and tau 10.
//   q3 "beantragte" (rel a): no unicode61 hit, sparse; the stub variant
//      "beantragen" lets hybrid-expanded find a (1); or and or-trigram 0.
// adaptive-trigram-1: 1, 1, 0 = 0.6667; adaptive-trigram-2 and -10: 1, 0.6309,
// 0 = 0.5436; adaptive-stem-1: 0, 1, 1 = 0.6667; adaptive-stem-10: 0, 1, 1 =
// 0.6667 (hybrid-expanded also ranks t2 first on q2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bench = fileURLToPath(new URL('../scripts/beir-bench.mjs', import.meta.url));
const data = fileURLToPath(new URL('./fixtures/beir-de-adaptive', import.meta.url));
const stub = fileURLToPath(new URL('./fixtures/de/stub-stemmer.mjs', import.meta.url));

function run(args) {
  try {
    return { code: 0, stdout: execFileSync(process.execPath, ['--no-warnings', bench, ...args], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status ?? -1, stdout: e.stdout ?? '', stderr: String(e.stderr ?? '') };
  }
}
const lastJson = (s) => JSON.parse(s.trim().split('\n').at(-1));

test('--adaptive-tau: sparse queries take the expanded lane, dense ones plain or', () => {
  const r = run(['--data', data, '--lang', 'de', '--stemmer', stub, '--stopwords', 'lib', '--adaptive-tau', '1,2,10', '--repeat', '1', '--json']);
  assert.equal(r.code, 0, r.stderr);
  const L = lastJson(r.stdout).lanes;
  const want = {
    or: 0.3333, 'or-trigram': 0.5436, 'hybrid-expanded': 0.6667,
    'adaptive-trigram-1': 0.6667, 'adaptive-trigram-2': 0.5436, 'adaptive-trigram-10': 0.5436, 'adaptive-stem-1': 0.6667, 'adaptive-stem-10': 0.6667,
  };
  for (const [lane, v] of Object.entries(want)) assert.equal(L[lane].ndcg10, v, lane);
});

test('--adaptive-tau: German only, non-negative integers; no adaptive lanes without the flag', () => {
  const base = ['--data', data, '--lang', 'de', '--stemmer', stub, '--repeat', '1', '--json'];
  assert.equal(Object.keys(lastJson(run(base).stdout).lanes).some((l) => l.startsWith('adaptive-')), false);
  assert.match(run(['--data', data, '--adaptive-tau', '5', '--repeat', '1']).stderr, /--adaptive-tau is German-only/);
  assert.match(run([...base, '--adaptive-tau', '-1']).stderr, /--adaptive-tau needs non-negative integers/);
});
