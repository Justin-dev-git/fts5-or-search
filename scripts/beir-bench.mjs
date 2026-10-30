// BEIR-format benchmark for the OR + coverage re-rank claim (T11).
// Reads a BEIR dataset directory (corpus.jsonl with _id/title/text,
// queries.jsonl with _id/text, qrels/test.tsv with header) and measures
// five retrieval lanes with the same tokenizer spec as production
// ('porter unicode61'). No dependencies beyond node:sqlite; evaluation
// metrics come from scripts/metrics.mjs.
//
// Usage: node scripts/beir-bench.mjs --data <dir> [--repeat 3] [--json]
//        node scripts/beir-bench.mjs --data <dir> --lang de --stemmer <path/to/stem-german.mjs> [...]
//   --lang de  German lanes instead of the English ones: and, or, or-stem,
//           or-stem-paradigm (german-fts5-stemmer variants, ORed), or-trigram
//           (FTS5 trigram tokenizer), hybrid and hybrid-expanded (coverage
//           re-rank as in german-fts5-stemmer's bench.mjs, T17). Index
//           tokenizer 'unicode61', stopwords = the stemmer's STOPWORDS for
//           every lane. The stemmer module is loaded from --stemmer at run
//           time; it is not a dependency.
//   --db-dir <dir>  build the FTS5 databases as files in <dir> (must exist;
//           existing files are never overwritten) instead of in memory. For
//           corpora larger than the free RAM (T19). Rankings are the same.
//   --reuse-db  with --db-dir: reuse an index whose build finished (a
//           <name>.db.done marker with the same tokenizer and corpus size);
//           build missing ones; refuse a .db without marker (aborted build).
//   --report-db  also report build time and database size per index
//           (text line + JSON fields buildMs/dbBytes).
//   --stopwords stemmer|lib  German only (T21): stopword list for every
//           German lane. `stemmer` (default) is the stemmer's STOPWORDS, as in
//           T16-T19; `lib` is STOPWORDS_DE from lib/or-search.mjs (JSON field
//           stopwords: "lib").
//   --adaptive-tau <n,...>  German only (T24): add the lanes adaptive-trigram-<n>
//           and adaptive-stem-<n> for each n. A query whose plain OR match hits
//           at most n documents of the unicode61 index takes or-trigram or
//           hybrid-expanded, every other query plain `or`. T25: also
//           adaptive-search-<n>, the library's adaptiveSearch with the stemmer
//           as expansion (returns 10 rows: only the @10 metrics are comparable).
//   --fts-prefix '<n m ...>'  German only (T31): build the unicode61 index with
//           FTS5 prefix='<n m ...>' (prefix indexes for prefix queries of exactly
//           those lengths); index name and reuse marker carry the value.
//   --prefix-min <n,...>  German only (T26): add the lanes or-prefix-<n>: the
//           `or` match on unicode61 with every word of at least n letters as an
//           FTS5 prefix query ("hund"* also finds "hundehalter", "hunde").
//   --context-cost <file>  (T32) one JSON line per judged query:
//           { qid, lanes: { <lane>: { first, chars } } } with `first` the 1-based
//           rank of the first document with relevance > 0 in the lane's ranked
//           list (at most 100 results; null if none) and `chars` the length in
//           characters (code points) of every returned document as indexed
//           (title, newline, text), in rank order. Evaluated by
//           scripts/context-cost.mjs.
//   --json  additionally prints one JSON line as the LAST output line:
//           { dataset, docs, queries, lanes: { <lane>:
//             { ndcg10, mrr10, recall100, p50ms, p95ms } } }
//
// Latency is per query (retrieval + re-rank); p50/p95 per repeat run, and
// the WORST value over the repeats is reported (cache-bias guard).
import { readFileSync, writeFileSync, createReadStream, existsSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { performance } from 'node:perf_hooks';
import {
  sanitizeMatch, buildOrMatch, hybridSearch, makeFtsTermPresent, tokenize, STOPWORDS_DE, adaptiveSearch,
} from '../lib/or-search.mjs';
import { evaluate, ndcgAtK, precisionAtK } from './metrics.mjs';

const K = 100; // every lane returns at most 100 results
const BLEND_POOL = 500; // candidate pool for the blend lanes (T12)
const BLEND_LAMBDAS = { blend: [0, 0.1, 0.2, 0.5], blendidf: [0.1, 0.2, 0.5] };

function parseArgs(argv) {
  const out = {
    data: null, repeat: 3, json: false, perQuery: null, lanes: null, titleWeights: null,
    lang: 'en', stemmer: null, dbDir: null, reportDb: false, reuseDb: false, stopwords: null, adaptiveTau: null, prefixMin: null, ftsPrefix: null, contextCost: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--data') out.data = argv[++i];
    else if (a === '--repeat') out.repeat = Number(argv[++i]);
    else if (a === '--json') out.json = true;
    else if (a === '--per-query') out.perQuery = argv[++i];
    else if (a === '--context-cost') out.contextCost = argv[++i];
    else if (a === '--lanes') out.lanes = argv[++i].split(',').filter(Boolean);
    else if (a === '--lang') out.lang = argv[++i];
    else if (a === '--stemmer') out.stemmer = argv[++i];
    else if (a === '--db-dir') out.dbDir = argv[++i];
    else if (a === '--report-db') out.reportDb = true;
    else if (a === '--reuse-db') out.reuseDb = true;
    else if (a === '--stopwords') out.stopwords = argv[++i];
    else if (a === '--fts-prefix') {
      out.ftsPrefix = argv[++i];
      if (!/^[1-9]\d*( [1-9]\d*)*$/.test(out.ftsPrefix ?? '')) throw new Error("beir-bench: --fts-prefix needs positive integers separated by spaces, e.g. '4 5 6'");
    }
    else if (a === '--prefix-min') {
      out.prefixMin = argv[++i].split(',').filter(Boolean).map(Number);
      if (!out.prefixMin.length || !out.prefixMin.every((n) => Number.isInteger(n) && n >= 1)) {
        throw new Error('beir-bench: --prefix-min needs positive integers');
      }
    }
    else if (a === '--adaptive-tau') {
      out.adaptiveTau = argv[++i].split(',').filter(Boolean).map(Number);
      if (!out.adaptiveTau.length || !out.adaptiveTau.every((n) => Number.isInteger(n) && n >= 0)) {
        throw new Error('beir-bench: --adaptive-tau needs non-negative integers');
      }
    }
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
  if (!['en', 'de'].includes(out.lang)) throw new Error(`beir-bench: --lang must be en or de, got ${out.lang}`);
  if (out.lang === 'de' && !out.stemmer) throw new Error('beir-bench: --lang de needs --stemmer <path/to/stem-german.mjs>');
  if (out.lang === 'de' && out.titleWeights) throw new Error('beir-bench: --title-weights is English-only');
  if (out.stopwords !== null) {
    if (out.lang !== 'de') throw new Error('beir-bench: --stopwords is German-only');
    if (!['stemmer', 'lib'].includes(out.stopwords)) throw new Error(`beir-bench: --stopwords must be stemmer or lib, got ${out.stopwords}`);
  }
  if (out.adaptiveTau && out.lang !== 'de') throw new Error('beir-bench: --adaptive-tau is German-only');
  if (out.prefixMin && out.lang !== 'de') throw new Error('beir-bench: --prefix-min is German-only');
  if (out.ftsPrefix && out.lang !== 'de') throw new Error('beir-bench: --fts-prefix is German-only');
  if (out.dbDir && !(existsSync(out.dbDir) && statSync(out.dbDir).isDirectory())) {
    throw new Error(`beir-bench: --db-dir must be an existing directory: ${out.dbDir}`);
  }
  if (out.reuseDb && !out.dbDir) throw new Error('beir-bench: --reuse-db needs --db-dir');
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

/** T32: length of a returned document in characters (code points, not UTF-16 units). */
function codePoints(s, lane) {
  if (typeof s !== 'string') throw new Error(`beir-bench: --context-cost: lane ${lane} returns rows without content`);
  return s.length - (s.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g)?.length ?? 0);
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.ceil(p * sorted.length) - 1);
  return sorted[idx];
}

// T19: the corpus is streamed line by line (a multi-GB corpus.jsonl does not
// fit into one JS string). Same rows, same order as the former readJsonl().
async function* corpusRows(path) {
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (t) yield JSON.parse(t);
  }
}

