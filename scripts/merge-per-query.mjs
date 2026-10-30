// Merge per-query files of separate bench runs (one lane each, T19) into one
// file for scripts/beir-compare.mjs. Lines are joined by qid; `terms` must
// agree. Only qids present in every input are written, in the order of the
// first input.
// Usage: node scripts/merge-per-query.mjs <out.jsonl> <in1.jsonl> <in2.jsonl> [...]
import { readFileSync, writeFileSync } from 'node:fs';

const [out, ...inputs] = process.argv.slice(2);
if (!out || inputs.length < 2) throw new Error('merge-per-query: <out.jsonl> <in1.jsonl> <in2.jsonl> [...]');
const read = (f) => readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const maps = inputs.map((f) => new Map(read(f).map((r) => [r.qid, r])));
const lines = [];
for (const [qid, first] of maps[0]) {
  if (!maps.every((m) => m.has(qid))) continue;
  const lanes = {};
  for (const m of maps) {
    const r = m.get(qid);
    if (r.terms !== first.terms) throw new Error(`merge-per-query: terms differ for ${qid}`);
    for (const [lane, v] of Object.entries(r.lanes)) {
      if (lane in lanes) throw new Error(`merge-per-query: lane ${lane} occurs twice`);
      lanes[lane] = v;
    }
  }
  lines.push(JSON.stringify({ qid, terms: first.terms, lanes }));
}
writeFileSync(out, lines.join('\n') + '\n');
console.log(`merged ${lines.length} queries from ${inputs.length} files`);
