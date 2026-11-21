// Round 21: (1) every wallpaper is an ordinary file in images/wallpapers - no built-in
// "Default (Anna)" entry that stays in the menu after its file was deleted;
// (2) CPU: animated panels are child windows, so their repaints do not redraw the whole
// layout; (3) memory: the GLASS list keeps covers at drawn size, not full resolution.
// Windows measurement behind (2): docs/ROUND21_REVIEW.md.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { root, read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run, runScript, handle } from './helpers/fake_host.mjs';

const ini = read('foo_ui_panels.ini'), main = read('main.txt');

// ---- 1. Wallpapers: all of them are peers ------------------------------------------------
assert(fs.existsSync(root + '/images/wallpapers/Anna_GLASS_UI_2560x1440.png'), 'bundled wallpaper is an ordinary, named file');
assert(!fs.existsSync(root + '/images/wallpapers/wallpaper.jpg'));
assert.match(ini, /^pvar\.once\.anna\.glass\.v2\.wallpaper = wallpapers\/Anna_GLASS_UI_2560x1440\.png\s*$/m);
assert(main.includes('$imageabs(0,0,%_width%,%_height%,images/$if2($getpvar(anna.glass.v2.wallpaper),wallpapers/Anna_GLASS_UI_2560x1440.png))'));
assert(!read('js/anna_top_chrome.js').includes('wallpaperDefault'), 'no built-in menu entry');

const SKIN = 'C:\\fb\\profile\\foo_ui_panels-skins\\Anna_Glass\\';
function chrome(saved, names) {
  const appended = [];
  const menu = () => ({ AppendMenuItem: (f, id, text) => appended.push([id, text, f]), AppendMenuSeparator() {}, AppendTo() {}, TrackPopupMenu: () => 0 });
  const h = createHost({ vars: saved === undefined ? {} : { 'anna.glass.v2.wallpaper': saved }, overrides: {
    fb: { ProfilePath: 'C:\\fb\\profile\\' },
    utils: { Glob: p => (p === SKIN + 'images\\wallpapers\\*' ? names.map(n => SKIN + 'images\\wallpapers\\' + n) : []),
      IsFile: p => p === SKIN + 'js\\anna_top_chrome.js' },
    window: { Width: 183, Height: 31, CreatePopupMenu: menu, NotifyOthers() {} },
  } });
  const c = panelContext(h);
  runScript(c, 'js/anna_top_chrome.js');
  const wall = () => h.state.vars.get('anna.glass.v2.wallpaper');
  const menuItems = () => { appended.length = 0; c.settingsMenu(1, 1); return appended.filter(([id]) => id >= 300).map(([, t]) => t.trim()); };
  return { c, h, wall, menuItems };
}
{ // Anna_GLASS_UI_2560x1440.png is listed like any other image, by its file name.
  const { c, wall, menuItems } = chrome('wallpapers/Anna_GLASS_UI_2560x1440.png', ['Anna_GLASS_UI_2560x1440.png', 'Sea.jpg', 'notes.txt']);
  assert.deepEqual([...c.wallpaperChoices()].map(w => [w.file, w.label]), [['wallpapers/Anna_GLASS_UI_2560x1440.png', 'Anna_GLASS_UI_2560x1440'], ['wallpapers/Sea.jpg', 'Sea']]);
  assert.deepEqual(menuItems(), ['✓ Anna_GLASS_UI_2560x1440', 'Sea']);
  assert.equal(wall(), 'wallpapers/Anna_GLASS_UI_2560x1440.png');
}
{ // The bundled file was deleted: it is gone from the menu, and the saved choice moves on.
  const { c, wall, menuItems } = chrome('wallpapers/Anna_GLASS_UI_2560x1440.png', ['Sea.jpg']);
  assert.deepEqual([...c.wallpaperChoices()].map(w => w.file), ['wallpapers/Sea.jpg']);
  assert.equal(wall(), 'wallpapers/Sea.jpg', 'a missing choice falls back to an existing image');
  assert.deepEqual(menuItems(), ['✓ Sea']);
}
{ // Choices saved by older builds (wallpaper.jpg at either place) move to an existing image.
  for (const old of ['wallpaper.jpg', 'wallpapers/wallpaper.jpg']) {
    assert.equal(chrome(old, ['Anna_GLASS_UI_2560x1440.png', 'Sea.jpg']).wall(), 'wallpapers/Anna_GLASS_UI_2560x1440.png', old);
    assert.equal(chrome(old, ['Sea.jpg']).wall(), 'wallpapers/Sea.jpg', old + ' without Anna_GLASS_UI_2560x1440.png');
  }
}
{ // Unset: main.txt's fallback (Anna_GLASS_UI_2560x1440.png) is used while it exists, nothing is written.
  const a = chrome(undefined, ['Anna_GLASS_UI_2560x1440.png', 'Sea.jpg']);
  assert.equal(a.h.state.vars.has('anna.glass.v2.wallpaper'), false);
  assert.equal(a.c.currentWallpaper(), 'wallpapers/Anna_GLASS_UI_2560x1440.png');
  assert.equal(chrome(undefined, ['Sea.jpg']).wall(), 'wallpapers/Sea.jpg');
}
{ // A file deleted while foobar2000 runs disappears the next time the menu opens.
  const names = ['Anna_GLASS_UI_2560x1440.png', 'Sea.jpg'];
  const { wall, menuItems } = chrome('wallpapers/Anna_GLASS_UI_2560x1440.png', names);
  names.shift();
  assert.deepEqual(menuItems(), ['✓ Sea']);
  assert.equal(wall(), 'wallpapers/Sea.jpg');
}
{ // Empty folder: only the hint, and the saved value is left alone.
  const { wall, menuItems } = chrome('wallpapers/Anna_GLASS_UI_2560x1440.png', []);
  assert.deepEqual(menuItems(), []);
  assert.equal(wall(), 'wallpapers/Anna_GLASS_UI_2560x1440.png');
}

