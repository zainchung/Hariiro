// Round 16: numbered scratch views (`Hariiro - Artist View #2`, ...) were never cleaned up.
// The sidebar AddItems-locks every populated view (Round 13) and the cleanup skipped every
// locked list (Round 11). Our own JS Panel lock must not block the cleanup; a lock held by
// another component still must (SetPlaylistLockedActions throws for it, as in foo_js_panel).
import assert from 'node:assert/strict';
import { createHost, panelContext, run } from './helpers/fake_host.mjs';

const PROP = 'Hariiro.OwnedScratchPlaylists.v1';
let host, V, names;
function setup(overrides) {
  host = createHost({ playlists: [{ name: 'User' }, { name: 'Hariiro - Artist View' }],
    props: { [PROP]: JSON.stringify(['Hariiro - Artist View']) }, overrides });
  V = panelContext(host);
  run(V, "include('hariiro_i18n.js');include('hariiro_shared.js');include('hariiro_scratch_views.js');");
  names = () => host.state.playlists.map(p => p.name);
}
const S = host => host.state;
// What the sidebar does when it opens an Artist view (loadSortedView).
const open = name => { const d = V.HariiroScratchViews.claim(name); host.plman.SetPlaylistLockedActions(d, ['AddItems']); S(host).active = d; return d; };

// The Windows case: Artist View plays, another artist opens as #2, user moves on.
setup();
open('Hariiro - Artist View'); S(host).playing = 1;
const second = open('Hariiro - Artist View');
assert.equal(names()[second], 'Hariiro - Artist View #2');
S(host).active = 0; // back to an ordinary playlist
assert.equal(V.HariiroScratchViews.prune(), 1, 'own AddItems lock must not keep #2 alive');
assert.deepEqual(names(), ['User', 'Hariiro - Artist View']);
assert.deepEqual(JSON.parse(S(host).props.get(PROP)), ['Hariiro - Artist View']);
assert(host.plman.IsPlaylistLocked(1), 'the base view keeps its lock');

// Still protected: active, playing, and a lock held by another component.
setup(); open('Hariiro - Artist View'); S(host).playing = 1; open('Hariiro - Artist View');
assert.equal(V.HariiroScratchViews.prune(), 0, '#2 is active');
S(host).active = 0; S(host).playing = 2;
assert.equal(V.HariiroScratchViews.prune(), 0, '#2 is playing');
assert(host.plman.IsPlaylistLocked(2), 'a kept view keeps its lock');
S(host).playing = 1; S(host).playlists[2].locked = { owner: 'other', actions: ['RemovePlaylist'] };
assert.equal(V.HariiroScratchViews.prune(), 0, 'foreign lock: fail closed');
assert.equal(names()[2], 'Hariiro - Artist View #2');

// If the host refuses the removal, the view gets its AddItems lock back.
setup({ plman: { RemovePlaylist: () => false } });
open('Hariiro - Artist View'); S(host).playing = 1; open('Hariiro - Artist View'); S(host).active = 0;
assert.equal(V.HariiroScratchViews.prune(), 0);
assert.deepEqual([...host.plman.GetPlaylistLockedActions(2)], ['AddItems']);
console.log('test_round16_scratch: ok');
