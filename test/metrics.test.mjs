// Metric unit tests for the BEIR validation (T11). Hand-computed values;
// linear gain, log2(rank+1) discount, as in trec_eval / pytrec_eval (BEIR).
// Pending until T11 step 1 copies it to test/metrics.test.mjs unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ndcgAtK, mrrAtK, recallAtK, evaluate } from '../scripts/metrics.mjs';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('ndcgAtK: graded relevance, linear gain, log2 discount', () => {
  // DCG = 2/log2(2) + 0 + 1/log2(4) = 2.5 ; IDCG = 2 + 1/log2(3) = 2.630930
  close(ndcgAtK(['d3', 'd2', 'd1'], { d1: 1, d3: 2 }, 10), 0.950234);
  // DCG = 1/log2(3) ; IDCG = 1 + 1/log2(3)
  close(ndcgAtK(['d9', 'd8'], { d7: 1, d8: 1 }, 10), 0.386853);
  close(ndcgAtK(['d1', 'd2'], { d5: 1 }, 10), 0);
});

test('cutoff k is respected (relevant doc at rank 11 does not count)', () => {
  const ranked = Array.from({ length: 10 }, (_, i) => `x${i}`).concat(['rel']);
  close(ndcgAtK(ranked, { rel: 1 }, 10), 0);
  close(mrrAtK(ranked, { rel: 1 }, 10), 0);
  close(recallAtK(ranked, { rel: 1 }, 10), 0);
  close(recallAtK(ranked, { rel: 1 }, 11), 1);
});

test('mrrAtK and recallAtK ignore judged-but-irrelevant (score 0) docs', () => {
  close(mrrAtK(['n', 'r'], { n: 0, r: 1 }, 10), 0.5);
  close(recallAtK(['n', 'r'], { n: 0, r: 1, s: 2 }, 100), 0.5);
});

test('evaluate: means over judged queries; missing runs count as 0; unjudged queries excluded', () => {
  const qrels = new Map([
    ['q1', { d1: 1, d3: 2 }],
    ['q2', { d5: 1 }],
    ['q3', { d7: 1, d8: 1 }],
    ['q4', { z: 0 }], // no relevant doc -> excluded
  ]);
  const run = new Map([
    ['q1', ['d3', 'd2', 'd1']],
    ['q3', ['d9', 'd8']],
    ['q9', ['d1']], // not judged -> ignored
  ]); // q2 missing from run -> scores 0
  const r = evaluate(run, qrels, { k: 10, recallK: 100 });
  assert.equal(r.queries, 3);
  close(r.ndcg10, 0.445696);
  close(r.mrr10, 0.5);
  close(r.recall100, 0.5);
});
