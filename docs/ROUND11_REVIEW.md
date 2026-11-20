# Anna Glass V2 — Round 11 (2026-11-20)

## Changes

- **Sidebar OLE:** Artist mode cannot start sidebar drag/drop. In Playlists mode, an ordinary/pinned playlist initiates copy-only OLE when dragged deliberately **rightwards**, while vertical movement only reorders ordinary playlists. An ongoing sidebar-origin drag cannot copy its contents back into the sidebar. Moving Music Library vertically no longer launches the Windows OLE process dialog.
- **Queue:** Normal playlists now launch `fb.DoDragDrop` while the pointer is still inside the source panel. The existing Queue panel accepts copy-only drops. Real Windows host behavior still needs on-device validation.
- **Glass playlist:** Reject self-origin drag/drop, including a short post-drag grace period. Also reject sidebar-origin items dragged back onto the same playlist. External files/folders can still be imported into an editable playlist.
- **Menu:** Removed TopChrome's outer frame; its 183px panel now ends 16px from the right screen edge, matching the power-control/right-card margin. Existing menu commands retained.
- **Accent themes:** Hamburger menu → Accent color: **Rose pink** (default), **Violet**, **Sky blue**, **Teal**. The choice persists via `anna.theme.hue` and `anna.glass.v2.accent`. JS-drawn accent strokes and footer control PNGs follow the preset. The illustrated wallpaper and host-owned foobar2000/ESLyric menus are intentionally not recolored.
- **Language:** Skin-owned drag/drop hints, queue, playlist, lyric, ESLyric and window-control warnings use shared translated text for zh-CN, zh-TW, ja and en. Diagnostics from the host may still include the host's own language. "Follow system" retains the previously installed JS Panel compatibility behavior.
- **Internal playlist / SQLite footprint:** Reuse scratch playlists where safe. Prune redundant numbered Artist/Sorted and Search cache playlists only when recorded as owned by this skin, unlocked and unreferenced by playback, the active playlist and the queue. Never delete `playlists-v2.0/*.sqlite` directly. Ordinary playlist removal uses `plman.RemovePlaylist`; foobar2000 controls database lifecycle. **Never delete SQLite files in Explorer while foobar2000 runs.** The read-only audit tool from Round 10 remains available.

## Validation

- `node --check js/*.js` — syntax validation of all JS files.
- `node tests/test_round3.mjs` through `node tests/test_round11.mjs`, plus `tests/test_vnext.mjs`: 10 suites passing locally, including simulated Queue OLE exchange, Artist drag prohibition, same-playlist drop protection, cache retention and theme selection.
- PNG validation: three tinted subfolders each preserve the original filenames, dimensions and 32-bit alpha channels.
- ZIP integrity checked with Python's `zipfile.testzip()`.

## Remaining Windows checks

- The UI requires foobar2000 Panels UI (reborn) and a JS Panel version with `fb.DoDragDrop`, `on_drag_drop` and playback queue APIs. Actual drag feedback and pointer capture must be retested in Windows.
- Some foobar2000-native visual elements use fixed theme colours; the colour selector primarily retints Anna Glass JS-drawn accents and its control PNGs.
- Existing user-owned playlists, the actual queue and the favorites list are never removed by the cache cleanup.
