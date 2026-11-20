# Anna GLASS V2 — Round 8 test/acceptance notes

This is a **test skin**, not a verified Windows release. Branch: `feature/anna-ui-reference-refresh`; main remains untouched.

## Changes

1. **Switch palette:** The GLASS/NATIVE, Desk ON/OFF and QUEUE switches use the exact same active fill, inactive fill, highlight outline and two thumb colours. Disabled ESLyric state still shows disabled text.
2. **Safe playlist removal:** Sidebar delete checks the real host API at runtime. It uses `plman.RemovePlaylist` or `RemovePlaylistSwitch` as available. If `utils.MessageBox` is absent/fails, an explicit secondary confirmation menu appears instead of `TypeError: not a function`. Protected, playing, queued and pinned playlists remain non-removable. Removing a playlist never deletes audio files.
3. **Cross-panel drag:** Drag selected tracks from the centre GLASS playlist to an ordinary sidebar playlist. Hover paints a rose-coloured target and `＋ ADD TRACKS`; a drop directs the native OLE copy to that playlist and focuses it. The pre-existing playlist-added callback then sorts and reveals new tracks. Fixed Music Library, Anna - Favorites, Anna - Search Result and Artist mode do **not** accept drops. Source tracks are not deleted.
4. **Remove tracks without removing files:** In an ordinary playlist, select tracks and right-click the **middle GLASS** list → `Remove selected tracks from playlist (keep files)`, or press Delete. The sidebar's ordinary-playlist right-click menu provides the same action. The call is `plman.RemovePlaylistSelection(p,false)` and preserves the local source files. Fixed library/favorites/search views cannot use these removal actions.
5. **Image-backed footer:** The seven transport positions load external transparent PNG files. All playback modes, previous/next, ±5s, headphone output, play/pause (including ring), speaker, butterfly and volume thumb are in `images/controls/`. Old vector icons are no longer drawn. The seek and volume rails themselves still render dynamically because their progress is data-driven.
6. **Elapsed timer:** Starts 28px closer to the left end of the progress bar; the right timer is unchanged.
7. **No shuffle icon rework beyond image conversion:** The three late shuffle modes retain their Round 7 semantics; a redesign remains deferred at the user's request.

## Automated checks

- `node --check js/*.js` (via shell loop)
- `node tests/test_round3.mjs` through `test_round8.mjs` and `test_vnext.mjs`
- PNG alpha and resource existence checks
- ZIP CRC integrity and relative asset paths

## Windows checks still required

- Confirm the specific JS Panel build resolves `gdi.Image('../images/controls/...')` from its script directory and loads the complete PNG set at 100% and high DPI.
- In プレイリスト select a song in Glass, drag it over a *different* ordinary playlist in the left sidebar and verify the rose hover highlight, copy, resulting row count and focus. Confirm no files were deleted.
- Attempt identical drag over each pinned entry; ensure the drop cursor refuses it. Repeat centre-to-left drag with classic/NATIVE playback list.
- Remove an ordinary playlist using its context menu. If the host lacks the standard confirmation helper, use the second explicit confirmation menu. Verify the playlist entry disappears, but local audio files remain.
- Use the centre-list or sidebar context command to remove selected playlist entries and verify media files remain. Verify fixed entries do not expose an unsafe delete action.
- Compare GLASS, Desk and QUEUE ON and OFF colours and verify the elapsed timer spacing.

## Host/API limits

Native OLE mouse capture, popup-menu implementations and file-system effects depend on installed foobar2000, Panels UI and JS Panel builds. Automated checks use mocks; they do not constitute Windows interaction validation.
