// Round 21 (2): Panels UI redraws the whole layout twice a second while playing, and every
// JS panel paints again. Measured on Windows, antialiased round rects (0.3-0.5 ms each) and
// scaling 192 px PNGs (0.6 ms each) made up most of that time. js/anna_paint_cache.js draws
// each once into a cached bitmap; panels then only blit it (0.03-0.1 ms).
import assert from 'node:assert/strict';
import { read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run, runScript, handle } from './helpers/fake_host.mjs';

// ---- fake GDI with bitmaps that record what was drawn on them --------------------------------
function fakeGdi() {
  const made = [];
  const image = (w, h) => {
    const img = { Width: w, Height: h, disposed: false, calls: [], resized: 0,
      Resize(nw, nh) { this.resized++; return image(nw, nh); }, RotateFlip() {},
      Dispose() { this.disposed = true; },
      GetGraphics() { return recorder(img.calls); }, ReleaseGraphics() {} };
    made.push(img); return img;
  };
  return { made, image, CreateImage: (w, h) => image(w, h) };
}
function recorder(calls) {
  return new Proxy({}, { get: (_, k) => (k === 'then' ? undefined : (...a) => { calls.push([k, ...a]); return 0; }) });
}

// ---- 1. the module ---------------------------------------------------------------------------
{
  const g = fakeGdi();
  const host = createHost({ overrides: { gdi: { CreateImage: g.CreateImage } } });
  const ctx = panelContext(host);
  run(ctx, "include('anna_theme.js');include('anna_paint_cache.js');");
  const C = ctx.AnnaPaintCache;
  assert(Object.isFrozen(C));

  // icon(): resized once per drawn size, never upscaled
  const png = g.image(192, 192);
  const a = C.icon(png, 39, 39, 2), b = C.icon(png, 39, 39, 2);
  assert.equal(a, b, 'same copy on the next paint');
  assert.equal(png.resized, 1);
  assert.deepEqual([a.Width, a.Height], [78, 78], '2 device px per layout px');
  assert.equal(C.icon(png, 39, 39, 1).Width, 39);
  assert.equal(C.icon(png, 120, 120, 2), png, 'no upscaling: the original is drawn');
  const calls = [];
  C.drawIcon(recorder(calls), png, 10, 20, 39, 39, 68, 2);
  assert.deepEqual(calls[0], ['DrawImage', a, 10, 20, 39, 39, 0, 0, 78, 78, 0, 68]);

  // shape(): painted once into a bitmap, then only blitted
  let painted = 0;
  const paint = (q, x, y) => { painted++; q.FillRoundRect(x, y, 100, 30, 7, 7, 0x52132242); q.DrawRoundRect(x, y, 100, 30, 7, 7, 1, 0xffffafda); };
  const out = [];
  C.shape(recorder(out), 'row|a', 5, 50, 100, 30, 3, paint);
  C.shape(recorder(out), 'row|a', 5, 90, 100, 30, 3, paint);
  assert.equal(painted, 1, 'second row with the same look reuses the bitmap');
  assert.deepEqual(out.map(c => c[0]), ['DrawImage', 'DrawImage'], 'the panel only blits');
  const bmp = out[0][1];
  assert.deepEqual([bmp.Width, bmp.Height], [106, 36], 'margin around the shape for glows');
  assert.deepEqual(out[1].slice(2, 6), [2, 87, 106, 36]);
  assert.deepEqual(bmp.calls[0], ['FillRoundRect', 3, 3, 100, 30, 7, 7, 0x52132242], 'drawn at the margin offset');
  C.shape(recorder(out), 'row|b', 5, 50, 100, 30, 3, paint);
  C.shape(recorder(out), 'row|a', 5, 50, 120, 30, 3, paint);
  assert.equal(painted, 3, 'another look or size is another bitmap');
  // Accent colours: the bitmap is drawn through AnnaTheme.graphics and keyed by the accent.
  ctx.AnnaTheme.set('blue');
  C.shape(recorder(out), 'row|a', 5, 50, 100, 30, 3, paint);
  assert.equal(painted, 4, 'accent change repaints the bitmap');
  const blue = out[out.length - 1][1];
  assert.notEqual(ctx.AnnaTheme.recolor(0xffffafda), 0xffffafda, 'precondition: blue recolours this frame');
  assert.equal(blue.calls[1][8], ctx.AnnaTheme.recolor(0xffffafda), 'colours recoloured for the accent');
  // Bounded: old bitmaps are released.
  for (let i = 0; i < 300; i++) C.shape(recorder([]), 'k' + i, 0, 0, 10, 10, 0, paint);
  assert(g.made.filter(m => m.disposed).length >= 150, 'least recently used bitmaps are disposed');
  // A host without CreateImage still paints directly.
  const host2 = createHost({ overrides: { gdi: { CreateImage: () => { throw new Error('no'); } } } });
  const ctx2 = panelContext(host2);
  run(ctx2, "include('anna_theme.js');include('anna_paint_cache.js');");
  const direct = [];
  ctx2.AnnaPaintCache.shape(recorder(direct), 'x', 5, 6, 10, 10, 2, paint);
  assert.deepEqual(direct.map(c => c[0]), ['FillRoundRect', 'DrawRoundRect']);
  assert.deepEqual(direct[0].slice(1, 3), [5, 6]);
}

