// Round 25: release ZIP with installer, bundled components and screenshots.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(join(ROOT, rel), 'utf8');
const PY = ['python3', 'python'].find(p => spawnSync(p, ['--version']).status === 0);
assert(PY, 'python is needed to build the package');

const listed = JSON.parse(read('third_party/components.json')).components;
assert.deepEqual(listed.map(c => c.name).sort(), ['foo_js_panel', 'foo_ui_panels']);
for (const c of listed) {
  assert.match(read(`third_party/${c.name}/LICENSE.txt`), /MIT License/, `${c.name} licence`);
  assert(read('third_party/THIRD-PARTY-NOTICES.txt').includes(`${c.name} ${c.version}`), `${c.name} in the notices`);
}

const tmp = mkdtempSync(join(tmpdir(), 'hariiro-pkg-'));
try {
  // Fake components: a DLL only has to start with "MZ" here.
  const comps = join(tmp, 'user-components-x64');
  for (const c of listed) { mkdirSync(join(comps, c.name), { recursive: true }); writeFileSync(join(comps, c.name, `${c.name}.dll`), 'MZfake'); }
  const names = zip => {
    const r = spawnSync(PY, ['-c', 'import sys,zipfile;print("\\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))', zip], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim().split(/\r?\n/);
  };
  const build = (out, extra) => {
    const env = { ...process.env }; delete env.HARIIRO_COMPONENTS_DIR;
    const r = spawnSync(PY, [join(ROOT, 'tools/package_skin.py'), '--output', out, ...extra], { encoding: 'utf8', env });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    return r.stdout;
  };

  const full = join(tmp, 'full.zip');
  assert.match(build(full, ['--components', comps]), /with components/);
  const n = names(full);
  for (const f of ['Hariiro/main.txt', 'Hariiro/foo_ui_panels.ini', 'Hariiro/LICENSE', 'Hariiro/js/playlist_browser.js',
    'Install-Hariiro.cmd', 'Install-Hariiro.ps1', 'Hariiro-README.txt', 'LICENSE', 'THIRD-PARTY-NOTICES.txt'])
    assert(n.includes(f), `zip has ${f}`);
  for (const c of listed) {
    assert(n.includes(`components/${c.name}/${c.name}.dll`), `zip has ${c.name}.dll`);
    assert(n.includes(`components/${c.name}/LICENSE.txt`), `zip has the ${c.name} licence`);
  }
  assert(n.filter(f => /^preview\/.+\.png$/.test(f)).length >= 3, 'at least three screenshots (now playing, two themes)');
  assert(n.includes('preview/hariiro-glass-now-playing.png'), 'now-playing screenshot');
  assert(!n.some(f => !f.startsWith('Hariiro/') && /^(main\.txt|js\/|images\/)/.test(f)), 'skin files only inside Hariiro/');

  const plain = join(tmp, 'plain.zip');
  assert.match(build(plain, []), /WITHOUT components/);
  const p = names(plain);
  assert(!p.some(f => f.startsWith('components/') || f === 'THIRD-PARTY-NOTICES.txt'), 'no components without --components');
  assert(p.includes('Install-Hariiro.ps1') && p.includes('Hariiro/main.txt'));

  // A missing component DLL fails the release build.
  rmSync(join(comps, 'foo_js_panel'), { recursive: true });
  const env = { ...process.env }; delete env.HARIIRO_COMPONENTS_DIR;
  const bad = spawnSync(PY, [join(ROOT, 'tools/package_skin.py'), '--output', join(tmp, 'bad.zip'), '--components', comps], { encoding: 'utf8', env });
  assert.notEqual(bad.status, 0, 'missing component must fail');
  assert(!existsSync(join(tmp, 'bad.zip')), 'no ZIP written on failure');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// The installer never edits foobar2000's configuration or playlists and never replaces a component.
const ps = read('tools/installer/Install-Hariiro.ps1');
assert(!/config\.sqlite|playlists-v2|Set-ItemProperty|Remove-Item/i.test(ps), 'installer touches no configuration and deletes nothing');
assert.match(ps, /already installed, kept/, 'installed components are kept');
assert.match(ps, /backup-/, 'an existing skin folder is backed up');
assert.match(ps, /portable_mode_enabled/, 'portable and installed foobar2000');
assert.match(ps, /Panels UI \(reborn\)/, 'first-start guidance');
assert.match(read('tools/installer/Install-Hariiro.cmd'), /Install-Hariiro\.ps1/);

console.log('PASS round25 installer: package layout, components + licences, screenshots, installer limits');
