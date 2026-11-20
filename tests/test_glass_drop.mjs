// Phase D1 (step 1): the middle list's drop decision lives in js/anna_glass_drop.js.
// Same rules as the Round 14 drag matrix; the panel only supplies its own-drag state.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, installIncludeShim } from './helpers/js_panel.mjs';

installIncludeShim(vm);
const names = ['User A', 'User B', 'Anna - Favorites', 'Anna - Artist View', 'Anna - Queue Buffer #2', 'Anna - Search Results'];
let active = 0, locked = new Set(), now = 1000;
const vars = new Map();
const ctx = vm.createContext({
  Date: { now: () => now }, JSON, String, Array, Object,
  plman: { get ActivePlaylist() { return active; }, get PlaylistCount() { return names.length; },
    GetPlaylistName: i => names[i], IsPlaylistLocked: i => locked.has(i) },
  panelsui: { GetVariable: (k, d) => (vars.has(k) ? vars.get(k) : d), SetVariable: (k, v) => vars.set(k, v) },
});
ctx.include = f => vm.runInContext(read('js/' + f), ctx);
vm.runInContext("include('anna_i18n.js');include('anna_shared.js');include('anna_glass_drop.js');", ctx);
const G = ctx.AnnaGlassDrop, S = ctx.AnnaShared, t = k => ctx.AnnaI18n.t(k);
const reset = () => {
  active = 0; locked = new Set(); now = 1000; vars.clear();
  vars.set(S.PVAR.navMode, 'library'); vars.set(S.PVAR.queueBuffer, 'Anna - Queue Buffer #2');
  vars.set(S.PVAR.searchOwned, '["Anna - Search Results"]');
};
const idle = { active: false, guardUntil: 0 };
const ev = (own = idle) => JSON.parse(JSON.stringify(G.evaluate(own)));
assert(Object.isFrozen(G));

// Drag source
reset();
assert.deepEqual(JSON.parse(JSON.stringify(G.source(idle))), { kind: 'external' });
assert.equal(G.source({ active: true, guardUntil: 0 }).kind, 'glass', 'own DoDragDrop in progress');
assert.equal(G.source({ active: false, guardUntil: 1500 }).kind, 'glass', 'stray callback right after own drag');
S.setOrigin('glass:0'); assert.equal(G.source(idle).kind, 'glass');
S.setOrigin('sidebar:artist:2'); assert.deepEqual(JSON.parse(JSON.stringify(G.source(idle))), { kind: 'sidebar', type: 'artist', index: 2 });

// Target: only an ordinary, unlocked playlist shown in library mode
reset();
assert.equal(G.target(), 0);
for (const [setup, why] of [
  [() => { active = 2; }, 'Favorites is reserved'],
  [() => { active = 3; }, 'Artist view'],
  [() => { active = 4; }, 'Queue buffer'],
  [() => { active = 5; }, 'search results owned by the skin'],
  [() => { locked.add(0); }, 'locked playlist'],
  [() => { vars.set(S.PVAR.navMode, 'artists'); }, 'Artists tab'],
  [() => { active = -1; }, 'no playlist'],
]) { reset(); setup(); assert.equal(G.target(), -1, why); }

// Decisions (Round 14 matrix)
reset();
assert.deepEqual(ev({ active: true, guardUntil: 0 }), { ok: false, msg: '' }, 'own tracks never back onto Glass');
S.setOrigin('sidebar:artist:1'); assert.deepEqual(ev(), { ok: false, msg: t('sidebarToMiddleDenied') });
S.setOrigin('sidebar:fixedFavorites:2'); assert.deepEqual(ev(), { ok: false, msg: t('sidebarToMiddleDenied') });
S.setOrigin('sidebar:playlist:0'); assert.deepEqual(ev(), { ok: false, msg: t('sameListDenied') });
S.setOrigin('sidebar:playlist:1'); assert.deepEqual(ev(), { ok: true, msg: t('dropToImport'), target: 0 });
S.setOrigin(''); assert.deepEqual(ev(), { ok: true, msg: t('dropToImport'), target: 0 }, 'external files into an ordinary list');
active = 2; assert.deepEqual(ev(), { ok: false, msg: t('chooseRegularPlaylist') });
active = 3; assert.deepEqual(ev(), { ok: false, msg: t('artistHint') }, 'artist view gets the artist hint');
reset(); vars.set(S.PVAR.navMode, 'artists'); assert.deepEqual(ev(), { ok: false, msg: t('artistHint') });

// The panel keeps only its own-drag state and a thin wrapper.
const glass = read('js/anna_glass_playlist.js');
assert(glass.includes("include('anna_glass_drop.js');"));
for (const fn of ['dragSource', 'activeDropTarget', 'dropAllowed', 'denyMessage'])
  assert(!new RegExp(`function ${fn}\\(`).test(glass), `${fn} moved to anna_glass_drop.js`);
assert(/function evaluateDrop\(\)\{return AnnaGlassDrop\.evaluate\(/.test(glass));

console.log('PASS glass drop: AnnaGlassDrop source/target/decision matrix, panel delegates to it');
