#!/usr/bin/env node
// Runs every tests/*.mjs in its own Node process and prints a summary.
// Exit code is non-zero if any test fails. Usage: node tools/run_tests.mjs [filter]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filter = process.argv[2] || '';
const files = fs.readdirSync(path.join(root, 'tests'))
  .filter(f => f.endsWith('.mjs') && f.includes(filter))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (!files.length) { console.error('No tests matched.'); process.exit(2); }

let failed = 0;
for (const f of files) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join('tests', f)], { cwd: root, encoding: 'utf8', timeout: 120000 });
  const ok = r.status === 0;
  const lines = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n');
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${f}  (${Date.now() - t0} ms)`);
  if (!ok) { failed++; console.log(lines.slice(0, 15).map(l => '      ' + l).join('\n')); }
}
console.log(`\n${files.length - failed}/${files.length} test files passed`);
process.exit(failed ? 1 : 0);
