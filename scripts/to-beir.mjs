// Convert German QA/retrieval sources into the BEIR layout that
// scripts/beir-bench.mjs reads: corpus.jsonl {_id,title,text},
// queries.jsonl {_id,text}, qrels/test.tsv (header + query-id, corpus-id,
// score). No dependencies; the source files are read, never modified.
//
// Formats:
//   --format germandpr  --in GermanDPR_test.json
//       deepset GermanDPR (CC BY 4.0): a JSON list of
//       { question, answers, positive_ctxs, negative_ctxs, hard_negative_ctxs },
//       each ctx { title, text, passage_id }. Corpus = all contexts of the
//       split, deduplicated by passage_id; qrels = the positive contexts.
//   --format hf-rows    --in page0.json,page1.json,...
//       Responses of the Hugging Face dataset viewer API
//       (https://datasets-server.huggingface.co/rows?...) for a SQuAD-style
//       dataset with fields { id, title, context, question }. Every page must
//       report truncated_cells = [] and the pages together must cover
//       num_rows_total rows. Corpus = distinct (title, context) pairs in order
//       of first appearance, ids c0, c1, ...; qrels = each question's context.
//   --format msmarco-tsv --in collection.tsv,queries.tsv,qrels.tsv
//       MS MARCO / mMARCO passage files (T19): collection `pid<TAB>text`,
//       queries `qid<TAB>text`, qrels in TREC form `qid 0 pid rel`. Streamed,
//       so an 8.8M-passage collection never sits in memory. Titles are empty.
//
// Usage: node scripts/to-beir.mjs --format <germandpr|hf-rows|msmarco-tsv> --in <file[,file…]> --out <dir>
// Prints one summary line: docs=<n> queries=<n> qrels=<n> [notes]
import { readFileSync, writeFileSync, mkdirSync, createReadStream, openSync, writeSync, closeSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

function parseArgs(argv) {
  const out = { format: null, inputs: [], outDir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--format') out.format = argv[++i];
    else if (a === '--in') out.inputs = argv[++i].split(',').filter(Boolean);
    else if (a === '--out') out.outDir = argv[++i];
    else throw new Error(`to-beir: unknown argument: ${a}`);
  }
  if (!['germandpr', 'hf-rows', 'msmarco-tsv'].includes(out.format)) {
    throw new Error('to-beir: --format must be germandpr, hf-rows or msmarco-tsv');
  }
  if (out.format === 'msmarco-tsv' && out.inputs.length !== 3) {
    throw new Error('to-beir: msmarco-tsv needs --in collection.tsv,queries.tsv,qrels.tsv');
  }
  if (!out.inputs.length) throw new Error('to-beir: --in <file[,file…]> is required');
  if (!out.outDir) throw new Error('to-beir: --out <dir> is required');
  return out;
}

function fromGermanDpr(records) {
  if (!Array.isArray(records)) throw new Error('to-beir: GermanDPR file must be a JSON list');
  const corpus = new Map(); // passage_id -> {title, text}
  const queries = [];
  const qrels = [];
  let conflicts = 0;
  let noPositive = 0;
  records.forEach((r, i) => {
    const ctxs = [...(r.positive_ctxs ?? []), ...(r.hard_negative_ctxs ?? []), ...(r.negative_ctxs ?? [])];
    for (const c of ctxs) {
      const id = String(c.passage_id);
      const doc = { title: String(c.title ?? ''), text: String(c.text ?? '') };
      const seen = corpus.get(id);
      if (!seen) corpus.set(id, doc);
      else if (seen.title !== doc.title || seen.text !== doc.text) conflicts++;
    }
    const pos = r.positive_ctxs ?? [];
    if (!pos.length) { noPositive++; return; }
    const qid = `q${i}`;
    queries.push({ _id: qid, text: String(r.question) });
    for (const c of pos) qrels.push([qid, String(c.passage_id), 1]);
  });
  const notes = [];
  if (conflicts) notes.push(`passage_id_conflicts=${conflicts}`);
  if (noPositive) notes.push(`questions_without_positive=${noPositive}`);
  return { corpus, queries, qrels, notes };
}

function fromHfRows(pages) {
  const rows = [];
  let total = null;
  for (const p of pages) {
    if (!Array.isArray(p.rows)) throw new Error('to-beir: hf-rows page without a rows array');
    if (total == null) total = p.num_rows_total;
    else if (p.num_rows_total !== total) throw new Error('to-beir: hf-rows pages disagree on num_rows_total');
    for (const r of p.rows) {
      if (r.truncated_cells && r.truncated_cells.length) {
        throw new Error(`to-beir: row ${r.row_idx} has truncated cells: ${r.truncated_cells.join(',')}`);
      }
      rows.push(r);
    }
  }
  const idx = new Set(rows.map((r) => r.row_idx));
  if (idx.size !== rows.length) throw new Error('to-beir: duplicate row_idx across pages');
  if (total != null && rows.length !== total) {
    throw new Error(`to-beir: got ${rows.length} rows, num_rows_total says ${total}`);
  }
  rows.sort((a, b) => a.row_idx - b.row_idx);
  const corpus = new Map(); // c<n> -> {title, text}
  const byKey = new Map(); // title\0context -> c<n>
  const queries = [];
  const qrels = [];
  const qids = new Set();
  for (const { row_idx: n, row } of rows) {
    const title = String(row.title ?? '');
    const text = String(row.context ?? '');
    const key = `${title}\u0000${text}`;
    if (!byKey.has(key)) {
      const id = `c${byKey.size}`;
      byKey.set(key, id);
      corpus.set(id, { title, text });
    }
    const qid = row.id != null ? String(row.id) : `r${n}`;
    if (qids.has(qid)) throw new Error(`to-beir: duplicate question id ${qid}`);
    qids.add(qid);
    queries.push({ _id: qid, text: String(row.question) });
    qrels.push([qid, byKey.get(key), 1]);
  }
  return { corpus, queries, qrels, notes: [] };
}

async function* tsvLines(path) {
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) yield line;
}

