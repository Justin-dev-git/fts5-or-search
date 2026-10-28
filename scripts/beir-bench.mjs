// BEIR-format benchmark for the OR + coverage re-rank claim (T11).
// Reads a BEIR dataset directory (corpus.jsonl with _id/title/text,
// queries.jsonl with _id/text, qrels/test.tsv with header) and measures
// five retrieval lanes with the same tokenizer spec as production
// ('porter unicode61'). No dependencies beyond node:sqlite; evaluation
// metrics come from scripts/metrics.mjs.
//
// Usage: node scripts/beir-bench.mjs --data <dir> [--repeat 3] [--json]
//   --json  additionally prints one JSON line as the LAST output line:
//           { dataset, docs, queries, lanes: { <lane>:
//             { ndcg10, mrr10, recall100, p50ms, p95ms } } }
//
// Latency is per query (retrieval + re-rank); p50/p95 per repeat run, and
// the WORST value over the repeats is reported (cache-bias guard).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { performance } from 'node:perf_hooks';
import {
  sanitizeMatch, buildOrMatch, hybridSearch, makeFtsTermPresent, tokenize,
} from '../lib/or-search.mjs';
import { evaluate, ndcgAtK, precisionAtK } from './metrics.mjs';

const K = 100; // every lane returns at most 100 results
const BLEND_POOL = 500; // candidate pool for the blend lanes (T12)
const BLEND_LAMBDAS = { blend: [0, 0.1, 0.2, 0.5], blendidf: [0.1, 0.2, 0.5] };

function parseArgs(argv) {
  const out = { data: null, repeat: 3, json: false, perQuery: null, lanes: null, titleWeights: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--data') out.data = argv[++i];
    else if (a === '--repeat') out.repeat = Number(argv[++i]);
    else if (a === '--json') out.json = true;
    else if (a === '--per-query') out.perQuery = argv[++i];
    else if (a === '--lanes') out.lanes = argv[++i].split(',').filter(Boolean);
    else if (a === '--title-weights') {
      out.titleWeights = argv[++i].split(',').filter(Boolean).map((s) => {
        const w = Number(s);
        if (!Number.isFinite(w)) throw new Error(`beir-bench: --title-weights needs numbers, got ${s}`);
        return w;
      });
      if (!out.titleWeights.length) throw new Error('beir-bench: --title-weights needs at least one weight');
    } else throw new Error(`beir-bench: unknown argument: ${a}`);
  }
  if (!out.data) throw new Error('beir-bench: --data <dir> is required');
  if (!Number.isInteger(out.repeat) || out.repeat < 1) {
    throw new Error(`beir-bench: --repeat must be a positive integer, got ${out.repeat}`);
  }
  return out;
}

function readJsonl(path) {
  const rows = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (t) rows.push(JSON.parse(t));
  }
  return rows;
}

/** qrels/test.tsv: header + tab-separated query-id, corpus-id, score. */
function readQrels(path) {
  const qrels = new Map();
  const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim());
  for (let i = 1; i < lines.length; i++) {
    const [qid, docId, score] = lines[i].split('\t');
    if (!qid || !docId) continue;
    if (!qrels.has(qid)) qrels.set(qid, {});
    qrels.get(qid)[docId] = Number(score);
  }
  return qrels;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.ceil(p * sorted.length) - 1);
  return sorted[idx];
}

function loadCorpus(docs) {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE VIRTUAL TABLE docs USING fts5(id UNINDEXED, content, tokenize='porter unicode61')");
  const ins = db.prepare('INSERT INTO docs (id, content) VALUES (?, ?)');
  db.exec('BEGIN');
  for (const d of docs) ins.run(String(d._id), `${d.title ?? ''}\n${d.text ?? ''}`);
  db.exec('COMMIT');
  return db;
}

