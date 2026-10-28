// T18: the English re-rank lanes at the library's normal k=10 (OR pool 50)
// versus the k=100 lanes of T11-T14 (OR pool 500). Fixture beir-pool, one
// query "solar wind electricity grid", relevant doc `rel` (3 of 4 terms,
// BM25 rank 1). Doc `full` has all 4 terms but 2 000 filler words, BM25
// rank 57 of 57. Hand reasoning, checked in review:
//   - every pool-500 lane re-ranks `full` above `rel`: 0.6309
//   - pool 50 without AND floor never sees `full`: 1
//   - the AND floor adds `full` (the only all-terms doc) back: 0.6309
//   - `and` returns only `full`: 0; `or` and the blends keep `rel` first: 1
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bench = fileURLToPath(new URL('../scripts/beir-bench.mjs', import.meta.url));
const data = fileURLToPath(new URL('./fixtures/beir-pool', import.meta.url));

test('pool size decides the coverage re-rank: k=100 lanes vs k=10 lanes on beir-pool', () => {
  const out = execFileSync(process.execPath, ['--no-warnings', bench, '--data', data, '--repeat', '1', '--json'], { encoding: 'utf8' });
  const L = JSON.parse(out.trim().split('\n').at(-1)).lanes;
  const nd = (n) => L[n].ndcg10;
  assert.equal(nd('and'), 0);
  assert.equal(nd('or'), 1);
  for (const n of ['hybrid', 'hybrid-nofloor', 'hybrid-fts']) assert.equal(nd(n), 0.6309, n);
  assert.equal(nd('hybrid-k10'), 0.6309);
  assert.equal(nd('hybrid-fts-k10'), 0.6309);
  assert.equal(nd('hybrid-nofloor-k10'), 1);
  assert.equal(nd('hybrid-substr-k10'), 1);
  assert.equal(nd('blend-0.5'), 1);
});