// In memory by default; with --db-dir a fresh file per index (never reused or
// overwritten). journal/synchronous off only for the file build: speed, no
// effect on the index content.
function openDb(dbDir, name) {
  if (!dbDir) return new DatabaseSync(':memory:');
  const file = join(dbDir, `${name}.db`);
  if (existsSync(file)) throw new Error(`beir-bench: ${file} exists; remove it or use another --db-dir`);
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF');
  return db;
}

const dbBytesOf = (db) => db.prepare('PRAGMA page_count').get().page_count * db.prepare('PRAGMA page_size').get().page_size;

// Every built index is recorded here for --report-db: name, ms, db.
const builtIndexes = [];

async function loadCorpus(corpusPath, tokenizer = 'porter unicode61', { dbDir = null, name = 'index', reuse = false, ftsPrefix = null } = {}) {
  const file = dbDir ? join(dbDir, `${name}.db`) : null;
  const corpusBytes = statSync(corpusPath).size;
  if (reuse) {
    const marker = `${file}.done`;
    if (existsSync(marker)) {
      const m = JSON.parse(readFileSync(marker, 'utf8'));
      if (m.tokenizer !== tokenizer || m.corpusBytes !== corpusBytes || (m.ftsPrefix ?? null) !== ftsPrefix) {
        throw new Error(`beir-bench: ${file} was built with another tokenizer or corpus; remove it`);
      }
      const db = new DatabaseSync(file);
      builtIndexes.push({ name, ms: m.buildMs, db, reused: true });
      return { db, docs: m.docs };
    }
    if (existsSync(file)) throw new Error(`beir-bench: ${file} has no .done marker (aborted build?); remove it`);
  }
  const t0 = performance.now();
  const db = openDb(dbDir, name);
  db.exec(`CREATE VIRTUAL TABLE docs USING fts5(id UNINDEXED, content, tokenize='${tokenizer}'${ftsPrefix ? `, prefix='${ftsPrefix}'` : ''})`);
  const ins = db.prepare('INSERT INTO docs (id, content) VALUES (?, ?)');
  let docs = 0;
  db.exec('BEGIN');
  for await (const d of corpusRows(corpusPath)) {
    ins.run(String(d._id), `${d.title ?? ''}\n${d.text ?? ''}`);
    docs++;
  }
  db.exec('COMMIT');
  const ms = performance.now() - t0;
  if (file) writeFileSync(`${file}.done`, JSON.stringify({ tokenizer, ...(ftsPrefix ? { ftsPrefix } : {}), docs, buildMs: Math.round(ms), corpusBytes }) + '\n');
  builtIndexes.push({ name, ms, db });
  return { db, docs };
}