// T13: separate title/text columns so bm25() can weight the title column.
function loadCorpusSplit(docs) {
  const db2 = new DatabaseSync(':memory:');
  db2.exec("CREATE VIRTUAL TABLE docs2 USING fts5(id UNINDEXED, title, text, tokenize='porter unicode61')");
  const ins = db2.prepare('INSERT INTO docs2 (id, title, text) VALUES (?, ?, ?)');
  db2.exec('BEGIN');
  for (const d of docs) ins.run(String(d._id), d.title ?? '', d.text ?? '');
  db2.exec('COMMIT');
  return db2;
}

function lanesFor(db, docCount) {
  const stmt = db.prepare('SELECT rowid AS rid, id, content, rank FROM docs WHERE docs MATCH ? ORDER BY rank LIMIT ?');
  const search = (match, limit) => stmt.all(match, limit);
  const getText = (r) => r.content;
  const lanes = {
    and: (q) => search(sanitizeMatch(q), K),
    or: (q) => search(buildOrMatch(q), K),
    hybrid: (q) => hybridSearch(search, q, getText, { k: K }),
    'hybrid-nofloor': (q) => hybridSearch(search, q, getText, { k: K, andFloor: false }),
    'hybrid-fts': (q) => hybridSearch(search, q, getText, {
      k: K,
      termPresent: makeFtsTermPresent(db, 'docs', { idKey: 'rid' }),
    }),
  };

  // T12 blend lanes (bench-side only, lib/ untouched): score = norm + λ·cov
  // over the OR top-500 pool, stable sort so ties keep pool order.
  const termPresent = makeFtsTermPresent(db, 'docs', { idKey: 'rid' });
  const dfStmt = db.prepare('SELECT count(*) AS c FROM docs WHERE docs MATCH ?');
  const dfCache = new Map(); // quoted term -> hit count
  const dfOf = (term) => {
    if (!dfCache.has(term)) dfCache.set(term, dfStmt.get(`"${term.replaceAll('"', '')}"`).c);
    return dfCache.get(term);
  };
  const idfOf = (term) => {
    const df = dfOf(term);
    return Math.log((docCount - df + 0.5) / (df + 0.5) + 1);
  };

  function blend(query, lambda, weightedBy) {
    const pool = search(buildOrMatch(query), BLEND_POOL);
    const ts = [...new Set(tokenize(query))];
    let maxNegRank = 0;
    for (const r of pool) maxNegRank = Math.max(maxNegRank, -r.rank);
    const idfSum = weightedBy ? ts.reduce((s, t) => s + idfOf(t), 0) : 0;
    const scored = pool.map((r, i) => {
      const norm = maxNegRank > 0 ? -r.rank / maxNegRank : 0;
      let cov = 0;
      if (ts.length) {
        if (weightedBy) {
          if (idfSum > 0) {
            for (const t of ts) if (termPresent(t, r)) cov += idfOf(t);
            cov /= idfSum;
          }
        } else {
          for (const t of ts) if (termPresent(t, r)) cov += 1;
          cov /= ts.length;
        }
      }
      return { r, i, score: norm + lambda * cov };
    });
    // Array#sort is stable in V8, so equal scores keep pool order (spec).
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, K).map((s) => s.r);
  }

  for (const fam of Object.keys(BLEND_LAMBDAS)) {
    for (const lambda of BLEND_LAMBDAS[fam]) {
      lanes[`${fam}-${lambda}`] = (q) => blend(q, lambda, fam === 'blendidf');
    }
  }
  return lanes;
}

