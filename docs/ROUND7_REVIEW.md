# Anna Glass V2 — Round 7 Windows UI acceptance

Branch: `feature/anna-ui-reference-refresh` (not merged into `main`).

## Changes

- The first tab is labeled **アーティスト**. The sidebar header is **アーティスト/ライブラリ**. Artist mode still reads real foobar2000 Media Library artists; its working/sorted playlists are protected against AddItems in classic mode where the host supports playlist locks.
- In **プレイリスト**, the sidebar always shows **Music Library**, **Anna - Favorites**, and **Anna - Search Result**. The latter follows the specifically owned search-results playlist, including a numbered fallback if a user already owns `Anna - Search Results`. User playlists are selected directly rather than through a non-editable sorted scratch copy.
- On a non-fixed playlist, the sidebar supports **Create new playlist**, **Rename playlist**, **Remove playlist**, and drag reordering with a translucent source row and a pink insertion line. Deletion requires explicit confirmation; a playing, queued or locked playlist cannot be deleted.
- Native and Glass views can import externally dragged files/folders into the active editable source playlist. On the resulting add event, a 260 ms debounce sorts by album/disc/track and focuses the first newly added track. This intentionally changes the actual user's playlist order **only when tracks are imported**.
- The Glass panel explicitly rejects file drops in Artist mode with the user-requested explanation. The native classic panel cannot show the same native OLE tooltip without a Panels UI DLL change; it instead protects its internal scratch playlist via an `AddItems` lock (when the installed JS Panel supports it).
- Spectrum right padding is 14 px, matching left padding. The two seek-time captions have 14 px separation from their respective seek endpoints. Transport icon centers are evenly spaced 63 px apart.
- ±5 s uses a single curved arrow geometry mirrored horizontally. Both left/right clicks on the playback-order button open the same seven-mode menu. Shuffle tracks, albums and folders glyphs now combine equal-weight crossed arrows with a musical note, compact CD, and musical score.
- ON states of GLASS/NATIVE and Desk use the same pink fill as QUEUE. Footer play-ring and volume bar are otherwise unchanged.

## Manual Windows checks

1. Backup the existing skin directory and try the ZIP as an isolated test skin; do not replace an experimental DLL.
2. Open **プレイリスト**: three pinned entries must stay at the top. Add two ordinary playlists; drag one past the other and inspect the insertion line and ghost. Right-click to rename and delete one. Confirm the pinned entries cannot be removed.
3. Pick an editable ordinary playlist, drag a folder and multiple individual audio files onto Glass; verify the actual playlist receives the tracks, sorts them and focuses an imported song. Repeat in NATIVE. Confirm a protected/locked or pinned playlist cannot be modified by the import flow.
4. In **アーティスト**, try dropping files on Glass: the message should reject the drop. In NATIVE, confirm the temporary source playlist does not accept imports. If it does, send the Panels UI/JS Panel versions and first Console error; do not use the real Music Library as a test destination.
5. Click and right-click the playback-order icon: both must show all seven modes. Check that the three Shuffle mode icons and ±5 s mirrored arrows remain readable at 100%/150% DPI.
6. At 960/1280/1536/1920px, check spectrum left/right 14px padding, seek timer spacing and equal transport icon gaps.

## Limitations

- This package has JavaScript syntax, mock functional, geometry and archive-integrity checks, not a verified Windows GUI pass. OLE drop delivery and playlist lock behavior depend on the installed foobar2000/Panels UI/JS Panel versions.
- Existing user-created virtual folder definitions remain stored in the local JS Panel properties but are no longer shown in the flat Playlist view. No audio files are deleted by removing a playlist; its entries are removed from foobar2000's playlist registry only.
- Search results ownership is published by the search JS Panel; if that panel has not yet initialized, the fixed Search Result row appears empty until it initializes.
