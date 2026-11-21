// Round 22 (2): every frame follows the accent colour. Before, (a) main.txt's own colours never
// changed, and (b) the warm peach/gold frames (hue 0-50) were outside HariiroTheme.recolor's
// pink range. Now warm frames take the colour's hue (pink keeps its original design), the
// corner PNGs follow the same rule, and main.txt reads recoloured values that TopChrome
// publishes as hariiro.tc.<r-g-b>.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { root, read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run, runScript } from './helpers/fake_host.mjs';

const rgb = argb => [(argb >>> 16) & 255, (argb >>> 8) & 255, argb & 255];
const hue = ([r, g, b]) => { const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); if (!d) return 0;
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return h * 60; };

function theme(id, degree) {
  const h = createHost({ vars: { 'hariiro.theme.hue': id, ...(degree === undefined ? {} : { 'hariiro.theme.degree': String(degree) }) } });
  const ctx = panelContext(h);
  run(ctx, "include('hariiro_shared.js');include('hariiro_theme.js');");
  return { T: ctx.HariiroTheme, h, ctx };
}

// ---- 1. warm frames take the colour's hue --------------------------------------------------
{
  const FRAME = 0xc8d8a88f; // GLASS cover / album frame, hue 20
  assert.equal(theme('pink').T.recolor(FRAME), FRAME, 'pink keeps its peach frames');
  for (const [id, deg] of [['blue', 211], ['mint', 150], ['violet', 278], ['amber', 36]]) {
    const out = theme(id).T.recolor(FRAME);
    assert.equal(out >>> 24, 0xc8, 'alpha kept');
    assert(Math.abs(hue(rgb(out)) - deg) <= 2, `${id}: frame hue ${hue(rgb(out))}`);
    assert(Math.abs(Math.max(...rgb(out)) - 0xd8) <= 1, `${id}: brightness kept`);
  }
  const { T } = theme('blue');
  assert.equal(T.recolor(0xff808080), 0xff808080, 'greys stay');
  assert.equal(T.recolor(0xff121d38), 0xff121d38, 'dark navy glass stays');
  assert.equal(T.recolor(0xff2a1a10), 0xff2a1a10, 'dark warm (r < 120) stays');
}

// ---- 2. main.txt: every colour a colour changes is read from hariiro.tc.<r-g-b> ----------------
const main = read('main.txt');
const { T: blue } = theme('blue');
const code = main.split(/\r?\n/).filter(l => !l.trimStart().startsWith('//')).join('\n');
const changes = c => { const [r, g, b] = c.split('-').map(Number); return blue.recolor((0xff000000 | (r << 16) | (g << 8) | b) >>> 0) !== ((0xff000000 | (r << 16) | (g << 8) | b) >>> 0); };
const bare = [...code.matchAll(/(brushcolor-|pencolor-|,)(\d{1,3}-\d{1,3}-\d{1,3})(?=[ ,)])/g)]
  .filter(m => !code.slice(Math.max(0, m.index - 40), m.index).endsWith(`$getpvar(hariiro.tc.${m[2]})`))
  .map(m => m[2]).filter(changes);
assert.deepEqual([...new Set(bare)], [], 'colours in main.txt that do not follow the accent');
const wrapped = [...new Set([...code.matchAll(/\$if2\(\$getpvar\(hariiro\.tc\.(\d{1,3}-\d{1,3}-\d{1,3})\),(\d{1,3}-\d{1,3}-\d{1,3})\)/g)]
  .map(m => { assert.equal(m[1], m[2], 'fallback is the base colour'); return m[1]; }))].sort();
assert(wrapped.length >= 15, 'frames, lines and labels of the layout');
assert.deepEqual([...blue.LAYOUT_COLORS].sort(), wrapped, 'HariiroTheme.LAYOUT_COLORS lists exactly the wrapped colours');

// ---- 3. TopChrome publishes them -------------------------------------------------------------------
{
  const h = createHost({ vars: { 'hariiro.theme.hue': 'blue' }, overrides: {
    fb: { ProfilePath: 'C:\\fb\\' }, utils: { Glob: () => [], IsFile: () => false },
    window: { Width: 183, Height: 31, NotifyOthers() {} } } });
  const ctx = panelContext(h);
  runScript(ctx, 'js/hariiro_top_chrome.js');
  const P = ctx.HariiroShared.PVAR.themeColorPrefix;
  assert.equal(P, 'hariiro.tc.');
  for (const c of wrapped) assert.equal(h.state.vars.get(P + c), ctx.HariiroTheme.layoutColor(c), c);
  const frame = h.state.vars.get(P + '236-184-177').split('-').map(Number);
  assert(Math.abs(hue(frame) - 211) <= 2, 'card outline is blue: ' + frame);
  // Choosing pink puts the original colours back.
  ctx.HariiroTheme.set('pink'); ctx.publishLayoutColors();
  assert.equal(h.state.vars.get(P + '236-184-177'), '236-184-177');
}

// ---- 4. corner PNGs follow the same rule (gold dots included) ------------------------------------
const tool = read('tools/make_accent_palette.py');
assert(/def recolor\(r, g, b, target\):[\s\S]*<= 50/.test(tool), 'the image tool has the warm rule too');
const corner = id => fs.readFileSync(root + `/images/controls/${id}/corner_tl.png`);
assert(!corner('blue').equals(corner('pink')));
console.log('test_round22_unified_colours: ok');