// T13: separate title/text columns so bm25() can weight the title column.
async function loadCorpusSplit(corpusPath, { dbDir = null, name = 'split' } = {}) {
  const t0 = performance.now();
  const db2 = openDb(dbDir, name);
  db2.exec("CREATE VIRTUAL TABLE docs2 USING fts5(id UNINDEXED, title, text, tokenize='porter unicode61')");
  const ins = db2.prepare('INSERT INTO docs2 (id, title, text) VALUES (?, ?, ?)');
  db2.exec('BEGIN');
  for await (const d of corpusRows(corpusPath)) ins.run(String(d._id), d.title ?? '', d.text ?? '');
  db2.exec('COMMIT');
  builtIndexes.push({ name, ms: performance.now() - t0, db: db2 });
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

  // T18: the re-rank lanes at the library's normal top-10 use (k=10, OR pool
  // k*5 = 50). The k=K lanes above re-rank a 500-row pool, which lets
  // coverage pull low-BM25 documents into the top 10. These lanes return 10
  // rows (hybrid-substr-k10: the 50-row pool), so only the @10 metrics are
  // comparable with the other lanes; Recall@100 is not.
  const K10 = 10;
  lanes['hybrid-k10'] = (q) => hybridSearch(search, q, getText, { k: K10 });
  lanes['hybrid-nofloor-k10'] = (q) => hybridSearch(search, q, getText, { k: K10, andFloor: false });
  lanes['hybrid-fts-k10'] = (q) => hybridSearch(search, q, getText, { k: K10, termPresent });
  // the German T17 re-rank (substring coverage, pool 50, no AND floor) on English
  lanes['hybrid-substr-k10'] = (q) => {
    const ts = tokenize(q);
    return ts.length ? substringCoverageRerank(search(buildOrMatch(q), SUBSTR_RERANK_POOL), ts.map((t) => [t])) : [];
  };
  return lanes;
}

