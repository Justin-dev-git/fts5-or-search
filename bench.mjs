#!/usr/bin/env node
// Benchmark harness: measures retrieval lanes on YOUR FTS5 corpus.
//
// Lanes (all through the same tokenizer you use in production):
//   fts-and    strict AND of quoted terms            — the usual baseline
//   fts-or     OR of terms, BM25 order               — pure recall
//   fts-hybrid hybridSearch(): OR pool + AND floor + coverage re-rank
//
// Timing is worst-of-N per case and lane (--repeat, default 3) and, for the
// hybrid lane, includes the full operation: both SQL queries + re-rank.
// A single run flatters cold caches; report worst-of-N.
//
// Cases are answerability-checked: a case whose must_contain regexes match
// nothing in the corpus is EXCLUDED (no silent denominator drift).
//
// Cases file: JSON array of
//   { id, query, must_contain: [regexSource…], table?, contentColumn? }
// Corpus: any SQLite file with one or more FTS5 tables; --tables picks them
//   (default: auto-detect all fts5 virtual tables, content column "content").
//
// Usage:
//   node bench.mjs --db /path/to/corpus.db --cases cases.json [--k 10]
//                  [--tables messages_fts,docs_fts] [--repeat 3]
import { DatabaseSync } from 'node:sqlite';
import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import { buildOrMatch, sanitizeMatch, hybridSearch } from './lib/or-search.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const dbPath = arg('db', null);
const casesPath = arg('cases', 'cases.json');
const K = Number(arg('k', 10));
const REPEATS = Math.max(1, Number(arg('repeat', 3)) || 3);

if (!dbPath) {
  console.error('usage: node bench.mjs --db <corpus.db> --cases <cases.json> [--k 10] [--tables a,b] [--repeat 3]');
  process.exit(2);
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const cases = JSON.parse(readFileSync(casesPath, 'utf8'));

// auto-detect FTS5 tables from sqlite_master
const detected = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND sql LIKE '%fts5%'")
  .all().map((r) => r.name)
  .filter((n) => !/_(content|docsize|config|idx|data|shadow)$/.test(n));
const tables = (arg('tables', null)?.split(',')) ?? detected;
if (!tables.length) { console.error('no fts5 tables found; pass --tables'); process.exit(2); }

// B7: table/column names come from cases.json / --tables and are interpolated
// into SQL. Only allow tables that were actually detected as FTS5 tables, and
// validate column identifiers — anything else aborts with a clear message.
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
function checkTable(t) {
  if (!detected.includes(t)) {
    console.error(`bench: table not among detected FTS5 tables: ${JSON.stringify(t)} (detected: ${detected.join(', ') || 'none'})`);
    process.exit(2);
  }
  return t;
}
function checkColumn(col) {
  if (!IDENT.test(col)) {
    console.error(`bench: invalid content column name: ${JSON.stringify(col)}`);
    process.exit(2);
  }
  return col;
}

function search(table, match, limit) {
  checkTable(table);
  return db.prepare(
    `SELECT rowid AS _rid, * FROM ${table} WHERE ${table} MATCH ? ORDER BY rank LIMIT ?`
  ).all(match, limit);
}

function answerable(c) {
  const table = checkTable(c.table ?? tables[0]);
  const col = checkColumn(c.contentColumn ?? 'content');
  const probe = `%${(c.must_contain[0] ?? '').replace(/[\\^$*+?.()|[\]{}]/g, '')}%`;
  const rows = db.prepare(`SELECT ${col} AS content FROM ${table} WHERE lower(${col}) LIKE ? LIMIT 500`).all(probe.toLowerCase());
  const re = (c.must_contain ?? []).map((p) => new RegExp(p, 'i'));
  return rows.some((r) => re.every((rx) => rx.test(r.content ?? '')));
}

// run(c) must return the final ranked row list; it is timed as a whole.
function scoreLane(run) {
  let hit = 0, rr = 0, cnt = 0, lat = 0;
  for (const c of cases) {
    if (!answerable(c)) continue;
    cnt++;
    const col = checkColumn(c.contentColumn ?? 'content');
    const res = (c.must_contain ?? []).map((p) => new RegExp(p, 'i'));
    let worst = 0, finalRows = [];
    for (let i = 0; i < REPEATS; i++) {
      const t = performance.now();
      const final = run(c);
      const ms = performance.now() - t;
      if (ms > worst) { worst = ms; finalRows = final; }
    }
    lat += worst;
    const idx = finalRows.findIndex((r) => res.every((rx) => rx.test(r[col] ?? '')));
    if (idx >= 0) { hit++; rr += 1 / (idx + 1); }
  }
  return {
    hit_at_k: cnt ? +(hit / cnt).toFixed(3) : null,
    mrr: cnt ? +(rr / cnt).toFixed(3) : null,
    cases: cnt,
    avg_worst_latency_ms: cnt ? +(lat / cnt).toFixed(2) : null,
  };
}

const lanes = {
  'fts-and': (c) => search(checkTable(c.table ?? tables[0]), sanitizeMatch(c.query), K),
  'fts-or': (c) => search(checkTable(c.table ?? tables[0]), buildOrMatch(c.query), K),
  'fts-hybrid': (c) => {
    const table = checkTable(c.table ?? tables[0]);
    const col = c.contentColumn ?? 'content';
    const bounded = (match, limit) => search(table, match, limit);
    return hybridSearch(bounded, c.query, (r) => r[col], { k: K });
  },
};

console.log(`db=${dbPath} k=${K} repeat=${REPEATS} (worst-of-N, incl. rerank+AND floor) tables=${tables.join(',')}`);
console.log('\nlane            hit@k    MRR    cases  worst-latency');
for (const [name, run] of Object.entries(lanes)) {
  const r = scoreLane(run);
  console.log(
    name.padEnd(14),
    String(r.hit_at_k).padStart(6),
    String(r.mrr).padStart(6),
    String(r.cases).padStart(6),
    String(r.avg_worst_latency_ms + 'ms').padStart(13)
  );
}
db.close();
