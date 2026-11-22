// Round 24: several ordinary playlists can be selected in the sidebar (Ctrl / Shift + click)
// and removed with Delete; Ctrl+Z in any skin panel undoes the newest removal of the skin
// (playlists in the sidebar, tracks in the middle list, a track from the Queue).
import assert from 'node:assert/strict';
import { createHost, panelContext, run, runScript, handle } from './helpers/fake_host.mjs';

const tracks = (tag, n) => Array.from({ length: n }, (_, i) => handle(`C:/Music/${tag}${i}.flac`));
const VK_DELETE = 0x2e, VK_Z = 0x5a, MK_SHIFT = 4, MK_CONTROL = 8;
let ctrl = false;
const keys = { IsKeyPressed: vk => vk === 0x11 && ctrl, GetAlbumArtV2: () => null, IsFile: () => false, Glob: () => [] };

// One host, several panels with their own names; RunAction('JSPANEL:<name>:<info>') reaches
// that panel's on_notify_data, as Panels UI does.
function skin(options) {
  const host = createHost({ ...options, overrides: { utils: keys, window: { Width: 300, Height: 500, SetCursor() {} } } });
  const panels = new Map();
  function panel(name, file) {
    const ui = { ...host.panelsui, PanelName: name, RunAction(a) {
      host.state.actions.push(a);
      const m = /^JSPANEL:([^:]+):(.*)$/.exec(a);
      if (!m) return true;
      const target = panels.get(m[1]);
      if (!target) return false;
      if (typeof target.on_notify_data === 'function') target.on_notify_data(m[1], m[2]);
      return true;
    } };
    const ctx = panelContext(host, { panelsui: ui });
    runScript(ctx, file);
    panels.set(name, ctx);
    return ctx;
  }
  return { host, st: host.state, panel };
}
const ctrlZ = ctx => { ctrl = true; try { return ctx.on_key_down(VK_Z); } finally { ctrl = false; } };
const names = st => st.playlists.map(p => p.name);

// ---- HariiroUndo: a stack per panel, the shared order across panels ------------------------
{
  const { host, panel } = skin({ playlists: [{ name: 'A' }] });
  const ctx = panel('Probe', 'js/hariiro_shared.js');
  run(ctx, "include('hariiro_i18n.js');include('hariiro_undo.js');");
  const done = [];
  const U = run(ctx, 'HariiroUndo.create(()=>{})');
  U.offer('one', () => done.push(1)); U.offer('two', () => done.push(2));
  assert.equal(U.depth(), 2);
  assert.deepEqual(JSON.parse(host.state.vars.get('hariiro.undo.order')), ['Probe', 'Probe']);
  assert.equal(U.keyUndo(), true); assert.deepEqual(done, [2], 'newest first');
  host.flushTimers(); // the notice expires ...
  assert.equal(U.active(), false); assert.equal(U.undo(), false);
  assert.equal(U.keyUndo(), true, '... but Ctrl+Z still undoes the older action');
  assert.deepEqual(done, [2, 1]);
  assert.equal(U.keyUndo(), false, 'nothing left');
  assert.deepEqual(JSON.parse(host.state.vars.get('hariiro.undo.order')), []);
  // A restarted panel forgets its stale entries in the shared order.
  host.state.vars.set('hariiro.undo.order', JSON.stringify(['Other', 'Probe']));
  run(ctx, 'HariiroUndo.create(()=>{})');
  assert.deepEqual(JSON.parse(host.state.vars.get('hariiro.undo.order')), ['Other']);
  // Only Ctrl+Z counts (not Ctrl+Shift+Z, not Z alone).
  ctrl = true; assert.equal(run(ctx, 'HariiroUndo.isUndoKey(0x5a)'), true); ctrl = false;
  assert.equal(run(ctx, 'HariiroUndo.isUndoKey(0x5a)'), false);
}