// ---- 2. the hot panels use it --------------------------------------------------------------
for (const f of ['js/anna_glass_playlist.js', 'js/playlist_browser.js', 'js/anna_transport.js', 'js/anna_footer_slider.js'])
  assert(read(f).includes("include('anna_paint_cache.js');"), f);
const transport = read('js/anna_transport.js'), slider = read('js/anna_footer_slider.js');
assert(/AnnaPaintCache\.drawIcon\(/.test(transport) && !/gr\.DrawImage\(/.test(transport), 'transport icons from the cache');
assert(/AnnaPaintCache\.drawIcon\(/.test(slider) && !/gr\.DrawImage\(/.test(slider), 'seek/volume thumbs from the cache');

// GLASS list: rows and album boxes reach the panel as blits, not as round rects.
{
  const g = fakeGdi();
  const tracks = ['a', 'b', 'c', 'd'].map(n => handle(n + '.flac'));
  const host = createHost({ playlists: [{ name: 'A', items: tracks }], overrides: {
    gdi: { CreateImage: g.CreateImage },
    utils: { GetAlbumArtV2: () => null, IsFile: () => false, Glob: () => [] },
    window: { Width: 600, Height: 400, SetCursor() {} },
  } });
  const ctx = panelContext(host);
  runScript(ctx, 'js/anna_glass_playlist.js');
  const paintOnce = () => { const calls = []; ctx.on_paint(recorder(calls)); return calls; };
  const first = paintOnce(), second = paintOnce();
  for (const calls of [first, second]) {
    const names = calls.map(c => c[0]);
    assert.equal(names.filter(n => n === 'FillRoundRect' || n === 'DrawRoundRect').length, 0,
      'no round rects on the panel itself: ' + names.join(','));
    assert(names.filter(n => n === 'DrawImage').length >= 5, 'album box + 4 rows are blits');
    assert(names.includes('GdiDrawText'), 'text is still drawn directly');
  }
  const bitmaps = g.made.length;
  paintOnce();
  assert.equal(g.made.length, bitmaps, 'a third paint creates no bitmaps');
}

// Sidebar rows likewise.
{
  const src = read('js/playlist_browser.js');
  const paint = src.slice(src.indexOf('function on_paint(gr)'), src.indexOf('function on_paint(gr)') + 2500);
  assert(paint.includes('AnnaPaintCache.shape('), 'sidebar rows from the cache');
}
console.log('test_round21_paint_cache: ok');
