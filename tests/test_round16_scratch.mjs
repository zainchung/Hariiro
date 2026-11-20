// Round 16: numbered scratch views (`Anna - Artist View #2`, ...) were never cleaned up.
// The sidebar AddItems-locks every populated view (Round 13) and the cleanup skipped every
// locked list (Round 11). Our own JS Panel lock must not block the cleanup; a lock held by
// another component still must (SetPlaylistLockedActions throws for it, as in foo_js_panel).
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, installIncludeShim } from './helpers/js_panel.mjs';

installIncludeShim(vm);
const PROP = 'Anna.OwnedScratchPlaylists.v1';
let rows, props, playing, active, locks, removeResult;
function host() {
  rows = ['User', 'Anna - Artist View'];
  props = new Map([[PROP, JSON.stringify(['Anna - Artist View'])]]);
  playing = -1; active = 0; locks = new Map(); removeResult = true; // index -> {owner, actions}
  const ctx = vm.createContext({
    JSON, String, Array, Object, Set, Number, Error, console: { log() {} },
    window: { GetProperty: (k, d) => (props.has(k) ? props.get(k) : d), SetProperty: (k, v) => props.set(k, v) },
    plman: {
      get PlaylistCount() { return rows.length; }, get ActivePlaylist() { return active; }, set ActivePlaylist(v) { active = v; },
      get PlayingPlaylist() { return playing; },
      GetPlaylistName: i => rows[i], FindPlaylist: n => rows.indexOf(n),
      IsPlaylistLocked: i => (locks.get(i)?.actions.length || 0) > 0,
      GetPlaybackQueueContents: () => [],
      RemovePlaylist(i) {
        if (!removeResult) return false;
        rows.splice(i, 1);
        const next = new Map(); for (const [k, v] of locks) if (k !== i) next.set(k > i ? k - 1 : k, v); locks = next;
        return true;
      },
      SetPlaylistLockedActions(i, actions) {
        if (locks.get(i)?.owner === 'other') throw Error(`SetPlaylistLockedActions: playlist ${i} is locked by another component`);
        locks.set(i, { owner: 'js', actions: [...actions] });
      },
      FindOrCreatePlaylist(n) { let i = rows.indexOf(n); if (i < 0) { i = rows.length; rows.push(n); } return i; },
    },
  });
  ctx.include = f => vm.runInContext(read('js/' + f), ctx);
  vm.runInContext("include('anna_i18n.js');include('anna_shared.js');include('anna_scratch_views.js');", ctx);
  return ctx;
}
// What the sidebar does when it opens an Artist view (loadSortedView).
const open = (V, name) => { const d = V.AnnaScratchViews.claim(name); V.plman.SetPlaylistLockedActions(d, ['AddItems']); active = d; return d; };

// The Windows case: Artist View plays, another artist opens as #2, user moves on.
let V = host();
open(V, 'Anna - Artist View'); playing = 1;
const second = open(V, 'Anna - Artist View');
assert.equal(rows[second], 'Anna - Artist View #2');
active = 0; // back to an ordinary playlist
assert.equal(V.AnnaScratchViews.prune(), 1, 'own AddItems lock must not keep #2 alive');
assert.deepEqual(rows, ['User', 'Anna - Artist View']);
assert.deepEqual(JSON.parse(props.get(PROP)), ['Anna - Artist View']);
assert(V.plman.IsPlaylistLocked(1), 'the base view keeps its lock');

// Still protected: active, playing, and a lock held by another component.
V = host(); open(V, 'Anna - Artist View'); playing = 1; open(V, 'Anna - Artist View');
assert.equal(V.AnnaScratchViews.prune(), 0, '#2 is active');
active = 0; playing = 2;
assert.equal(V.AnnaScratchViews.prune(), 0, '#2 is playing');
assert(V.plman.IsPlaylistLocked(2), 'a kept view keeps its lock');
playing = 1; locks.set(2, { owner: 'other', actions: ['RemovePlaylist'] });
assert.equal(V.AnnaScratchViews.prune(), 0, 'foreign lock: fail closed');
assert.equal(rows[2], 'Anna - Artist View #2');

// If the host refuses the removal, the view gets its AddItems lock back.
V = host(); open(V, 'Anna - Artist View'); playing = 1; open(V, 'Anna - Artist View'); active = 0;
removeResult = false;
assert.equal(V.AnnaScratchViews.prune(), 0);
assert.deepEqual(locks.get(2).actions, ['AddItems']);
console.log('test_round16_scratch: ok');
