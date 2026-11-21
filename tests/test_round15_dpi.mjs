// Round 15: OLE drops onto the sidebar / middle / Queue.
// Windows check (foo_js_panel 1.9.0, Panels UI reborn): with windowless = 1 the
// host misroutes a drop - the target panel gets on_drag_leave instead of
// on_drag_drop and foobar2000 inserts the tracks into the ACTIVE playlist.
// Real child windows (windowless = 0) receive on_drag_drop, but get physical
// pixels, so the panels draw at half size at 200% DPI. HariiroDpi scales them.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, installIncludeShim } from './helpers/js_panel.mjs';

installIncludeShim(vm);
const PANELS = { Playlists: 'js/playlist_browser.js', GlassPlaylist: 'js/hariiro_glass_playlist.js', HariiroQueue: 'js/hariiro_queue.js' };

// ---------------------------------------------------------------- 1. layout
const ini = read('foo_ui_panels.ini');
for (const name of Object.keys(PANELS)) {
  assert(ini.includes(`panel.${name}.windowless = 0`), `${name} must be a real child window (own OLE drop target)`);
  assert(!ini.includes(`panel.${name}.windowless = 1`), `${name}: windowless routing misdirects drops`);
}
// Every child-window JS panel (windowless = 0) gets physical pixels, so all of
// them go through HariiroDpi - the three drop targets plus the search box and the
// NATIVE-mode scroll strip, which were child windows already.
// Round 21: the lyrics card and the seek bar animate; as child windows their repaints stay local.
const CHILD = { ...PANELS, GlassSearch: 'js/hariiro_search.js', NativeScroll: 'js/hariiro_native_scroll.js',
  HariiroLyrics: 'js/hariiro_lyrics.js', FooterSeek: 'js/hariiro_footer_slider.js' };
for (const name of ['GlassSearch', 'NativeScroll']) assert(ini.includes(`panel.${name}.windowless = 0`), name);
for (const m of ini.matchAll(/^panel\.(\w+)\.windowless = 0$/gm))
  assert(CHILD[m[1]], `${m[1]} is a child window but is not covered by HariiroDpi`);
