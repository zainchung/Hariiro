// Round 22: (1) the bundled wallpapers are the owner's two pictures; (2) accent colours work
// like wallpapers: every folder in images/controls (with play.png) is one, named by the folder;
// (3) the corner ornaments belong to each colour (images/controls/<colour>/corner_*.png).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { root, read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run, runScript } from './helpers/fake_host.mjs';

const ini = read('foo_ui_panels.ini'), main = read('main.txt');

// ---- 1. wallpapers ------------------------------------------------------------------------------
const walls = fs.readdirSync(root + '/images/wallpapers').filter(f => !f.endsWith('.md')).sort();
assert.deepEqual(walls, ['moon.png', '櫻花樹下的水晶茶韻.png']);
assert.match(ini, /^pvar\.once\.anna\.glass\.v2\.wallpaper = wallpapers\/moon\.png\s*$/m);
assert(main.includes('$if2($getpvar(anna.glass.v2.wallpaper),wallpapers/moon.png)'));
assert(read('js/anna_top_chrome.js').includes("const DEFAULT_WALLPAPER='wallpapers/moon.png';"));

// ---- 2. bundled colours: folders with theme.json and the corner ornaments --------------------------
const BUNDLED = { amber: 36, blue: 211, mint: 150, pink: 326, teal: 174, violet: 278 };
const CORNERS = ['corner_bl.png', 'corner_br.png', 'corner_tl.png', 'corner_tr.png'];
assert(!fs.existsSync(root + '/images/ornaments'), 'ornaments moved into the colour folders');
const isRgbaPng = f => { const b = fs.readFileSync(f); return b.readUInt32BE(0) === 0x89504e47 && b[25] === 6; };
const pinkNames = fs.readdirSync(root + '/images/controls/pink').filter(f => f.endsWith('.png')).sort();
assert.equal(pinkNames.length, 20, '16 controls + 4 corners');
for (const [id, hue] of Object.entries(BUNDLED)) {
  const dir = root + '/images/controls/' + id;
  assert.deepEqual(fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort(), pinkNames, id);
  for (const c of CORNERS) assert(isRgbaPng(dir + '/' + c), `${id}/${c} keeps alpha`);
  if (id !== 'pink') assert(!fs.readFileSync(dir + '/corner_tl.png').equals(fs.readFileSync(root + '/images/controls/pink/corner_tl.png')), `${id}: corners recoloured`);
  const meta = JSON.parse(fs.readFileSync(dir + '/theme.json', 'utf8'));
  assert.equal(meta.hue, hue, id); assert.match(meta.accent, /^\d{1,3}-\d{1,3}-\d{1,3}$/);
}
// main.txt takes corners and the volume icon from the chosen colour's folder.
assert(!main.includes('images/ornaments/'));
const FOLDER = '$if($strcmp($getpvar(anna.theme.hue),rose),pink,$if2($getpvar(anna.theme.hue),pink))';
for (const c of ['tl', 'tr', 'bl', 'br']) assert(main.includes(`images/controls/${FOLDER}/corner_${c}.png`), c);
assert(main.includes(`images/controls/${FOLDER}/speaker.png`));
assert(!/\$strcmp\(\$getpvar\(anna\.theme\.hue\),violet\)/.test(main), 'no per-colour branches left');
assert(ini.includes('pvar.once.anna.theme.hue = pink'));

