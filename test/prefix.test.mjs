// T26: prefix lanes (beir-bench --prefix-min). Reference values on test/fixtures/beir-de-prefix, by hand:
//   q1 "Hund" (rel h "Hundehalter melden"): unicode61 has no token "hund", so `or` finds nothing (0); the prefix
//      query "hund"* matches "hundehalter" (1) when n <= 4; with n = 5 the 4-letter word stays exact (0).
//   q2 "Ausweis" (rel p "Personalausweis beantragen"): the query word is the END of the compound, so neither `or`
//      nor a prefix query finds it (0); only trigram does (1).
//   q3 "Katzen" (rel k "Katzen füttern"): exact token, every lane 1.
// or 0.3333, or-prefix-4 0.6667, or-prefix-5 0.3333, or-trigram 1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bench = fileURLToPath(new URL('../scripts/beir-bench.mjs', import.meta.url));
const data = fileURLToPath(new URL('./fixtures/beir-de-prefix', import.meta.url));
const stub = fileURLToPath(new URL('./fixtures/de/stub-stemmer.mjs', import.meta.url));

function run(args) {
  try {
    return { code: 0, stdout: execFileSync(process.execPath, ['--no-warnings', bench, ...args], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status ?? -1, stdout: e.stdout ?? '', stderr: String(e.stderr ?? '') };
  }
}
const lastJson = (s) => JSON.parse(s.trim().split('\n').at(-1));

test('--prefix-min: words of at least n letters become prefix queries; compound heads are not found', () => {
  const r = run(['--data', data, '--lang', 'de', '--stemmer', stub, '--stopwords', 'lib', '--prefix-min', '4,5',
    '--lanes', 'or,or-trigram,or-prefix-4,or-prefix-5', '--repeat', '1', '--json']);
  assert.equal(r.code, 0, r.stderr);
  const L = lastJson(r.stdout).lanes;
  const want = { or: 0.3333, 'or-prefix-4': 0.6667, 'or-prefix-5': 0.3333, 'or-trigram': 1 };
  for (const [lane, v] of Object.entries(want)) assert.equal(L[lane].ndcg10, v, lane);
});

test('--prefix-min: German only, positive integers; no prefix lanes without the flag', () => {
  const base = ['--data', data, '--lang', 'de', '--stemmer', stub, '--repeat', '1', '--json'];
  assert.equal(Object.keys(lastJson(run(base).stdout).lanes).some((l) => l.startsWith('or-prefix-')), false);
  assert.match(run(['--data', data, '--prefix-min', '4', '--repeat', '1']).stderr, /--prefix-min is German-only/);
  assert.match(run([...base, '--prefix-min', '0']).stderr, /--prefix-min needs positive integers/);
});
