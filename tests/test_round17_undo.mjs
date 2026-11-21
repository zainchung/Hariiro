// Round 17 (Phase E2): deleting a playlist in the sidebar and clearing the Queue can be
// undone for a few seconds from a notice at the bottom of that panel.
import assert from 'node:assert/strict';
import { createHost, panelContext, run, runScript, handle } from './helpers/fake_host.mjs';

const tracks = n => Array.from({ length: n }, (_, i) => handle(`C:/Music/${i}.flac`));
// A click as the panel sees it (AnnaDpi scale 1 in the fake host).
const click = (ctx, x, y) => { ctx.on_mouse_lbtn_down(x, y); ctx.on_mouse_lbtn_up(x, y); };

// ---- AnnaUndo -------------------------------------------------------------------------
{
  const host = createHost(), ctx = panelContext(host);
  run(ctx, "include('anna_undo.js');");
  let repaints = 0, restored = [];
  const U = ctx.AnnaUndo.create(() => repaints++);
  assert(Object.isFrozen(ctx.AnnaUndo) && Object.isFrozen(U));
  assert.equal(U.active(), false); assert.equal(U.hit(10, 380, 200, 400), '');
  U.offer('Deleted A', () => restored.push('A'));
  assert.equal(U.active(), true); assert.equal(U.text(), 'Deleted A'); assert(repaints > 0);
  const b = U.button(200, 400);
  assert.equal(U.hit(b.x + 2, b.y + 2, 200, 400), 'undo');
  assert.equal(U.hit(10, b.y + 2, 200, 400), 'notice', 'the notice itself swallows the click');
  assert.equal(U.hit(10, 10, 200, 400), '');
  // A newer action replaces the older one; only the newer one can be undone.
  U.offer('Deleted B', () => restored.push('B'));
  assert.equal(U.undo(), true); assert.deepEqual(restored, ['B']);
  assert.equal(U.active(), false); assert.equal(U.undo(), false, 'only once');
  // The notice expires.
  U.offer('Deleted C', () => restored.push('C'));
  assert(host.flushTimers() >= 1);
  assert.equal(U.active(), false); assert.equal(U.undo(), false);
  assert.deepEqual(restored, ['B']);
  assert(ctx.AnnaUndo.DURATION >= 5000 && ctx.AnnaUndo.DURATION <= 15000);
}

// ---- Sidebar: delete a playlist, then undo ----------------------------------------------
{
  const mix = tracks(3); mix.push(mix[0]); // an old duplicate the user kept
  const host = createHost({ playlists: [{ name: 'Default' }, { name: 'Mix', items: mix }, { name: 'Other', items: tracks(1) }],
    active: 1, vars: { 'anna.nav.mode': 'library' } });
  const st = host.state, sb = panelContext(host);
  runScript(sb, 'js/playlist_browser.js');
  const row = sb.entries().find(e => e.name === 'Mix');
  sb.confirmRemove(row);
  assert.deepEqual(st.playlists.map(p => p.name), ['Default', 'Other']);
  sb.on_playlists_changed();
  const b = sb.AnnaUndo && run(sb, 'sidebarUndo.button(AnnaDpi.width(),AnnaDpi.height())');
  assert(b, 'sidebar shows an undo notice after a delete');
  assert(run(sb, 'sidebarUndo.text()').includes('Mix'));
  click(sb, b.x + 3, b.y + 3);
  assert.deepEqual(st.playlists.map(p => p.name), ['Default', 'Mix', 'Other'], 'back at its old place');
  assert.deepEqual(st.playlists[1].items.map(h => h.Path), mix.map(h => h.Path), 'same tracks, same order');
  assert.equal(st.active, 1, 'restored list is shown');
  // The host then reports the change; the import dedup must keep the old duplicate.
  sb.on_playlists_changed(); sb.on_playlist_items_added(1);
  assert.equal(st.playlists[1].items.length, 4, 'restore is not an import');
  assert.equal(run(sb, 'sidebarUndo.active()'), false);
  // Name taken in the meantime: restored under a free name, nothing overwritten.
  sb.confirmRemove(sb.entries().find(e => e.name === 'Other'));
  host.plman.CreatePlaylist(2, 'Other');
  run(sb, 'sidebarUndo.undo()');
  assert.deepEqual(st.playlists.map(p => p.name), ['Default', 'Mix', 'Other (2)', 'Other']);
  assert.equal(st.playlists[3].items.length, 0, 'the new list is untouched');
}

// ---- Queue: clear, then undo ------------------------------------------------------------
{
  const old = tracks(3), later = handle('C:/Music/later.flac');
  const host = createHost({ queue: old.map(h => ({ Handle: h, PlaylistIndex: -1, PlaylistItemIndex: -1 })),
    overrides: { window: { Width: 300, Height: 300 } } });
  const st = host.state, q = panelContext(host);
  runScript(q, 'js/anna_queue.js');
  click(q, 300 - 60, 15); // "Clear playback queue" button
  assert.equal(st.queue.length, 0);
  const b = run(q, 'queueUndo.button(AnnaDpi.width(),AnnaDpi.height())');
  assert(run(q, 'queueUndo.active()'), 'queue shows an undo notice after clearing');
  host.plman.AddItemToPlaybackQueue(later); // queued meanwhile
  click(q, b.x + 3, b.y + 3);
  assert.deepEqual(st.queue.map(x => x.Handle.Path), [...old, later].map(h => h.Path), 'old queue first, newer items after it');
  // The menu's "Clear playback queue" offers the same undo.
  q.window.CreatePopupMenu = () => ({ AppendMenuItem() {}, AppendMenuSeparator() {}, TrackPopupMenu: () => 13 });
  host.window.CreatePopupMenu = q.window.CreatePopupMenu;
  q.on_mouse_rbtn_up(20, 20);
  assert.equal(st.queue.length, 0);
  run(q, 'queueUndo.undo()');
  assert.equal(st.queue.length, 4);
  // Nothing to clear: no notice.
  run(q, 'queueUndo.dismiss()'); host.plman.FlushPlaybackQueue(); q.refresh();
  click(q, 300 - 60, 15);
  assert.equal(run(q, 'queueUndo.active()'), false);
}
console.log('test_round17_undo: ok');
