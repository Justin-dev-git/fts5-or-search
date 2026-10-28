// CLI safety tests (review fix B6): corpus-from-md must never clobber an
// existing --out file without --force.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/corpus-from-md.mjs', import.meta.url));
const srcDir = fileURLToPath(new URL('../sample-corpus', import.meta.url));

function run(args) {
  try {
    const stdout = execFileSync(process.execPath, ['--no-warnings', script, ...args], { encoding: 'utf8' });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? -1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

test('B6: refuses to overwrite existing --out without --force (file untouched)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fts5-cli-'));
  try {
    const out = join(dir, 'precious.db');
    const sentinel = 'NOT-A-DB keep me';
    writeFileSync(out, sentinel);
    const r = run(['--src', srcDir, '--out', out]);
    assert.notEqual(r.code, 0, 'expected nonzero exit without --force');
    assert.match(r.stderr, /refusing to overwrite/);
    assert.equal(readFileSync(out, 'utf8'), sentinel, 'existing file must be byte-identical');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('B6: --force replaces the existing file and builds a working corpus', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fts5-cli-'));
  try {
    const out = join(dir, 'precious.db');
    writeFileSync(out, 'stale');
    const r = run(['--src', srcDir, '--out', out, '--force']);
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /built .*: \d+ docs/);
    // sanity: it is a real FTS5 db now
    const { DatabaseSync } = await_import_check();
    const db = new DatabaseSync(out, { readOnly: true });
    const n = db.prepare('SELECT COUNT(*) c FROM docs_fts').get().c;
    db.close();
    assert.ok(n >= 8, `expected >=8 docs, got ${n}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// hoisted statically to keep the test body sync
function await_import_check() {
  return { DatabaseSync };
}
import { DatabaseSync } from 'node:sqlite';
