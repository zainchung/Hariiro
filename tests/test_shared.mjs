// HariiroShared: origin marker format, reserved names, and no drift back into
// hard-coded copies in the panels that use it. Also loads every panel script
// in a permissive fake host to catch load-time errors (missing include, typo).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { read, root, installIncludeShim } from './helpers/js_panel.mjs';

installIncludeShim(vm);
const vars = new Map();
const ctx = vm.createContext({ panelsui: {
  GetVariable: (k, d) => (vars.has(k) ? vars.get(k) : d),
  SetVariable: (k, v) => vars.set(k, v) } });
vm.runInContext(read('js/hariiro_shared.js'), ctx);
const S = ctx.HariiroShared;

// Marker round trips.
assert.equal(S.sidebarMarker('playlist', 3), 'sidebar:playlist:3');
assert.equal(S.sidebarMarker('library'), 'sidebar:library:-1');
assert.equal(S.glassMarker(5), 'glass:5');
const p = o => JSON.parse(JSON.stringify(S.parseOrigin(o)));
assert.deepEqual(p('sidebar:artist:2'), { kind: 'sidebar', type: 'artist', index: 2 });
assert.deepEqual(p('sidebar:7'), { kind: 'sidebar', type: 'unknown', index: 7 }); // pre-Round 14 format
assert.deepEqual(p('sidebar:bad'), { kind: 'sidebar', type: 'unknown', index: -1 });
assert.deepEqual(p('glass:4'), { kind: 'glass', index: 4 });
assert.deepEqual(p('glass:x'), { kind: 'glass', index: -2 });
assert.deepEqual(p(''), { kind: 'external' });
assert.deepEqual(p(undefined), { kind: 'external' });

// Owner-checked clearing.
S.setOrigin('glass:1'); S.clearOriginIf('sidebar:'); assert.equal(S.getOrigin(), 'glass:1');
S.clearOriginIf('glass:'); assert.equal(S.getOrigin(), '');
assert.equal(vm.runInNewContext(read('js/hariiro_shared.js') + ';HariiroShared.getOrigin()', {}), ''); // no panelsui

// Reserved names.
for (const n of ['Favorites', 'Music Library', 'Queue Buffer', 'Sorted Library View',
  'Artist View #2', 'Import Staging', 'Import Staging #3']) assert(S.isReservedName(n), n);
for (const n of ['My list', 'Artist Viewer', 'Music Library 2', 'My Favorites']) assert(!S.isReservedName(n), n);
assert(Object.isFrozen(S) && Object.isFrozen(S.LIST) && Object.isFrozen(S.PVAR));

// Drift guard: the panels that include HariiroShared must not re-hard-code its values.
for (const f of ['js/hariiro_glass_playlist.js', 'js/playlist_browser.js']) {
  const src = read(f);
  assert(src.includes("include('hariiro_shared.js');"), f);
  assert(!src.includes("'hariiro.drag.origin'"), f + ': use HariiroShared.PVAR.dragOrigin');
  assert(!/['"]sidebar:['"]\s*\+|['"]glass:['"]\s*\+/.test(src), f + ': build markers with HariiroShared');
  for (const name of Object.values(S.LIST)) assert(!src.includes(`'${name}'`), `${f}: use HariiroShared.LIST for '${name}'`);
}

// D2: every panel-variable key is defined once, in HariiroShared.PVAR. hariiro_theme.js and
// hariiro_i18n.js own their variable (they load standalone) and must use the same value.
for (const k of ['themeHue', 'themeAccent', 'language', 'queueOpen', 'chromeHidden', 'favoriteCurrent', 'playlistExperimental'])
  assert(typeof S.PVAR[k] === 'string' && S.PVAR[k].startsWith('hariiro.'), `HariiroShared.PVAR.${k}`);
const OWNED = { 'js/hariiro_theme.js': [S.PVAR.themeHue, S.PVAR.themeAccent, S.PVAR.themeDegree], 'js/hariiro_i18n.js': [S.PVAR.language] };
for (const [f, keys] of Object.entries(OWNED)) for (const v of keys) assert(read(f).includes(`'${v}'`), `${f} must use '${v}'`);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const f of fs.readdirSync(root + '/js').filter(n => n.endsWith('.js')).map(n => 'js/' + n)) {
  if (f === 'js/hariiro_shared.js') continue;
  const src = read(f);
  for (const v of Object.values(S.PVAR)) {
    if ((OWNED[f] || []).includes(v)) continue;
    // 'hariiro.x' as a key, or inside an action string such as 'PVAR:TOGGLE:hariiro.x'
    assert(!new RegExp(`['":]${esc(v)}['"]`).test(src), `${f} hard-codes '${v}': use HariiroShared.PVAR`);
  }
  // Helper modules whose panels include their dependencies first (used inside functions only).
  if (/\bHariiroShared\./.test(src) && !['js/hariiro_drop_fix.js', 'js/hariiro_undo.js', 'js/hariiro_glass_drop.js', 'js/hariiro_scratch_views.js', 'js/hariiro_import_staging.js'].includes(f))
    assert(src.includes("include('hariiro_shared.js');"), `${f} uses HariiroShared: include('hariiro_shared.js')`);
}

// Smoke test: every panel script loads in a permissive fake host.
function stub(name = 'host') {
  const fn = function () {};
  return new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return h => (h === 'number' ? 0 : '');
      if (k === Symbol.iterator) return function* () {};
      if (k === 'then') return undefined;
      if (['Count', 'Width', 'Height', 'PlaylistCount', 'Length', 'ID'].includes(k)) return 0;
      if (['ActivePlaylist', 'PlayingPlaylist'].includes(k)) return -1;
      if (k === 'GetProperty' || k === 'GetVariable') return (_, d) => d;
      if (k === 'Convert' || k === 'GetPlaybackQueueContents') return () => [];
      if (!(k in t)) t[k] = stub(name + '.' + String(k));
      return t[k];
    },
    set(t, k, v) { t[k] = v; return true; },
    apply() { return stub(name + '()'); },
    construct() { return stub('new ' + name); },
  });
}
const scripts = fs.readdirSync(root + '/js').filter(f => f.endsWith('.js'));
for (const f of scripts) {
  const c = vm.createContext({ console: { log() {} }, JSON, Math, Date, Map, Set, Object, Array, String, Number,
    RegExp, Error, Symbol, Promise, parseInt, parseFloat, isNaN });
  for (const g of ['window', 'gdi', 'fb', 'plman', 'utils', 'panelsui', 'UIHacks', 'ActiveXObject'])
    c[g] = stub(g);
  // Helper modules have no include statements: their panel includes these base modules first.
  const src = read('js/' + f);
  if (!/^[ \t]*include\(/m.test(src))
    for (const base of ['hariiro_i18n.js', 'hariiro_shared.js']) if (base !== f) vm.runInContext(read('js/' + base), c);
  try { vm.runInContext(src, c, { filename: f }); }
  catch (e) { assert.fail(`${f} failed to load: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
}
console.log(`PASS shared: origin markers, reserved names, drift guard, ${scripts.length} panel scripts load in a fake host`);