for (const [name, file] of Object.entries(CHILD)) {
  const src = read(file);
  assert(!/window\.RepaintRect\(/.test(src), `${file}: use HariiroDpi.repaintRect()`);
  assert(!/gdi\.CalcTextWidth\(/.test(src), `${file}: use HariiroDpi.textWidth()`);
  assert(src.includes("include('hariiro_dpi.js');"), `${file}: include hariiro_dpi.js`);
  assert(/HariiroDpi\.install\(\);\s*$/.test(src), `${file}: HariiroDpi.install() must be the last statement`);
  assert(!/window\.(Width|Height)\b/.test(src), `${file}: use HariiroDpi.width()/height() (layout units)`);
  assert(!/gdi\.Font\(/.test(src), `${file}: use HariiroDpi.font() so text scales`);
  assert(!/\.TrackPopupMenu\(/.test(src), `${file}: use HariiroDpi.popup() so menus open under the pointer`);
  assert(!/fb\.DoDragDrop\(/.test(src), `${file}: use HariiroDpi.doDragDrop() so nested host callbacks are converted`);
}

// ------------------------------------------------------- 2. adapter (unit)
function adapter({ width, height, rect }) {
  const fonts = [], repaints = [];
  const win = { Width: width, Height: height, RepaintRect: (...a) => repaints.push(a) };
  const ctx = vm.createContext({
    window: win, Math, Number, Object, Array, Proxy, Map, isFinite, repaints,
    gdi: { Font: (name, size, style) => { const f = { Name: name, Size: size, Style: style, Height: size + 2 }; fonts.push(f); return f; },
      CalcTextWidth: (text, f) => text.length * f.Size / 2 },
    panelsui: { GetPanelRect: () => rect },
  });
  vm.runInContext(read('js/hariiro_dpi.js'), ctx);
  return { ctx, win, fonts, D: ctx.HariiroDpi };
}
function recorder() {
  const calls = [];
  const gr = new Proxy({}, { get: (_, k) => (...a) => {
    calls.push([k, a]);
    if (k === 'CalcTextWidth') return 100;
    if (k === 'CalcTextHeight') return 30;
    if (k === 'MeasureString') return { X: a[2], Y: a[3], Width: 80, Height: 40, Lines: 2, Chars: 9 };
    if (k === 'EstimateLineWrap') return ['ab', 60, 'cd', 40];
    return undefined;
  } });
  return { gr, calls };
}

{ // scale 2: child window on a 200% display
  const { D, fonts } = adapter({ width: 392, height: 900, rect: { X: 23, Y: 89, Width: 196, Height: 450 } });
  D.update();
  assert.equal(D.scale(), 2);
  assert.equal(D.width(), 196);
  assert.equal(D.height(), 450);
  const F = D.font('Yu Gothic UI', 12, 1);
  assert.equal(fonts.length, 0, 'real fonts are created lazily, once the scale is known');
  const { gr, calls } = recorder();
  const g = D.graphics(gr);
  g.FillSolidRect(1, 2, 3, 4, 0xff000000);
  g.FillRoundRect(10, 20, 30, 40, 5, 6, 0xff111111);
  g.DrawRoundRect(10, 20, 30, 40, 5, 6, 1, 0xff222222);
  g.DrawRect(1, 2, 3, 4, 1, 0xff333333);
  g.FillEllipse(1, 2, 3, 4, 0xff444444);
  g.GdiDrawText('x', F, 0xffffffff, 5, 6, 70, 80, 0x24);
  g.FillPolygon(0xff555555, 0, [7, 8, 17, 18]);
  g.DrawImage('img', 1, 2, 3, 4, 0, 0, 90, 90);
  g.GdiAlphaBlend('img', 1, 2, 3, 4, 0, 5, 90, 7, 128);
  const byName = n => calls.find(c => c[0] === n)[1];
  assert.deepEqual(byName('FillSolidRect'), [2, 4, 6, 8, 0xff000000]);
  assert.deepEqual(byName('FillRoundRect'), [20, 40, 60, 80, 10, 12, 0xff111111]);
  assert.deepEqual(byName('DrawRoundRect'), [20, 40, 60, 80, 10, 12, 2, 0xff222222]);
  assert.deepEqual(byName('DrawRect'), [2, 4, 6, 8, 2, 0xff333333]);
  assert.deepEqual(byName('FillEllipse'), [2, 4, 6, 8, 0xff444444]);
  const text = byName('GdiDrawText');
  assert.deepEqual([text[0], text[2], ...text.slice(3)], ['x', 0xffffffff, 10, 12, 140, 160, 0x24]);
  assert.equal(text[1].Size, 24, 'font is created at the scaled size');
  assert.equal(text[1].Style, 1);
  assert.deepEqual(byName('FillPolygon'), [0xff555555, 0, [14, 16, 34, 36]]);
  assert.deepEqual(byName('DrawImage'), ['img', 2, 4, 6, 8, 0, 0, 90, 90], 'source rect stays in image pixels');
  assert.deepEqual(byName('GdiAlphaBlend'), ['img', 2, 4, 6, 8, 0, 5, 90, 7, 128]);
  g.GdiDrawText('y', F, 0, 0, 0, 1, 1, 0);
  assert.equal(fonts.length, 1, 'one real font per descriptor and scale');
  // Measurements come back in layout units.
  assert.equal(g.CalcTextWidth('x', F), 50);
  assert.equal(g.CalcTextHeight('x', F), 15);
  const m = g.MeasureString('x', F, 3, 4, 100, 150, 0);
  assert.deepEqual(calls.at(-1)[1].slice(2, 6), [6, 8, 200, 300]);
  assert.deepEqual({ ...m }, { X: 3, Y: 4, Width: 40, Height: 20, Lines: 2, Chars: 9 });
  assert.deepEqual([...g.EstimateLineWrap('abcd', F, 50)], ['ab', 30, 'cd', 20]);
  assert.equal(calls.at(-1)[1][2], 100);
  // Popup menus open at the physical pointer position.
  let at = null; D.popup({ TrackPopupMenu: (x, y, f) => { at = [x, y, f]; return 7; } }, 15, 25, 0);
  assert.deepEqual(at, [30, 50, 0]);
}

{ // 125 % / 150 % displays, and moving the window to a monitor with another DPI
  const rect = { Width: 200, Height: 100 };
  const { D, win, fonts, ctx } = adapter({ width: 250, height: 125, rect });
  const F = D.font('Yu Gothic UI', 12, 0);
  const drawAt = () => { const { gr, calls } = recorder(); D.graphics(gr).GdiDrawText('x', F, 0, 10, 20, 30, 40, 0); return calls[0][1]; };
  D.update();
  assert.equal(D.scale(), 1.25);
  assert.deepEqual([D.width(), D.height()], [200, 100]);
  let a = drawAt();
  assert.deepEqual(a.slice(3, 7), [13, 25, 38, 50]);
  assert.equal(a[1].Size, 15);
  win.Width = 300; win.Height = 150; // dragged to a 150 % monitor: host resizes the child window
  assert.equal(D.update(), true, 'scale change is detected');
  assert.equal(D.scale(), 1.5);
  a = drawAt();
  assert.deepEqual(a.slice(3, 7), [15, 30, 45, 60]);
  assert.equal(a[1].Size, 18, 'a new real font is made for the new scale');
  win.Width = 250; win.Height = 125; D.update();
  assert.equal(drawAt()[1], fonts[0], 'fonts are cached per scale');
  // gdi-level helpers used by the search box.
  D.repaintRect(37, 2, 100, 20);
  assert.deepEqual(ctx.repaints.at(-1), [46, 3, 125, 25]);
  assert.equal(D.textWidth('abcd', F), 4 * 15 / 2 / 1.25, 'textWidth returns layout units');
}

{ // scale 1: windowless or missing rect - drawing is untouched
  for (const opts of [{ width: 196, height: 450, rect: { Width: 196, Height: 450 } }, { width: 392, height: 900, rect: null }]) {
    const { D } = adapter(opts);
    D.update();
    assert.equal(D.scale(), 1);
    const { gr, calls } = recorder();
    const F = D.font('Segoe UI', 10, 0);
    D.graphics(gr).GdiDrawText('x', F, 1, 5.5, 6, 7, 8, 0);
    assert.deepEqual(calls[0][1].slice(3), [5.5, 6, 7, 8, 0]);
    assert.equal(calls[0][1][1].Size, 10);
  }
}

{ // callback wrapping: divide once, keep return values, no double scaling on re-entry
  const { ctx, D } = adapter({ width: 392, height: 900, rect: { Width: 196, Height: 450 } });
  vm.runInContext(`
    var seen=[];
    function on_paint(gr){seen.push(['paint',typeof gr.FillSolidRect]);}
    function on_size(){seen.push(['size',HariiroDpi.scale()]);}
    function on_mouse_move(x,y,m){seen.push(['move',x,y,m]);}
    function on_mouse_rbtn_up(x,y){seen.push(['rup',x,y]);return true;}
    function on_drag_enter(a,x,y){on_drag_over(a,x,y);}
    function on_drag_over(a,x,y){seen.push(['over',x,y]);a.Effect=1;}
    function on_drag_drop(a,x,y){seen.push(['drop',x,y]);}
    HariiroDpi.install();`, ctx);
  ctx.on_size();
  ctx.on_mouse_move(100, 60, 1);
  assert.equal(ctx.on_mouse_rbtn_up(40, 20), true);
  const a = { Effect: 0 };
  ctx.on_drag_enter(a, 200, 80);
  ctx.on_drag_drop(a, 202, 82);
  ctx.on_paint({ FillSolidRect() {} });
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.seen)), [
    ['size', 2], ['move', 50, 30, 1], ['rup', 20, 10], ['over', 100, 40], ['drop', 101, 41], ['paint', 'function']]);
  assert.equal(a.Effect, 1);
  assert.equal(D.scale(), 2);
}

{ // Windows: fb.DoDragDrop runs a modal loop INSIDE on_mouse_move, and the host
  // calls on_paint / on_drag_* of the same panel from there. Those must still be
  // converted (a raw gr crashed GdiDrawText with "argument 2 is not a gdi.Font").
  const { ctx } = adapter({ width: 392, height: 900, rect: { Width: 196, Height: 450 } });
  ctx.hostDrag = null;
  ctx.fb = { DoDragDrop: (...args) => { ctx.hostDrag(); return 'dd:' + args.length; } };
  vm.runInContext(`
    var seen=[];
    var F=HariiroDpi.font('Yu Gothic UI',12,0);
    function on_paint(gr){gr.GdiDrawText('x',F,0,1,2,3,4,0);}
    function on_drag_enter(a,x,y){on_drag_over(a,x,y);}
    function on_drag_over(a,x,y){seen.push(['over',x,y]);}
    function on_mouse_move(x,y){seen.push(['move',x,y]);seen.push(['dd',HariiroDpi.doDragDrop(1,'handles',1,{})]);}
    function on_mouse_lbtn_up(x,y){on_mouse_rbtn_up(x,y);}
    function on_mouse_rbtn_up(x,y){seen.push(['rup',x,y]);HariiroDpi.popup({TrackPopupMenu(px,py){seen.push(['menu',px,py]);on_mouse_move(px,py);return 0;}},x,y);}
    HariiroDpi.install();`, ctx);
  const drawn = [];
  ctx.hostDrag = () => { ctx.on_drag_enter({}, 300, 100); ctx.on_paint({ GdiDrawText: (...a) => drawn.push(a) }); };
  ctx.on_mouse_move(40, 20);
  ctx.hostDrag = () => {};
  ctx.on_mouse_lbtn_up(10, 30);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.seen)), [
    ['move', 20, 10], ['over', 150, 50], ['dd', 'dd:4'],
    ['rup', 5, 15], ['menu', 10, 30], ['move', 5, 15], ['dd', 'dd:4']]);
  assert.equal(drawn.length, 1);
  assert.equal(drawn[0][1].Size, 24, 'nested on_paint still gets the scaling gr (real font)');
  assert.deepEqual(drawn[0].slice(3), [2, 4, 6, 8, 0]);
}