// German lanes (T16). Every lane uses the stemmer's STOPWORDS so that the
// lanes differ only in matching: and/or on 'unicode61' (folds umlauts, keeps
// ß), or-stem* OR all stemmer variants of all query terms, or-trigram ORs the
// same terms as `or` against a trigram index (substring matching, so
// compounds such as "Personalausweis" contain "ausweis").
const quoteTerm = (t) => `"${t.replaceAll('"', '')}"`;

// T17: re-rank exactly as the lanes fts-hybrid / fts-hybrid-expanded in
// german-fts5-stemmer's bench.mjs: pool = 50 rows (its K*5 with K=10),
// coverage = number of term groups with ANY variant occurring as a substring
// of the lower-cased row text (not folded), score = coverage*1000 + 1/(i+1).
// Recall@100 of these lanes is therefore capped by the 50-row pool.
const SUBSTR_RERANK_POOL = 50;
function substringCoverageRerank(rows, groups) {
  return rows
    .map((r, i) => {
      const low = String(r.content ?? '').toLowerCase();
      const coverage = groups.filter((u) => u.some((v) => low.includes(v))).length;
      return { r, score: coverage * 1000 + 1 / (i + 1) };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.r);
}

// T21: with --stopwords lib, STOPWORDS_DE replaces the stemmer's list. The
// stemmer lanes get the query without those words (token rule of the
// stemmer's queryTermVariants, leading/trailing hyphens stripped as in
// tokenize(): "Vor-" is "vor"), and stemmer variants that are in
// STOPWORDS_DE are dropped as well ("viele" also yields "viel", "Check-in"
// yields "in"); a group left without variants is dropped.
const dropStopwords = (q, sw) => q.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/)
  .map((w) => w.replace(/^-+/, '').replace(/-+$/, '')).filter((w) => w && !sw.has(w)).join(' ');

