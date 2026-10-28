#!/usr/bin/env node
// Build a throwaway FTS5 corpus from a directory of markdown files — used by
// the README quick start so the benchmark is reproducible without shipping a
// binary DB. Output: a standalone db with one fts5 table (path UNINDEXED,
// content), same tokenizer the docs search uses.
//
// Refuses to overwrite an existing --out file unless --force is given.
//
// Usage: node scripts/corpus-from-md.mjs --src /path/to/docs [--out db] [--force]
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync, statSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);
const src = arg('src', null);
const out = arg('out', join(tmpdir(), 'fts5-or-demo.db'));
const tokenizer = arg('tokenizer', 'porter unicode61');
if (!src) { console.error('usage: corpus-from-md.mjs --src <dir> [--out db] [--force] [--tokenizer spec]'); process.exit(2); }
if (!/^[A-Za-z0-9 _-]+$/.test(tokenizer)) {
  console.error(`corpus-from-md: refusing suspicious tokenizer spec: ${tokenizer}`);
  process.exit(2);
}

if (existsSync(out)) {
  if (!has('force')) {
    console.error(`corpus-from-md: refusing to overwrite existing file: ${out} (pass --force to replace it)`);
    process.exit(2);
  }
  unlinkSync(out); // explicit --force: replace wholesale, never open stale bytes
}

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.md')) files.push(p);
  }
})(src);

const db = new DatabaseSync(out);
db.exec(`CREATE VIRTUAL TABLE docs_fts USING fts5(path UNINDEXED, content, tokenize='${tokenizer}')`);
db.exec('PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;');
const ins = db.prepare('INSERT INTO docs_fts(path, content) VALUES (?,?)');
db.exec('BEGIN');
let n = 0;
for (const f of files) {
  const txt = readFileSync(f, 'utf8').replace(/\s+/g, ' ').slice(0, 20000);
  if (txt.length > 200) { ins.run(f, txt); n++; }
}
db.exec('COMMIT');
console.log(`built ${out}: ${n} docs, tokenize='${tokenizer}'`);
db.close();
