# Hariiro V2 — Round 13 review (2026-11-20)

## Changes

1. Moved all 16 default rose-pink transparent PNGs from `images/controls/*.png` into **`images/controls/pink/*.png`**. The active theme ID is still `rose`; the theme loader maps it to the `pink` directory. Footer speaker, transport buttons, seek/volume thumbs and generator paths now use `pink/`.
2. Replaced left/centre drag initiation with deliberate **horizontal** drag thresholds; ordinary playlist **vertical** movement stays local reordering. Pinned sidebar sources (Music Library, Hariiro - Favorites, Hariiro - Search Result), Artist rows and ordinary playlist rows can start Queue-bound OLE export. Fixed sources remain read-only destinations and cannot be reordered.
3. Changed `Playlists`, `GlassPlaylist` and `HariiroQueue` to `windowless = 1`, routing OLE drag enter/over/drop through Panels UI's main-window JS Panel interface; each script explicitly accepts or rejects by source/target. The Lyrics panel explicitly rejects OLE.
4. Middle track selection supports selected-track OLE copy to normal editable playlists and Queue. Dropping back onto Glass itself or dropping a sidebar collection over Glass returns `Effect=0`.
5. External files/directories: normal sidebar rows accept imported tracks, fixed rows and Artist reject. A drop on empty sidebar space uses one reusable hidden `Hariiro - Import Staging` playlist and creates an ordinary `Imported Tracks` playlist **only after imported audio items are observed**. The staging list is hidden from the sidebar. Dragging to Glass accepts files only while an editable normal playlist is active.
6. The blank titlebar uses `UIHacks.SetPseudoCaption` in **root-window coordinates**, enabling window movement; native caption double-click should maximize/restore (old script callback remains as fallback).
7. The Desk button is painted *after* the footer background, eliminating the preceding footer background overlay that visually weakened its active tint.
8. Added localized drag notices and regression tests for the drag-source/target matrix and splash-free asset structure.

## Intended drag matrix

| Source | Destination | Behavior |
|---|---|---|
| Sidebar Artist, ordinary playlist or fixed playlist | QUEUE | Copy all songs to Playback Queue |
| Sidebar Artist, ordinary playlist or fixed playlist | Glass middle | Reject + localized warning |
| Sidebar ordinary playlist | Same sidebar | Vertical drag: reorder playlists only |
| Sidebar fixed playlist | Same sidebar | No reorder, no track insertion |
| Glass selected tracks | Ordinary sidebar playlist | Copy selected songs (multi-select works) |
| Glass selected tracks | Fixed playlist / Artist sidebar | Reject + localized warning |
| Glass selected tracks | QUEUE | Copy selected songs to Playback Queue |
| Glass selected tracks | Same Glass panel | Reject, even after leaving/re-entering |
| External audio files/dir | Ordinary sidebar playlist | Append songs to that playlist |
| External audio files/dir | Empty sidebar area while Playlist is selected | Stage and create playlist only when at least one playable track arrives |
| External audio files/dir | Artist sidebar / fixed playlist | Reject + localized warning |
| External audio files/dir | Glass showing an ordinary editable playlist | Append audio tracks |
| External audio files/dir | Glass showing Artist or fixed list | Reject + localized warning |

## Technical limits / Windows acceptance

- **Windows verification is still required.** Offline tests model the OLE callbacks and their Effects but cannot prove what Windows foobar2000, a particular version of Panels UI, or another installed playlist component will do.
- Panels UI's native root drop target can fall back to `WM_DROPFILES` when **no windowless JS Panel occupies the drop point**. Similarly, the **NATIVE Single Column Playlist** is not implemented as an Hariiro JS Panel drop target. Therefore this JavaScript-only update cannot categorically prevent native automatic file import if a user drops onto a border/gap/unhandled native surface. Fixing that fully requires a Panels UI host change (and rebuilding the DLL) to reject unsupported OLE targets, not merely more JS guards.
- The new blank-sidebar staging list uses one persistent foobar2000 playlist. It is not created repeatedly; no user-visible playlist is created for a drop that yields no playable audio. Deleting `playlists-v2.0` SQLite files by hand remains unsafe.
- `UIHacks.SetPseudoCaption` is routed by JS Panel's native window-control shim. Windows actual click/drag/double-click behavior still needs acceptance.
- Test with a **backup of playlists**. Verify ordinary, Artist and pinned-list drag to Queue, Glass-to-normal copy, internal/re-entry returns, external file/folder imports, and fixed-mode rejection, including switching between GLASS and NATIVE.

## Verification

- All JavaScript source files passed `node --check`.
- Previous Round 3–12 regression suites and new Round 13 drag-matrix regression passed offline after updating expectations to the new rules.
- ZIP CRC and 16 pink-asset RGBA alpha transparency verified.
