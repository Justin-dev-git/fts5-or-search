// Per-query win/tie/loss comparison of two lanes from a beir-bench
// --per-query JSONL file (T12). Each line: { qid, terms, lanes: {
// <lane>: { ndcg10, p10 } } }.
//
// Usage: node scripts/beir-compare.mjs <per-query.jsonl> --a <lane> --b <lane> [--json]
//
// First output line (exact format): `<a> vs <b>: W=<n> T=<n> L=<n>`
// where W means lane a has the higher nDCG@10, T means |Δ| < 1e-9, L means
// b is higher. Then one line per term-count group (1-3, 4-6, 7+) with the
// group size and W/T/L plus mean nDCG@10 and P@10 of both lanes in that
// group.
import { readFileSync } from 'node:fs';

const TIE_EPS = 1e-9;
const GROUPS = [
  ['terms 1-3', (t) => t >= 1 && t <= 3],
  ['terms 4-6', (t) => t >= 4 && t <= 6],
  ['terms 7+', (t) => t >= 7],
];

function parseArgs(argv) {
  const out = { file: null, a: null, b: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--a') out.a = argv[++i];
    else if (a === '--b') out.b = argv[++i];
    else if (a === '--json') out.json = true;
    else if (!out.file) out.file = a;
    else throw new Error(`beir-compare: unknown argument: ${a}`);
  }
  if (!out.file || !out.a || !out.b) {
    throw new Error('beir-compare: usage: <per-query.jsonl> --a <lane> --b <lane> [--json]');
  }
  return out;
}

function wtl(rows, a, b) {
  let w = 0, t = 0, l = 0;
  for (const r of rows) {
    const da = r.lanes[a].ndcg10 - r.lanes[b].ndcg10;
    if (Math.abs(da) < TIE_EPS) t++;
    else if (da > 0) w++;
    else l++;
  }
  return { W: w, T: t, L: l };
}

function mean(rows, lane, field) {
  if (!rows.length) return 0;
  return rows.reduce((s, r) => s + r.lanes[lane][field], 0) / rows.length;
}

function run() {
  const { file, a, b, json } = parseArgs(process.argv.slice(2));
  const rows = readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
  for (const r of rows) {
    if (!r.lanes?.[a] || !r.lanes?.[b]) {
      throw new Error(`beir-compare: row ${r.qid} lacks lane "${!r.lanes?.[a] ? a : b}"`);
    }
  }

  const overall = wtl(rows, a, b);
  const groups = GROUPS.map(([label, pred]) => {
    const sub = rows.filter((r) => pred(r.terms));
    return {
      label,
      n: sub.length,
      ...wtl(sub, a, b),
      a_ndcg10: mean(sub, a, 'ndcg10'),
      a_p10: mean(sub, a, 'p10'),
      b_ndcg10: mean(sub, b, 'ndcg10'),
      b_p10: mean(sub, b, 'p10'),
    };
  });

  console.log(`${a} vs ${b}: W=${overall.W} T=${overall.T} L=${overall.L}`);
  for (const g of groups) {
    console.log(
      `${g.label}  n=${g.n}  W=${g.W} T=${g.T} L=${g.L}  ` +
      `${a}: ndcg@10=${g.a_ndcg10.toFixed(4)} p@10=${g.a_p10.toFixed(4)}  ` +
      `${b}: ndcg@10=${g.b_ndcg10.toFixed(4)} p@10=${g.b_p10.toFixed(4)}`,
    );
  }
  if (json) {
    console.log(JSON.stringify({ file, a, b, overall, groups }));
  }
}

run();
