// Phase D1 (step 3): sidebar pieces moved out of js/playlist_browser.js and tested directly.
//  - HariiroSidebarDrop: the one drop decision behind on_drag_over / on_drag_drop / external files.
//  - HariiroDedupTracker: path baselines that remove the duplicates an import just added.
//  - HariiroImportStaging: the hidden list that receives files dropped on blank sidebar space.
import assert from 'node:assert/strict';
import { read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run, handle } from './helpers/fake_host.mjs';
const plain = x => JSON.parse(JSON.stringify(x));

// ---- HariiroSidebarDrop ------------------------------------------------------------------
{
  const ctx = panelContext(createHost());
  run(ctx, "include('hariiro_i18n.js');include('hariiro_sidebar_drop.js');");
  const D = ctx.HariiroSidebarDrop, t = k => ctx.HariiroI18n.t(k);
  assert(Object.isFrozen(D));
  const mine = { kind: 'playlist', index: 4, name: 'Mine' }, fixed = { kind: 'fixedFavorites', index: 1, name: 'Fav' };
  const base = { mode: 'playlists', busy: false, src: '', hit: { i: 5, row: mine }, editable: r => r.kind === 'playlist',
    blankAllowed: false, glassIndex: -2 };
  const decide = o => plain(D.decide({ ...base, ...o }));
  const no = notice => ({ accept: false, kind: 'reject', target: -1, p: -1, notice });

  assert.deepEqual(decide({}), { accept: true, kind: 'row', target: 5, p: 4, notice: t('dropTo') + ' Mine' }, 'external file → ordinary row');
  assert.deepEqual(decide({ src: 'glass:2', glassIndex: 2 }).kind, 'row', 'middle list → another playlist');
  assert.deepEqual(decide({ src: 'glass:4', glassIndex: 4 }), no(t('sameListDenied')), 'middle list → its own playlist');
  assert.deepEqual(decide({ hit: { i: 1, row: fixed } }), no(t('listReadOnlyDrop')), 'pinned row is read-only');
  assert.deepEqual(decide({ hit: null, blankAllowed: true }), { accept: true, kind: 'blank', target: -1, p: -1, notice: t('dropNewPlaylist') });
  assert.deepEqual(decide({ hit: { i: 9, row: null }, blankAllowed: true }).kind, 'blank', 'below the last row');
  assert.deepEqual(decide({ hit: null }), no(t('dropEditable')), 'blank space, but not an external file');
  assert.deepEqual(decide({ src: 'sidebar:playlist:3' }), no(t('sidebarToMiddleDenied')), 'sidebar → sidebar');
  assert.deepEqual(decide({ busy: true }), no(t('sidebarToMiddleDenied')), "the sidebar's own drag");
  assert.deepEqual(decide({ mode: 'artists' }), no(t('artistHint')), 'Artist tab is read-only');
}

// ---- HariiroDedupTracker -----------------------------------------------------------------
{
  const host = createHost({ playlists: [
    { name: 'Mix', items: [handle('C:/A.flac'), handle('C:/A.flac'), handle('C:/B.flac')] },
    { name: 'Hariiro - Favorites', items: [handle('C:/A.flac')] }, { name: 'Mix', items: [handle('D:/X.flac')] }] });
  const st = host.state, items = p => st.playlists[p].items;
  const ctx = panelContext(host);
  run(ctx, "include('hariiro_playlist_dedup.js');include('hariiro_dedup_tracker.js');");
  const T = ctx.HariiroDedupTracker.create(p => st.playlists[p].name !== 'Hariiro - Favorites');
  assert(Object.isFrozen(T));
  let removingSeen = false;
  const remove = host.plman.RemovePlaylistSelection;
  host.plman.RemovePlaylistSelection = (p, crop) => { remove(p, crop); removingSeen = T.isRemoving(p); };

  assert.equal(T.dedupe(0), 0, 'no baseline yet: never touch unknown user data');
  T.sync();
  // Import: one file already there (A, case-insensitive path), one new (C) twice.
  items(0).push(handle('c:/a.FLAC'), handle('C:/C.flac'), handle('C:/C.flac'));
  host.plman.SetPlaylistSelection(0, [1, 4], true); host.plman.SetPlaylistFocusItem(0, 5);
  assert.equal(T.dedupe(0), 2);
  assert.deepEqual(items(0).map(x => x.Path), ['C:/A.flac', 'C:/A.flac', 'C:/B.flac', 'C:/C.flac'], 'old duplicates are kept');
  assert(removingSeen && !T.isRemoving(0), 'isRemoving is true only during the removal');
  assert.deepEqual([...st.selection.get(0)], [1, 3], 'selection kept and shifted (old 4 → 3)');
  assert.equal(st.focus.get(0), 3, 'focus follows the removal');
  assert.equal(st.undoBackups, 1, 'undo point before removing');
  // Same name, second list: tracked separately (name + serial).
  items(2).push(handle('D:/X.flac'));
  assert.equal(T.dedupe(2), 1);
  // Not an ordinary list, or locked: nothing removed.
  items(1).push(handle('C:/A.flac'));
  assert.equal(T.dedupe(1), 0);
  assert.equal(items(1).length, 2);
  items(0).push(handle('C:/B.flac')); st.playlists[0].locked = { owner: 'other', actions: ['RemoveItems'] };
  assert.equal(T.dedupe(0), 1, 'reported, but a locked list is not changed');
  assert.equal(items(0).length, 5);
  // refresh() makes the current content the baseline.
  st.playlists[0].locked = null; items(0).push(handle('C:/B.flac')); T.refresh(0);
  assert.equal(T.dedupe(0), 0);
}

// ---- HariiroImportStaging ----------------------------------------------------------------
{
  const host = createHost({ playlists: [{ name: 'User' }, { name: 'Hariiro - Import Staging' }] });
  const ctx = panelContext(host), names = () => host.state.playlists.map(p => p.name);
  run(ctx, "include('hariiro_i18n.js');include('hariiro_shared.js');include('hariiro_import_staging.js');");
  const S = ctx.HariiroImportStaging;
  assert(Object.isFrozen(S));
  assert.equal(S.name(), ''); assert.equal(S.find(), -1);
  assert.equal(S.playlist(), 2, 'a foreign list with the base name is skipped');
  assert.equal(names()[2], 'Hariiro - Import Staging #2');
  assert.equal(S.name(), 'Hariiro - Import Staging #2'); assert.equal(S.find(), 2);
  assert.equal(host.state.props.get('Hariiro.Sidebar.ImportStaging.v1'), 'Hariiro - Import Staging #2', 'remembered across restarts');
  assert.equal(S.playlist(), 2, 'reused');
}

// ---- The sidebar keeps no copies -------------------------------------------------------
const sidebar = read('js/playlist_browser.js');
for (const f of ['hariiro_sidebar_drop.js', 'hariiro_dedup_tracker.js', 'hariiro_import_staging.js'])
  assert(sidebar.includes(`include('${f}');`), f);
for (const old of ['ordinaryPathBaselines', 'removeImportDuplicates', 'importStageName', 'Hariiro.Sidebar.ImportStaging.v1',
  "HariiroI18n.t('sameListDenied')", "HariiroI18n.t('dropNewPlaylist')"])
  assert(!sidebar.includes(old), 'playlist_browser.js still has ' + old);
console.log('test_sidebar_modules: ok');
