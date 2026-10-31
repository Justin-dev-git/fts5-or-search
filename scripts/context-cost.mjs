#!/usr/bin/env node
// T32: context cost of the retrieval side, from the file written by
// `beir-bench.mjs --context-cost <file>` (one line per judged query:
// { qid, lanes: { <lane>: { first, chars } } }).
//
//   node scripts/context-cost.mjs <file> [--k 6,10] [--pairs and:or,or:or-prefix-4] [--json]
//
// Without assumptions (rank distribution): share of questions whose first
// relevant document is at rank 1, in the top k, in the returned list (at most
// 100), not in it, and how often a lane returned nothing at all; median rank and
// characters of the documents on ranks 1..r (r = rank of the first relevant one).
//
// Agent model (assumptions, stated so they can be checked): every search call
// returns k results; the agent reads them in rank order and calls again for the
// next k until the first relevant document appears (paging, no reformulation);
// a snippet is the whole document. Then calls = ceil(r / k), snippets read =
// min(calls * k, results returned) and characters read = their total length.
// Questions without a relevant document in the returned list are counted
// separately (not found), never averaged in.
//
// Pairs a:b compare lane b with lane a on the same questions: Δ = mean of the
// per-question differences (b − a); 95 % interval from a paired bootstrap
// (4 000 resamples, mulberry32, seed 32 reset for every pair and metric).
// Hit shares use all questions; calls and characters only the questions both
// lanes found within their returned list.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Agent model for one question: null if the lane did not return a relevant document. */
export function agentCost(first, chars, k) {
  if (first === null || first === undefined) return null;
  if (!Number.isInteger(k) || k < 1) throw new RangeError('agentCost: k must be a positive integer');
  const calls = Math.ceil(first / k);
  const snippets = Math.min(calls * k, chars.length);
  let read = 0;
  for (let i = 0; i < snippets; i++) read += chars[i];
  return { calls, snippets, chars: read };
}

/** Characters of the documents on ranks 1..first (null if not found). */
export function charsToFirst(first, chars) {
  if (first === null || first === undefined) return null;
  let s = 0;
  for (let i = 0; i < first; i++) s += chars[i];
  return s;
}

export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Per-lane summary over all questions of the file. */
export function summarize(rows, lane, ks = [6, 10]) {
  const L = rows.map((r) => r.lanes[lane]);
  if (L.some((x) => !x)) throw new Error(`context-cost: lane ${lane} missing for some question`);
  const found = L.filter((x) => x.first !== null);
  const out = {
    questions: L.length,
    empty: L.filter((x) => x.chars.length === 0).length,
    at1: L.filter((x) => x.first === 1).length / L.length,
    found: found.length / L.length,
    notFound: L.length - found.length,
    medianRank: median(found.map((x) => x.first)),
    charsToFirst: { median: median(found.map((x) => charsToFirst(x.first, x.chars))), mean: mean(found.map((x) => charsToFirst(x.first, x.chars))) },
    k: {},
  };
  for (const k of ks) {
    const c = found.map((x) => agentCost(x.first, x.chars, k));
    out.k[k] = {
      inTopK: L.filter((x) => x.first !== null && x.first <= k).length / L.length,
      calls: mean(c.map((x) => x.calls)),
      snippets: mean(c.map((x) => x.snippets)),
      chars: mean(c.map((x) => x.chars)),
    };
  }
  return out;
}

function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mean of per-question differences with a paired bootstrap 95 % interval. */
export function pairedDelta(d, { resamples = 4000, seed = 32 } = {}) {
  if (!d.length) return { n: 0, delta: null, lo: null, hi: null };
  const rnd = mulberry32(seed);
  const bs = [];
  for (let r = 0; r < resamples; r++) {
    let s = 0;
    for (let i = 0; i < d.length; i++) s += d[Math.floor(rnd() * d.length)];
    bs.push(s / d.length);
  }
  bs.sort((x, y) => x - y);
  return { n: d.length, delta: mean(d), lo: bs[Math.floor(0.025 * resamples)], hi: bs[Math.ceil(0.975 * resamples) - 1] };
}

