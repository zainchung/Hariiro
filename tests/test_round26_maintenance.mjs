// Round 26: the lyrics card gets the same backing as the other cards, and the three-line
// menu ends with a link to the project's public GitHub releases.
import assert from 'node:assert/strict';
import { read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run, runScript } from './helpers/fake_host.mjs';

// ---- Lyrics card backing ----------------------------------------------------------------
// On a light wallpaper the lyrics card was nearly white: main.txt drew only its outline
// (brushcolor-null), while every other card lays a navy tint over the wallpaper. The
// lyrics panel is a transparent child window, so the tint must come from main.txt.
const main = read('main.txt');
const lines = main.split(/\r?\n/);
const nowCard = lines.find(l => l.startsWith('$drawrect($eval(%_width% * 72 / 100 - 10),58,'));
assert(nowCard, 'now-playing card');
// Round 27: colours go through hariiro.tc.<base> (light tone).
const fill = nowCard.match(/brushcolor-\$if2\(\$getpvar\(hariiro\.tc\.(\d+-\d+-\d+)\),\1\) pencolor-\S+ alpha-(\d+)/);
assert(fill, 'now-playing card has a fill');
const LYRICS_RECT = '$eval(%_width% * 72 / 100 - 10),337,$eval(%_width% * 28 / 100 - 6),$eval(%_height% - 466)';
const lyricsPanel = lines.findIndex(l => l.includes('$panel(HariiroLyrics,'));
const backing = lines.findIndex(l => l.includes('$drawrect(' + LYRICS_RECT + ',brushcolor-$if2($getpvar(hariiro.tc.' + fill[1] + '),' + fill[1] + ') pencolor-null alpha-' + fill[2] + ')'));
assert(backing >= 0, 'lyrics card is filled like the now-playing card');
assert(backing < lyricsPanel, 'the backing is drawn beneath the lyrics panel');
// Only in lyrics mode: the queue keeps its own coloured fill.
assert.match(lines[backing], /^\$if\(\$strcmp\(\$getpvar\(hariiro\.queue\.open\),1\),,\$drawrect\(/);
// The outline is unchanged.
assert(main.includes('$drawrect(' + LYRICS_RECT + ',brushcolor-null pencolor-$if2($getpvar(hariiro.tc.236-184-177),236-184-177) alpha-94)'));

// ---- GitHub releases in the three-line menu ---------------------------------------------
const URL = 'https://github.com/zainchung/Hariiro/releases';
let pick = 0;
const items = [], runs = [];
const menu = () => ({
  AppendMenuItem: (f, id, text) => items.push({ id, text, f }),
  AppendMenuSeparator: () => items.push({ sep: true }),
  AppendTo() {}, TrackPopupMenu: () => pick,
});
const host = createHost({ overrides: {
  utils: { Run: (app, params) => { runs.push([app, params]); return true; }, Glob: () => [], IsFile: () => false },
  window: { Width: 183, Height: 31, CreatePopupMenu: menu, NotifyOthers() {} },
} });
const chrome = panelContext(host);
runScript(chrome, 'js/hariiro_top_chrome.js');
chrome.settingsMenu(10, 10);
// Submenus share the recorder and are filled before the main menu's last entries, so the
// link (main-menu id < 200) is the very last item appended, right after a separator.
const last = items[items.length - 1];
assert(last.id < 200, 'a main-menu item');
assert.equal(last.text, chrome.HariiroI18n.t('githubReleases'));
assert(items[items.length - 2].sep, 'separator before the link');
assert.equal(runs.length, 0, 'nothing opens until the item is chosen');
pick = last.id; items.length = 0;
chrome.settingsMenu(10, 10);
assert.deepEqual(runs, [[URL, undefined]], 'opens the public releases page');

// Labels in all nine languages, distinct from English where the language differs.
const ctx = panelContext(createHost());
run(ctx, "include('hariiro_i18n.js');");
const I = ctx.HariiroI18n;
for (const l of I.LANGS) assert(I.dict[l].githubReleases, l);
assert.match(I.dict.en.githubReleases, /GitHub/);
for (const l of I.LANGS) if (l !== 'en') assert.match(I.dict[l].githubReleases, /GitHub/, l);

console.log('PASS test_round26_maintenance');
