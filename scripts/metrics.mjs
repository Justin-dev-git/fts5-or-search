// IR metrics for the BEIR validation lane (T11). Conventions as in
// trec_eval / pytrec_eval (what BEIR reports): linear gain = the graded
// relevance value, position discount 1/log2(rank+1) with rank 1-based,
// IDCG built from ALL relevance values > 0 of the query (not just top-k).
// "Relevant" for MRR/Recall means relevance value > 0; judged-but-irrelevant
// documents (value 0) are neither hits nor part of the denominator.
// No dependencies.

const discount = (rank) => Math.log2(rank + 1); // rank is 1-based

function dcg(ranked, qrel, k) {
  let sum = 0;
  const n = Math.min(ranked.length, k);
  for (let i = 0; i < n; i++) {
    const rel = qrel[ranked[i]] ?? 0;
    if (rel > 0) sum += rel / discount(i + 1);
  }
  return sum;
}

function idcg(qrel, k) {
  const rels = Object.values(qrel).filter((v) => v > 0).sort((a, b) => b - a);
  let sum = 0;
  const n = Math.min(rels.length, k);
  for (let i = 0; i < n; i++) sum += rels[i] / discount(i + 1);
  return sum;
}

/** nDCG@k with graded relevance: `ranked` is the ranked list of doc ids,
 *  `qrel` maps doc id -> relevance value (absent = 0). 0 when the query has
 *  no relevant document (IDCG = 0). */
export function ndcgAtK(ranked, qrel, k) {
  const ideal = idcg(qrel, k);
  if (ideal === 0) return 0;
  return dcg(ranked, qrel, k) / ideal;
}

/** Reciprocal rank of the first document with relevance > 0 within the top
 *  k; 0 if none. Docs judged with score 0 do not count as hits. */
export function mrrAtK(ranked, qrel, k) {
  const n = Math.min(ranked.length, k);
  for (let i = 0; i < n; i++) {
    if ((qrel[ranked[i]] ?? 0) > 0) return 1 / (i + 1);
  }
  return 0;
}

/** Fraction of ALL relevant documents (relevance > 0) retrieved within the
 *  top k. Queries without relevant documents have no defined recall and are
 *  excluded by evaluate(); called directly they return 0. */
export function recallAtK(ranked, qrel, k) {
  const relevant = Object.keys(qrel).filter((d) => (qrel[d] ?? 0) > 0);
  if (relevant.length === 0) return 0;
  const top = new Set(ranked.slice(0, k));
  let hit = 0;
  for (const d of relevant) if (top.has(d)) hit++;
  return hit / relevant.length;
}

/** Precision@k with trec_eval convention: relevant documents (relevance > 0)
 *  in the top k, divided by k — even when fewer than k documents were
 *  returned. */
export function precisionAtK(ranked, qrel, k) {
  const n = Math.min(ranked.length, k);
  let hit = 0;
  for (let i = 0; i < n; i++) {
    if ((qrel[ranked[i]] ?? 0) > 0) hit++;
  }
  return hit / k;
}

/** Mean metrics over judged queries.
 *  @param run   Map<queryId, docId[]> (ranked list per query)
 *  @param qrels Map<queryId, {docId: relevance}>
 *  Queries with no relevant document in qrels are excluded entirely;
 *  judged queries missing from `run` count with 0 for every metric. */
export function evaluate(run, qrels, { k = 10, recallK = 100 } = {}) {
  let n = 0, ndcg = 0, mrr = 0, recall = 0, p = 0;
  for (const [qid, qrel] of qrels) {
    const hasRelevant = Object.values(qrel).some((v) => (v ?? 0) > 0);
    if (!hasRelevant) continue;
    n++;
    const ranked = run.get(qid) ?? [];
    ndcg += ndcgAtK(ranked, qrel, k);
    mrr += mrrAtK(ranked, qrel, k);
    recall += recallAtK(ranked, qrel, recallK);
    p += precisionAtK(ranked, qrel, k);
  }
  return {
    queries: n,
    ndcg10: n ? ndcg / n : 0,
    mrr10: n ? mrr / n : 0,
    recall100: n ? recall / n : 0,
    p10: n ? p / n : 0,
  };
}
