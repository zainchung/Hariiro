# Hariiro — Round 10 (2026-11-20)

## Changes

1. Replaced the two separate gear / hamburger controls with **one hamburger**. Left and right click open the same Hariiro settings popup (including native foobar2000 menu, Windows title bar, menu bar, and language options). Minimize/maximize/power remain usable. The top bar/search geometry was adjusted; the old gear drawing and direct menu action were deleted.
2. Sidebar `Playlists`: a playlist row (ordinary, Favorites or Search Result) can export the **actual track handles** to Queue through an OLE copy drag. Music Library continues to export its library handles; artist rows continue to export their artist handles. A fixed entry without a backing playlist cannot start an empty OLE drag.
3. Added `Duplicate playlist` on right-click **ordinary** playlists. Uses foobar2000's `plman.DuplicatePlaylist(index, name)` and a collision-safe ` - Copy`, ` - Copy (2)` naming sequence; original playlist contents are untouched. Favorites, Search Result, and Music Library cannot be duplicated via the Hariiro menu.
4. Playlist-to-playlist full-list OLE copying from **within the sidebar** is disabled: OLE drags initiated on sidebar rows have their own origin guard and are refused by the sidebar as a target. The existing in-panel playlist reorder gesture and its visual insertion marker remain.
5. Dragging an existing selection **from the Glass center panel** now suppresses an erroneous file/folder import warning if the cursor crosses that same panel during its own OLE session. The actual external file/folder import path remains unchanged.

## SQLite / temporary data investigation

The scripts **do not directly create, open or append to** `profile/playlists-v2.0/*.sqlite`; there is no `.sqlite` pathname or SQLite writer in `js/`. This path is managed by foobar2000 v2.x. The scripts *do* use the foobar2000 `plman` APIs to create and update playlists, which can make the native playlist storage grow.

| Script | Persisted entity | When produced | Reuse / growth risk |
| --- | --- | --- | --- |
| `playlist_browser.js` | `Hariiro - Artist View` or `Hariiro - Artist View #N` | Artist/library view sorting | If current view is playing/queued, `findSafeView()` protects it and may create another numbered slot (up to 64 candidates per base name). |
| `playlist_browser.js` | `Hariiro - Sorted Library View` or `#N` | Music Library sorted view | Same protection/reuse policy. |
| `hariiro_search.js` | `Hariiro - Search Results` or `#N` | Searches | `safeResultsPlaylist()` protects currently playing or queued results; may create another numbered slot (up to 128 candidates). |
| `hariiro_queue.js` | `Hariiro - Queue Buffer` or `#N` | First queue drag requiring a buffer | Reuses a registered owned buffer; compacts only after 400 items if neither playing nor queued references make it unsafe. |
| `playlist_browser.js`, `hariiro_glass_playlist.js` | `Hariiro - Favorites` | First favorite add | Persistent user collection, **not** a disposable cache. |
| `playlist_browser.js` | User-created/duplicated playlists | User action | Deliberate permanent content; not cache. |

The scripts also call `window.SetProperty` for search query, scratch ownership, queue buffer ownership, lyric search and source preferences, nav tab state, and historical folder-view settings. JS Panel stores these properties under the profile's JS Panel property storage. `panelsui.SetVariable` sets skin state, not raw SQLite files. No application-authored `.tmp`, `.db`, `.sqlite` or `.log` writes were found in this version of Hariiro's JS sources.

**What this does not establish:** without the user's actual profile directory and measurements, we cannot attribute a particular `.sqlite` file or each playback-time size increase to Hariiro. Native foobar2000 playlist persistence and unrelated components also operate in this directory. The safe approach is to record file counts/sizes, compare alongside foobar2000's visible playlist names (including numbered Hariiro scratch names), and avoid deleting SQLite files while foobar2000 is running. Do not automatically remove scratch playlists that might be playing or referenced by the queue.

Read-only diagnostic: `python tools/audit_playlist_databases.py "C:\\path\\to\\foobar2000\\profile"`.

## Verification

- All Round 3–9 tests still pass (the old window-control coordinate assertions are updated for the compact header).
- Round 10 dynamic mocks verify: new single settings target; all five sidebar drag sources; sidebar-origin drag rejection; duplicate playlist; no Glass self-drag warning.
- 16 transparent PNG control assets and original transport/volume/lyrics code are otherwise unchanged.

**Windows acceptance:** verify OLE effects with the installed JS Panel/Panels UI versions, especially drag from Favorites/Search to the right Queue, playlist reorder, and the center-to-left drop. No live Windows testing is claimed here.
