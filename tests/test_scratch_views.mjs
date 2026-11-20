// Phase D1 (step 2): the sidebar's scratch-view registry lives in js/anna_scratch_views.js.
// Same rules as before (Round 11 cleanup, Round 13 lock handling); tested directly here.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, installIncludeShim } from './helpers/js_panel.mjs';

installIncludeShim(vm);
const PROP = 'Anna.OwnedScratchPlaylists.v1';
let rows, props, playing, active, queueRefs, locked, unlockFails, created;
function host(initialProp) {
  rows = ['User', 'Anna - Artist View', 'Anna - Artist View #2', 'Anna - Sorted Library View #2', 'Anna - Artist View #3'];
  props = new Map(initialProp === undefined ? [] : [[PROP, initialProp]]);
  playing = -1; active = 0; queueRefs = []; locked = new Set(); unlockFails = false; created = [];
  const ctx = vm.createContext({
    JSON, String, Array, Object, Set, Number, Error, console: { log() {} },
    window: { GetProperty: (k, d) => (props.has(k) ? props.get(k) : d), SetProperty: (k, v) => props.set(k, v) },
    plman: {
      get PlaylistCount() { return rows.length; }, get ActivePlaylist() { return active; }, get PlayingPlaylist() { return playing; },
      GetPlaylistName: i => rows[i], FindPlaylist: n => rows.indexOf(n), IsPlaylistLocked: i => locked.has(i),
      GetPlaybackQueueContents: () => queueRefs,
      RemovePlaylist(i) { rows.splice(i, 1); return true; },
      SetPlaylistLockedActions(i) { if (unlockFails) throw Error('foreign lock'); },
      FindOrCreatePlaylist(n) { let i = rows.indexOf(n); if (i < 0) { i = rows.length; rows.push(n); created.push(n); } return i; },
    },
  });
  ctx.include = f => vm.runInContext(read('js/' + f), ctx);
  vm.runInContext("include('anna_i18n.js');include('anna_shared.js');include('anna_scratch_views.js');", ctx);
  return ctx;
}
const owned = () => JSON.parse(props.get(PROP) || '[]');

// Registry load: only view names survive; junk and user names are dropped.
let V = host(JSON.stringify(['Anna - Artist View #2', 'User', 42, 'Anna - Sorted Library View #2', 'Anna - Artist View']));
assert(Object.isFrozen(V.AnnaScratchViews));
const S = V.AnnaScratchViews;
assert(S.isOwned('Anna - Artist View #2') && S.isOwned('Anna - Sorted Library View #2') && S.isOwned('Anna - Artist View'));
assert(!S.isOwned('User') && !S.isOwned('Anna - Artist View #3'));
assert(!host('not json').AnnaScratchViews.isOwned('Anna - Artist View'), 'corrupt property → empty registry');
assert(!host(undefined).AnnaScratchViews.isOwned('Anna - Artist View'));

// claim(): unregistered same-named lists belong to the user and are skipped.
V = host('[]');
assert.equal(V.AnnaScratchViews.claim('Anna - Artist View'), rows.indexOf('Anna - Artist View #4'));
assert.deepEqual(created, ['Anna - Artist View #4']);
assert.deepEqual(owned(), ['Anna - Artist View #4']);
// A registered view is reused, unless playing, queued or locked by someone else.
V = host(JSON.stringify(['Anna - Artist View', 'Anna - Artist View #2', 'Anna - Artist View #3']));
assert.equal(V.AnnaScratchViews.claim('Anna - Artist View'), 1);
playing = 1; queueRefs = [{ PlaylistIndex: 2 }];
assert.equal(V.AnnaScratchViews.claim('Anna - Artist View'), 4, 'playing #1 and queued #2 are protected');
unlockFails = true;
assert.equal(V.AnnaScratchViews.claim('Anna - Artist View'), rows.indexOf('Anna - Artist View #4'), 'foreign lock fails closed');
assert.throws(() => { rows = []; for (let n = 0; n < 64; n++) rows.push(n ? 'Anna - X #' + (n + 1) : 'Anna - X'); V.AnnaScratchViews.claim('Anna - X'); },
  e => e.message === V.AnnaI18n.t('viewSlotsFull'));

// prune(): removes only owned numbered duplicates that nothing references.
V = host(JSON.stringify(['Anna - Artist View', 'Anna - Artist View #2', 'Anna - Sorted Library View #2', 'Anna - Artist View #3', 'Anna - Artist View #9']));
playing = 2; queueRefs = [{ PlaylistIndex: 4 }]; active = 0;
assert.equal(V.AnnaScratchViews.prune(), 1, 'only Sorted Library View #2 is free');
assert.deepEqual(rows, ['User', 'Anna - Artist View', 'Anna - Artist View #2', 'Anna - Artist View #3']);
assert.deepEqual(owned(), ['Anna - Artist View', 'Anna - Artist View #2', 'Anna - Artist View #3'], 'missing #9 forgotten');
V = host(JSON.stringify(['Anna - Artist View #2']));
locked.add(2); unlockFails = true; assert.equal(V.AnnaScratchViews.prune(), 0, 'list locked by another component kept');
V = host(JSON.stringify(['Anna - Artist View #2']));
active = 2; assert.equal(V.AnnaScratchViews.prune(), 0, 'active list kept');
V = host(JSON.stringify(['Anna - Artist View #2']));
V.plman.RemovePlaylist = undefined; assert.equal(V.AnnaScratchViews.prune(), 0, 'old host without RemovePlaylist');

// The sidebar keeps no copy of the registry.
const sidebar = read('js/playlist_browser.js');
assert(sidebar.includes("include('anna_scratch_views.js');"));
assert(!sidebar.includes('Anna.OwnedScratchPlaylists.v1') && !/\bownedScratch\b/.test(sidebar));
console.log('test_scratch_views: ok');
