// T32: beir-bench --context-cost and scripts/context-cost.mjs. Reference values on test/fixtures/beir-context, by hand:
//   documents as indexed (title "", newline, text): a1 "\napple apple apple" 18 characters, a2 "\napple banana cherry"
//   20, a3 "\npie 🥧" 6 (code points; the emoji is two UTF-16 units).
//   q1 "apple" (rel a2; a1 judged 0 = not relevant): a1 has "apple" three times at the same length, so AND and OR
//      rank a1, a2: first relevant at 2.
//   q2 "banana pie" (rel a3): no document has both words, AND returns nothing; OR ranks the shorter a3 before a2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentCost, charsToFirst, median, summarize, compare, pairedDelta } from '../scripts/context-cost.mjs';

const bench = fileURLToPath(new URL('../scripts/beir-bench.mjs', import.meta.url));
const cli = fileURLToPath(new URL('../scripts/context-cost.mjs', import.meta.url));
const data = fileURLToPath(new URL('./fixtures/beir-context', import.meta.url));

function benchRows() {
  const dir = mkdtempSync(join(tmpdir(), 'ctx-'));
  try {
    const file = join(dir, 'ctx.jsonl');
    execFileSync(process.execPath, ['--no-warnings', bench, '--data', data, '--lanes', 'and,or', '--repeat', '1', '--context-cost', file], { encoding: 'utf8' });
    return readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('--context-cost: rank of the first relevant document and characters (code points) of every returned document', () => {
  assert.deepEqual(benchRows(), [
    { qid: 'q1', lanes: { and: { first: 2, chars: [18, 20] }, or: { first: 2, chars: [18, 20] } } },
    { qid: 'q2', lanes: { and: { first: null, chars: [] }, or: { first: 1, chars: [6, 20] } } },
  ]);
});

test('agent model: calls = ceil(r/k), snippets = calls*k capped at the returned list, characters of those snippets', () => {
  const ten = Array(20).fill(10);
  assert.deepEqual(agentCost(7, ten, 6), { calls: 2, snippets: 12, chars: 120 });
  assert.deepEqual(agentCost(6, ten, 6), { calls: 1, snippets: 6, chars: 60 });
  assert.deepEqual(agentCost(7, ten.slice(0, 8), 6), { calls: 2, snippets: 8, chars: 80 });
  assert.equal(agentCost(null, ten, 6), null);
  assert.throws(() => agentCost(1, ten, 0), RangeError);
  assert.equal(charsToFirst(3, [5, 6, 7, 8]), 18);
  assert.equal(charsToFirst(null, [5]), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
});

test('summary and paired comparison on the fixture (not found counted separately, costs only where both found)', () => {
  const rows = benchRows();
  const and = summarize(rows, 'and', [1, 6]);
  assert.equal(and.empty, 1);
  assert.equal(and.notFound, 1);
  assert.equal(and.found, 0.5);
  assert.equal(and.at1, 0);
  assert.equal(and.medianRank, 2);
  assert.deepEqual(and.k[1], { inTopK: 0, calls: 2, snippets: 2, chars: 38 });
  assert.deepEqual(and.k[6], { inTopK: 0.5, calls: 1, snippets: 2, chars: 38 });
  const or = summarize(rows, 'or', [1, 6]);
  assert.equal(or.medianRank, 1.5);
  assert.deepEqual(or.charsToFirst, { median: 22, mean: 22 });
  assert.deepEqual(or.k[1], { inTopK: 0.5, calls: 1.5, snippets: 1.5, chars: 22 });
  assert.deepEqual(or.k[6], { inTopK: 1, calls: 1, snippets: 2, chars: 32 });
  const c = compare(rows, 'and', 'or', [1, 6]);
  assert.deepEqual([c.onlyA, c.onlyB, c.both], [0, 1, 1]);
  assert.equal(c.k[6].inTopK.delta, 0.5);
  assert.equal(c.k[1].calls.delta, 0);
  assert.equal(c.charsToFirst.delta, 0);
});

test('paired bootstrap: deterministic (seed reset per call), interval contains the mean, constant differences give a point', () => {
  const d = [0, 1, 0, 1, 1, 0, 0, 1, 1, 1];
  const x = pairedDelta(d);
  assert.deepEqual(pairedDelta(d), x);
  assert.equal(x.delta, 0.6);
  assert.ok(x.lo <= 0.6 && 0.6 <= x.hi && x.lo < x.hi);
  assert.deepEqual(pairedDelta([2, 2, 2]), { n: 3, delta: 2, lo: 2, hi: 2 });
  assert.deepEqual(pairedDelta([]), { n: 0, delta: null, lo: null, hi: null });
});

test('context-cost CLI: table, pairs and JSON; unknown lanes are refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ctx-'));
  try {
    const file = join(dir, 'ctx.jsonl');
    execFileSync(process.execPath, ['--no-warnings', bench, '--data', data, '--lanes', 'and,or', '--repeat', '1', '--context-cost', file], { encoding: 'utf8' });
    const out = execFileSync(process.execPath, [cli, file, '--k', '6', '--pairs', 'and:or', '--json'], { encoding: 'utf8' });
    const j = JSON.parse(out.trim().split('\n').at(-1));
    assert.equal(j.questions, 2);
    assert.equal(j.lanes.or.k[6].chars, 32);
    assert.equal(j.pairs[0].onlyB, 1);
    assert.throws(() => execFileSync(process.execPath, [cli, file, '--pairs', 'and:nope'], { encoding: 'utf8', stdio: 'pipe' }), /unknown lane/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
