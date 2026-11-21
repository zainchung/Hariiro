// Round 15: external files (File Explorer) dropped on the sidebar / middle / Queue.
// Windows check (foo_js_panel 1.9.0 + Panels UI, child or windowless panels alike):
// the panel gets on_drag_enter/over, then on_drag_leave at release - never
// on_drag_drop - and foobar2000 appends the files to the ACTIVE playlist and
// selects them. HariiroDropFix arms on that "leave with the button up" and moves the
// just-appended, selected entries to where the panel would have dropped them.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, installIncludeShim } from './helpers/js_panel.mjs';

installIncludeShim(vm);

// ------------------------------------------------------------- fake host
const mk = (a = []) => ({ get Count() { return a.length; }, Convert: () => [...a], Item: i => a[i],
  Add(h) { a.push(h); }, AddRange(o) { a.push(...o.Convert()); } });
const H = p => ({ Path: p, RawPath: 'file://' + p, SubSong: 0 });
let records, sel, active, queue, vars, now, lbutton;
function reset() {
  records = [
    { name: 'User A', items: [H('a.flac')] },
    { name: 'User B', items: [H('b.flac'), H('b2.flac')] },
    { name: 'Favorites', items: [H('fav.flac')] }];
  sel = records.map(() => new Set());
  active = 0; queue = []; now = 1000; lbutton = false;
  vars = new Map([['hariiro.nav.mode', 'library'], ['hariiro.theme.hue', 'rose'], ['hariiro.drag.origin', '']]);
}
reset();
const plman = {
  get PlaylistCount() { return records.length; }, get ActivePlaylist() { return active; }, set ActivePlaylist(v) { active = v; },
  get PlayingPlaylist() { return -1; }, FindPlaylist: n => records.findIndex(r => r.name === n),
  GetPlaylistName: i => records[i]?.name || '', PlaylistItemCount: i => records[i]?.items.length || 0,
  GetPlaylistItems: i => mk(records[i]?.items.slice() || []), IsPlaylistLocked: () => false,
  IsPlaylistItemSelected: (p, i) => sel[p].has(i), GetPlaylistSelectedItems: p => mk(records[p].items.filter((_, i) => sel[p].has(i))),
  ClearPlaylistSelection: p => sel[p].clear(), SetPlaylistSelection: (p, ids, v) => ids.forEach(i => v ? sel[p].add(i) : sel[p].delete(i)),
  SetPlaylistSelectionSingle: (p, i, v) => v ? sel[p].add(i) : sel[p].delete(i), SetPlaylistFocusItem() {}, EnsurePlaylistItemVisible() {},
  GetPlaylistFocusItemIndex: () => -1, UndoBackup() {},
  RemovePlaylistSelection(p) { const keep = []; records[p].items.forEach((h, i) => { if (!sel[p].has(i)) keep.push(h); }); records[p].items = keep; sel[p].clear(); fire('on_playlist_items_removed', p); },
  InsertPlaylistItems(p, at, h, select) { const add = h.Convert(); records[p].items.splice(at, 0, ...add);
    if (select) { sel[p].clear(); add.forEach((_, k) => sel[p].add(at + k)); } fire('on_playlist_items_added', p); },
  CreatePlaylist(_at, name) { records.push({ name, items: [] }); sel.push(new Set()); return records.length - 1; },
  FindOrCreatePlaylist(n) { const i = this.FindPlaylist(n); return i >= 0 ? i : this.CreatePlaylist(0, n); },
  ClearPlaylist(p) { records[p].items = []; sel[p].clear(); }, SortByFormatV2: () => true, SetPlaylistLockedActions() {},
  GetPlaybackQueueContents: () => [], AddItemToPlaybackQueue: h => queue.push(h.Path), GetPlayingItemLocation: () => ({ IsValid: false }),
  MovePlaylist: () => true, RemovePlaylist: () => true,
};
const panels = [];
function fire(name, p) { for (const c of panels) if (typeof c[name] === 'function') c[name](p); }
function panel(name, file, width) {
  const win = { ID: name, Width: width, Height: 450, IsVisible: true, Repaint() {}, SetCursor() {},
    GetProperty: (_k, d) => d, SetProperty() {}, SetTimeout: () => 1, ClearTimeout() {}, SetInterval: () => 1, ClearInterval() {},
    CreatePopupMenu: () => ({ AppendMenuItem() {}, AppendMenuSeparator() {}, TrackPopupMenu: () => 0 }) };
  const ctx = vm.createContext({ console: { log() {} }, plman, window: win, Date: { now: () => now },
    fb: { TitleFormat: () => ({ EvalWithMetadb: () => '', EvalWithMetadbs: hs => hs.Convert().map(() => 'A') }),
      GetLibraryItems: () => mk([]), GetNowPlaying: () => null, CreateHandleList: () => mk([]), DoDragDrop() {} },
    panelsui: { PanelName: name, GetVariable: (k, d) => vars.get(k) ?? d, SetVariable: (k, v) => vars.set(k, v), RunAction: () => true,
      GetPanelRect: () => ({ Width: width, Height: 450 }) },
    utils: { CheckComponent: () => false, IsKeyPressed: vk => vk === 1 && lbutton, GetAlbumArtV2: () => null },
    gdi: { Font: (n, s, st) => ({ Name: n, Size: s, Style: st }) } });
  ctx.include = f => vm.runInContext(read('js/' + f), ctx);
  vm.runInContext(read(file), ctx, { filename: file });
  panels.push(ctx);
  return ctx;
}
// Panels UI calls the panels in layout order: sidebar first.
const sidebar = panel('Playlists', 'js/playlist_browser.js', 196);
const glass = panel('GlassPlaylist', 'js/hariiro_glass_playlist.js', 364);
const q = panel('HariiroQueue', 'js/hariiro_queue.js', 229);
const rowY = name => { const i = sidebar.entries().findIndex(r => r.name === name); assert(i >= 0, name); return 8 + 30 * i + 14; };

