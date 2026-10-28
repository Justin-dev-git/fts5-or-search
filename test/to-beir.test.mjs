// scripts/to-beir.mjs (T16): GermanDPR and Hugging Face viewer rows into the
// BEIR layout read by scripts/beir-bench.mjs. Expected values by hand from
// the fixtures in test/fixtures/de/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/to-beir.mjs', import.meta.url));
const fx = (p) => fileURLToPath(new URL(`./fixtures/de/${p}`, import.meta.url));

function run(args) {
  try {
    return { code: 0, stdout: execFileSync(process.execPath, ['--no-warnings', script, ...args], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status ?? -1, stdout: e.stdout ?? '', stderr: String(e.stderr ?? '') };
  }
}
const jsonl = (p) => readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

test('germandpr: corpus dedup by passage_id, qrels from positives, notes for conflicts and empty positives', () => {
  const dir = mkdtempSync(join(tmpdir(), 'to-beir-'));
  try {
    const r = run(['--format', 'germandpr', '--in', fx('germandpr-mini.json'), '--out', dir]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout.trim(), 'docs=5 queries=2 qrels=2 passage_id_conflicts=1 questions_without_positive=1');
    assert.deepEqual(jsonl(join(dir, 'corpus.jsonl')).map((d) => d._id), ['p1', 'p2', 'p3', '4', 'p5']);
    assert.equal(jsonl(join(dir, 'corpus.jsonl'))[3].text, 'Jena hat eine Universität.', 'first text wins on conflict');
    assert.deepEqual(jsonl(join(dir, 'queries.jsonl')), [
      { _id: 'q0', text: 'Wer schrieb den Faust?' },
      { _id: 'q1', text: 'Wann starb Schiller?' },
    ]);
    assert.equal(readFileSync(join(dir, 'qrels', 'test.tsv'), 'utf8'), 'query-id\tcorpus-id\tscore\nq0\tp1\t1\nq1\tp2\t1\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('hf-rows: distinct (title, context) become c0, c1 …; every question gets its context as qrel', () => {
  const dir = mkdtempSync(join(tmpdir(), 'to-beir-'));
  try {
    const r = run(['--format', 'hf-rows', '--in', `${fx('hf-rows/page1.json')},${fx('hf-rows/page0.json')}`, '--out', dir]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout.trim(), 'docs=2 queries=3 qrels=3');
    assert.deepEqual(jsonl(join(dir, 'corpus.jsonl')), [
      { _id: 'c0', title: 'Personalausweis', text: 'Den Personalausweis beantragen Sie im Bürgerbüro.' },
      { _id: 'c1', title: 'Müllabfuhr', text: 'Die Müllabfuhr kommt montags.' },
    ]);
    assert.deepEqual(jsonl(join(dir, 'queries.jsonl')).map((q) => q._id), ['x1', 'x2', 'x3']);
    assert.equal(readFileSync(join(dir, 'qrels', 'test.tsv'), 'utf8'), 'query-id\tcorpus-id\tscore\nx1\tc0\t1\nx2\tc0\t1\nx3\tc1\t1\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('hf-rows: refuses truncated cells and incomplete page sets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'to-beir-'));
  try {
    const page = JSON.parse(readFileSync(fx('hf-rows/page0.json'), 'utf8'));
    page.rows[0].truncated_cells = ['context'];
    writeFileSync(join(dir, 'trunc.json'), JSON.stringify(page));
    const t = run(['--format', 'hf-rows', '--in', `${join(dir, 'trunc.json')},${fx('hf-rows/page1.json')}`, '--out', join(dir, 'o1')]);
    assert.notEqual(t.code, 0);
    assert.match(t.stderr, /truncated cells/);
    const m = run(['--format', 'hf-rows', '--in', fx('hf-rows/page0.json'), '--out', join(dir, 'o2')]);
    assert.notEqual(m.code, 0);
    assert.match(m.stderr, /num_rows_total says 3/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