// id<TAB>text; the text may itself contain tabs, so only the first one splits.
function splitIdText(line, what) {
  const i = line.indexOf('\t');
  if (i <= 0) throw new Error(`to-beir: ${what} line without id<TAB>text: ${line.slice(0, 80)}`);
  return [line.slice(0, i), line.slice(i + 1)];
}

async function fromMsmarcoTsv([collection, queriesFile, qrelsFile], outDir) {
  mkdirSync(join(outDir, 'qrels'), { recursive: true });
  const fd = openSync(join(outDir, 'corpus.jsonl'), 'w');
  let docs = 0;
  let buf = [];
  for await (const line of tsvLines(collection)) {
    const [_id, text] = splitIdText(line, 'collection');
    buf.push(JSON.stringify({ _id, title: '', text }));
    docs++;
    if (buf.length >= 10000) { writeSync(fd, buf.join('\n') + '\n'); buf = []; }
  }
  if (buf.length) writeSync(fd, buf.join('\n') + '\n');
  closeSync(fd);
  const queries = [];
  for await (const line of tsvLines(queriesFile)) {
    const [_id, text] = splitIdText(line, 'queries');
    queries.push(JSON.stringify({ _id, text }));
  }
  writeFileSync(join(outDir, 'queries.jsonl'), queries.join('\n') + '\n');
  const qrels = ['query-id\tcorpus-id\tscore'];
  for await (const line of tsvLines(qrelsFile)) {
    const f = line.trim().split(/\s+/);
    if (f.length !== 4) throw new Error(`to-beir: qrels line is not "qid 0 pid rel": ${line.slice(0, 80)}`);
    qrels.push(`${f[0]}\t${f[2]}\t${f[3]}`);
  }
  writeFileSync(join(outDir, 'qrels', 'test.tsv'), qrels.join('\n') + '\n');
  console.log(`docs=${docs} queries=${queries.length} qrels=${qrels.length - 1}`);
}

async function main() {
  const { format, inputs, outDir } = parseArgs(process.argv.slice(2));
  if (format === 'msmarco-tsv') return fromMsmarcoTsv(inputs, outDir);
  const parsed = inputs.map((f) => JSON.parse(readFileSync(f, 'utf8')));
  const { corpus, queries, qrels, notes } = format === 'germandpr'
    ? fromGermanDpr(parsed.length === 1 ? parsed[0] : parsed.flat())
    : fromHfRows(parsed);
  mkdirSync(join(outDir, 'qrels'), { recursive: true });
  writeFileSync(join(outDir, 'corpus.jsonl'),
    [...corpus].map(([_id, d]) => JSON.stringify({ _id, title: d.title, text: d.text })).join('\n') + '\n');
  writeFileSync(join(outDir, 'queries.jsonl'), queries.map((q) => JSON.stringify(q)).join('\n') + '\n');
  writeFileSync(join(outDir, 'qrels', 'test.tsv'),
    ['query-id\tcorpus-id\tscore', ...qrels.map((r) => r.join('\t'))].join('\n') + '\n');
  console.log(`docs=${corpus.size} queries=${queries.length} qrels=${qrels.length}${notes.length ? ' ' + notes.join(' ') : ''}`);
}

await main();
