// Precision@k tests for T12 (hand-computed, trec_eval convention: divide by
// k even when fewer than k documents were returned).
// Pending until T12 step 1 copies it to test/metrics-p10.test.mjs unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { precisionAtK, evaluate } from '../scripts/metrics.mjs';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('precisionAtK: relevant = score > 0, divided by k', () => {
  const qrel = { r: 1, r2: 2, n: 0 };
  close(precisionAtK(['r', 'n', 'r2'], qrel, 10), 0.2);
  close(precisionAtK(['r', 'n', 'r2'], qrel, 2), 0.5);
  close(precisionAtK([], qrel, 10), 0);
});

test('evaluate also returns p10 (mean over judged queries, missing run = 0)', () => {
  const qrels = new Map([
    ['q1', { d1: 1, d3: 2 }],
    ['q2', { d5: 1 }],
    ['q3', { d7: 1, d8: 1 }],
  ]);
  const run = new Map([['q1', ['d3', 'd2', 'd1']], ['q3', ['d9', 'd8']]]);
  const r = evaluate(run, qrels, { k: 10, recallK: 100 });
  close(r.p10, 0.1); // (2/10 + 0 + 1/10) / 3
  close(r.ndcg10, 0.445696); // unchanged from T11
});
