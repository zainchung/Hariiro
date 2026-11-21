// Release 1.0: the project is called Hariiro. The old name must not appear in any file name
// or text file of the project (scripts, layout, ini, tests, tools, docs). Saved settings,
// playlist names and window properties use the new name too; old installs are not migrated
// (owner's decision).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OLD = new RegExp(['a', 'n', 'n', 'a'].join(''), 'i'); // not spelled out, so this file passes
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '.claude']);
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.zip', '.ico']);
const LOCAL_ONLY = new Set(['CLAUDE.local.md']); // machine notes, not committed

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) yield* walk(join(dir, e.name)); }
    else yield join(dir, e.name);
  }
}

const badNames = [], badText = [];
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (LOCAL_ONLY.has(rel)) continue;
  if (OLD.test(rel)) badNames.push(rel);
  if (BINARY.has(extname(file).toLowerCase())) continue;
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => { if (OLD.test(line)) badText.push(`${rel}:${i + 1}`); });
}
assert.deepEqual(badNames, [], 'file names still use the old name');
assert.deepEqual(badText.slice(0, 20), [], `text still uses the old name (${badText.length} lines)`);

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
assert.equal(pkg.name, 'hariiro');
assert.equal(pkg.version, '1.0.0');

const shared = readFileSync(join(ROOT, 'js', 'hariiro_shared.js'), 'utf8');
for (const list of ['Favorites', 'Queue Buffer', 'Sorted Library View', 'Artist View', 'Import Staging'])
  assert(shared.includes(`'Hariiro - ${list}'`), `reserved playlist "Hariiro - ${list}"`);

console.log('test_round23_name: ok');
