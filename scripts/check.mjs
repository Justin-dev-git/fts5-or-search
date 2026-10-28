#!/usr/bin/env node
// Task gate for the agent workflow (see AGENTS.md).
//
//   npm run check -- tasks/T7-probe-lanes.md
//
// A task passes only if ALL of these hold:
//   1. the working tree is clean (everything committed),
//   2. at least one commit on HEAD carries the task prefix ("T7: ..."),
//   3. every file touched by those commits is listed under
//      "Erlaubte Dateien:" in the task file (entries ending in "/" allow a
//      whole directory),
//   4. `npm test` passes,
//   5. every command in the first ```bash block under "## Prüfung" exits 0
//      (run with `bash -o pipefail -c`, so `cmd | grep -F "..."` checks output).
// The verdict comes from exit codes, not from anyone's summary.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseTask(text, fileName = '') {
  const idFromName = basename(fileName).match(/^(T\d+)\b/)?.[1] ?? null;
  const idFromTitle = text.match(/^#\s+(T\d+)\b/m)?.[1] ?? null;
  const id = idFromTitle ?? idFromName;

  const allowed = [];
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^Erlaubte Dateien:\s*$/.test(l.trim()));
  if (start >= 0) {
    for (const l of lines.slice(start + 1)) {
      const m = l.match(/^\s*-\s+`?([^`\s]+)`?\s*$/);
      if (m) allowed.push(m[1]);
      else if (l.trim() === '') { if (allowed.length) break; }
      else break;
    }
  }

  const commands = [];
  const sec = text.search(/^##\s+Prüfung\s*$/m);
  if (sec >= 0) {
    const block = text.slice(sec).match(/```bash\n([\s\S]*?)```/);
    if (block) {
      for (const l of block[1].split('\n')) {
        const t = l.trim();
        if (t && !t.startsWith('#')) commands.push(t);
      }
    }
  }
  return { id, allowed, commands };
}

export function isAllowed(file, allowed) {
  return allowed.some((a) => (a.endsWith('/') ? file.startsWith(a) : file === a));
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

function main() {
  const taskPath = process.argv[2];
  if (!taskPath || !existsSync(taskPath)) {
    console.error('usage: npm run check -- tasks/<Tn-name>.md');
    process.exit(2);
  }
  const task = parseTask(readFileSync(taskPath, 'utf8'), taskPath);
  const fail = [];
  const say = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fail.push(msg); };

  if (!task.id) say(false, 'task id (T<n>) not found in title or file name');
  if (!task.allowed.length) say(false, 'no "Erlaubte Dateien:" list in task file');
  if (!task.commands.length) say(false, 'no ```bash block under "## Prüfung"');

  const dirty = git('status', '--porcelain');
  say(dirty === '', dirty === '' ? 'working tree clean' : `working tree not clean:\n${dirty}`);

  if (task.id) {
    const shas = git('log', '--format=%H', `--grep=^${task.id}: `, 'HEAD').split('\n').filter(Boolean);
    say(shas.length > 0, `${shas.length} commit(s) with prefix "${task.id}: "`);
    const files = new Set();
    for (const sha of shas) {
      for (const f of git('show', '--format=', '--name-only', sha).split('\n').filter(Boolean)) files.add(f);
    }
    const outside = [...files].filter((f) => !isAllowed(f, task.allowed));
    say(outside.length === 0,
      outside.length === 0
        ? `scope ok: ${[...files].join(', ') || '(no files)'}`
        : `files outside "Erlaubte Dateien": ${outside.join(', ')}`);
  }

  console.log('\n--- npm test ---');
  const t = spawnSync('npm', ['test'], { stdio: 'inherit' });
  say(t.status === 0, `npm test (exit ${t.status})`);

  task.commands.forEach((cmd, i) => {
    console.log(`\n--- Prüfung ${i + 1}/${task.commands.length}: ${cmd}`);
    const r = spawnSync('bash', ['-o', 'pipefail', '-c', cmd], { stdio: 'inherit' });
    say(r.status === 0, `Prüfung ${i + 1} (exit ${r.status})`);
  });

  console.log(`\nCHECK ${task.id ?? '?'}: ${fail.length ? `FAIL (${fail.length})` : 'PASS'}`);
  process.exit(fail.length ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
