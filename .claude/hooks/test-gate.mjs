#!/usr/bin/env node
// Stop-Hook (Test-Gate, eingetragen in .claude/settings.json).
//
// Führt `npm test` aus, wenn sich der Arbeitsstand seit dem letzten Lauf
// geändert hat (HEAD, Änderungen gegenüber HEAD, nicht versionierte Dateien).
// Bei Rot hält er Claude einmal an. Ein zweites Mal im selben Durchgang
// blockiert er nicht (stop_hook_active), damit AGENTS.md Schritt 6 gilt:
// höchstens 3 Versuche, dann stoppen und mit Ausgabe melden.
// Der zuletzt geprüfte Stand liegt in .git/claude-test-gate, nicht im Arbeitsbaum.
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 << 20 });

let state = null;
let stampPath = null;
try {
  const h = createHash('sha256');
  h.update(git('rev-parse', 'HEAD'));
  h.update(git('diff', 'HEAD', '--binary'));
  for (const f of git('ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean)) {
    h.update(`\0${f}\0`);
    try { h.update(readFileSync(resolve(cwd, f))); } catch {}
  }
  state = h.digest('hex');
  stampPath = resolve(cwd, git('rev-parse', '--git-path', 'claude-test-gate').trim());
  if (readFileSync(stampPath, 'utf8') === state) process.exit(0); // schon geprüft
} catch {}

const r = spawnSync('npm', ['test'], { cwd, encoding: 'utf8', maxBuffer: 256 << 20 });
if (stampPath) { try { writeFileSync(stampPath, state); } catch {} }
if (r.status === 0) process.exit(0);

const lines = `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n');
const failing = [];
lines.forEach((l, i) => { if (/^\s*not ok /.test(l)) failing.push(...lines.slice(i, i + 14)); });
const summary = lines.filter((l) => /^# (tests|pass|fail|cancelled) /.test(l));
const detail = [...failing.slice(0, 70), ...summary].join('\n') || lines.slice(-40).join('\n');

if (input.stop_hook_active) {
  console.log(JSON.stringify({ systemMessage: `Test-Gate: npm test ist weiterhin rot (exit ${r.status}).` }));
  process.exit(0);
}
console.log(JSON.stringify({
  decision: 'block',
  reason: `Test-Gate: npm test ist rot (exit ${r.status}). Beheben oder nach AGENTS.md Schritt 6 `
    + `(höchstens 3 Versuche) stoppen und den Fehlschlag mit dieser Ausgabe melden:\n${detail}`,
}));
