// Unit tests for scripts/check.mjs (task gate of the agent workflow).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseTask, isAllowed } from '../scripts/check.mjs';

const TASK = [
  '# T7: Probe-Lanes ergänzen',
  'Stufe: 1',
  '',
  'Erlaubte Dateien:',
  '- scripts/heldout-probe.mjs',
  '- `scripts/noise-probe.mjs`',
  '- docs/',
  '',
  '## Prüfung',
  '```bash',
  '# comment lines are ignored',
  'node -e "process.exit(0)"',
  '',
  'echo hi | grep -F "hi"',
  '```',
].join('\n');

test('parseTask: id, allowed files (with/without backticks, dirs), commands', () => {
  const t = parseTask(TASK, 'tasks/T7-probe-lanes.md');
  assert.equal(t.id, 'T7');
  assert.deepEqual(t.allowed, ['scripts/heldout-probe.mjs', 'scripts/noise-probe.mjs', 'docs/']);
  assert.deepEqual(t.commands, ['node -e "process.exit(0)"', 'echo hi | grep -F "hi"']);
});

test('parseTask: id falls back to the file name', () => {
  assert.equal(parseTask('# Titel ohne ID', 'tasks/T12-x.md').id, 'T12');
});

test('isAllowed: exact paths and directory prefixes only', () => {
  const a = ['scripts/a.mjs', 'docs/'];
  assert.ok(isAllowed('scripts/a.mjs', a));
  assert.ok(isAllowed('docs/x/y.md', a));
  assert.ok(!isAllowed('scripts/a.mjs.bak', a));
  assert.ok(!isAllowed('test/regression.test.mjs', a));
});

test('gate: FAIL on out-of-scope file, PASS when scope and commands are fine', () => {
  const dir = mkdtempSync(join(tmpdir(), 'check-'));
  const script = fileURLToPath(new URL('../scripts/check.mjs', import.meta.url));
  const sh = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' });
  try {
    sh('init', '-q'); sh('config', 'user.email', 't@t'); sh('config', 'user.name', 't');
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'node -e ""' } }));
    mkdirSync(join(dir, 'tasks'));
    writeFileSync(join(dir, 'tasks/T1-x.md'),
      '# T1: x\n\nErlaubte Dateien:\n- a.txt\n\n## Prüfung\n```bash\ngrep -F ok a.txt\n```\n');
    sh('add', '.'); sh('commit', '-qm', 'setup');
    writeFileSync(join(dir, 'a.txt'), 'ok\n');
    sh('add', '.'); sh('commit', '-qm', 'T1: allowed change');
    const run = () => spawnSync(process.execPath, [script, 'tasks/T1-x.md'], { cwd: dir, encoding: 'utf8' });
    assert.equal(run().status, 0, run().stdout);
    writeFileSync(join(dir, 'b.txt'), 'x\n');
    sh('add', '.'); sh('commit', '-qm', 'T1: sneaky extra file');
    const r = run();
    assert.equal(r.status, 1);
    assert.match(r.stdout, /files outside "Erlaubte Dateien": b\.txt/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
