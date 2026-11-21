// Round 21 (3): Español, Português, Français, Deutsch and Русский join English, 简体中文,
// 繁體中文 and 日本語. The language menu lists every language by its own name (owner's
// reference: Auto, English, Español, Português, 中文（简体）, 日本語, Français, Deutsch,
// Русский). main.txt reads the language actually shown, so "auto" works there too.
import assert from 'node:assert/strict';
import { read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run, runScript } from './helpers/fake_host.mjs';

const LANGS = ['en', 'zh-CN', 'zh-TW', 'ja', 'es', 'pt', 'fr', 'de', 'ru'];
const NEW = ['es', 'pt', 'fr', 'de', 'ru'];
const intl = locale => ({ DateTimeFormat: () => ({ resolvedOptions: () => ({ locale }) }) });

// ---- dictionary -----------------------------------------------------------------------------
{
  const host = createHost({ vars: { 'hariiro.language': 'en' } });
  const ctx = panelContext(host);
  run(ctx, "include('hariiro_i18n.js');");
  const I = ctx.HariiroI18n, keys = Object.keys(I.dict.en);
  assert(keys.length > 140);
  assert.deepEqual([...I.LANGS], LANGS);
  for (const l of LANGS) for (const k of keys)
    assert(typeof I.dict[l][k] === 'string' && I.dict[l][k].trim(), `${l}.${k} missing`);
  for (const l of NEW) {
    assert.equal(Object.keys(I.dict[l]).length, keys.length, `${l}: no extra keys`);
    for (const k of ['language', 'artists', 'searchHint', 'wallpaper', 'undo', 'clearQueue', 'noLyrics'])
      assert.notEqual(I.dict[l][k], I.dict.en[k], `${l}.${k} is translated`);
    assert(I.dict[l].wallpaperHint.includes('images\\wallpapers'), `${l}: folder name kept`);
  }
  // Placeholders the code appends to (": " + error, counts) keep their punctuation.
  for (const l of NEW) assert(/[:：]\s*$/.test(I.dict[l].deviceFailed), `${l}.deviceFailed ends with a colon`);
  // Every language can be chosen; others are ignored.
  for (const l of [...LANGS, 'auto']) { I.change(l); assert.equal(host.state.vars.get('hariiro.language'), l); }
  I.change('xx'); assert.equal(host.state.vars.get('hariiro.language'), 'auto');
  // Own names, fixed whatever the interface language.
  assert.deepEqual(LANGS.map(l => I.nativeName(l)),
    ['English', '中文（简体）', '中文（繁體）', '日本語', 'Español', 'Português', 'Français', 'Deutsch', 'Русский']);
}

// ---- "auto" follows the system ------------------------------------------------------------------
for (const [locale, want] of [['es-ES', 'es'], ['es-MX', 'es'], ['pt-BR', 'pt'], ['pt-PT', 'pt'], ['fr-CA', 'fr'],
  ['de-AT', 'de'], ['ru-RU', 'ru'], ['zh-TW', 'zh-TW'], ['ja-JP', 'ja'], ['en-US', 'en']]) {
  const host = createHost({ vars: { 'hariiro.language': 'auto' } });
  const ctx = panelContext(host, { Intl: intl(locale) });
  run(ctx, "include('hariiro_i18n.js');");
  assert.equal(ctx.HariiroI18n.current(), want, locale);
}

// ---- settings menu ------------------------------------------------------------------------------
{
  let pick = 0; const items = [];
  const menu = () => ({ AppendMenuItem: (f, id, text) => items.push([id, text]), AppendMenuSeparator() {}, AppendTo() {}, TrackPopupMenu: () => pick });
  const host = createHost({ vars: { 'hariiro.language': 'auto' }, overrides: {
    fb: { ProfilePath: 'C:\\fb\\profile\\' }, utils: { Glob: () => [], IsFile: () => false },
    window: { Width: 183, Height: 31, CreatePopupMenu: menu, NotifyOthers() {} },
  } });
  const ctx = panelContext(host, { Intl: intl('de-DE') });
  runScript(ctx, 'js/hariiro_top_chrome.js');
  // The language actually shown is published for main.txt.
  const S = ctx.HariiroShared.PVAR;
  assert.equal(S.languageShown, 'hariiro.language.shown');
  assert.equal(host.state.vars.get(S.languageShown), 'de', 'auto on a German system');
  ctx.settingsMenu(1, 1);
  const langItems = items.filter(([id]) => id >= 200 && id < 230).map(([, t]) => t.replace(/^✓ |^ {3}/, ''));
  assert.deepEqual(langItems, [ctx.HariiroI18n.t('auto'), 'English', 'Español', 'Português', '中文（简体）', '中文（繁體）',
    '日本語', 'Français', 'Deutsch', 'Русский']);
  assert(items.find(([id]) => id === 200)[1].startsWith('✓'), 'auto ticked');
  const ru = items.find(([, t]) => t.endsWith('Русский'))[0];
  pick = ru; items.length = 0; ctx.settingsMenu(1, 1);
  assert.equal(host.state.vars.get('hariiro.language'), 'ru');
  ctx.on_panelsui_variable_changed('hariiro.language');
  assert.equal(host.state.vars.get(S.languageShown), 'ru', 'follows a menu choice');
}

// ---- main.txt ---------------------------------------------------------------------------------------
{
  const main = read('main.txt');
  assert(!main.includes('$getpvar(hariiro.language)'), 'main.txt uses the shown language, not the setting');
  const lines = main.split(/\r?\n/).filter(l => l.includes('$getpvar(hariiro.language.shown)'));
  assert.equal(lines.length, 4, 'sidebar title, album header, queue header, stopped');
  for (const line of lines) for (const l of LANGS.filter(x => x !== 'ja'))
    assert(line.includes(`$strcmp($getpvar(hariiro.language.shown),${l})`), `${l} in: ${line.slice(0, 60)}`);
}
console.log('test_round21_languages: ok');
