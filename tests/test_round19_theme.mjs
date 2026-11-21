// Round 19 (Phase E3): two more accent colours (amber, mint) with their control images,
// and a wallpaper choice in the settings menu (images/wallpapers/*).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { root, read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run, runScript } from './helpers/fake_host.mjs';

// ---- Accent presets ---------------------------------------------------------------------
const host = createHost(), ctx = panelContext(host);
run(ctx, "include('anna_i18n.js');include('anna_theme.js');");
const T = ctx.AnnaTheme, ids = [...T.PRESETS.map(p => p.id)];
// Round 22: presets are the bundled colour folders, by name (labels are folder names).
assert.deepEqual(ids, ['amber', 'blue', 'mint', 'pink', 'teal', 'violet']);
for (const p of T.PRESETS) { assert.equal(p.label, p.id); assert.match(p.accent, /^\d{1,3}-\d{1,3}-\d{1,3}$/); }
// Rose pink is turned into the preset's hue.
const hueOf = argb => { const r = (argb >>> 16) & 255, g = (argb >>> 8) & 255, b = argb & 255, mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  let h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return h * 60; };
for (const [id, hue] of [['amber', 36], ['mint', 150]]) {
  assert(T.set(id)); assert.equal(T.selected(), id);
  // 0xffff90c7 has hue ~330; Round 22: it moves to the preset hue keeping 30 % of its 4° offset.
  assert(Math.abs(hueOf(T.recolor(0xffff90c7)) - (hue + (hueOf(0xffff90c7) - 326) * 0.3)) < 1.5, `${id} hue`);
}

// ---- Control images for every preset ----------------------------------------------------
const NAMES = fs.readdirSync(root + '/images/controls/pink').filter(f => f.endsWith('.png')).sort();
assert.equal(NAMES.length, 20); // 16 controls + 4 corners (Round 22)
const isRgbaPng = file => { const b = fs.readFileSync(file); return b.readUInt32BE(0) === 0x89504e47 && b.toString('ascii', 12, 16) === 'IHDR' && b[25] === 6; };
for (const p of T.PRESETS) {
  const dir = root + '/images/controls/' + p.id;
  assert.deepEqual(fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort(), NAMES, dir);
  for (const n of NAMES) assert(isRgbaPng(dir + '/' + n), dir + '/' + n + ' must keep its alpha channel');
}
assert(fs.existsSync(root + '/tools/make_accent_palette.py'), 'the variants can be regenerated');
// The footer volume icon in main.txt follows the colour folder (test_round22_themes).
const main = read('main.txt');

// ---- Wallpaper choice -------------------------------------------------------------------
const SKIN = 'C:\\fb\\profile\\foo_ui_panels-skins\\Anna_Glass\\';
const globs = [];
const files = {
  'C:\\fb\\profile\\foo_ui_panels-skins\\*': ['C:\\fb\\profile\\foo_ui_panels-skins\\Other', SKIN.slice(0, -1)],
  [SKIN + 'images\\wallpapers\\*']: [SKIN + 'images\\wallpapers\\Night Sky.jpg', SKIN + 'images\\wallpapers\\readme.txt', SKIN + 'images\\wallpapers\\dawn.PNG'],
};
let menuPick = 0;
const appended = [];
const menu = () => ({ AppendMenuItem: (f, id, text) => appended.push([id, text, f]), AppendMenuSeparator() {}, AppendTo() {}, TrackPopupMenu: () => menuPick });
const h2 = createHost({ vars: { 'anna.glass.v2.wallpaper': 'wallpapers/wallpaper.jpg' }, overrides: {
  fb: { ProfilePath: 'C:\\fb\\profile\\' },
  utils: { Glob: p => { globs.push(p); return (files[p] || []).slice(); },
    IsFile: p => p === SKIN + 'js\\anna_top_chrome.js' },
  window: { Width: 183, Height: 31, CreatePopupMenu: menu, NotifyOthers() {} },
} });
const chrome = panelContext(h2);
runScript(chrome, 'js/anna_top_chrome.js');
const list = [...chrome.wallpaperChoices()];
// Round 21: no built-in entry; images by name. The saved wallpaper.jpg no longer exists here,
// so the first image was chosen on load (see test_round21_perf).
assert.deepEqual([...list.map(w => w.file)], ['wallpapers/dawn.PNG', 'wallpapers/Night Sky.jpg'], 'images by name');
assert.deepEqual(list.map(w => w.label), ['dawn', 'Night Sky']);
// Choosing one from the settings menu sets the Panels UI variable main.txt and the ini read.
chrome.settingsMenu(10, 10);
const night = appended.find(([, text]) => text.includes('Night Sky'));
assert(night, 'wallpaper submenu lists the images'); assert(appended.some(([, t]) => t.startsWith('✓') && t.includes('dawn')));
menuPick = night[0]; chrome.settingsMenu(10, 10);
assert.equal(h2.state.vars.get('anna.glass.v2.wallpaper'), 'wallpapers/Night Sky.jpg');
// Only names from the list are accepted.
assert.equal(chrome.setWallpaper('..\\..\\evil.jpg'), false);
assert.equal(chrome.setWallpaper('wallpapers/missing.jpg'), false);
assert.equal(h2.state.vars.get('anna.glass.v2.wallpaper'), 'wallpapers/Night Sky.jpg');
assert.equal(chrome.setWallpaper('wallpapers/wallpaper.jpg'), false); // Round 21: not in this folder
assert.equal(chrome.setWallpaper('wallpapers/dawn.PNG'), true);
// main.txt draws the chosen file, falling back to the bundled one.
assert(main.includes('$imageabs(0,0,%_width%,%_height%,images/$if2($getpvar(anna.glass.v2.wallpaper),wallpapers/Anna_GLASS_UI_2560x1440.png))'));
assert(fs.existsSync(root + '/images/wallpapers/README.md'), 'folder exists in the package with a note');
// The menu hint names the folder with its separator (Windows check found "imageswallpapers").
for (const lang of ['en', 'zh-CN', 'zh-TW', 'ja'])
  assert(ctx.AnnaI18n.dict[lang].wallpaperHint.includes('images\\wallpapers'), lang);
console.log('test_round19_theme: ok');
