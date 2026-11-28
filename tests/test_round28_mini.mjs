// Round 28: NATIVE is gone (its fixed colours did not suit the light interface); a mini player
// takes its place as the optional compact window (Panels UI mini mode, ☰ → Mini player).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { root, read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run, runScript, handle } from './helpers/fake_host.mjs';

const main = read('main.txt'), ini = read('foo_ui_panels.ini');

// ---- NATIVE removed ------------------------------------------------------------------------
for (const s of ['SwitchGlass', 'SwitchNative', 'NativeScroll', 'Single Column Playlist', 'hariiro.playlist.experimental'])
  assert(!main.includes(s), 'main.txt: ' + s);
for (const s of ['panel.SwitchGlass.', 'panel.SwitchNative.', 'panel.NativeScroll.', 'hariiro.playlist.experimental'])
  assert(!ini.includes(s), 'ini: ' + s);
assert(main.includes('$panel(GlassPlaylist,JS Panel,248,89,'), 'the Glass list is always shown');
for (const f of ['js/hariiro_mode_switch.js', 'js/hariiro_native_scroll.js']) assert(!fs.existsSync(root + '/' + f), f);
assert(!read('js/hariiro_glass_playlist.js').includes('switchNative'), 'no "Switch to NATIVE" menu item');
assert(!read('js/hariiro_i18n.js').includes('switchNative'));
{
  const ctx = panelContext(createHost());
  run(ctx, "include('hariiro_shared.js');");
  assert.equal(ctx.HariiroShared.PVAR.playlistExperimental, undefined);
}

// ---- Layout: full above 220 layout px, mini player below ----------------------------------
const MARK = '// ==== MINI PLAYER';
assert(main.includes('$ifgreater(%_height%,220,'), 'one condition switches the layouts');
const at = main.indexOf(MARK);
assert(at > 0, 'mini section');
const full = main.slice(main.indexOf('$ifgreater(%_height%,220,'), at), mini = main.slice(at);
for (const p of ['Playlists', 'GlassPlaylist', 'NavTabs', 'TopChrome', 'HariiroLyrics', 'CaptionStrip'])
  assert(full.includes(`$panel(${p},`) && !mini.includes(`$panel(${p},`), p + ' only in the full window');
for (const p of ['MiniSide', 'MiniCaption', 'Cover', 'FooterTransport', 'FooterSeek'])
  assert(mini.includes(`$panel(${p},`), p + ' in the mini player');
assert(mini.includes('%title%') && mini.includes('%artist%') && mini.includes('%playback_time%') && mini.includes('%length%'));
// Panels UI mini mode: enabled by mini.size; the full size is kept in two variables.
assert.match(ini, /^mini\.size = \d+ \d+\s*$/m);
assert.match(ini, /^mini\.anchor = RIGHT TOP\s*$/m);
assert.match(ini, /^mini\.saved_w_pvar = hariiro\.mini\.full\.w\s*$/m);
assert.match(ini, /^mini\.saved_h_pvar = hariiro\.mini\.full\.h\s*$/m);
assert(ini.includes('panel.MiniSide.script = js/hariiro_mini.js'));
assert(ini.includes('panel.MiniSide.windowless = 0'), 'child window: knows the display scale');
assert(ini.includes('panel.MiniCaption.script = js/hariiro_caption_strip.js'));
assert(read('js/hariiro_mini.js').includes('HariiroDpi.install()'), 'child windows use HariiroDpi');