// ------------------------------------- 3. real sidebar as a 200% child window
{
  const mk = (a = []) => ({ get Count() { return a.length; }, Convert: () => [...a], Item: i => a[i], Add(h) { a.push(h); }, AddRange(o) { a.push(...o.Convert()); } });
  const records = [
    { name: 'User A', items: [{ Path: 'a.flac' }] }, { name: 'User B', items: [{ Path: 'b.flac' }] },
    { name: 'Hariiro - Favorites', items: [{ Path: 'fav.flac' }] }];
  const vars = new Map([['hariiro.nav.mode', 'library'], ['hariiro.drag.origin', 'glass:0'], ['hariiro.theme.hue', 'rose']]);
  let active = 0; const fontSizes = []; const drawn = [];
  const plman = {
    get PlaylistCount() { return records.length; }, get ActivePlaylist() { return active; }, set ActivePlaylist(v) { active = v; },
    get PlayingPlaylist() { return -1; }, FindPlaylist: n => records.findIndex(r => r.name === n), GetPlaylistName: i => records[i]?.name || '',
    GetPlaylistItems: i => mk(records[i]?.items.slice() || []), PlaylistItemCount: i => records[i]?.items.length || 0,
    IsPlaylistLocked: () => false, GetPlaybackQueueContents: () => [], GetPlaylistSelectedItems: () => mk([]),
    SetPlaylistLockedActions() {}, GetPlayingItemLocation: () => ({ IsValid: false }), GetPlaylistFocusItemIndex: () => 0,
  };
  const win = { ID: 'Playlists', Width: 392, Height: 900, IsVisible: true, Repaint() {},
    GetProperty: (_k, d) => d, SetProperty() {}, SetTimeout: () => 1, ClearTimeout() {}, SetInterval: () => 1, ClearInterval() {},
    CreatePopupMenu: () => ({ AppendMenuItem() {}, AppendMenuSeparator() {}, TrackPopupMenu: () => 0 }) };
  const ctx = vm.createContext({ console: { log() {} }, plman, window: win,
    fb: { TitleFormat: () => ({ EvalWithMetadb: () => '', EvalWithMetadbs: hs => hs.Convert().map(() => 'A') }),
      GetLibraryItems: () => mk([]), GetNowPlaying: () => null, CreateHandleList: () => mk([]) },
    panelsui: { PanelName: 'Playlists', GetVariable: (k, d) => vars.get(k) ?? d, SetVariable: (k, v) => vars.set(k, v),
      RunAction: () => true, GetPanelRect: () => ({ X: 23, Y: 89, Width: 196, Height: 450 }) },
    utils: { CheckComponent: () => false },
    gdi: { Font: (n, s, st) => { fontSizes.push(s); return { Name: n, Size: s, Style: st }; } } });
  ctx.include = f => vm.runInContext(read('js/' + f), ctx);
  vm.runInContext(read('js/playlist_browser.js'), ctx);
  ctx.on_size();
  assert.equal(ctx.HariiroDpi.scale(), 2);
  // Sidebar rows are 30 layout px from y=8: find "User B" and drop on it in PHYSICAL pixels.
  const row = ctx.entries().findIndex(r => r.name === 'User B');
  assert(row >= 0);
  const yLayout = 8 + 30 * row + 14;
  const over = { Effect: 0 };
  ctx.on_drag_enter(over, 80 * 2, yLayout * 2);
  ctx.on_drag_over(over, 80 * 2, yLayout * 2);
  assert.equal(over.Effect, 1, 'physical pointer maps onto the User B row');
  const drop = { Effect: 0 };
  ctx.on_drag_drop(drop, 80 * 2, yLayout * 2);
  assert.equal(drop.Effect, 1);
  assert.equal(drop.Playlist, plman.FindPlaylist('User B'), 'drop goes to the row under the pointer, not the active playlist');
  // Painting fills the physical window and uses doubled font sizes.
  const gr = new Proxy({}, { get: (_, k) => (...a) => { drawn.push([k, a]); return k === 'CalcTextWidth' ? 10 : undefined; } });
  ctx.on_paint(gr);
  const rects = drawn.filter(c => c[0] === 'FillRoundRect' || c[0] === 'FillSolidRect');
  assert(rects.length > 0);
  const right = Math.max(...rects.map(c => c[1][0] + c[1][2]));
  assert(right > 300 && right <= 392, `rows span the physical width (right edge ${right})`);
  assert(fontSizes.includes(24), `12px fonts are created at 24px (got ${fontSizes})`);
}

