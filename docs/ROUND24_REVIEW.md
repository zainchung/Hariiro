# Round 24 review — locked list + Queue drop, playlist multi-select, Ctrl+Z (2026-11-22)

Owner's report: with a pinned row selected (Music Library, Favorites, Search Result), files
dragged from File Explorer onto the Queue end up in a new playlist and are not queued. Owner's
requests: several ordinary playlists can be selected in the sidebar and removed with Delete;
Ctrl+Z undoes removing playlists, tracks and Queue entries while foobar2000 has the focus.

## Bug: external drop on the Queue while a locked list is active

Cause: for files from another program the panel never gets `on_drag_drop`; foobar2000 adds
them to the **active** playlist and `HariiroDropFix` moves them to the panel's target
(Round 15). When the active playlist is locked (the Music Library working copy has an
`AddItems` lock, pinned lists may be locked), `arm()` gave up — but foobar2000 does not:
it creates a new playlist for the files. Nothing moved them, so the Queue stayed empty.

The Windows check showed what the host really does with the Music Library selected: the
active list is the `Sorted Library View`, which carries the skin's own `AddItems` lock, and
foobar2000 simply refuses the drop - no new playlist, no `on_playlist_items_added`. With
Favorites / Search Result the active list is not locked and the drop was queued already.

Fix (`js/hariiro_drop_fix.js`):
- Own lock (the usual case): `arm()` lifts it on release (`on_drag_leave` comes ~30 ms
  before the host adds the files) and keeps the actions in `o.relock`. The host appends to
  the active list as usual, `apply()` moves the files to the plan's target (Queue, a sidebar
  row, the import staging list) and puts the lock back right away. When nothing arrives
  (drag cancelled, refused), a 3 s timer restores the lock and clears the plan.
- Not lifted: a reject plan (the target itself is locked) and a drop on the locked list's
  own row - the host refuses those anyway.
- A lock of another component cannot be lifted (`SetPlaylistLockedActions` throws). If the
  host then creates a new playlist, the plan records all playlist names; the one playlist
  that appears on top of them is emptied into the target and removed, the locked list becomes
  active again. This plan lives only 3 s (not 15 s): a playlist made later - for example a
  sidebar view - is never taken for dropped files.

## Sidebar multi-select and Delete (`js/playlist_browser.js`)

- Ctrl + click toggles an ordinary playlist; Shift + click selects the range from the last
  Ctrl + clicked row (Ctrl + Shift adds the range). These clicks do not switch the list on
  screen. A plain click ends the multi-selection; pinned rows never join it.
- Delete removes the selected lists (or the active ordinary list without a multi-selection);
  the context menu's "Remove playlist" on a selected row does the same. Playing lists,
  locked lists and lists the queue refers to stay; the sidebar says so.
- One notice ("Deleted playlists: 3") and one undo for the whole group; undo puts every
  list back at its old place with its tracks and selects them again.

## Ctrl+Z (`js/hariiro_undo.js`)

- `HariiroUndo` keeps a stack (20) per panel besides the 8-second notice; the notice button
  still undoes only what it shows. Panel names go on a shared order
  (`HariiroShared.PVAR.undoOrder`, newest last).
- Ctrl+Z (no Shift / Alt) in the sidebar, the middle list or the Queue calls `keyUndo()`:
  the newest action of the whole skin is undone in its own panel
  (`JSPANEL:<panel>:hariiro.undo` → `on_notify_data` → `notify()`), so the key works in
  whichever of these panels has the focus. With nothing to undo the key is not handled and
  foobar2000 gets it.
- Undoable now: deleting playlists (sidebar), removing tracks with Delete / the menu (middle
  list, new notice there too), removing one Queue entry (menu or trash), clearing the Queue.
- Restored tracks go back at their old indices. `PVAR.undoRestore` marks the playlist for 3 s
  so the sidebar does not treat the refill as an import (no dedup, no sort): without it a
  removed duplicate copy would be removed again at once.
- A panel that starts drops its stale names from the shared order.

Not covered: Ctrl+Z while the keyboard focus is in the search box (typing there keeps its own
meaning) or in a windowless panel / the native playlist view (foobar2000's own Edit → Undo
applies there; the middle list still calls `UndoBackup` before it removes tracks).

## Tests

- `tests/test_round15_external.mjs` case 10 (failed before the fix): another component's
  lock, host creates "New Playlist" → queued, stray list removed, locked list active again;
  same for a sidebar row; an unrelated extra playlist is left alone; a new playlist 4 s later
  is not taken. Case 11 (failed before the second fix): own lock lifted on release, files
  appended by the host are queued, lock restored; cancelled drop → timer restores the lock;
  drop on the locked list's own row → lock kept. The fake host now has
  `Get/SetPlaylistLockedActions` and runnable timers.
- `tests/test_round24_undo.mjs`: undo stack and shared order; Ctrl / Shift / Ctrl+Shift
  click, Delete, one undo for the group, playing list kept; Ctrl+Z from each panel undoes
  the newest action of any panel (queue → tracks → playlist), restored duplicate kept
  (checked to fail without the marker), nothing left → key not handled.
- `test_shared.mjs`: `hariiro_undo.js` joins the helpers that use `HariiroShared` lazily.
- `npm test`: 36/36.

## Windows check (foobar2000 v2.26.3, foo_js_panel 1.9.2, 2560x1440)

External files came from a test-only WinForms drag source; a temporary logger was appended
to the installed Queue script only and removed afterwards; playlists restored from backup.

- First build: Music Library selected → drop on the Queue did nothing (logger: leave, then no
  playlist change at all). Favorites / Search Result → queued. Hence the fix above.
- After the fix: Music Library selected → 2 files queued, `Sorted Library View` locked again
  (logger: `lock=false` only between leave and the host's add).
- Sidebar: Ctrl + click on two rows, Delete → notice "3 playlists deleted" (the active list
  joins the selection on the first Ctrl + click, as in File Explorer); Ctrl+Z → all three
  back, selected.
- Middle list: Delete → notice "1 track removed"; Ctrl+Z → track back at index 2, selected.
- Queue: "Remove from queue" → Ctrl+Z → entry back at its old place.
- Cross-panel: track removed in the middle list, Ctrl+Z with the focus in the Queue → track
  restored.
- Dropped files are queued in foobar2000's order (sorted by file name), not in drag order.
- `fb_test.ps1 status`: no JS warnings or errors.