async function lanesForDe(corpusPath, stem, dbOpts, stopwords = 'stemmer', adaptiveTau = [], prefixMin = [], ftsPrefix = null) {
  const sw = stopwords === 'lib' ? STOPWORDS_DE : stem.STOPWORDS;
  const de = { stopwords: sw };
  const variants = stopwords === 'lib'
    ? (q, o) => stem.queryTermVariants(dropStopwords(q, sw), o).map((g) => g.filter((v) => !sw.has(v))).filter((g) => g.length)
    : (q, o) => stem.queryTermVariants(q, o);
  const prep = (db) => {
    const stmt = db.prepare('SELECT rowid AS rid, id, content, rank FROM docs WHERE docs MATCH ? ORDER BY rank LIMIT ?');
    return (match, limit = K) => stmt.all(match, limit);
  };
  const uniName = `${dbOpts.prefix}-unicode61${ftsPrefix ? `-p${ftsPrefix.replaceAll(' ', '_')}` : ''}`;
  const { db: dbUni, docs } = await loadCorpus(corpusPath, 'unicode61', { ...dbOpts, name: uniName, ftsPrefix });
  const { db: dbTri } = await loadCorpus(corpusPath, 'trigram remove_diacritics 1', { ...dbOpts, name: `${dbOpts.prefix}-trigram` });
  const search = prep(dbUni);
  const searchTri = prep(dbTri);
  const stemMatch = (q, paradigm) => {
    const vs = [...new Set(variants(q, { paradigm }).flat())];
    return vs.length ? `(${vs.map(quoteTerm).join(' OR ')})` : '""';
  };
  const result = {
    lanes: {
      and: (q) => search(sanitizeMatch(q, de)),
      or: (q) => search(buildOrMatch(q, de)),
      'or-stem': (q) => search(stemMatch(q, false)),
      'or-stem-paradigm': (q) => search(stemMatch(q, true)),
      'or-trigram': (q) => searchTri(buildOrMatch(q, de)),
      // coverage re-rank without stemmer: groups are the single `or` terms
      hybrid: (q) => {
        const ts = tokenize(q, de);
        return ts.length ? substringCoverageRerank(search(buildOrMatch(q, de), SUBSTR_RERANK_POOL), ts.map((t) => [t])) : [];
      },
      // stemmer-expanded OR pool (match string built like the original:
      // groups ORed, duplicates kept) + variant-coverage re-rank
      'hybrid-expanded': (q) => {
        const groups = variants(q);
        if (!groups.length) return [];
        const orM = groups.map((u) => `(${u.map(quoteTerm).join(' OR ')})`).join(' OR ');
        return substringCoverageRerank(search(orM, SUBSTR_RERANK_POOL), groups);
      },
      // T18: trigram OR pool + the same substring coverage re-rank (substring
      // coverage matches trigram's substring semantics)
      'hybrid-trigram': (q) => {
        const ts = tokenize(q, de);
        return ts.length ? substringCoverageRerank(searchTri(buildOrMatch(q, de), SUBSTR_RERANK_POOL), ts.map((t) => [t])) : [];
      },
    },
    tokOpts: de,
    docs,
    // whole database incl. stored text; the difference is index size
    dbBytes: { unicode61: dbBytesOf(dbUni), trigram: dbBytesOf(dbTri) },
  };
  // T24: a query is sparse if its plain OR match hits at most tau documents of
  // the unicode61 index (counted with LIMIT tau+1, so a dense query stops
  // early). Sparse queries take the expanded lane, all others plain `or`.
  const { lanes } = result;
  const sparseStmt = dbUni.prepare('SELECT count(*) AS c FROM (SELECT 1 FROM docs WHERE docs MATCH ? LIMIT ?)');
  const sparse = (q, tau) => sparseStmt.get(buildOrMatch(q, de), tau + 1).c <= tau;
  const countUpTo = (match, n) => sparseStmt.get(match, n).c;
  for (const tau of adaptiveTau) {
    lanes[`adaptive-trigram-${tau}`] = (q) => (sparse(q, tau) ? lanes['or-trigram'](q) : lanes.or(q));
    lanes[`adaptive-stem-${tau}`] = (q) => (sparse(q, tau) ? lanes['hybrid-expanded'](q) : lanes.or(q));
    lanes[`adaptive-search-${tau}`] = (q) => adaptiveSearch(search, countUpTo, q, (r) => r.content,
      { k: 10, tau, expand: (t) => stem.queryTermVariants(t), ...de });
  }
  // T26: words of at least n letters (letters only) as prefix queries; since T31 via the library option
  for (const n of prefixMin) {
    lanes[`or-prefix-${n}`] = (q) => (tokenize(q, de).length ? search(buildOrMatch(q, { ...de, prefixMin: n })) : []);
  }
  return result;
}