// ------------------------------- 4. search box at 200 % (child window since Stage 2G)
{
  const props = new Map(), repaints = [], drawn = [];
  const win = { Width: 608, Height: 62, IsVisible: true, Repaint() {}, RepaintRect: (...a) => repaints.push(a),
    GetProperty: (k, d) => props.get(k) ?? d, SetProperty: (k, v) => props.set(k, v), SetCursor() {},
    SetInterval: fn => { win.tick = fn; return 1; }, ClearInterval() {},
    CreatePopupMenu: () => ({ AppendMenuItem() {}, TrackPopupMenu: () => 0 }) };
  props.set('Hariiro.Search.LastQuery.v1', 'abcd');
  const ctx = vm.createContext({ console: { log() {} }, window: win,
    plman: { PlaylistCount: 0, ActivePlaylist: -1, PlayingPlaylist: -1, FindPlaylist: () => -1, GetPlaybackQueueContents: () => [] },
    panelsui: { GetVariable: (_k, d) => d, SetVariable() {}, GetPanelRect: () => ({ X: 369, Y: 6, Width: 304, Height: 31 }) },
    utils: { IsKeyPressed: () => false },
    gdi: { Font: (n, s, st) => ({ Name: n, Size: s, Style: st }), CalcTextWidth: (t, f) => t.length * f.Size / 2 } });
  ctx.include = f => vm.runInContext(read('js/' + f), ctx);
  vm.runInContext(read('js/hariiro_search.js'), ctx);
  ctx.on_size && ctx.on_size();
  assert.equal(ctx.HariiroDpi.scale(), 2);
  // FONT is 11 layout px -> 5.5 layout px per char in this fake. Click just after "ab"
  // (38 + 2*5.5 = 49 layout px) in PHYSICAL pixels: caret lands after 2 characters.
  ctx.on_mouse_lbtn_down(50 * 2, 15 * 2);
  assert.equal(vm.runInContext('caret', ctx), 2, 'click position maps through the scale');
  win.tick();
  assert.deepEqual(repaints.at(-1), [74, 4, 460, 54], 'caret blink repaints the physical text box');
  ctx.on_paint(new Proxy({}, { get: (_, k) => (...a) => { drawn.push([k, a]); return k === 'CalcTextWidth' ? 22 : undefined; } }));
  const box = drawn.find(c => c[0] === 'FillRoundRect')[1];
  assert.deepEqual(box.slice(0, 4), [0, 0, 608, 62], 'glass box fills the physical window');
}

console.log('PASS round15 dpi: child-window drop routing, DPI adapter (100-200 %, DPI change), sidebar and search at 200 %');
