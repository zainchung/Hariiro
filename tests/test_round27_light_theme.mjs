// Round 27: light interface on light wallpapers. One tone rule in HariiroTheme turns the dark
// glass palette into a light one (lightness mirrored, hue / saturation / alpha kept). The
// title-bar panel picks the tone from the wallpaper's brightness (or the owner's choice in the
// ☰ menu) and publishes it; panels, main.txt colours and control images follow it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { root, read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run, runScript } from './helpers/fake_host.mjs';

const rgb = c => [(c >>> 16) & 255, (c >>> 8) & 255, c & 255];
const lightness = c => { const [r, g, b] = rgb(c); return (Math.max(r, g, b) + Math.min(r, g, b)) / 510; };
const luma = c => { const [r, g, b] = rgb(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };

// ---- The tone rule --------------------------------------------------------------------------
{
  const host = createHost();
  const ctx = panelContext(host);
  run(ctx, "include('hariiro_shared.js');include('hariiro_theme.js');");
  const T = ctx.HariiroTheme;
  assert.equal(T.tone(), 'dark', 'dark until a tone is published');
  const gr = {};
  assert.equal(T.graphics(gr), gr, 'pink + dark draws unchanged');
  assert.equal(T.recolor(0xffffe4ee), 0xffffe4ee);
  const darkKey = T.key();

  host.state.vars.set('hariiro.tone', 'light');
  assert.equal(T.tone(), 'light');
  assert.notEqual(T.key(), darkKey, 'caches keyed by the tone');
  assert.notEqual(T.graphics(gr), gr, 'light tone recolours even the pink base');
  // Pale text becomes dark, dark glass becomes pale; alpha is kept.
  for (const text of [0xffffffff, 0xffffe4ee, 0xfff4b9d8, 0xffefd9e9]) {
    const out = T.recolor(text);
    assert(luma(out) < 0.3, `text ${text.toString(16)} -> ${out.toString(16)} is dark`);
    assert.equal(out >>> 24, text >>> 24);
  }
  for (const glass of [0x41121d38, 0xbd41264e, 0x75683b67]) {
    const out = T.recolor(glass);
    assert(lightness(out) > 0.6, `glass ${glass.toString(16)} -> ${out.toString(16)} is pale`);
    // Pale translucent glass is frosted 1.5x so busy light wallpapers show through less.
    assert.equal(out >>> 24, Math.min(255, Math.round((glass >>> 24) * 1.5)), 'frosted');
  }
  // lighten() itself (shared with the light icons) keeps alpha.
  assert.equal(T.lighten(0x41121d38) >>> 24, 0x41);
  assert.equal(T.recolor(0x00000000) >>> 24, 0, 'transparent stays transparent');
  // Mid-tone accents keep roughly their lightness.
  assert(Math.abs(lightness(T.recolor(0xff93547d)) - lightness(0xff93547d)) < 0.15);
  // main.txt colours follow the same rule.
  const [r, g, b] = T.layoutColor('249-220-235').split('-').map(Number);
  assert((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.3, 'main.txt text is dark');
  const [fr, fg, fb] = T.layoutColor('18-26-49').split('-').map(Number);
  assert((Math.max(fr, fg, fb) + Math.min(fr, fg, fb)) / 510 > 0.6, 'main.txt glass is pale');
  // Hue shift and tone combine (a blue accent, light).
  host.state.vars.set('hariiro.theme.hue', 'blue'); host.state.vars.set('hariiro.theme.degree', '211');
  const blue = T.recolor(0xffffb7da), [br, bg, bb] = rgb(blue);
  assert(bb > br && luma(blue) < 0.35, 'blue and dark: ' + blue.toString(16));

  // Wallpaper brightness from the image's colour scheme.
  const scheme = cols => ({ GetColourSchemeJSON: () => JSON.stringify(cols), Dispose() {} });
  assert.equal(T.wallpaperTone({ Resize: () => scheme([{ col: 0xfff6e3ef, freq: 0.7 }, { col: 0xff8fa6d8, freq: 0.3 }]), Dispose() {} }), 'light');
  assert.equal(T.wallpaperTone(scheme([{ col: 0xff141c3c, freq: 0.8 }, { col: 0xfff0d080, freq: 0.2 }])), 'dark');
  assert.equal(T.wallpaperTone(null), null);
  assert.equal(T.wallpaperTone({ GetColourSchemeJSON: () => { throw new Error('x'); } }), null);
}

// ---- main.txt ----------------------------------------------------------------------------
const main = read('main.txt');
{
  const host = createHost();
  const ctx = panelContext(host);
  run(ctx, "include('hariiro_theme.js');");
  const LAYOUT = [...ctx.HariiroTheme.LAYOUT_COLORS];
  const code = main.split(/\r?\n/).filter(l => !l.trimStart().startsWith('//')).join('\n');
  // Every colour main.txt draws goes through hariiro.tc.<base>, so the tone reaches it.
  const used = new Set();
  const stripped = code.replace(/\$if2\(\$getpvar\(hariiro\.tc\.(\d{1,3}-\d{1,3}-\d{1,3})\),\1\)/g, (_, c) => { used.add(c); return 'TC'; });
  assert.deepEqual(stripped.match(/\b\d{1,3}-\d{1,3}-\d{1,3}\b/g), null, 'no literal colours left in main.txt');
  for (const c of used) assert(LAYOUT.includes(c), `${c} is published (LAYOUT_COLORS)`);
  // Control images come from the colour's light/ folder when the light tone is on.
  const FOLDER = '$if($strcmp($getpvar(hariiro.theme.hue),rose),pink,$if2($getpvar(hariiro.theme.hue),pink))';
  assert(code.split('images/controls/').length - 1 >= 17, 'corners and speaker');
  for (const ref of code.split('images/controls/').slice(1))
    assert(ref.startsWith(FOLDER + '/$getpvar(hariiro.controls.light)'), ref.slice(0, 160));
  // Round 28: NATIVE (and its dark backing for the light tone) was removed.
}

// ---- Light control images ----------------------------------------------------------------
for (const id of fs.readdirSync(root + '/images/controls')) {
  const dir = root + '/images/controls/' + id;
  if (!fs.statSync(dir).isDirectory()) continue;
  const names = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();
  assert.deepEqual(fs.readdirSync(dir + '/light').filter(f => f.endsWith('.png')).sort(), names, id + '/light');
  assert(!fs.readFileSync(dir + '/light/play.png').equals(fs.readFileSync(dir + '/play.png')), id + ': light icons differ');
}
assert(fs.existsSync(root + '/tools/make_light_controls.py'), 'light icons can be regenerated');
for (const f of ['js/hariiro_transport.js', 'js/hariiro_footer_slider.js'])
  assert(read(f).includes('HariiroTheme.controlsFolder()'), f + ' loads icons for the tone');

// ---- Title-bar panel: automatic tone, cache, menu -----------------------------------------
{
  const SKIN = 'C:\\fb\\profile\\foo_ui_panels-skins\\Hariiro\\';
  const scheme = cols => ({ Resize: () => ({ GetColourSchemeJSON: () => JSON.stringify(cols), Dispose() {} }), Dispose() {} });
  const WALL = {
    [SKIN + 'images\\wallpapers\\day.png']: scheme([{ col: 0xfff8e8f0, freq: 1 }]),
    [SKIN + 'images\\wallpapers\\night.png']: scheme([{ col: 0xff101830, freq: 1 }]),
  };
  const loaded = [];
  let pick = 0;
  const items = [];
  const menu = () => ({ AppendMenuItem: (f, id, text) => items.push({ id, text, f }), AppendMenuSeparator() {}, AppendTo() {}, TrackPopupMenu: () => pick });
  const notes = [];
  const host = createHost({ vars: { 'hariiro.wallpaper': 'wallpapers/day.png' }, overrides: {
    fb: { ProfilePath: 'C:\\fb\\profile\\' },
    gdi: { Image: p => { loaded.push(p); if (!WALL[p]) throw new Error('no ' + p); return WALL[p]; } },
    utils: {
      Glob: p => p.endsWith('wallpapers\\*') ? [SKIN + 'images\\wallpapers\\day.png', SKIN + 'images\\wallpapers\\night.png'] : [],
      IsFile: p => p === SKIN + 'js\\hariiro_top_chrome.js' || p === SKIN + 'images\\controls\\pink\\light\\play.png',
    },
    window: { Width: 183, Height: 31, CreatePopupMenu: menu, NotifyOthers: (n, v) => notes.push([n, v]) },
  } });
  const V = k => host.state.vars.get(k);
  const chrome = panelContext(host);
  runScript(chrome, 'js/hariiro_top_chrome.js');
  const T = chrome.HariiroTheme, I = chrome.HariiroI18n;
  assert.equal(V('hariiro.tone'), 'light', 'bright wallpaper -> light');
  assert.equal(V('hariiro.tone.auto'), 'wallpapers/day.png|light', 'result cached per wallpaper');
  assert.equal(V('hariiro.controls.light'), 'light/');
  assert.equal(V('hariiro.tc.249-220-235'), T.layoutColor('249-220-235'));
  assert.notEqual(V('hariiro.tc.249-220-235'), '249-220-235');
  assert(notes.some(([n]) => n === 'Hariiro.ThemeChanged'), 'panels told to repaint');
  assert.equal(T.controlsFolder(), '../images/controls/pink/light/');

  // Loading again with the same wallpaper reads the cache, not the image.
  loaded.length = 0;
  runScript(panelContext(host), 'js/hariiro_top_chrome.js');
  assert(!loaded.some(p => p.includes('wallpapers')), 'no second analysis');

  // Switching to the dark wallpaper from the menu goes back to the dark tone.
  chrome.settingsMenu(0, 0);
  const night = items.find(i => i.text.includes('night'));
  pick = night.id; items.length = 0; chrome.settingsMenu(0, 0);
  assert.equal(V('hariiro.tone'), 'dark');
  assert.equal(V('hariiro.controls.light'), '');
  assert.equal(V('hariiro.tc.249-220-235'), '249-220-235');
  assert.equal(T.controlsFolder(), '../images/controls/pink/');

  // The ☰ menu: Interface colours → Automatic (from the wallpaper) / Dark / Light.
  pick = 0; items.length = 0; chrome.settingsMenu(0, 0);
  const find = key => items.find(i => i.text.trim().replace(/^✓\s*/, '') === I.t(key));
  for (const k of ['toneAuto', 'toneDark', 'toneLight']) {
    assert(find(k), k);
    assert(!(find(k).id >= 300 && find(k).id < 360), k + ': not inside the 60 wallpaper ids');
  }
  assert(find('toneAuto').text.startsWith('✓'), 'automatic by default');
  pick = find('toneLight').id; items.length = 0; chrome.settingsMenu(0, 0);
  assert.equal(V('hariiro.tone.mode'), 'light');
  assert.equal(V('hariiro.tone'), 'light', 'forced light on a dark wallpaper');
  pick = 0; items.length = 0; chrome.settingsMenu(0, 0);
  pick = find('toneAuto').id; items.length = 0; chrome.settingsMenu(0, 0);
  assert.equal(V('hariiro.tone.mode'), 'auto');
  assert.equal(V('hariiro.tone'), 'dark');

  // A colour folder without light/ keeps its normal images.
  host.state.vars.set('hariiro.tone.mode', 'light');
  host.state.vars.set('hariiro.theme.hue', 'custom');
  chrome.applyTone();
  assert.equal(V('hariiro.controls.light'), '');
}

// ---- Labels -------------------------------------------------------------------------------
{
  const ctx = panelContext(createHost());
  run(ctx, "include('hariiro_i18n.js');");
  const I = ctx.HariiroI18n;
  for (const k of ['tone', 'toneAuto', 'toneDark', 'toneLight'])
    for (const l of I.LANGS) assert(I.dict[l][k], `${l}: ${k}`);
}

console.log('PASS test_round27_light_theme');
