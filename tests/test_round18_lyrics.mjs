// Round 18 (Phase E1): more ESLyric file-name patterns, a per-track timing offset, and
// better progress for LRC files that only have line timestamps.
import assert from 'node:assert/strict';
import { createHost, panelContext, run, runScript } from './helpers/fake_host.mjs';

// ---- AnnaLyricTools ---------------------------------------------------------------------
{
  const host = createHost(), ctx = panelContext(host);
  run(ctx, "include('anna_lyric_tools.js');");
  const T = ctx.AnnaLyricTools;
  assert(Object.isFrozen(T));
  const f = { artist: 'Anna', albumArtist: 'Various', album: 'Glass', title: 'Moon', track: '03', stem: '03 Moon' };
  const names = [...T.fileNames(f)];
  // Round 11 patterns first, in their old order.
  assert.deepEqual(names.slice(0, 9), ['Anna - Moon', 'Anna-Moon', 'Moon - Anna', 'Moon', '03 Moon',
    'Anna\\Moon', 'Anna\\Anna - Moon', 'Glass\\Moon', 'Anna\\Glass\\Moon']);
  for (const n of ['Anna_Moon', 'Anna - Glass - Moon', 'Various - Moon', '03. Moon', '03 - Moon',
    '03. Anna - Moon', 'Glass\\03. Moon', 'Glass\\03 - Moon'])
    assert(names.includes(n), n);
  assert.equal(new Set(names).size, names.length, 'no duplicates ("03 Moon" is both stem and track pattern)');
  assert(![...T.fileNames({ ...f, albumArtist: 'Anna' })].includes('Anna - Moon', 9), 'album artist = artist adds nothing');
  assert.deepEqual([...T.fileNames({ title: 'Moon' })], ['Moon'], 'missing tags give no half names');

  assert.equal(T.singSeconds(''), 1);
  assert(Math.abs(T.singSeconds('月には叢雲') - 5 * 0.32) < 1e-9);
  assert(T.singSeconds('hello world') < T.singSeconds('こんにちは世界'), 'Latin letters are quicker than kana');

  const O = T.createOffsets('Anna.Test.Offsets');
  assert.equal(O.get('a'), 0);
  assert.equal(O.nudge('a', 1), 0.5); assert.equal(O.nudge('a', 1), 1); assert.equal(O.nudge('b', -1), -0.5);
  assert.deepEqual(JSON.parse(host.state.props.get('Anna.Test.Offsets')), { a: 1, b: -0.5 });
  assert.equal(T.createOffsets('Anna.Test.Offsets').get('a'), 1, 'remembered');
  assert.equal(O.set('a', 99), 30, 'clamped'); assert.equal(O.reset('a'), 0);
  assert.equal(JSON.parse(host.state.props.get('Anna.Test.Offsets')).a, undefined, 'reset removes the entry');
  for (let i = 0; i < 520; i++) O.set('t' + i, 1);
  const kept = Object.keys(JSON.parse(host.state.props.get('Anna.Test.Offsets')));
  assert.equal(kept.length, 500); assert(!kept.includes('t0') && kept.includes('t519'), 'oldest dropped');
  // Portable foobar2000 stores paths relative to its own folder (found in the Windows check:
  // lyrics next to such tracks were never found).
  const P = (p, dir = 'E:\\Apps\\foobar2000\\') => T.localPath(p, dir);
  assert.equal(P('file-relative://..\\Music\\A\\b.flac'), 'E:\\Apps\\Music\\A\\b.flac');
  assert.equal(P('file-relative://Music\\b.flac'), 'E:\\Apps\\foobar2000\\Music\\b.flac');
  assert.equal(P('file-relative://..\\..\\..\\x.flac'), '', 'never above the drive root');
  assert.equal(P('file-relative://b.flac', ''), '', 'no foobar2000 folder → unknown');
  assert.equal(P('file://C:\\Music\\b.flac'), 'C:\\Music\\b.flac');
  assert.equal(P('file:///C:/Music/b.flac'), 'C:/Music/b.flac');
  assert.equal(P('C:\\Music\\b.flac'), 'C:\\Music\\b.flac');
  assert.equal(P('https://radio.example/live'), '');
  assert.equal(P('navidrome://x'), '');
  host.state.props.set('Anna.Test.Offsets', 'not json');
  assert.equal(T.createOffsets('Anna.Test.Offsets').get('a'), 0, 'corrupt property → no offsets');
}

