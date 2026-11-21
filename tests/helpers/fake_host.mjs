// Reusable fake foobar2000 / JS Panel / Panels UI host for offline tests (Phase D3).
// Covers what the skin's helper modules and most panel callbacks touch: playlists with
// items, selection, focus, locks with an owner, the playback queue, panel variables,
// window properties and timers. New suites should start here and add what they need via
// `overrides`, instead of writing a host of their own.
//
//   const host = createHost({ playlists: [{ name: 'A', items: [h('a.flac')] }] });
//   const ctx = panelContext(host);                 // vm context with the include shim
//   run(ctx, "include('hariiro_shared.js');");          // or runScript(ctx, 'js/x.js')
//   host.state.playlists[0].items                    // inspect / change state directly
import vm from 'node:vm';
import { read, installIncludeShim } from './js_panel.mjs';

installIncludeShim(vm);

// A track handle: Path + SubSong (what the skin compares).
export const handle = (path, subSong = 0) => ({ Path: path, SubSong: subSong });

// FbMetadbHandleList stand-in backed by a copy-on-read array.
export function handleList(items = []) {
  const list = items;
  return {
    get Count() { return list.length; },
    Convert: () => list.slice(),
    Item: i => list[i],
    Add(h) { list.push(h); },
    AddRange(other) { list.push(...other.Convert()); },
    Find(h) { return list.indexOf(h); },
  };
}

