// Round 22 (3): the native panels' colours (foo_ui_panels.ini color.*, seen in NATIVE mode).
// Panels UI has no variable for color.*, but with no highlight colour set it uses the accent
// (theme.accent_pvar = anna.glass.v2.accent), live — verified on Windows. So: no highlight
// lines, and every other color.* value is neutral (no pink/violet cast), so it suits any colour.
import assert from 'node:assert/strict';
import { read } from './helpers/js_panel.mjs';

const ini = read('foo_ui_panels.ini');
const lines = [...ini.matchAll(/^(color\.[\w.]+) = (\d+) (\d+) (\d+)\s*$/gm)];
assert(lines.length >= 10, 'native colours are still set');
assert(!/^color\.(playlist\.)?highlight\s*=/m.test(ini), 'highlight follows the accent: not set');
assert.match(ini, /^theme\.accent_pvar = anna\.glass\.v2\.accent\s*$/m);
for (const [, key, ...v] of lines) {
  const [r, g, b] = v.map(Number), mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  // Neutral: either grey-ish or a slight cool (blue) cast like the glass; never red/pink-led.
  assert(mx - mn <= 22, `${key} = ${r} ${g} ${b} is tinted`);
  assert(!(r === mx && r - mn > 6), `${key} = ${r} ${g} ${b} leans warm/pink`);
}
console.log('test_round22_native_colours: ok');
