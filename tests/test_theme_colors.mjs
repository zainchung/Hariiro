// Phase D2: colours shared by several panels live in HariiroTheme.COLORS, and the pill switch
// (GLASS/NATIVE, QUEUE, DESK) is drawn by HariiroTheme.paintSwitch. No behaviour change.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { root, read } from './helpers/js_panel.mjs';

const ctx = vm.createContext({ panelsui: { GetVariable: (k, d) => d }, Math, Object, Map, Proxy, String });
vm.runInContext(read('js/hariiro_theme.js'), ctx);
const T = ctx.HariiroTheme, C = T.COLORS;
assert(Object.isFrozen(C));

// The values the panels used before the move.
assert.deepEqual({ ...C }, {
  switchActiveBg: 0xff93547d, switchIdleBg: 0xff43334f, switchActiveFrame: 0xffffc8e7, switchIdleFrame: 0xffd9b2d2,
  switchActiveKnob: 0xffffe9f5, switchIdleKnob: 0xffd8cbdf, switchGlow: 0x74ff8fc6, switchActiveHalo: 0x99ffd2eb,
  switchIdleHalo: 0x779ca0b4, rowNormal: 0x41121d38, rowHover: 0x48324667, rowFrame: 0x58a4afcb, rowGlow: 0x48ff9fd0,
});

// Reference: the paintSwitch each switch panel had before Phase D2 (verbatim).
function oldPaintSwitch(gr, w, h, active, hover) {
  const cy = Math.round(h / 2), cx = active ? w - 11 : 11;
  gr.FillRoundRect(2, 2, w - 5, h - 5, 9, 9, active ? 0xff93547d : 0xff43334f);
  gr.DrawRoundRect(2, 2, w - 5, h - 5, 9, 9, 1, active || hover ? 0xffffc8e7 : 0xffd9b2d2);
  if (active) gr.DrawRoundRect(1, 1, w - 3, h - 3, 10, 10, 1, 0x74ff8fc6);
  gr.FillEllipse(cx - 8, cy - 8, 16, 16, active ? 0x99ffd2eb : 0x779ca0b4);
  gr.FillEllipse(cx - 7, cy - 7, 14, 14, active ? 0xffffe9f5 : 0xffd8cbdf);
}
const record = () => { const calls = []; return { calls, gr: new Proxy({}, { get: (_, k) => (...a) => calls.push([k, ...a]) }) }; };
for (const [w, h] of [[84, 24], [74, 24], [168, 48], [85, 25]])
  for (const active of [false, true]) for (const hover of [false, true]) {
    const a = record(), b = record();
    oldPaintSwitch(a.gr, w, h, active, hover); T.paintSwitch(b.gr, w, h, active, hover);
    assert.deepEqual(b.calls, a.calls, `${w}x${h} active=${active} hover=${hover}`);
  }

// Drift guard: no panel keeps its own copy of a shared colour or of the pill drawing.
const shared = Object.values(C).map(v => '0x' + v.toString(16).padStart(8, '0'));
for (const f of fs.readdirSync(root + '/js').filter(n => n.endsWith('.js') && n !== 'hariiro_theme.js')) {
  const src = read('js/' + f).toLowerCase();
  for (const hex of shared) assert(!src.includes(hex), `js/${f} hard-codes ${hex}: use HariiroTheme.COLORS`);
  assert(!/function\s+paintswitch\b/.test(src), `js/${f}: use HariiroTheme.paintSwitch`);
}
for (const f of ['hariiro_mode_switch.js', 'hariiro_queue_toggle.js', 'hariiro_desktop_lyrics.js'])
  assert(read('js/' + f).includes('HariiroTheme.paintSwitch(gr,w,h,'), f);
console.log('test_theme_colors: ok');
