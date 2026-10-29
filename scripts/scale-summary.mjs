// Markdown tables from the result files of scripts/scale-run.sh (T19).
// Reads <results>/<lang>-<size>.<lane>.txt (last line = bench JSON),
// <lang>-<size>.<lane>.txt.timeout marks a lane stopped by the time limit.
// Usage: node scripts/scale-summary.mjs <results-dir>
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) throw new Error('scale-summary: <results-dir>');
const rows = [];
for (const f of readdirSync(dir)) {
  const m = f.match(/^(en|de)-([^.]+)\.(.+)\.txt(\.timeout)?$/);
  if (!m) continue;
  const [, lang, size, lane, timeout] = m;
  if (timeout) { rows.push({ lang, size, lane, timeout: true }); continue; }
  const last = readFileSync(join(dir, f), 'utf8').trim().split('\n').at(-1);
  const j = JSON.parse(last);
  const L = j.lanes[lane];
  rows.push({ lang, size, lane, docs: j.docs, queries: j.queries, ...L, buildMs: j.buildMs, indexBytes: j.indexBytes, reused: j.reusedIndexes });
}
const sizeKey = (s) => (s === 'all' ? Infinity : Number(s));
const laneOrder = ['and', 'or', 'or-stem', 'or-trigram', 'hybrid', 'hybrid-fts', 'hybrid-k10', 'hybrid-nofloor-k10',
  'hybrid-fts-k10', 'hybrid-substr-k10', 'hybrid-expanded', 'hybrid-trigram', 'blend-0.1', 'blendidf-0.1'];
rows.sort((a, b) => a.lang.localeCompare(b.lang) || sizeKey(a.size) - sizeKey(b.size)
  || laneOrder.indexOf(a.lane) - laneOrder.indexOf(b.lane));
const f4 = (x) => (x == null ? '–' : x.toFixed(4));
for (const lang of ['en', 'de']) {
  const rs = rows.filter((r) => r.lang === lang);
  if (!rs.length) continue;
  console.log(`\n### ${lang === 'en' ? 'English' : 'German'}\n`);
  console.log('| size | docs | queries | lane | nDCG@10 | MRR@10 | Recall@100 | P@10 | p50 ms | p95 ms |');
  console.log('|---|---:|---:|---|---:|---:|---:|---:|---:|---:|');
  for (const r of rs) {
    if (r.timeout) { console.log(`| ${r.size} | | | ${r.lane} | timeout | | | | | |`); continue; }
    console.log(`| ${r.size} | ${r.docs} | ${r.queries} | ${r.lane} | ${f4(r.ndcg10)} | ${f4(r.mrr10)} | ${f4(r.recall100)} | ${f4(r.p10)} | ${r.p50ms.toFixed(2)} | ${r.p95ms.toFixed(2)} |`);
  }
  console.log('\n| size | index | build s | size MB |');
  console.log('|---|---|---:|---:|');
  const seen = new Set();
  for (const r of rs) {
    if (r.timeout || !r.indexBytes) continue;
    for (const [name, bytes] of Object.entries(r.indexBytes)) {
      if (seen.has(name)) continue;
      seen.add(name);
      console.log(`| ${r.size} | ${name.replace(/^[a-z]{2}-[^-]+-/, '')} | ${(r.buildMs[name] / 1000).toFixed(1)} | ${(bytes / 1048576).toFixed(2)} |`);
    }
  }
}