// Locks: {owner: 'js' | 'other', actions: [...]}. SetPlaylistLockedActions throws for a
// lock owned by another component, as foo_js_panel 1.9 does.
export function createHost({ playlists = [], active = 0, playing = -1, queue = [], vars = {}, props = {},
  overrides = {} } = {}) {
  const state = {
    playlists: playlists.map(p => ({ name: p.name, items: (p.items || []).slice(), locked: p.locked || null })),
    active, playing, queue: queue.slice(), selection: new Map(), focus: new Map(),
    vars: new Map(Object.entries(vars)), props: new Map(Object.entries(props)),
    timers: new Map(), nextTimer: 0, undoBackups: 0, actions: [], repaints: 0,
  };
  const P = i => state.playlists[i];
  const sel = p => { if (!state.selection.has(p)) state.selection.set(p, new Set()); return state.selection.get(p); };
  // Per-playlist maps follow their playlist when one before it is removed.
  const shiftAfterRemove = removed => {
    for (const m of [state.selection, state.focus]) {
      const next = new Map();
      for (const [k, v] of m) if (k !== removed) next.set(k > removed ? k - 1 : k, v);
      m.clear(); for (const [k, v] of next) m.set(k, v);
    }
  };

  const plman = {
    get PlaylistCount() { return state.playlists.length; },
    get ActivePlaylist() { return state.active; }, set ActivePlaylist(v) { state.active = v; },
    get PlayingPlaylist() { return state.playing; },
    GetPlaylistName: i => (P(i) ? P(i).name : ''),
    FindPlaylist: n => state.playlists.findIndex(x => x.name === n),
    PlaylistItemCount: i => (P(i) ? P(i).items.length : 0),
    GetPlaylistItems: i => handleList(P(i).items),
    CreatePlaylist(at, name) { state.playlists.splice(at, 0, { name, items: [], locked: null }); return at; },
    FindOrCreatePlaylist(name) {
      const i = plman.FindPlaylist(name);
      return i >= 0 ? i : plman.CreatePlaylist(state.playlists.length, name);
    },
    RemovePlaylist(i) {
      if (!P(i)) return false;
      state.playlists.splice(i, 1); shiftAfterRemove(i);
      if (state.active === i) state.active = -1; else if (state.active > i) state.active--;
      if (state.playing === i) state.playing = -1; else if (state.playing > i) state.playing--;
      return true;
    },
    RenamePlaylist(i, name) { if (!P(i)) return false; P(i).name = name; return true; },
    MovePlaylist(from, to) { const [x] = state.playlists.splice(from, 1); state.playlists.splice(to, 0, x); return true; },
    IsPlaylistLocked: i => !!(P(i) && P(i).locked && P(i).locked.actions.length),
    GetPlaylistLockedActions: i => (P(i) && P(i).locked ? P(i).locked.actions.slice() : []),
    SetPlaylistLockedActions(i, actions) {
      if (!P(i)) throw new Error(`SetPlaylistLockedActions: no playlist ${i}`);
      if (P(i).locked && P(i).locked.owner === 'other')
        throw new Error(`SetPlaylistLockedActions: playlist ${i} is locked by another component`);
      P(i).locked = actions.length ? { owner: 'js', actions: actions.slice() } : null;
    },
    InsertPlaylistItems(i, at, list) { P(i).items.splice(at, 0, ...list.Convert()); },
    ClearPlaylist(i) { P(i).items = []; sel(i).clear(); },
    UndoBackup() { state.undoBackups++; },
    IsPlaylistItemSelected: (p, i) => sel(p).has(i),
    ClearPlaylistSelection(p) { sel(p).clear(); },
    SetPlaylistSelection(p, items, on) { for (const i of items) on ? sel(p).add(i) : sel(p).delete(i); },
    SetPlaylistSelectionSingle(p, i, on) { on ? sel(p).add(i) : sel(p).delete(i); },
    GetPlaylistSelectedItems: p => handleList(P(p).items.filter((_, i) => sel(p).has(i))),
    RemovePlaylistSelection(p) { P(p).items = P(p).items.filter((_, i) => !sel(p).has(i)); sel(p).clear(); },
    GetPlaylistFocusItemIndex: p => (state.focus.has(p) ? state.focus.get(p) : -1),
    SetPlaylistFocusItem(p, i) { state.focus.set(p, i); },
    EnsurePlaylistItemVisible() {},
    GetPlaybackQueueContents: () => state.queue.slice(),
    GetPlaybackQueueHandles: () => handleList(state.queue.map(q => q.Handle).filter(Boolean)),
    AddItemToPlaybackQueue(h) { state.queue.push({ Handle: h, PlaylistIndex: -1, PlaylistItemIndex: -1 }); },
    FlushPlaybackQueue() { state.queue = []; },
    RemoveItemFromPlaybackQueue(i) { state.queue.splice(i, 1); },
    GetPlayingItemLocation: () => ({ IsValid: false }),
    SortByFormatV2: () => true,
  };
  const fb = {
    CreateHandleList: () => handleList([]),
    TitleFormat: () => ({ Eval: () => '', EvalWithMetadb: () => '', EvalWithMetadbs: l => l.Convert().map(() => '') }),
    GetNowPlaying: () => null,
    GetLibraryItems: () => handleList([]),
  };
  const window = {
    ID: 1, Width: 200, Height: 400, IsVisible: true,
    Repaint() { state.repaints++; }, RepaintRect() { state.repaints++; },
    GetProperty: (k, d) => (state.props.has(k) ? state.props.get(k) : d),
    SetProperty(k, v) { state.props.set(k, v); },
    SetTimeout(cb) { state.timers.set(++state.nextTimer, cb); return state.nextTimer; },
    ClearTimeout(id) { state.timers.delete(id); },
    SetInterval() { return 0; }, ClearInterval() {},
    NotifyOthers() {},
  };
  const panelsui = {
    GetVariable: (k, d) => (state.vars.has(k) ? state.vars.get(k) : d),
    SetVariable(k, v) { state.vars.set(k, v); },
    RunAction(a) { state.actions.push(a); },
    GetPanelRect: () => ({ X: 0, Y: 0, Width: window.Width, Height: window.Height }),
  };
  const gdi = { Font: (name, size, style = 0) => ({ Name: name, Size: size, Style: style, Height: size }) };
  const utils = { IsKeyPressed: () => false, InputBox: () => '' };
  // Overrides keep their getters/setters (a spread would freeze them into values).
  const merge = (base, extra) => (extra ? Object.defineProperties(base, Object.getOwnPropertyDescriptors(extra)) : base);
  merge(plman, overrides.plman); merge(fb, overrides.fb); merge(window, overrides.window);
  merge(panelsui, overrides.panelsui); merge(gdi, overrides.gdi); merge(utils, overrides.utils);
  // Run every pending timer once (in creation order); returns how many ran.
  function flushTimers() {
    const due = [...state.timers]; state.timers.clear();
    for (const [, cb] of due) cb();
    return due.length;
  }
  return { plman, fb, window, panelsui, gdi, utils, state, flushTimers };
}

// vm context exposing the host's globals plus the built-ins the skin uses.
export function panelContext(host, extra = {}) {
  return vm.createContext({
    plman: host.plman, fb: host.fb, window: host.window, panelsui: host.panelsui, gdi: host.gdi, utils: host.utils,
    console: { log() {} }, JSON, Math, Date, Map, Set, Object, Array, String, Number, Error, RegExp, Symbol, Proxy,
    parseInt, parseFloat, isNaN,
    ...extra,
  });
}
export const run = (ctx, source) => vm.runInContext(source, ctx);
export const runScript = (ctx, path) => vm.runInContext(read(path), ctx, { filename: path });