// ---- 2. CPU: animated panels are child windows ----------------------------------------------
// Windows check: a repaint of a windowless panel redrew all 14 JS panels plus the layout
// (~11 times a second while playing, ~80 % of one core). Child-window repaints stay local.
for (const name of ['AnnaLyrics', 'FooterSeek']) {
  assert(ini.includes(`panel.${name}.windowless = 0`), `${name} animates: must be a child window`);
  assert(!ini.includes(`panel.${name}.windowless = 1`), name);
}
// Timer-driven repaints in the lyrics and seek panels must not be full-window and must stay
// off while the panel is hidden; the GLASS list's now-playing glyph repaints only its own rect.
const glass = read('js/anna_glass_playlist.js');
const eqTimer = glass.slice(glass.indexOf('miniEqTimer=window.SetInterval'), glass.indexOf('function on_script_unload'));
assert(eqTimer.includes('AnnaDpi.repaintRect('), 'mini EQ: repaint only the glyph');
assert(!/window\.Repaint\(\)/.test(eqTimer), 'mini EQ: no full repaint');

// ---- 3. Memory: covers are kept at drawn size ----------------------------------------------
{
  const made = [];
  const image = (w, h) => { const img = { Width: w, Height: h, disposed: false,
    Resize(nw, nh) { const r = image(nw, nh); return r; }, RotateFlip() {}, Dispose() { this.disposed = true; } };
    made.push(img); return img; };
  const tracks = [handle('a.flac'), handle('b.flac')];
  const host = createHost({ playlists: [{ name: 'A', items: tracks }], overrides: {
    utils: { GetAlbumArtV2: () => image(1400, 1200), IsFile: () => false, Glob: () => [] },
    window: { Width: 600, Height: 400, SetCursor() {} },
  } });
  const ctx = panelContext(host);
  runScript(ctx, 'js/anna_glass_playlist.js');
  const group = run(ctx, 'nodes.find(n=>n.kind==="group")');
  assert(group, 'the list has an album group');
  const entry = run(ctx, 'getCover')(group);
  const S = run(ctx, 'COVER_SIZE');
  assert(entry.image, 'cover kept');
  assert(Math.max(entry.image.Width, entry.image.Height) <= S * 2, `cover cached at drawn size, not ${entry.image.Width}px`);
  assert.equal(Math.round(entry.image.Width / entry.image.Height * 100), Math.round(1400 / 1200 * 100), 'aspect kept');
  assert(made[0].disposed, 'the full-size original is released at once');
}
console.log('test_round21_perf: ok');
