// Release 1.0.0 is published under the MIT License (owner's decision). The licence text and
// copyright line live in LICENSE, package.json says MIT, every shipped script and layout file
// names the licence (SPDX), and the package script puts LICENSE into the ZIP.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = rel => readFileSync(join(ROOT, rel), 'utf8');

const license = read('LICENSE');
assert.match(license, /^MIT License\r?\n/, 'LICENSE starts with "MIT License"');
assert.match(license, /^Copyright \(c\) 2026 \S.*$/m, 'LICENSE has a copyright line');
assert(license.includes('Permission is hereby granted, free of charge, to any person obtaining a copy'));
assert(license.includes('THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND'));

assert.equal(JSON.parse(read('package.json')).license, 'MIT');

const SPDX = 'SPDX-License-Identifier: MIT';
const shipped = ['main.txt', 'foo_ui_panels.ini',
  ...readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f)];
const missing = shipped.filter(rel => !read(rel).split(/\r?\n/).slice(0, 3).some(l => l.includes(SPDX)));
assert.deepEqual(missing, [], `files without "${SPDX}" in their first three lines`);

const pkg = read('tools/package_skin.py');
assert.match(pkg, /["']LICENSE["']/, 'package_skin.py ships LICENSE');

const userReadme = read('docs/USER_README.txt');
assert.match(userReadme, /MIT License/, 'the user README names the licence');
assert.match(read('README.md'), /MIT License/, 'README names the licence');

console.log('test_release_license: ok');
