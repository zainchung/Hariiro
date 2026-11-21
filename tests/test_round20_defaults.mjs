// Round 20: new installs start in GLASS mode, and every wallpaper (the bundled one too) lives
// in images/wallpapers/. A saved choice of the old location keeps working.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { root, read } from './helpers/js_panel.mjs';

const ini = read('foo_ui_panels.ini'), main = read('main.txt');
assert.match(ini, /^pvar\.once\.hariiro\.playlist\.experimental = 1\s*$/m, 'GLASS by default for new installs');

// Files: one place for wallpapers (Round 21 renamed the bundled one to Hariiro_UI_2560x1440.png; the menu
// and saved-choice rules are in test_round21_perf).
assert(fs.existsSync(root + '/images/wallpapers/Hariiro_UI_2560x1440.png'));
assert(!fs.existsSync(root + '/images/wallpaper.jpg'), 'no second copy at the old place');
assert.match(ini, /^pvar\.once\.hariiro\.wallpaper = wallpapers\/Hariiro_UI_2560x1440\.png\s*$/m);
assert(main.includes('$imageabs(0,0,%_width%,%_height%,images/$if2($getpvar(hariiro.wallpaper),wallpapers/Hariiro_UI_2560x1440.png))'));
console.log('test_round20_defaults: ok');
