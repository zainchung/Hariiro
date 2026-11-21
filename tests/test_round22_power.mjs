// Round 22 (5): the power button looked rough - its ring was 9° straight segments with flat
// ends, and the windowless title-bar panel draws without antialiasing (SetSmoothingMode on its
// gr has no effect there; verified on Windows). The button (frame + glyph) is now drawn once
// per look at 2x size, antialiased, into a bitmap that is scaled down onto the panel.
import assert from 'node:assert/strict';
import { createHost, panelContext, runScript } from './helpers/fake_host.mjs';

const made = [];
const recorder = calls => new Proxy({}, { get: (_, k) => (...a) => { calls.push([k, ...a]); return 0; } });
const image = (w, h) => { const img = { Width: w, Height: h, calls: [], GetGraphics() { return recorder(img.calls); }, ReleaseGraphics() {}, Dispose() {} }; made.push(img); return img; };
const host = createHost({ overrides: {
  fb: { ProfilePath: 'C:\\fb\\' }, utils: { Glob: () => [], IsFile: () => false },
  gdi: { CreateImage: image },
  window: { Width: 183, Height: 31, NotifyOthers() {} } } });
const ctx = panelContext(host);
runScript(ctx, 'js/hariiro_top_chrome.js');
const paint = () => { const calls = []; ctx.on_paint(recorder(calls)); return calls; };

const first = paint();
assert.equal(made.length, 1, 'one bitmap for the button');
const bmp = made[0];
assert.deepEqual([bmp.Width, bmp.Height], [35 * 2, 32 * 2], 'button area at 2x');
assert.deepEqual(bmp.calls[0], ['SetSmoothingMode', 4], 'antialiased inside the bitmap');
const ring = bmp.calls.filter(c => c[0] === 'DrawLine' && Math.abs(Math.hypot(c[1] - 35, c[2] - 32) - 14) < 0.01);
assert(ring.length >= 100, 'ring in fine (≤ 2°) segments: ' + ring.length);
assert(bmp.calls.some(c => c[0] === 'DrawRoundRect'), 'frame drawn in the bitmap too');
const blit = first.find(c => c[0] === 'DrawImage');
assert(blit && blit[1] === bmp, 'the panel blits the bitmap');
assert.deepEqual(blit.slice(2, 10), [148, 0, 35, 32, 0, 0, 70, 64], 'scaled down onto the button area');
assert(!first.some(c => c[0] === 'DrawLine' && c[5] === 2), 'no aliased ring segments on the panel');
// Cached: a second paint reuses it; hover is another look.
paint(); assert.equal(made.length, 1);
ctx.on_mouse_move(160); paint(); assert.equal(made.length, 2, 'hover look');
ctx.on_mouse_leave(); paint(); assert.equal(made.length, 2, 'normal look reused');
console.log('test_round22_power: ok');