async function run() {
  const { data, repeat, json, perQuery, lanes: laneFilter, titleWeights, lang, stemmer, dbDir, reportDb, reuseDb, stopwords, adaptiveTau, prefixMin, ftsPrefix, contextCost } = parseArgs(process.argv.slice(2));
  const corpusPath = join(data, 'corpus.jsonl');
  const dbOpts = { dbDir, prefix: basename(resolve(data)), reuse: reuseDb };
  const queries = new Map(readJsonl(join(data, 'queries.jsonl')).map((q) => [String(q._id), q.text]));
  const qrels = readQrels(join(data, 'qrels', 'test.tsv'));
  const qids = [...qrels.keys()].filter((q) => queries.has(q));

  let lanes;
  let tokOpts; // stopword options for the per-query term count
  let dbBytes = null;
  let docCount;
  if (lang === 'de') {
    const stem = await import(pathToFileURL(resolve(stemmer)).href);
    if (!(stem.STOPWORDS instanceof Set) || typeof stem.queryTermVariants !== 'function') {
      throw new Error('beir-bench: --stemmer module must export STOPWORDS (Set) and queryTermVariants()');
    }
    ({ lanes, tokOpts, dbBytes, docs: docCount } = await lanesForDe(corpusPath, stem, dbOpts, stopwords ?? 'stemmer', adaptiveTau ?? [], prefixMin ?? [], ftsPrefix));
  } else {
    const { db, docs } = await loadCorpus(corpusPath, 'porter unicode61', { ...dbOpts, name: `${dbOpts.prefix}-porter-unicode61` });
    docCount = docs;
    lanes = lanesFor(db, docs);
  }

  // T13 title-weighted lanes on the split-column table docs2; existing lanes
  // keep running on docs unchanged. Only created when the flag is set.
  if (titleWeights) {
    const db2 = await loadCorpusSplit(corpusPath, { ...dbOpts, name: `${dbOpts.prefix}-split` });
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
  const docChars = new Map(laneNames.map((l) => [l, new Map()])); // T32: characters of each returned document

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
        if (rep === 0 && contextCost) docChars.get(lane).set(qid, rows.map((r) => codePoints(r.content, lane)));
      }
      const sorted = [...perQuery].sort((a, b) => a - b);
      worst.get(lane).p50 = Math.max(worst.get(lane).p50, percentile(sorted, 0.5));
      worst.get(lane).p95 = Math.max(worst.get(lane).p95, percentile(sorted, 0.95));
      latency.get(lane).push(...perQuery);
    }
  }

  const out = { dataset: basename(data), docs: docCount, queries: qids.length, lanes: {} };
  if (lang === 'de') {
    out.lang = 'de';
    out.dbBytes = dbBytes;
    if (stopwords === 'lib') out.stopwords = 'lib';
    if (ftsPrefix) out.ftsPrefix = ftsPrefix;
  }
  if (reportDb) {
    out.buildMs = Object.fromEntries(builtIndexes.map((x) => [x.name, +x.ms.toFixed(0)]));
    out.indexBytes = Object.fromEntries(builtIndexes.map((x) => [x.name, dbBytesOf(x.db)]));
    out.reusedIndexes = builtIndexes.filter((x) => x.reused).map((x) => x.name);
  }
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
  if (dbBytes) {
    const mb = (b) => (b / 1048576).toFixed(2);
    console.log(`db size MB: unicode61=${mb(dbBytes.unicode61)} trigram=${mb(dbBytes.trigram)}`);
  }
  if (reportDb) {
    for (const x of builtIndexes) {
      console.log(`index ${x.name}: build ${(x.ms / 1000).toFixed(1)} s${x.reused ? ' (earlier run, reused)' : ''}, size ${(dbBytesOf(x.db) / 1048576).toFixed(2)} MB`);
    }
  }

  // Per-query detail file for beir-compare (T12): one line per judged query.
  if (perQuery) {
    const lines = [];
    for (const qid of qids) {
      const qrel = qrels.get(qid);
      const terms = new Set(tokenize(queries.get(qid), tokOpts)).size;
      const perLane = {};
      for (const lane of laneNames) {
        const ranked = runs.get(lane).get(qid) ?? [];
        perLane[lane] = { ndcg10: ndcgAtK(ranked, qrel, 10), p10: precisionAtK(ranked, qrel, 10) };
      }
      lines.push(JSON.stringify({ qid, terms, lanes: perLane }));
    }
    writeFileSync(perQuery, lines.join('\n') + '\n');
  }
  // T32: context-cost file for scripts/context-cost.mjs: one line per judged query.
  if (contextCost) {
    const lines = [];
    for (const qid of qids) {
      const qrel = qrels.get(qid);
      const perLane = {};
      for (const lane of laneNames) {
        const ranked = runs.get(lane).get(qid) ?? [];
        const i = ranked.findIndex((d) => (qrel[d] ?? 0) > 0);
        perLane[lane] = { first: i < 0 ? null : i + 1, chars: docChars.get(lane).get(qid) ?? [] };
      }
      lines.push(JSON.stringify({ qid, lanes: perLane }));
    }
    writeFileSync(contextCost, lines.join('\n') + '\n');
  }
  if (json) console.log(JSON.stringify(out));
}

await run();