/** Lane b against lane a on the same questions. */
export function compare(rows, a, b, ks = [6, 10], opts = {}) {
  const A = rows.map((r) => r.lanes[a]);
  const B = rows.map((r) => r.lanes[b]);
  const both = rows.map((_, i) => i).filter((i) => A[i].first !== null && B[i].first !== null);
  const hit = (x, k) => (x.first !== null && x.first <= k ? 1 : 0);
  const out = {
    a, b,
    onlyA: A.filter((x, i) => x.first !== null && B[i].first === null).length,
    onlyB: B.filter((x, i) => x.first !== null && A[i].first === null).length,
    both: both.length,
    charsToFirst: pairedDelta(both.map((i) => charsToFirst(B[i].first, B[i].chars) - charsToFirst(A[i].first, A[i].chars)), opts),
    k: {},
  };
  for (const k of ks) {
    out.k[k] = {
      inTopK: pairedDelta(rows.map((_, i) => hit(B[i], k) - hit(A[i], k)), opts),
      calls: pairedDelta(both.map((i) => agentCost(B[i].first, B[i].chars, k).calls - agentCost(A[i].first, A[i].chars, k).calls), opts),
      chars: pairedDelta(both.map((i) => agentCost(B[i].first, B[i].chars, k).chars - agentCost(A[i].first, A[i].chars, k).chars), opts),
    };
  }
  return out;
}

// Formatting: shares in percent with one decimal, characters as integers with a space every three digits.
const pct = (x) => `${(100 * x).toFixed(1)} %`;
const int = (x) => (x === null ? '–' : String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
const sgn = (x, f) => (x === null ? '–' : (x < 0 ? '−' : '+') + f(Math.abs(x)));
const dPct = (x) => sgn(x, (v) => (100 * v).toFixed(1));
const dInt = (x) => sgn(x, (v) => int(v));
const d2 = (x) => sgn(x, (v) => v.toFixed(2));
const ci = (r, f) => `${f(r.delta)} [${f(r.lo)}, ${f(r.hi)}]`;

function main(argv) {
  const file = argv[0];
  if (!file) throw new Error('usage: node scripts/context-cost.mjs <file> [--k 6,10] [--pairs a:b,...] [--json]');
  let ks = [6, 10];
  let pairs = [];
  let json = false;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--k') ks = argv[++i].split(',').map(Number);
    else if (argv[i] === '--pairs') pairs = argv[++i].split(',').map((p) => p.split(':'));
    else if (argv[i] === '--json') json = true;
    else throw new Error(`context-cost: unknown argument: ${argv[i]}`);
  }
  if (!ks.every((k) => Number.isInteger(k) && k >= 1)) throw new Error('context-cost: --k needs positive integers');
  const rows = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  const lanes = Object.keys(rows[0].lanes);
  for (const [a, b] of pairs) if (!lanes.includes(a) || !lanes.includes(b)) throw new Error(`context-cost: unknown lane in pair ${a}:${b}`);
  const res = { questions: rows.length, lanes: {}, pairs: [] };
  console.log(`questions=${rows.length} (first relevant document within the returned list of at most 100)`);
  const head = ['lane', 'empty', 'rank 1', ...ks.map((k) => `top ${k}`), 'top 100', 'not found', 'median rank', 'chars to first (median / mean)',
    ...ks.map((k) => `k=${k}: calls / snippets / chars`)];
  console.log(head.join(' | '));
  for (const lane of lanes) {
    const s = summarize(rows, lane, ks);
    res.lanes[lane] = s;
    console.log([lane, `${s.empty} (${pct(s.empty / s.questions)})`, pct(s.at1), ...ks.map((k) => pct(s.k[k].inTopK)), pct(s.found), `${s.notFound} (${pct(1 - s.found)})`, s.medianRank ?? '–',
      `${int(s.charsToFirst.median)} / ${int(s.charsToFirst.mean)}`,
      ...ks.map((k) => `${s.k[k].calls?.toFixed(2) ?? '–'} / ${s.k[k].snippets?.toFixed(2) ?? '–'} / ${int(s.k[k].chars)}`)].join(' | '));
  }
  for (const [a, b] of pairs) {
    const c = compare(rows, a, b, ks);
    res.pairs.push(c);
    console.log(`\n${b} vs ${a}: found only by ${a} ${c.onlyA}, only by ${b} ${c.onlyB}, by both ${c.both}`);
    for (const k of ks) console.log(`  k=${k}: Δ in top ${k} ${ci(c.k[k].inTopK, dPct)} points; both found: Δ calls ${ci(c.k[k].calls, d2)}, Δ chars read ${ci(c.k[k].chars, dInt)}`);
    console.log(`  both found: Δ chars to first ${ci(c.charsToFirst, dInt)}`);
  }
  if (json) console.log(JSON.stringify(res));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
