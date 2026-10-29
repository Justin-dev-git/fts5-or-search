// T19 runner pieces: --reuse-db (completion marker, same results, refusal of
// aborted builds), merge-per-query, and scripts/scale-run.sh end to end on
// test/fixtures/msmarco-mini with the stub stemmer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const p = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const bench = p('../scripts/beir-bench.mjs');
const node = (args, env = {}) => spawnSync(process.execPath, ['--no-warnings', ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
const lastJson = (s) => JSON.parse(s.trim().split('\n').at(-1));

function convert(root) {
  const f = (x) => p(`./fixtures/msmarco-mini/${x}`);
  for (const [lang, c, q] of [['en', 'collection.tsv', 'queries.tsv'], ['de', 'collection-de.tsv', 'queries-de.tsv']]) {
    execFileSync(process.execPath, ['--no-warnings', p('../scripts/to-beir.mjs'), '--format', 'msmarco-tsv',
      '--in', `${f(c)},${f(q)},${f('qrels.tsv')}`, '--out', join(root, 'beir', `${lang}-full`)]);
  }
}

test('--reuse-db: second run reuses the finished index, same rankings; aborted build refused', () => {
  const root = mkdtempSync(join(tmpdir(), 'reuse-'));
  try {
    const data = p('./fixtures/beir-mini');
    const db = join(root, 'db');
    mkdirSync(db);
    const a = node([bench, '--data', data, '--db-dir', db, '--reuse-db', '--report-db', '--repeat', '1', '--json']);
    assert.equal(a.status, 0, a.stderr);
    assert.ok(existsSync(join(db, 'beir-mini-porter-unicode61.db.done')));
    const b = node([bench, '--data', data, '--db-dir', db, '--reuse-db', '--report-db', '--repeat', '1', '--json']);
    assert.equal(b.status, 0, b.stderr);
    const ja = lastJson(a.stdout), jb = lastJson(b.stdout);
    assert.deepEqual(jb.reusedIndexes, ['beir-mini-porter-unicode61']);
    assert.deepEqual(ja.reusedIndexes, []);
    for (const l of Object.keys(ja.lanes)) assert.equal(jb.lanes[l].ndcg10, ja.lanes[l].ndcg10, l);
    const c = node([bench, '--data', data, '--db-dir', db, '--repeat', '1']);
    assert.match(c.stderr, /exists; remove it/, 'without --reuse-db an existing file is never touched');
    rmSync(join(db, 'beir-mini-porter-unicode61.db.done'));
    const d = node([bench, '--data', data, '--db-dir', db, '--reuse-db', '--repeat', '1']);
    assert.match(d.stderr, /has no \.done marker/);
    assert.match(node([bench, '--data', data, '--reuse-db', '--repeat', '1']).stderr, /--reuse-db needs --db-dir/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('merge-per-query joins lanes by qid and refuses duplicate lanes', () => {
  const root = mkdtempSync(join(tmpdir(), 'merge-'));
  try {
    const a = join(root, 'a.jsonl'), b = join(root, 'b.jsonl'), out = join(root, 'm.jsonl');
    writeFileSync(a, '{"qid":"1","terms":2,"lanes":{"or":{"ndcg10":1,"p10":0.1}}}\n{"qid":"2","terms":1,"lanes":{"or":{"ndcg10":0,"p10":0}}}\n');
    writeFileSync(b, '{"qid":"2","terms":1,"lanes":{"and":{"ndcg10":0,"p10":0}}}\n{"qid":"1","terms":2,"lanes":{"and":{"ndcg10":0.5,"p10":0.1}}}\n');
    const r = node([p('../scripts/merge-per-query.mjs'), out, a, b]);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l)), [
      { qid: '1', terms: 2, lanes: { or: { ndcg10: 1, p10: 0.1 }, and: { ndcg10: 0.5, p10: 0.1 } } },
      { qid: '2', terms: 1, lanes: { or: { ndcg10: 0, p10: 0 }, and: { ndcg10: 0, p10: 0 } } },
    ]);
    const cmp = node([p('../scripts/beir-compare.mjs'), out, '--a', 'or', '--b', 'and']);
    assert.match(cmp.stdout, /^or vs and: W=1 T=1 L=0/);
    assert.notEqual(node([p('../scripts/merge-per-query.mjs'), out, a, a]).status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('scale-run.sh: subsets, id hash, one process per lane, compares, summary; resumes', () => {
  const root = mkdtempSync(join(tmpdir(), 'scale-run-'));
  try {
    convert(root);
    const env = { SCALE_DIR: root, STEMMER: p('./fixtures/de/stub-stemmer.mjs'), SIZES: '5', QUERIES: '3', FULL_QUERIES: '2', REPEAT: '1' };
    const r = spawnSync('bash', [p('../scripts/scale-run.sh')], { encoding: 'utf8', env: { ...process.env, ...env } });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const res = (f) => readFileSync(join(root, 'results', f), 'utf8');
    assert.match(res('run.log'), /DONE summary/);
    for (const line of res('idhash.txt').trim().split('\n')) {
      const [, en, de] = line.split(' ');
      assert.equal(en, de);
    }
    assert.equal(res('subsample-en-5.txt').trim(), 'docs=5 queries=3 qrels=4 rel_docs=4 missing_rel=0');
    assert.equal(res('subsample-de-all.txt').trim(), 'docs=10 queries=2 qrels=3 rel_docs=3 missing_rel=0');
    assert.equal(lastJson(res('en-5.or.txt')).lanes.or.ndcg10, 0.8978);
    for (const lane of ['and', 'or', 'or-stem', 'or-trigram', 'hybrid', 'hybrid-expanded', 'hybrid-trigram']) {
      assert.ok(existsSync(join(root, 'results', `de-all.${lane}.txt`)), lane);
    }
    for (const lane of ['hybrid', 'hybrid-fts', 'hybrid-k10', 'hybrid-nofloor-k10', 'hybrid-fts-k10', 'hybrid-substr-k10', 'blend-0.1', 'blendidf-0.1']) {
      assert.match(res(`compare-en-5.${lane}-vs-or.txt`), new RegExp(`^${lane} vs or: W=`), lane);
    }
    assert.match(res('compare-de-5.hybrid-trigram-vs-or-trigram.txt'), /^hybrid-trigram vs or-trigram: W=/);
    assert.match(res('compare-de-5.or-trigram-vs-or.txt'), /^or-trigram vs or: W=\d+ T=\d+ L=\d+/);
    assert.match(res('summary.md'), /\| all \| 10 \| 2 \| or-trigram \|/);
    assert.equal(existsSync(join(root, 'db', 'de-5')), false, 'index dir removed after the size');
    const again = spawnSync('bash', [p('../scripts/scale-run.sh')], { encoding: 'utf8', env: { ...process.env, ...env } });
    assert.equal(again.status, 0);
    assert.equal((again.stdout.match(/ skip /g) ?? []).length, 34, 'every finished lane (10 en + 7 de, 2 sizes) is skipped on restart');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('scale-run.sh: FULL=0 skips the whole corpus; FULL_*_LANES limit the full-size lanes', () => {
  const root = mkdtempSync(join(tmpdir(), 'scale-run-'));
  try {
    convert(root);
    const base = { SCALE_DIR: root, STEMMER: p('./fixtures/de/stub-stemmer.mjs'), QUERIES: '3', FULL_QUERIES: '2', REPEAT: '1' };
    const run = (env) => spawnSync('bash', [p('../scripts/scale-run.sh')], { encoding: 'utf8', env: { ...process.env, ...base, ...env } });
    assert.equal(run({ SIZES: '5', FULL: '0' }).status, 0);
    assert.equal(existsSync(join(root, 'beir', 'en-all')), false, 'FULL=0: no full-size subset');
    const later = run({ SIZES: '5', FULL: '1', FULL_EN_LANES: 'and or', FULL_DE_LANES: 'and or or-trigram' });
    assert.equal(later.status, 0, later.stdout);
    assert.equal((later.stdout.match(/ skip /g) ?? []).length, 17, 'the earlier size is not measured again');
    const has = (f) => existsSync(join(root, 'results', f));
    assert.ok(has('en-all.or.txt') && has('de-all.or-trigram.txt'));
    assert.equal(has('en-all.hybrid-k10.txt') || has('de-all.hybrid-expanded.txt'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