// ---- Sidebar: Ctrl / Shift + click, Delete, Ctrl+Z ----------------------------------------
{
  const { st, panel } = skin({ playlists: [{ name: 'A', items: tracks('a', 1) }, { name: 'B', items: tracks('b', 2) },
    { name: 'C', items: tracks('c', 3) }, { name: 'D', items: tracks('d', 1) }], active: 0,
    vars: { 'hariiro.nav.mode': 'library' } });
  const sb = panel('Playlists', 'js/playlist_browser.js');
  const rowY = name => { const i = sb.entries().findIndex(r => r.name === name); assert(i >= 0, name); return 8 + 30 * i + 12; };
  const click = (name, mask = 0) => { sb.on_mouse_lbtn_down(60, rowY(name), mask); sb.on_mouse_lbtn_up(60, rowY(name), mask); };
  const selected = () => [...sb.entries().filter((e, i) => run(sb, 'selectedRow')(e, i)).map(e => e.name)];
  click('B');
  assert.equal(st.active, 1); assert.deepEqual(selected(), ['B'], 'a plain click selects one list');
  click('D', MK_CONTROL);
  assert.deepEqual(selected(), ['B', 'D'], 'Ctrl + click adds');
  assert.equal(st.active, 1, 'and does not switch the list on screen');
  click('C', MK_SHIFT);
  assert.deepEqual(selected(), ['C', 'D'], 'Shift + click: range from the last Ctrl + clicked row');
  click('A', MK_CONTROL | MK_SHIFT);
  assert.deepEqual(selected(), ['A', 'B', 'C', 'D'], 'Ctrl + Shift + click extends');
  click('A', MK_CONTROL);
  assert.deepEqual(selected(), ['B', 'C', 'D'], 'Ctrl + click on a selected row removes it');
  assert.equal(sb.on_key_down(VK_DELETE), true);
  assert.deepEqual(names(st), ['A'], 'Delete removes all selected lists');
  assert(run(sb, 'sidebarUndo.text()').includes('3'), 'one notice for the three lists');
  assert.equal(ctrlZ(sb), true);
  assert.deepEqual(names(st), ['A', 'B', 'C', 'D'], 'Ctrl+Z puts them back in place');
  assert.deepEqual(st.playlists[2].items.map(h => h.Path), tracks('c', 3).map(h => h.Path));
  assert.deepEqual(selected(), ['B', 'C', 'D'], 'and selected again');
  // A plain click ends the multi-selection; Delete then removes the active list only.
  click('C');
  assert.equal(sb.on_key_down(VK_DELETE), true);
  assert.deepEqual(names(st), ['A', 'B', 'D']);
  // The playing list is never removed; the others still go.
  click('A'); click('B', MK_CONTROL); st.playing = 0;
  sb.on_key_down(VK_DELETE);
  assert.deepEqual(names(st), ['A', 'D']);
  assert.notEqual(run(sb, 'error'), '', 'says why A stayed');
  // Fixed rows are not part of a multi-selection.
  st.playing = -1;
  click('A'); click('Favorites', MK_CONTROL);
  assert.equal(run(sb, 'multiMode'), false, 'Ctrl + click on a pinned row is a plain click');
}

// ---- Ctrl+Z across panels: newest first, wherever the keyboard focus is ---------------------
{
  const q1 = tracks('q', 3);
  const { st, panel } = skin({ playlists: [{ name: 'Mix', items: tracks('m', 4).concat([handle('C:/Music/m0.flac')]) },
    { name: 'Other', items: tracks('o', 1) }], active: 0,
    queue: q1.map(h => ({ Handle: h, PlaylistIndex: -1, PlaylistItemIndex: -1 })),
    vars: { 'hariiro.nav.mode': 'library', 'hariiro.sidebar.editable.name': 'Mix' } });
  const sb = panel('Playlists', 'js/playlist_browser.js');
  const glass = panel('GlassPlaylist', 'js/hariiro_glass_playlist.js');
  const q = panel('HariiroQueue', 'js/hariiro_queue.js');
  // 1. sidebar: remove "Other"
  sb.confirmRemove(sb.entries().find(e => e.name === 'Other'));
  assert.deepEqual(names(st).filter(n => n !== 'Queue Buffer'), ['Mix']);
  // 2. middle list: remove tracks 1 and 4 (the second copy of m0) with Delete
  st.vars.set('hariiro.sidebar.editable.name', 'Mix');
  host_select(st, 0, [1, 4]);
  assert.equal(glass.on_key_down(VK_DELETE), true);
  sb.on_playlist_items_removed(0); // as the host reports it: the dedup baseline follows
  assert.deepEqual(st.playlists[0].items.map(h => h.Path), ['C:/Music/m0.flac', 'C:/Music/m2.flac', 'C:/Music/m3.flac']);
  // 3. queue: remove the middle track
  run(q, 'moveOrRemove(1,null)');
  assert.deepEqual(st.queue.map(x => x.Handle.Path), [q1[0], q1[2]].map(h => h.Path));
  assert(run(q, 'queueUndo.active()'), 'the queue shows an undo notice');
  // Ctrl+Z in the sidebar: the queue removal (newest) is undone first.
  assert.equal(ctrlZ(sb), true);
  assert.deepEqual(st.queue.map(x => x.Handle.Path), q1.map(h => h.Path), 'track back at its old place');
  // Ctrl+Z in the queue: the track removal in the middle list.
  assert.equal(ctrlZ(q), true);
  const mix = st.playlists[st.playlists.findIndex(p => p.name === 'Mix')];
  assert.deepEqual(mix.items.map(h => h.Path), ['C:/Music/m0.flac', 'C:/Music/m1.flac', 'C:/Music/m2.flac', 'C:/Music/m3.flac', 'C:/Music/m0.flac']);
  // The sidebar sees the refill but does not treat it as an import (the old duplicate stays).
  sb.on_playlist_items_added(st.playlists.indexOf(mix));
  assert.equal(mix.items.length, 5, 'undo is not an import: no dedup');
  // Ctrl+Z in the middle list: the playlist removal.
  assert.equal(ctrlZ(glass), true);
  assert(names(st).includes('Other'));
  assert.equal(ctrlZ(glass), false, 'nothing left to undo: foobar2000 handles the key');
}

function host_select(st, p, ids) { st.selection.set(p, new Set(ids)); }

console.log('PASS round24 undo: sidebar multi-select + Delete; Ctrl+Z across sidebar / middle list / Queue');
