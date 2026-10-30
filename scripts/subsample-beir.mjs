// Deterministic corpus subsets of a BEIR directory for scale runs (T19).
//
// Query selection: the first --queries query ids in qrels order that have a
// relevant document (score > 0) and a query text. Because the selection
// follows the qrels file, two languages that share one qrels file (MS MARCO
// English and mMARCO German) get the same queries.
//
// Document selection: all relevant documents of the selected queries, filled
// up to --docs with the smallest numeric document ids that are not relevant.
// The rule depends only on ids, never on text or file order, so the English
// and the German subset of the same size contain the same passages. With
// --docs at or above the corpus size the whole corpus is kept.
//
// Usage: node scripts/subsample-beir.mjs --data <beir-dir> --out <dir> --queries <n> --docs <n>
// Prints: docs=<n> queries=<n> qrels=<n> rel_docs=<n> missing_rel=<n>
import { readFileSync, writeFileSync, mkdirSync, createReadStream, openSync, writeSync, closeSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

function parseArgs(argv) {
  const out = { data: null, outDir: null, queries: null, docs: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--data') out.data = argv[++i];
    else if (a === '--out') out.outDir = argv[++i];
    else if (a === '--queries') out.queries = Number(argv[++i]);
    else if (a === '--docs') out.docs = Number(argv[++i]);
    else throw new Error(`subsample-beir: unknown argument: ${a}`);
  }
  if (!out.data || !out.outDir) throw new Error('subsample-beir: --data and --out are required');
  for (const k of ['queries', 'docs']) {
    if (!Number.isInteger(out[k]) || out[k] < 1) throw new Error(`subsample-beir: --${k} must be a positive integer`);
  }
  return out;
}

async function* lines(path) {
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (t) yield t;
  }
}

const numericId = (id) => {
  if (!/^\d+$/.test(id)) throw new Error(`subsample-beir: needs numeric corpus ids, got "${id}"`);
  return Number(id);
};

async function main() {
  const { data, outDir, queries: wantQ, docs: wantDocs } = parseArgs(process.argv.slice(2));

  const queryText = new Map();
  for (const l of readFileSync(join(data, 'queries.jsonl'), 'utf8').split('\n')) {
    const t = l.trim();
    if (t) { const q = JSON.parse(t); queryText.set(String(q._id), q.text); }
  }
  const qrelLines = readFileSync(join(data, 'qrels', 'test.tsv'), 'utf8').split('\n').filter((l) => l.trim());
  const header = qrelLines[0];
  const selected = [];
  const selectedSet = new Set();
  for (const l of qrelLines.slice(1)) {
    if (selected.length >= wantQ) break;
    const [qid, , score] = l.split('\t');
    if (selectedSet.has(qid) || !queryText.has(qid) || !(Number(score) > 0)) continue;
    selected.push(qid);
    selectedSet.add(qid);
  }
  const keptQrels = qrelLines.slice(1).filter((l) => selectedSet.has(l.split('\t')[0]));
  const rel = new Set(keptQrels.filter((l) => Number(l.split('\t')[2]) > 0).map((l) => l.split('\t')[1]));

  // Pass 1: all corpus ids (numeric, unique).
  const nonRelIds = [];
  const seen = new Set();
  let relPresent = 0;
  for await (const l of lines(join(data, 'corpus.jsonl'))) {
    const id = String(JSON.parse(l)._id);
    if (seen.has(id)) throw new Error(`subsample-beir: duplicate corpus id ${id}`);
    seen.add(id);
    if (rel.has(id)) relPresent++;
    else nonRelIds.push(numericId(id));
  }
  const fill = Math.max(0, wantDocs - relPresent);
  let threshold = -1;
  if (fill >= nonRelIds.length) threshold = Infinity;
  else if (fill > 0) {
    nonRelIds.sort((a, b) => a - b);
    threshold = nonRelIds[fill - 1];
  }

  // Pass 2: write the selected documents in corpus order.
  mkdirSync(join(outDir, 'qrels'), { recursive: true });
  const fd = openSync(join(outDir, 'corpus.jsonl'), 'w');
  let docs = 0;
  let buf = [];
  for await (const l of lines(join(data, 'corpus.jsonl'))) {
    const id = String(JSON.parse(l)._id);
    if (rel.has(id) || numericId(id) <= threshold) {
      buf.push(l);
      docs++;
      if (buf.length >= 10000) { writeSync(fd, buf.join('\n') + '\n'); buf = []; }
    }
  }
  if (buf.length) writeSync(fd, buf.join('\n') + '\n');
  closeSync(fd);
  writeFileSync(join(outDir, 'queries.jsonl'),
    selected.map((qid) => JSON.stringify({ _id: qid, text: queryText.get(qid) })).join('\n') + '\n');
  writeFileSync(join(outDir, 'qrels', 'test.tsv'), [header, ...keptQrels].join('\n') + '\n');
  console.log(`docs=${docs} queries=${selected.length} qrels=${keptQrels.length} rel_docs=${rel.size} missing_rel=${rel.size - relPresent}`);
}

await main();
