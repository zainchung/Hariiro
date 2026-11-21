// Phase D1 (step 2): the sidebar's scratch-view registry lives in js/hariiro_scratch_views.js.
// Same rules as before (Round 11 cleanup, Round 13 lock handling); tested directly here.
import assert from 'node:assert/strict';
import { read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run } from './helpers/fake_host.mjs';

const PROP = 'Hariiro.OwnedScratchPlaylists.v1';
const LISTS = ['User', 'Artist View', 'Artist View #2', 'Sorted Library View #2', 'Artist View #3'];
let host, st;
function load(initialProp) {
  host = createHost({ playlists: LISTS.map(name => ({ name })), props: initialProp === undefined ? {} : { [PROP]: initialProp } });
  st = host.state;
  const ctx = panelContext(host);
  run(ctx, "include('hariiro_i18n.js');include('hariiro_shared.js');include('hariiro_scratch_views.js');");
  return ctx;
}
const names = () => st.playlists.map(p => p.name);
const owned = () => JSON.parse(st.props.get(PROP) || '[]');
const foreignLock = i => { st.playlists[i].locked = { owner: 'other', actions: ['RemovePlaylist'] }; };

// Registry load: only view names survive; junk and user names are dropped.
let V = load(JSON.stringify(['Artist View #2', 'User', 42, 'Sorted Library View #2', 'Artist View']));
assert(Object.isFrozen(V.HariiroScratchViews));
const S = V.HariiroScratchViews;
assert(S.isOwned('Artist View #2') && S.isOwned('Sorted Library View #2') && S.isOwned('Artist View'));
assert(!S.isOwned('User') && !S.isOwned('Artist View #3'));
assert(!load('not json').HariiroScratchViews.isOwned('Artist View'), 'corrupt property → empty registry');
assert(!load(undefined).HariiroScratchViews.isOwned('Artist View'));

// claim(): unregistered same-named lists belong to the user and are skipped.
V = load('[]');
assert.equal(V.HariiroScratchViews.claim('Artist View'), 5);
assert.deepEqual(names().slice(5), ['Artist View #4'], 'one new list');
assert.deepEqual(owned(), ['Artist View #4']);
// A registered view is reused, unless playing, queued or locked by someone else.
V = load(JSON.stringify(['Artist View', 'Artist View #2', 'Artist View #3']));
assert.equal(V.HariiroScratchViews.claim('Artist View'), 1);
st.playing = 1; st.queue = [{ PlaylistIndex: 2 }];
assert.equal(V.HariiroScratchViews.claim('Artist View'), 4, 'playing #1 and queued #2 are protected');
foreignLock(4);
assert.equal(V.HariiroScratchViews.claim('Artist View'), names().indexOf('Artist View #4'), 'foreign lock fails closed');
assert.throws(() => {
  st.playlists = []; for (let n = 0; n < 64; n++) st.playlists.push({ name: n ? 'Hariiro - X #' + (n + 1) : 'Hariiro - X', items: [] });
  V.HariiroScratchViews.claim('Hariiro - X');
}, e => e.message === V.HariiroI18n.t('viewSlotsFull'));

// prune(): removes only owned numbered duplicates that nothing references.
V = load(JSON.stringify(['Artist View', 'Artist View #2', 'Sorted Library View #2', 'Artist View #3', 'Artist View #9']));
st.playing = 2; st.queue = [{ PlaylistIndex: 4 }]; st.active = 0;
assert.equal(V.HariiroScratchViews.prune(), 1, 'only Sorted Library View #2 is free');
assert.deepEqual(names(), ['User', 'Artist View', 'Artist View #2', 'Artist View #3']);
assert.deepEqual(owned(), ['Artist View', 'Artist View #2', 'Artist View #3'], 'missing #9 forgotten');
V = load(JSON.stringify(['Artist View #2']));
foreignLock(2); assert.equal(V.HariiroScratchViews.prune(), 0, 'list locked by another component kept');
V = load(JSON.stringify(['Artist View #2']));
st.active = 2; assert.equal(V.HariiroScratchViews.prune(), 0, 'active list kept');
V = load(JSON.stringify(['Artist View #2']));
host.plman.RemovePlaylist = undefined; assert.equal(V.HariiroScratchViews.prune(), 0, 'old host without RemovePlaylist');

// The sidebar keeps no copy of the registry.
const sidebar = read('js/playlist_browser.js');
assert(sidebar.includes("include('hariiro_scratch_views.js');"));
assert(!sidebar.includes('Hariiro.OwnedScratchPlaylists.v1') && !/\bownedScratch\b/.test(sidebar));
console.log('test_scratch_views: ok');
