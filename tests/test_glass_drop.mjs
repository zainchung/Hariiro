// Phase D1 (step 1): the middle list's drop decision lives in js/hariiro_glass_drop.js.
// Same rules as the Round 14 drag matrix; the panel only supplies its own-drag state.
import assert from 'node:assert/strict';
import { read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run } from './helpers/fake_host.mjs';

const names = ['User A', 'User B', 'Hariiro - Favorites', 'Hariiro - Artist View', 'Hariiro - Queue Buffer #2', 'Hariiro - Search Results'];
const host = createHost({ playlists: names.map(name => ({ name })) }), st = host.state;
let now = 1000;
const ctx = panelContext(host, { Date: { now: () => now } });
run(ctx, "include('hariiro_i18n.js');include('hariiro_shared.js');include('hariiro_glass_drop.js');");
const G = ctx.HariiroGlassDrop, S = ctx.HariiroShared, t = k => ctx.HariiroI18n.t(k);
let vars; // = host.state.vars after reset()
const lock = i => { st.playlists[i].locked = { owner: 'js', actions: ['AddItems'] }; };
const reset = () => {
  st.active = 0; st.playlists.forEach(p => { p.locked = null; }); now = 1000; st.vars.clear(); vars = st.vars;
  vars.set(S.PVAR.navMode, 'library'); vars.set(S.PVAR.queueBuffer, 'Hariiro - Queue Buffer #2');
  vars.set(S.PVAR.searchOwned, '["Hariiro - Search Results"]');
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
  [() => { st.active = 2; }, 'Favorites is reserved'],
  [() => { st.active = 3; }, 'Artist view'],
  [() => { st.active = 4; }, 'Queue buffer'],
  [() => { st.active = 5; }, 'search results owned by the skin'],
  [() => { lock(0); }, 'locked playlist'],
  [() => { vars.set(S.PVAR.navMode, 'artists'); }, 'Artists tab'],
  [() => { st.active = -1; }, 'no playlist'],
]) { reset(); setup(); assert.equal(G.target(), -1, why); }

// Decisions (Round 14 matrix)
reset();
assert.deepEqual(ev({ active: true, guardUntil: 0 }), { ok: false, msg: '' }, 'own tracks never back onto Glass');
S.setOrigin('sidebar:artist:1'); assert.deepEqual(ev(), { ok: false, msg: t('sidebarToMiddleDenied') });
S.setOrigin('sidebar:fixedFavorites:2'); assert.deepEqual(ev(), { ok: false, msg: t('sidebarToMiddleDenied') });
S.setOrigin('sidebar:playlist:0'); assert.deepEqual(ev(), { ok: false, msg: t('sameListDenied') });
S.setOrigin('sidebar:playlist:1'); assert.deepEqual(ev(), { ok: true, msg: t('dropToImport'), target: 0 });
S.setOrigin(''); assert.deepEqual(ev(), { ok: true, msg: t('dropToImport'), target: 0 }, 'external files into an ordinary list');
st.active = 2; assert.deepEqual(ev(), { ok: false, msg: t('chooseRegularPlaylist') });
st.active = 3; assert.deepEqual(ev(), { ok: false, msg: t('artistHint') }, 'artist view gets the artist hint');
reset(); vars.set(S.PVAR.navMode, 'artists'); assert.deepEqual(ev(), { ok: false, msg: t('artistHint') });

// The panel keeps only its own-drag state and a thin wrapper.
const glass = read('js/hariiro_glass_playlist.js');
assert(glass.includes("include('hariiro_glass_drop.js');"));
for (const fn of ['dragSource', 'activeDropTarget', 'dropAllowed', 'denyMessage'])
  assert(!new RegExp(`function ${fn}\\(`).test(glass), `${fn} moved to hariiro_glass_drop.js`);
assert(/function evaluateDrop\(\)\{return HariiroGlassDrop\.evaluate\(/.test(glass));

console.log('PASS glass drop: HariiroGlassDrop source/target/decision matrix, panel delegates to it');