// ---- 3. AnnaTheme --------------------------------------------------------------------------------
const SKIN = 'C:\\fb\\profile\\foo_ui_panels-skins\\Anna_Glass\\', C = SKIN + 'images\\controls\\';
function host(vars, extra = {}) {
  const files = { [C + 'amber\\theme.json']: '{"hue":36,"accent":"255-196-122"}', [C + 'pink\\theme.json']: '{"hue":326,"accent":"249-165-210"}',
    [C + 'Sakura Gold\\theme.json']: '{"hue":45,"accent":"240-200-90"}' };
  const plays = ['amber', 'pink', 'Sakura Gold', 'Ocean'].map(n => C + n + '\\play.png');
  const h = createHost({ vars, overrides: {
    fb: { ProfilePath: 'C:\\fb\\profile\\' },
    utils: {
      Glob: (p, exc, inc) => p === 'C:\\fb\\profile\\foo_ui_panels-skins\\*' ? [SKIN.slice(0, -1)]
        : p === C + '*' && inc === 0x10 ? ['amber', 'pink', 'Sakura Gold', 'Ocean', 'notes'].map(n => C + n) : [],
      IsFile: p => p === SKIN + 'js\\anna_top_chrome.js' || plays.includes(p) || p in files,
      ReadTextFile: p => { if (!(p in files)) throw new Error('missing'); return files[p]; },
    },
    // A folder without theme.json: its colour comes from play.png's dominant colour (teal-blue).
    gdi: { Image: p => ({ Width: 192, Height: 192, GetColourSchemeJSON: () => JSON.stringify([
      { col: 0xff202020, freq: 0.6 }, { col: 0xff3fa9e6, freq: 0.3 }, { col: 0xffffffff, freq: 0.1 }]), Dispose() {} }) },
    window: { Width: 183, Height: 31, NotifyOthers() {}, ...(extra.window || {}) },
  } });
  return h;
}
{
  const h = host({ 'anna.theme.hue': 'rose' }), ctx = panelContext(h);
  run(ctx, "include('anna_shared.js');include('anna_theme.js');");
  const T = ctx.AnnaTheme;
  assert.equal(T.selected(), 'pink', 'old "rose" setting is the pink folder');
  assert.equal(T.folder(), 'pink');
  assert.equal(T.recolor(0xffff90c7), 0xffff90c7, 'pink is the base: no recolouring');
  const list = [...T.scan(SKIN)].map(t => ({ ...t }));
  assert.deepEqual(list.map(t => t.id), ['amber', 'Ocean', 'pink', 'Sakura Gold'], 'folders with play.png, by name');
  assert.deepEqual(list.map(t => t.label), ['amber', 'Ocean', 'pink', 'Sakura Gold'], 'label is the folder name');
  assert.deepEqual(list.find(t => t.id === 'Sakura Gold'), { id: 'Sakura Gold', label: 'Sakura Gold', hue: 45, accent: '240-200-90' });
  const ocean = list.find(t => t.id === 'Ocean');
  assert(Math.abs(ocean.hue - 202) <= 2, 'hue from play.png: ' + ocean.hue);
  assert.equal(ocean.accent, '63-169-230');
  // Choosing one stores folder, hue and accent; colours follow the stored hue.
  assert(T.set(ocean));
  assert.equal(h.state.vars.get('anna.theme.hue'), 'Ocean');
  assert.equal(h.state.vars.get('anna.theme.degree'), String(ocean.hue));
  assert.equal(h.state.vars.get('anna.glass.v2.accent'), '63-169-230');
  assert.equal(T.selected(), 'Ocean'); assert.equal(T.folder(), 'Ocean');
  assert.notEqual(T.recolor(0xffff90c7), 0xffff90c7);
  assert.notEqual(T.key(), 'pink@326', 'cache key follows the colour');
}
{ // Bundled names still work when no hue is stored yet (other panels before TopChrome ran).
  const h = host({ 'anna.theme.hue': 'mint' }), ctx = panelContext(h);
  run(ctx, "include('anna_theme.js');");
  assert.equal(ctx.AnnaTheme.hue(), 150);
}

// ---- 4. settings menu ------------------------------------------------------------------------------
{
  let pick = 0; const items = [];
  const menu = () => ({ AppendMenuItem: (f, id, text) => items.push([id, text]), AppendMenuSeparator() {}, AppendTo() {}, TrackPopupMenu: () => pick });
  const h = host({ 'anna.theme.hue': 'violet' }, { window: { CreatePopupMenu: menu } });
  const ctx = panelContext(h);
  runScript(ctx, 'js/anna_top_chrome.js');
  // The saved colour's folder is gone: pink (or the first) is chosen and published on load.
  assert.equal(h.state.vars.get('anna.theme.hue'), 'pink');
  assert.equal(h.state.vars.get('anna.theme.degree'), '326');
  ctx.settingsMenu(1, 1);
  const themeItems = items.filter(([id]) => id >= 230 && id < 290).map(([id, t]) => [id, t]);
  assert.deepEqual(themeItems.map(([, t]) => t.trim()), ['amber', 'Ocean', '✓ pink', 'Sakura Gold']);
  pick = themeItems[3][0]; items.length = 0; ctx.settingsMenu(1, 1);
  assert.equal(h.state.vars.get('anna.theme.hue'), 'Sakura Gold');
  assert.equal(h.state.vars.get('anna.theme.degree'), '45');
  assert.equal(h.state.vars.get('anna.glass.v2.accent'), '240-200-90');
}

// ---- 5. panels load images from the colour's folder -------------------------------------------------
for (const f of ['js/anna_transport.js', 'js/anna_footer_slider.js']) {
  const src = read(f);
  assert(src.includes('AnnaTheme.folder()'), f);
  assert(!src.includes("'pink/'"), f + ': no rose/pink mapping of its own');
}
console.log('test_round22_themes: ok');