function run() {
  const { data, repeat, json, perQuery, lanes: laneFilter, titleWeights } = parseArgs(process.argv.slice(2));
  const corpus = readJsonl(join(data, 'corpus.jsonl'));
  const queries = new Map(readJsonl(join(data, 'queries.jsonl')).map((q) => [String(q._id), q.text]));
  const qrels = readQrels(join(data, 'qrels', 'test.tsv'));
  const qids = [...qrels.keys()].filter((q) => queries.has(q));

  const db = loadCorpus(corpus);
  const lanes = lanesFor(db, corpus.length);

  // T13 title-weighted lanes on the split-column table docs2; existing lanes
  // keep running on docs unchanged. Only created when the flag is set.
  if (titleWeights) {
    const db2 = loadCorpusSplit(corpus);
    const stmt2 = db2.prepare(
      'SELECT rowid AS rid, id, title || char(10) || text AS content FROM docs2 WHERE docs2 MATCH ? ORDER BY bm25(docs2, 0.0, ?, 1.0) LIMIT ?',
    );
    for (const w of titleWeights) {
      lanes[`or-title-${w}`] = (q) => stmt2.all(buildOrMatch(q), w, K);
    }
  }

  let laneNames = Object.keys(lanes);
  if (laneFilter) {
    for (const want of laneFilter) {
      if (!lanes[want]) throw new Error(`beir-bench: unknown lane: ${want}`);
    }
    laneNames = laneNames.filter((l) => laneFilter.includes(l));
  }

  // Deterministic ranked runs for evaluation, plus per-repeat latency.
  const runs = new Map(laneNames.map((l) => [l, new Map()]));
  const latency = new Map(laneNames.map((l) => [l, []])); // worst-run p50/p95
  const worst = new Map(laneNames.map((l) => [l, { p50: 0, p95: 0 }]));

  for (let rep = 0; rep < repeat; rep++) {
    for (const lane of laneNames) {
      const fn = lanes[lane];
      const perQuery = [];
      for (const qid of qids) {
        const text = queries.get(qid);
        const t0 = performance.now();
        const rows = fn(text);
        perQuery.push(performance.now() - t0);
        if (rep === 0) runs.get(lane).set(qid, rows.map((r) => String(r.id)));
      }
      const sorted = [...perQuery].sort((a, b) => a - b);
      worst.get(lane).p50 = Math.max(worst.get(lane).p50, percentile(sorted, 0.5));
      worst.get(lane).p95 = Math.max(worst.get(lane).p95, percentile(sorted, 0.95));
      latency.get(lane).push(...perQuery);
    }
  }

  const out = { dataset: basename(data), docs: corpus.length, queries: qids.length, lanes: {} };
  for (const lane of laneNames) {
    const m = evaluate(runs.get(lane), qrels, { k: 10, recallK: K });
    out.lanes[lane] = {
      ndcg10: +m.ndcg10.toFixed(4),
      mrr10: +m.mrr10.toFixed(4),
      recall100: +m.recall100.toFixed(4),
      p10: +m.p10.toFixed(4),
      p50ms: +worst.get(lane).p50.toFixed(2),
      p95ms: +worst.get(lane).p95.toFixed(2),
    };
  }

  const header = ['lane', 'ndcg@10', 'mrr@10', 'recall@100', 'p@10', 'p50ms', 'p95ms'];
  const rows = laneNames.map((l) => [
    l,
    out.lanes[l].ndcg10.toFixed(4),
    out.lanes[l].mrr10.toFixed(4),
    out.lanes[l].recall100.toFixed(4),
    out.lanes[l].p10.toFixed(4),
    out.lanes[l].p50ms.toFixed(2),
    out.lanes[l].p95ms.toFixed(2),
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  console.log(`dataset=${out.dataset} docs=${out.docs} queries=${out.queries} repeat=${repeat}`);
  console.log(header.map((h, i) => h.padEnd(widths[i])).join('  '));
  for (const r of rows) console.log(r.map((c, i) => c.padEnd(widths[i])).join('  '));

  // Per-query detail file for beir-compare (T12): one line per judged query.
  if (perQuery) {
    const lines = [];
    for (const qid of qids) {
      const qrel = qrels.get(qid);
      const terms = new Set(tokenize(queries.get(qid))).size;
      const perLane = {};
      for (const lane of laneNames) {
        const ranked = runs.get(lane).get(qid) ?? [];
        perLane[lane] = { ndcg10: ndcgAtK(ranked, qrel, 10), p10: precisionAtK(ranked, qrel, 10) };
      }
      lines.push(JSON.stringify({ qid, terms, lanes: perLane }));
    }
    writeFileSync(perQuery, lines.join('\n') + '\n');
  }
  if (json) console.log(JSON.stringify(out));
}

run();
