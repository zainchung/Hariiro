// Round 28 review fixes (findings of an independent review of rounds 26-28):
// 1. panels repaint when the interface tone or the light-icon folder changes, not only the hue;
//    TopChrome publishes the icon folder before the tone, so the first repaint has both;
// 2. ☰ menu: the tone ids (400-402) are not taken for wallpapers when there are > 100 images;
// 3. the sidebar cancels its timers when its script unloads.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { root, read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run, runScript } from './helpers/fake_host.mjs';

// ---- 1. Look variables -------------------------------------------------------------------------
{
  const ctx = panelContext(createHost());
  run(ctx, "include('hariiro_shared.js');include('hariiro_theme.js');");
  const T = ctx.HariiroTheme, P = ctx.HariiroShared.PVAR;
  for (const k of [P.themeHue, P.themeDegree, P.tone, P.controlsLight]) assert(T.isLookVariable(k), k);
  for (const k of [P.language, P.queueOpen, P.wallpaper, 'hariiro.tc.18-26-49']) assert(!T.isLookVariable(k), k);
}
// Every panel that draws through HariiroTheme and listens to Panels UI variables repaints on them.
for (const f of fs.readdirSync(root + '/js').filter(n => n.endsWith('.js'))) {
  const src = read('js/' + f);
  if (!src.includes('HariiroTheme.graphics(') || !src.includes('function on_panelsui_variable_changed')) continue;
  assert(src.includes('HariiroTheme.isLookVariable(name)'), `js/${f}: repaint on HariiroTheme.isLookVariable`);
}
// Behaviour, for panels that draw icons from the colour folder.
for (const [file, name, extra] of [['js/hariiro_transport.js', 'FooterTransport', {}], ['js/hariiro_queue_toggle.js', 'FooterQueueToggle', {}]]) {
  const host = createHost({ overrides: { panelsui: { PanelName: name }, gdi: { Image: () => ({ Width: 192, Height: 192 }) }, window: { Width: 428, Height: 67 }, plman: { PlaybackOrder: 0 }, fb: { IsPlaying: false, IsPaused: false } } });
  const ctx = panelContext(host, extra);
  runScript(ctx, file);
  for (const k of ['hariiro.tone', 'hariiro.controls.light']) {
    const before = host.state.repaints;
    ctx.on_panelsui_variable_changed(k);
    assert(host.state.repaints > before, `${file} repaints on ${k}`);
  }
}
// TopChrome writes the icon folder before the tone.
{
  const writes = [];
  const host = createHost({ vars: { 'hariiro.tone.mode': 'light' }, overrides: {
    fb: { ProfilePath: 'C:\\fb\\profile\\' },
    utils: { Glob: () => [], IsFile: p => /hariiro_top_chrome\.js$|light\\play\.png$/.test(p) },
    window: { Width: 183, Height: 31, NotifyOthers() {}, CreatePopupMenu: () => ({ AppendMenuItem() {}, AppendMenuSeparator() {}, AppendTo() {}, TrackPopupMenu: () => 0 }) },
  } });
  const set = host.panelsui.SetVariable.bind(host.panelsui);
  host.panelsui.SetVariable = (k, v) => { writes.push(k); set(k, v); };
  runScript(panelContext(host), 'js/hariiro_top_chrome.js');
  const iTone = writes.indexOf('hariiro.tone'), iIcons = writes.indexOf('hariiro.controls.light');
  assert(iTone >= 0 && iIcons >= 0, 'both published');
  assert(iIcons < iTone, 'icon folder first, then the tone');
}

// ---- 2. Menu ids with many wallpapers -------------------------------------------------------
{
  const SKIN = 'C:\\fb\\profile\\foo_ui_panels-skins\\Hariiro\\';
  const many = Array.from({ length: 105 }, (_, i) => SKIN + 'images\\wallpapers\\w' + String(i).padStart(3, '0') + '.png');
  let pick = 0;
  const items = [];
  const host = createHost({ vars: { 'hariiro.wallpaper': 'wallpapers/w000.png', 'hariiro.tone.mode': 'light' }, overrides: {
    fb: { ProfilePath: 'C:\\fb\\profile\\' },
    gdi: { Image: () => { throw new Error('not decoded in this test'); } },
    utils: { Glob: p => p.endsWith('wallpapers\\*') ? many.slice() : [], IsFile: p => p === SKIN + 'js\\hariiro_top_chrome.js' },
    window: { Width: 183, Height: 31, NotifyOthers() {}, CreatePopupMenu: () => ({ AppendMenuItem: (f, id, t) => items.push({ id, t }), AppendMenuSeparator() {}, AppendTo() {}, TrackPopupMenu: () => pick }) },
  } });
  const ctx = panelContext(host);
  runScript(ctx, 'js/hariiro_top_chrome.js');
  ctx.settingsMenu(0, 0);
  assert.equal(items.filter(i => i.id >= 300 && i.id < 360).length, 60, 'at most 60 wallpapers listed');
  pick = 400; ctx.settingsMenu(0, 0); // "Automatic"
  assert.equal(host.state.vars.get('hariiro.tone.mode'), 'auto', 'id 400 is the tone, not wallpaper #101');
  assert.equal(host.state.vars.get('hariiro.wallpaper'), 'wallpapers/w000.png', 'wallpaper unchanged');
}

// ---- 3. Sidebar timers on unload ------------------------------------------------------------
{
  const host = createHost({ playlists: [{ name: 'Default' }], vars: { 'hariiro.nav.mode': 'library' } });
  const sb = panelContext(host);
  runScript(sb, 'js/playlist_browser.js');
  sb.on_size(); host.flushTimers();
  assert(host.state.timers.size > 0, 'visibility poll and settle repaint pending');
  assert.equal(typeof sb.on_script_unload, 'function');
  sb.on_script_unload();
  assert.equal(host.state.timers.size, 0, 'all cancelled');
}

console.log('PASS test_round28_review');
