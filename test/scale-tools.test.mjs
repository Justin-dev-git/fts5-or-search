// T19 tools: to-beir --format msmarco-tsv and scripts/subsample-beir.mjs on
// test/fixtures/msmarco-mini (10 passages, English and German with the same
// passage ids, 3 queries, TREC qrels incl. one for an unknown query 999).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const toBeir = fileURLToPath(new URL('../scripts/to-beir.mjs', import.meta.url));
const subsample = fileURLToPath(new URL('../scripts/subsample-beir.mjs', import.meta.url));
const fx = (f) => fileURLToPath(new URL(`./fixtures/msmarco-mini/${f}`, import.meta.url));

function run(script, args) {
  try {
    return { code: 0, stdout: execFileSync(process.execPath, ['--no-warnings', script, ...args], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status ?? -1, stdout: e.stdout ?? '', stderr: String(e.stderr ?? '') };
  }
}
const jsonl = (p) => readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const ids = (dir) => jsonl(join(dir, 'corpus.jsonl')).map((d) => d._id);

function convert(dir, collection, queries) {
  return run(toBeir, ['--format', 'msmarco-tsv', '--in', `${fx(collection)},${fx(queries)},${fx('qrels.tsv')}`, '--out', dir]);
}

test('to-beir msmarco-tsv: streams collection, keeps tabs inside the text, TREC qrels to BEIR', () => {
  const dir = mkdtempSync(join(tmpdir(), 'scale-'));
  try {
    const r = convert(dir, 'collection.tsv', 'queries.tsv');
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout.trim(), 'docs=10 queries=3 qrels=5');
    const corpus = jsonl(join(dir, 'corpus.jsonl'));
    assert.deepEqual(corpus[0], { _id: '0', title: '', text: 'Solar panels convert sunlight into electricity.' });
    assert.equal(corpus[6].text, 'The Rhine flows through Germany\tand the Netherlands.');
    assert.equal(readFileSync(join(dir, 'qrels', 'test.tsv'), 'utf8'),
      'query-id\tcorpus-id\tscore\n300\t7\t1\n200\t3\t1\n200\t9\t1\n400\t1\t1\n999\t2\t1\n');
    assert.deepEqual(jsonl(join(dir, 'queries.jsonl'))[1], { _id: '300', text: 'which power plants use water' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('subsample: queries in qrels order, all relevant docs, fill with smallest other ids; same ids for EN and DE', () => {
  const root = mkdtempSync(join(tmpdir(), 'scale-'));
  try {
    for (const [lang, c, q] of [['en', 'collection.tsv', 'queries.tsv'], ['de', 'collection-de.tsv', 'queries-de.tsv']]) {
      assert.equal(convert(join(root, lang), c, q).code, 0);
      const r = run(subsample, ['--data', join(root, lang), '--out', join(root, `${lang}-5`), '--queries', '2', '--docs', '5']);
      assert.equal(r.code, 0, r.stderr);
      assert.equal(r.stdout.trim(), 'docs=5 queries=2 qrels=3 rel_docs=3 missing_rel=0');
    }
    assert.deepEqual(ids(join(root, 'en-5')), ['0', '1', '3', '7', '9']);
    assert.deepEqual(ids(join(root, 'de-5')), ids(join(root, 'en-5')));
    assert.deepEqual(jsonl(join(root, 'en-5', 'queries.jsonl')).map((q) => q._id), ['300', '200']);
    assert.equal(jsonl(join(root, 'de-5', 'queries.jsonl'))[0].text, 'welche Kraftwerke nutzen Wasser');
    assert.equal(readFileSync(join(root, 'en-5', 'qrels', 'test.tsv'), 'utf8'),
      'query-id\tcorpus-id\tscore\n300\t7\t1\n200\t3\t1\n200\t9\t1\n');
    const all = run(subsample, ['--data', join(root, 'en'), '--out', join(root, 'en-all'), '--queries', '3', '--docs', '100']);
    assert.equal(all.stdout.trim(), 'docs=10 queries=3 qrels=4 rel_docs=4 missing_rel=0');
    const only = run(subsample, ['--data', join(root, 'en'), '--out', join(root, 'en-rel'), '--queries', '1', '--docs', '1']);
    assert.equal(only.stdout.trim(), 'docs=1 queries=1 qrels=1 rel_docs=1 missing_rel=0');
    assert.deepEqual(ids(join(root, 'en-rel')), ['7']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('subsample: refuses non-numeric corpus ids', () => {
  const root = mkdtempSync(join(tmpdir(), 'scale-'));
  try {
    mkdirSync(join(root, 'qrels'), { recursive: true });
    writeFileSync(join(root, 'corpus.jsonl'), '{"_id":"a1","title":"","text":"x"}\n');
    writeFileSync(join(root, 'queries.jsonl'), '{"_id":"q","text":"x"}\n');
    writeFileSync(join(root, 'qrels', 'test.tsv'), 'query-id\tcorpus-id\tscore\nq\tb2\t1\n');
    const r = run(subsample, ['--data', root, '--out', join(root, 'o'), '--queries', '1', '--docs', '1']);
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /numeric corpus ids/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