// What foobar2000 does after the misrouted drop: append to the ACTIVE playlist, select the new entries.
function hostFallbackDrop(paths) {
  const p = active, at = records[p].items.length;
  sel[p].clear();
  records[p].items.push(...paths.map(H));
  paths.forEach((_, k) => sel[p].add(at + k));
  fire('on_playlist_items_added', p);
}
// External drag over a panel, released over it: enter/over with button down, then leave with button up.
function externalDropOn(ctx, x, y) {
  lbutton = true;
  const a = { Effect: 0, Playlist: -1, Base: 0, ToSelect: true };
  ctx.on_drag_enter(a, x, y); ctx.on_drag_over(a, x, y);
  lbutton = false;
  ctx.on_drag_leave();
}
const paths = p => records[p].items.map(h => h.Path);

// ---------------------------------------------------------------- source rules
for (const f of ['js/playlist_browser.js', 'js/hariiro_glass_playlist.js', 'js/hariiro_queue.js']) {
  const src = read(f);
  assert(src.includes("include('hariiro_drop_fix.js');"), f);
  assert(/HariiroDropFix\.install\([^)]*\);[\s\S]*HariiroDpi\.install\(\);\s*$/.test(src),
    `${f}: HariiroDropFix.install() must come right before HariiroDpi.install() (it needs layout units)`);
}

// 1. Sidebar row: middle shows User A, file dropped on "User B" row -> goes to User B, not User A.
reset();
externalDropOn(sidebar, 80, rowY('User B'));
hostFallbackDrop(['new.flac']);
assert.deepEqual(paths(0), ['a.flac'], 'removed from the active playlist');
assert.deepEqual(paths(1), ['b.flac', 'b2.flac', 'new.flac'], 'appended to the row under the pointer');
assert.equal(active, 1, 'the target becomes the active playlist, like a real sidebar drop');
assert.equal(vars.get('hariiro.drop.pending'), '', 'pending redirect is consumed');

// 2. Sidebar pinned row (Favorites) is read-only: the files are taken back out again.
reset();
externalDropOn(sidebar, 80, rowY('Favorites'));
hostFallbackDrop(['x.flac', 'y.flac']);
assert.deepEqual(paths(0), ['a.flac']);
assert.deepEqual(paths(2), ['fav.flac']);

// 3. Blank sidebar space: staged, and a new ordinary playlist appears with the audio.
reset();
externalDropOn(sidebar, 80, 400);
hostFallbackDrop(['n1.flac', 'n2.flac']);
assert.deepEqual(paths(0), ['a.flac']);
const staging = records.findIndex(r => r.name.startsWith('Import Staging'));
assert(staging >= 0, 'staging playlist used');
assert.deepEqual(paths(staging), ['n1.flac', 'n2.flac'], 'staged; the sidebar turns it into a playlist when idle');

// 4. Middle list showing an ordinary playlist: the files are already where they belong.
reset();
externalDropOn(glass, 100, 100);
assert.equal(vars.get('hariiro.drop.pending') || '', '', 'nothing to redirect');
hostFallbackDrop(['m.flac']);
assert.deepEqual(paths(0), ['a.flac', 'm.flac']);

// 5. Middle list showing Favorites (read-only): rejected, taken back out.
reset(); active = 2;
externalDropOn(glass, 100, 100);
hostFallbackDrop(['r.flac']);
assert.deepEqual(paths(2), ['fav.flac']);

// 6. Queue: queued, not left in the active playlist.
reset();
externalDropOn(q, 50, 60);
hostFallbackDrop(['q1.flac', 'q2.flac']);
assert.deepEqual(paths(0), ['a.flac']);
assert.deepEqual(queue, ['q1.flac', 'q2.flac']);

// 7. Not a drop: pointer just left the panel with the button still held - nothing armed.
reset();
lbutton = true;
{ const a = { Effect: 0, Playlist: -1 }; sidebar.on_drag_enter(a, 80, rowY('User B')); sidebar.on_drag_leave(); }
assert.equal(vars.get('hariiro.drop.pending') || '', '');
hostFallbackDrop(['gap.flac']); // e.g. later dropped on a gap: host default stays
assert.deepEqual(paths(0), ['a.flac', 'gap.flac']);

// 8. Internal drags (origin marker set) reach on_drag_drop on child windows: never redirected.
reset(); vars.set('hariiro.drag.origin', 'glass:0');
externalDropOn(sidebar, 80, rowY('User B'));
assert.equal(vars.get('hariiro.drop.pending') || '', '');

// 9. Stale or foreign additions are left alone: expired after 15 s, other playlist, unselected rows.
reset();
externalDropOn(sidebar, 80, rowY('User B'));
now += 16000;
hostFallbackDrop(['late.flac']);
assert.deepEqual(paths(0), ['a.flac', 'late.flac'], 'expired: untouched');
reset();
externalDropOn(sidebar, 80, rowY('User B'));
records[0].items.push(H('script-add.flac')); fire('on_playlist_items_added', 0); // nothing selected
assert.deepEqual(paths(0), ['a.flac', 'script-add.flac'], 'unselected additions are not the dropped files');

console.log('PASS round15 external: Explorer drops on sidebar rows / blank / pinned, middle, Queue are redirected');