// ---- Mini side panel: window size, back to full, favourite -------------------------------
{
  const FAV = 'Favorites', song = handle('C:\\m\\a.flac');
  let now = song;
  const ui = { WindowX: 2074, WindowY: -8, WindowWidth: 494, WindowHeight: 170, calls: [] };
  ui.SetWindowSize = (w, h) => ui.calls.push(['size', w, h]);
  ui.SetWindowPosition = (x, y) => ui.calls.push(['pos', x, y]);
  // At 200 %: the 480x156 px window Panels UI opened is 240x78 layout px.
  const W = 240, H = 78, S = 2;
  const host = createHost({ playlists: [{ name: 'Default', items: [song] }], overrides: {
    fb: { GetNowPlaying: () => now },
    window: { Width: 34 * S, Height: (H - 12) * S },
    panelsui: { PanelName: 'MiniSide', GetPanelRect: () => ({ X: W - 40, Y: 6, Width: 34, Height: H - 12 }) },
  } });
  const ctx = panelContext(host, { ActiveXObject: function (name) { if (name !== 'UIWizard') throw new Error(name); return ui; } });
  runScript(ctx, 'js/hariiro_mini.js');
  host.flushTimers();
  // Grown to 440x140 layout px (880x280 px), right edge kept (mini.anchor = RIGHT TOP).
  assert.deepEqual(ui.calls, [['size', 494 + 400, 170 + 124], ['pos', 2074 - 400, -8]]);
  ui.calls.length = 0;
  // The right size already: nothing happens.
  const host2 = createHost({ overrides: {
    window: { Width: 34 * S, Height: 128 * S },
    panelsui: { PanelName: 'MiniSide', GetPanelRect: () => ({ X: 400, Y: 6, Width: 34, Height: 128 }) },
  } });
  runScript(panelContext(host2, { ActiveXObject: () => ui }), 'js/hariiro_mini.js');
  host2.flushTimers();
  assert.deepEqual(ui.calls, []);

  // Top button: back to the full window.
  ctx.on_mouse_lbtn_up(17 * S, 14 * S);
  assert.deepEqual(host.state.actions, ['MINIMODE:TOGGLE']);
  // Heart: adds the playing track to Favorites, again removes it; the indicator follows.
  ctx.on_mouse_lbtn_up(17 * S, 48 * S);
  const fav = host.state.playlists.find(p => p.name === FAV);
  assert(fav && fav.items.includes(song), 'added to Favorites');
  assert.equal(host.state.vars.get('hariiro.favorite.current'), '1');
  ctx.on_mouse_lbtn_up(17 * S, 48 * S);
  assert(!fav.items.includes(song), 'removed again');
  assert.equal(host.state.vars.get('hariiro.favorite.current'), '0');
  // Nothing playing: no change, no error.
  now = null;
  ctx.on_mouse_lbtn_up(17 * S, 48 * S);
  assert.equal(fav.items.length, 0);
}
// The sidebar uses the same favourites helper (one implementation).
assert(read('js/playlist_browser.js').includes('HariiroFavorites.toggleCurrent('));
assert(read('js/playlist_browser.js').includes("include('hariiro_favorites.js');"));

// ---- Sidebar after a resize ------------------------------------------------------------------
// Back from the mini player (Windows check): Panels UI hides the full window's panels and shows
// them again with no on_size; the sidebar's child window then stayed black below its rows until
// the mouse moved over it. It now repaints (twice, the background settles) when it becomes
// visible again, and after a resize.
{
  const host = createHost({ playlists: [{ name: 'Default' }], vars: { 'hariiro.nav.mode': 'library' } });
  const sb = panelContext(host);
  runScript(sb, 'js/playlist_browser.js');
  const settle = () => { const before = host.state.repaints; for (let i = 0; i < 4; i++) host.flushTimers(); return host.state.repaints - before; };
  settle();
  assert.equal(settle(), 0, 'nothing while it stays visible');
  host.window.IsVisible = false; settle();
  host.window.IsVisible = true;
  assert(settle() >= 2, 'shown again: repainted twice');
  assert.equal(settle(), 0, 'and then quiet');
  sb.on_size();
  assert(settle() >= 2, 'after a resize too');
}