// ---- Lyrics panel -----------------------------------------------------------------------
const LRC = '[00:00.00]first line\n[00:05.00]second line\n[00:10.00]third line\n';
let now = 4.8, menu = 0, lrc = LRC;
const track = { Path: 'C:/Music/a.flac', SubSong: 0, GetFileInfo: () => ({ MetaCount: 0 }) };
const host = createHost({ overrides: {
  fb: { GetNowPlaying: () => track, IsPlaying: true, IsPaused: false, PlaybackLength: 60,
    get PlaybackTime() { return now; }, set PlaybackTime(v) { now = v; },
    ShowPopupMessage() {}, RunMainMenuCommand: () => false, ProfilePath: 'C:/fb/' },
  utils: { IsFile: p => p === 'C:/Music/a.lrc', ReadTextFile: () => lrc, CheckComponent: () => false },
  window: { Width: 320, Height: 390, CreatePopupMenu: () => ({ AppendMenuItem() {}, AppendMenuSeparator() {}, TrackPopupMenu: () => menu }) },
} });
const L = panelContext(host);
runScript(L, 'js/anna_lyrics.js');
assert.equal(run(L, 'state.kind'), 'synced');
assert.equal(L.currentIndex(), 0);
const choose = id => { menu = id; L.on_mouse_rbtn_up(10, 10); };
choose(30); // lyrics earlier
assert.equal(L.currentIndex(), 1, '+0.5 s: the next line is already due at 4.8 s');
assert.equal(JSON.parse(host.state.props.get('Anna.Lyrics.TrackOffsets.v1'))['C:/Music/a.flac#0'], 0.5);
choose(30);
// The offset is shown while it is not zero.
const paintTexts = () => { const out = []; L.on_paint(new Proxy({}, { get: (_, k) => k === 'CalcTextWidth' ? () => 8 : (...a) => { if (k === 'GdiDrawText') out.push([String(a[0]), a[2]]); } })); return out; };
assert(paintTexts().some(([t]) => t.includes('+1.0')), 'offset label');
// Seeking from the lyrics lands where that line plays with the offset applied.
run(L, 'lyricDrag={y:0,first:2,moved:true};previewCue=2;');
L.on_mouse_lbtn_up(10, 100);
assert.equal(now, 9, 'line at 10 s with +1 s offset → seek to 9 s');
choose(31); choose(31); choose(31); // later ×3 → −0.5
now = 5.2; assert.equal(L.currentIndex(), 0, '−0.5 s: second line not yet');
choose(32); // reset
assert.equal(L.currentIndex(), 1);
assert(!paintTexts().some(([t]) => /[+−-]\d\.\d/.test(t) && t.includes('s')), 'no label at 0');
// Another track has its own offset (none).
assert.equal(JSON.parse(host.state.props.get('Anna.Lyrics.TrackOffsets.v1') || '{}')['C:/Music/a.flac#0'], undefined);

// Line-stamp-only LRC: a short line followed by a long gap is sung in about its own length,
// not stretched over the whole gap.
lrc = '[00:00.00]短い\n[00:30.00]次の行\n'; L.reloadLyrics(); now = 2;
const PLAYED = 0xffec85bb, CURRENT = 0xffffedf6;
const glyphs = paintTexts().filter(([t]) => t === '短' || t === 'い');
assert(glyphs.length === 2 && glyphs.every(([, c]) => c === PLAYED), 'short line fully sung after ~1 s');
now = 0.3;
const early = paintTexts().filter(([t]) => t === '短' || t === 'い');
assert(early.some(([, c]) => c === CURRENT), 'not all sung at the start');
// A track with a portable (file-relative) path finds the LRC next to it.
{
  const rel = { Path: 'file-relative://..\\Music\\c.flac', SubSong: 0, GetFileInfo: () => ({ MetaCount: 0 }) };
  const seen = [];
  const h = createHost({ overrides: {
    fb: { GetNowPlaying: () => rel, IsPlaying: true, IsPaused: false, PlaybackLength: 60, PlaybackTime: 1,
      FoobarPath: 'E:\\Apps\\foobar2000\\', ProfilePath: 'E:\\Apps\\foobar2000\\profile\\', ShowPopupMessage() {} },
    utils: { IsFile: p => { seen.push(p); return p === 'E:\\Apps\\Music\\c.lrc'; }, ReadTextFile: () => LRC, CheckComponent: () => false },
    window: { Width: 320, Height: 390 },
  } });
  const R = panelContext(h);
  runScript(R, 'js/anna_lyrics.js');
  assert.equal(run(R, 'state.kind'), 'synced', 'found: ' + seen.slice(0, 3).join(' | '));
  assert.equal(run(R, 'state.filePath'), 'E:\\Apps\\Music\\c.lrc');
}
console.log('test_round18_lyrics: ok');
