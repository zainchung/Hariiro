# NATIVE and GLASS mode — who decides what (Phase E4, 2026-11-21)

The switch above the middle list (GLASS / NATIVE) chooses what fills the middle of the
window. It sets the Panels UI variable `anna.playlist.experimental` (`1` = GLASS), and
`main.txt` then loads one of two panels:

| | GLASS (`1`, default for new installs since Round 20) | NATIVE (`0`) |
|---|---|---|
| Middle panel | `GlassPlaylist`, our JS Panel `js/anna_glass_playlist.js` | `Playlist`, foobar2000's **Single Column Playlist** |
| Scroll strip | drawn by GlassPlaylist | `NativeScroll` (`js/anna_native_scroll.js`), which only calls `EnsurePlaylistItemVisible` |
| Look | album groups, covers, glass rows, accent colours | the host's renderer, coloured by `color.playlist.*` in `foo_ui_panels.ini` (fixed; not recoloured by the accent menu) |

Everything else in the window (sidebar, Queue, lyrics, footer, header) is the same JS in
both modes.

## Rules the skin enforces in both modes

These live in the sidebar, the Queue or the shared modules, so the middle panel does not
matter:

- Sidebar drops: ordinary row → that playlist; blank space → new playlist via the staging
  list; pinned rows and the Artist tab → rejected (`js/anna_sidebar_drop.js`).
- Queue drops and clearing, with undo (`js/anna_queue.js`, Round 17).
- Duplicate removal after an import into an ordinary playlist (`js/anna_dedup_tracker.js`):
  it reacts to `on_playlist_items_added`, whoever inserted the tracks.
- Sort-and-reveal after an import into the playlist shown in the middle (sidebar
  `collectImport` / `finishImport`).
- Files from File Explorer that foobar2000 put into the active playlist are moved to where
  they were dropped (`js/anna_drop_fix.js`, Round 15) — sidebar row, blank sidebar, Queue.
- Working copies (Music Library, Artist views) carry an `AddItems` lock, so nothing can be
  added to them from anywhere (Round 13).
- Deleting a playlist from the sidebar, with undo (Round 17).

## Rules only GLASS enforces

`js/anna_glass_drop.js` decides every drop on the middle list in GLASS mode:

- Drops are accepted only while an ordinary, unlocked playlist is shown; Favorites, search
  results, the Queue buffer and working copies reject with a message.
- Tracks dragged out of the middle list cannot be dropped back onto the same list.
- Sidebar rows dragged onto the middle list are rejected (they go to the Queue or another row).
- Its own keyboard, selection, group collapse, "now playing" reveal and drag-out to the Queue.

## What the host decides in NATIVE mode

The Single Column Playlist is a foobar2000 component; the skin cannot see or veto its drag
and drop. In NATIVE mode:

- A drop on the middle list goes wherever the Single Column Playlist puts it (normally the
  shown playlist, at the drop position). The skin's only influence is the `AddItems` lock on
  working copies, which makes the host refuse those.
- Expected (not re-tested): dropping a list's own tracks back onto it reorders them, as the
  Single Column Playlist does elsewhere, instead of the GLASS "same list" rejection.
- Expected (not re-tested): sidebar rows dragged onto the middle list are taken as an
  ordinary track drop.
- Keyboard shortcuts, selection, context menu, column text and colours are the host's.
- Duplicates are still removed afterwards (the sidebar sees the insertion), and an import
  into the shown playlist is still sorted and revealed.

Not verified on Windows in this pass: the NATIVE middle-list behaviours above are taken from
the Round 13–15 notes and the Single Column Playlist's known behaviour, not re-tested.

## Default mode

Since Round 20, new installs start in GLASS (`pvar.once.anna.playlist.experimental = 1` in
`foo_ui_panels.ini`), the mode the skin is designed around and the only one where all drop
rules above hold. `pvar.once` sets it only on first run; after that the switch remembers
the user's choice, so existing installs keep their mode.