// ---- Caption: drag area from the panel's own rect; double-click ---------------------------
{
  const calls = [];
  const fake = name => ({ SetPseudoCaption: (...a) => calls.push([name, ...a]), ToggleMaximize: () => calls.push([name, 'max']) });
  for (const [name, rect] of [['CaptionStrip', { X: 367, Y: 4, Width: 500, Height: 37 }], ['MiniCaption', { X: 130, Y: 6, Width: 264, Height: 44 }]]) {
    calls.length = 0;
    const host = createHost({ overrides: { window: { Width: rect.Width, Height: rect.Height }, panelsui: { PanelName: name, GetPanelRect: () => rect } } });
    const ctx = panelContext(host, { ActiveXObject: function (n) { return fake(n); } });
    runScript(ctx, 'js/hariiro_caption_strip.js');
    assert.deepEqual(calls[0], ['UIHacks', rect.X, rect.Y, rect.Width, rect.Height], name + ' drag area');
    ctx.on_mouse_lbtn_dblclk(10, 10);
    if (name === 'MiniCaption') assert.deepEqual(host.state.actions, ['MINIMODE:TOGGLE'], 'double-click: back to full');
    else assert(calls.some(c => c[1] === 'max'), 'double-click: maximise');
  }
}

// ---- Compact transport ----------------------------------------------------------------------
{
  let playPause = 0, prev = 0, next = 0;
  const icons = [];
  const host = createHost({ overrides: {
    fb: { IsPlaying: false, IsPaused: false, PlayOrPause: () => playPause++, Prev: () => prev++, Next: () => next++ },
    gdi: { Image: p => ({ Width: 192, Height: 192, path: p }) },
    window: { Width: 270, Height: 58, CreatePopupMenu: () => ({ AppendMenuItem() {}, TrackPopupMenu: () => 0 }) },
    plman: { PlaybackOrder: 0 },
  } });
  const ctx = panelContext(host);
  runScript(ctx, 'js/hariiro_transport.js');
  const slots = [...ctx.slots()];
  assert.deepEqual(slots.map(s => s.i), [0, 2, 3, 4, 6], 'order, previous, play, next, output');
  assert(slots.every((s, k) => Math.abs(s.x - (k + 0.5) * 270 / 5) < 1));
  ctx.on_mouse_lbtn_up(slots[1].x, 29); ctx.on_mouse_lbtn_up(slots[2].x, 29); ctx.on_mouse_lbtn_up(slots[3].x, 29);
  assert.deepEqual([prev, playPause, next], [1, 1, 1]);
  const gr = new Proxy({}, { get: (_, k) => (...a) => { if (k === 'DrawImage') icons.push(a); } });
  ctx.on_paint(gr);
  assert(icons.every(a => a[4] <= 52), 'icons fit the mini height');
  host.window.Width = 428;
  assert.equal(ctx.slots().length, 7, 'the footer keeps all seven');
}

// ---- ☰ menu entry and labels ----------------------------------------------------------------
{
  let pick = 0;
  const items = [];
  const host = createHost({ overrides: {
    utils: { Glob: () => [], IsFile: () => false },
    window: { Width: 183, Height: 31, NotifyOthers() {}, CreatePopupMenu: () => ({ AppendMenuItem: (f, id, t) => items.push({ id, t }), AppendMenuSeparator() {}, AppendTo() {}, TrackPopupMenu: () => pick }) },
  } });
  const ctx = panelContext(host);
  runScript(ctx, 'js/hariiro_top_chrome.js');
  ctx.settingsMenu(0, 0);
  const item = items.find(i => i.t === ctx.HariiroI18n.t('miniPlayer'));
  assert(item, 'Mini player in the ☰ menu');
  pick = item.id; ctx.settingsMenu(0, 0);
  assert(host.state.actions.includes('MINIMODE:TOGGLE'));
  const I = ctx.HariiroI18n;
  for (const k of ['miniPlayer', 'restoreFull']) for (const l of I.LANGS) assert(I.dict[l][k], `${l}: ${k}`);
}

console.log('PASS test_round28_mini');
