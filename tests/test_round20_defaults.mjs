// Round 20: new installs start in GLASS mode, and every wallpaper (the bundled one too) lives
// in images/wallpapers/. A saved choice of the old location keeps working.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { root, read } from './helpers/js_panel.mjs';
import { createHost, panelContext, runScript } from './helpers/fake_host.mjs';

const ini = read('foo_ui_panels.ini'), main = read('main.txt');
assert.match(ini, /^pvar\.once\.anna\.playlist\.experimental = 1\s*$/m, 'GLASS by default for new installs');

// Files: one place for wallpapers.
assert(fs.existsSync(root + '/images/wallpapers/wallpaper.jpg'));
assert(!fs.existsSync(root + '/images/wallpaper.jpg'), 'no second copy at the old place');
assert.match(ini, /^pvar\.once\.anna\.glass\.v2\.wallpaper = wallpapers\/wallpaper\.jpg\s*$/m);
assert(main.includes('$imageabs(0,0,%_width%,%_height%,images/$if2($getpvar(anna.glass.v2.wallpaper),wallpapers/wallpaper.jpg))'));

// The settings menu: the bundled picture is "Default (Anna)" once, other images after it.
const SKIN = 'C:\\fb\\profile\\foo_ui_panels-skins\\Anna_Glass\\';
function chrome(saved) {
  const h = createHost({ vars: saved === undefined ? {} : { 'anna.glass.v2.wallpaper': saved }, overrides: {
    fb: { ProfilePath: 'C:\\fb\\profile\\' },
    utils: { Glob: p => (p === SKIN + 'images\\wallpapers\\*' ? [SKIN + 'images\\wallpapers\\wallpaper.jpg', SKIN + 'images\\wallpapers\\Sea.jpg'] : []),
      IsFile: p => p === SKIN + 'js\\anna_top_chrome.js' },
    window: { Width: 183, Height: 31 },
  } });
  const c = panelContext(h);
  runScript(c, 'js/anna_top_chrome.js');
  return { c, h };
}
let { c, h } = chrome('wallpapers/wallpaper.jpg');
const list = [...c.wallpaperChoices()];
assert.deepEqual([...list.map(w => w.file)], ['wallpapers/wallpaper.jpg', 'wallpapers/Sea.jpg']);
assert.equal(list[0].label, c.AnnaI18n.t('wallpaperDefault'));
assert.equal(c.currentWallpaper(), 'wallpapers/wallpaper.jpg');
// A setting saved by an older build ("wallpaper.jpg") is moved to the new place on load.
({ c, h } = chrome('wallpaper.jpg'));
assert.equal(h.state.vars.get('anna.glass.v2.wallpaper'), 'wallpapers/wallpaper.jpg');
// Other saved choices are left alone.
({ c, h } = chrome('wallpapers/Sea.jpg'));
assert.equal(h.state.vars.get('anna.glass.v2.wallpaper'), 'wallpapers/Sea.jpg');
({ c, h } = chrome(undefined));
assert.equal(h.state.vars.has('anna.glass.v2.wallpaper'), false, 'nothing written when unset');
console.log('test_round20_defaults: ok');
