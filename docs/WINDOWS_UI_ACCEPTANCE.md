# Anna Glass V2 — Windows UI acceptance checklist (Draft PR #1)

**Scope:** skin-only branch `feature/anna-ui-reference-refresh`.
**Do not combine these changes with the experimental 16:9 DLL during initial UI debugging.**

Playlist folder grouping uses the playlist name as its persistent key because the JS Panel API does not expose a stable playlist ID. Avoid duplicate playlist names; renaming a playlist outside Anna Glass may leave it at the root until it is assigned again. The hidden `Anna - Queue Buffer` is periodically compacted only when there are no playback/queue index references to it.
Internal working playlists and the queue buffer are now **ownership-registered**. If a user playlist already has one of the reserved names, Anna Glass creates a numbered alternative and leaves the original untouched. Old unregistered scratch lists from earlier experimental builds are deliberately not cleared; after confirming they are neither playing nor queued, they can be removed manually in foobar2000's Playlist Manager.

## Installation and rollback

1. Keep the existing working foobar2000 x64 installation intact. Use a separate test profile or make a copy of `main.txt`, `foo_ui_panels.ini`, and the `js/` folder.
2. For skin testing, use the original, already working Panels UI component first. Do not replace the DLL yet.
3. If you have the **full-skin Windows test ZIP**, extract it into an isolated test-skin directory; it includes wallpaper, original controls and ornamental art. For a GitHub-only UI overlay, run `python tools/package_ui_preview.py`; that smaller ZIP contains code and the new corner ornament only. Neither package contains the experimental 16:9 DLL.
4. If a panel goes blank or shows errors, open foobar2000's Console and copy the first error. Restore the backed-up skin files and scripts to roll back completely.
5. Offline developer checks: `node tools/test_ui_reference.mjs` (Node.js 18+). **This cannot replace a real foobar2000 run.**

## ESLyric desktop lyrics (optional)

ESLyric is **not bundled** with the Anna Glass preview. Install an x64 ESLyric
component compatible with your foobar2000 installation separately. The in-skin
right-hand lyric view keeps its **outer frame** but removes the AnnaLyrics-drawn **inner frame**; **DESK** remains at its top-right.
The button is hidden while Playback Queue is open, keeping queue actions clear.

1. First verify `View → ESLyric → Desktop Lyric → Show` works directly in
   foobar2000. This is the authoritative baseline.
2. Click **DESK** once: ESLyric should enable its own desktop lyric overlay, and
   the control should show `DESK ON` when the menu item is checked. Click again
   to hide it. Try toggling from foobar2000's View menu: the skin indicator
   should follow within about 1.5 seconds.
3. Open the playback queue: the in-skin DESK button should disappear while the
   external ESLyric desktop overlay keeps its previous checked state. Close
   the queue and confirm the button returns at the lyric pane's top-right.
4. When ESLyric is absent, the button must show `DESK —`; clicking it must
   display a clear message and leave the in-skin lyrics unchanged.
5. If a localized/different ESLyric version has a different menu path, right-click
   **DESK → Configure ESLyric menu command...** and enter that full
   `View/...` path. This is saved locally for that JS panel instance. The button
   does not claim success unless foobar2000 accepts the command.

When testing a missing desktop lyric overlay, inspect ESLyric's own settings,
including **Hide when no synced lyrics** and **Hide when paused**. A checked menu
item does not guarantee visible lyrics under those settings.

**Note:** The visualizer remains the native Panels UI Spectrum. The experimental 3px JS visualizer was deliberately removed; there is no additional audio-processing script or runtime dependency.

## Saved ESLyric lyrics: location setup

The AnnaLyrics right-click menu mirrors the **four Location choices** shown under Preferences → Tools → ESLyric → Save Settings. It controls **where AnnaLyrics reads lyrics**, and does not alter the ESLyric component's own saving preferences:

1. **Tags** — read the current track's embedded `LYRICS`, `SYNCED LYRICS`, or other supported lyric metadata tags. This is not a disk folder.
2. **Configuration folder** — read from foobar2000's profile `lyrics` subfolder using `fb.ProfilePath`, including portable installs.
3. **The same folder as the track** — read `.lrc`/`.txt` files next to the audio file, matching the audio filename, `%title%`, or common artist/title filename schemes.
4. **Browse...** — enter the absolute custom folder used by ESLyric; optionally separate multiple paths with semicolons. **Only this fourth choice** prompts for a directory. Because the JS Panel host lacks a working native folder-picker API, Browse opens a path entry dialog rather than a Windows folder-picker window.

An existing custom folder from earlier AnnaLyrics versions is automatically retained as the default Browse selection until the user changes modes. Once set, the active mode persists across panel reloads.

**Filename is separate from Location in ESLyric**: for example, the screenshot uses `%title%`. AnnaLyrics searches common patterns, but an arbitrary custom ESLyric filename title-format expression is not interpreted automatically.

ESLyric is responsible for searching and saving. AnnaLyrics scans the selected location every **4 seconds while visible** and never makes an online request. The right-click menu also retains **Reload saved lyric files**. The obsolete native lyrics/ONLINE controls remain absent.

## Playback and sorting

| Test | Steps | Expected |
|---|---|---|
| Navigation / reveal | Start playback deep in a multi-album list, switch Library/Artist, then press 再生中 | The actual playing playlist becomes active and the current track is focused; GLASS scrolls to it and expands its album |
| Album sorting | Select an artist or Music Library with multiple albums | Middle list sorted by album, then disc, then track, both NATIVE and GLASS |
| Disc labels | Play tracks on disc 1 and disc 2, then a track with no TRACKNUMBER tag | Disc 1: `01. Title`; Disc 2: `2-01. Title`; missing track number: title only; same in Native and Glass |
| Saved playlist safety | Record an existing user playlist order, browse and change artists/libraries, return to saved list | Original order untouched |
| Playing-view safety | Start playback from a sorted view, switch to a different artist/library | Playback continues without clearing its source |
| Queue safety | Add to queue, switch artist/library, inspect queue | Previously queued tracks remain valid and do not change identity |

## Interactions and visual layout

| Test | Steps | Expected |
|---|---|---|
| Playlist folders | In Library, create a folder and assign two playlists containing different numbers of songs; collapse/expand, reopen, then delete the folder | Folder count is the **sum of track entries** across assigned playlists, not the number of child playlists; view grouping survives reload, saved data stays intact |
| Sidebar selection | Switch between top Artist/Library navigation, choose a playlist, then start a song from another playlist | Selected playlist shows a fine pink highlight and bold real track count; current playing playlist has a distinct rose marker; never show made-up usage statistics |
| Folder import | Right-click → Import audio folder, and test Cancel | Real foobar2000 folder picker; no unintended songs or broken saved list |
| Album art + heart | Switch between two files with different embedded front covers; compare right and footer art; click the heart twice | New JS cover reads current embedded front art and updates on track change; old async result never persists; favorite still toggles |
| Right metadata | At 960px, 1280px, 1536px and 1920px wide, play tracks with long Japanese titles and missing album/date/genre tags | One transparent NowDetails panel lays out title/artist/album/date/genre/codec in natural vertical flow, retaining 15/12/11px fonts, with no text collisions or unused gaps |
| Large Glass album cover | Use a playlist with several albums; scroll, switch playlists and return | 90px cover with a 21px faded reflection, 132px grouped headers; no stale thumbnails or escalating memory use |
| Glass song rows | In GLASS mode, play one track; inspect numbered/unnumbered rows, hover a long title; hover/click the heart and ellipsis, including double-clicks | Playing row has a rose glow and static three-stroke playing glyph; active album gains a subtle rose outline; row number stays separate; heart/menu hover zones are visible and double-clicking them does not accidentally play a track |
| Reserved-name collisions | Create a disposable playlist named `Anna - Sorted Library View` and another named `Anna - Queue Buffer` before testing the corresponding feature | Original items remain untouched; new numbered internal playlists are created instead |
| Search (Glass) | Single-click the only Glass search, type Japanese, use left/right caret, Ctrl+V, Enter and clear; confirm a blinking caret in the empty focused box | The child window receives character input, shows a blinking insertion caret, supports direct paste, and searches into an owned results playlist; no modal double-click or native search switch remains |
| Search collision | Create a disposable playlist named `Anna - Search Results` before using Glass Search | The disposable playlist is preserved, and a numbered owned result playlist is created instead |
| Spectrum | Play a track and inspect the right-hand visualizer in normal and maximized windows | Existing native Panels UI Spectrum stays in place with the pink accent; no separate VIS button or custom JS visualizer |
| Lyrics (ESLyric files) | Save a current track as LRC/TXT; switch AnnaLyrics save-location mode, then edit the LRC without changing song | Outer decorative border and corners remain; AnnaLyrics fills the child panel with no inner box, divider or opaque backing, updating saved content within ~4s |
| ESLyric desktop lyrics | Install x64 ESLyric, click DESK twice, toggle from View menu, then open/close Queue | Real desktop lyric overlay toggles; DESK stays at the upper-right of the framed lyric pane and hides only while Queue occupies that pane |
| Lyric save location | Right-click lyrics and select Tags / Configuration folder / The same folder as the track / Browse... matching ESLyric Save Settings | Tags reads embedded lyrics, Configuration folder reads `<foobar profile>\\lyrics`, Same folder reads adjacent LRC/TXT, and only Browse asks for a custom absolute path; selection persists and never changes ESLyric's own preferences |
| Seek | Play a track on a dark and a bright section of wallpaper, then drag the butterfly | Darker unplayed rail stays visible; played rail has soft pink glow; paper-cut butterfly is visible; larger elapsed/duration times; one seek on release |
| Footer transport | Cycle all seven playback orders, right-click order icon, test ±5s/previous/play/next/random, and resize | Icon genuinely changes for each order; ±5s controls sit farther out than previous/next; all vector icons (including the centred pink ring) render transparently from FooterTransport, without a separately drawn play-ring PNG |
| Footer volume and toggle | Move the volume slider; look beside it and at the bottom right; click GLASS/NATIVE | Slider is text-free, percentage moves to the footer's bottom right, GLASS→NATIVE or NATIVE→GLASS displays the current action rather than the literal word Switch |
| Queue dock | Drag a song from GLASS/NATIVE and drag an entire left-side playlist to the queue | Real queue receives the handles without reordering or clearing the user's saved source playlist |
| Queue fallback | Select a track in centre list, then click `+ ADD SELECTED` in the queue panel | Song is inserted into foobar2000 playback queue even if a component does not deliver OLE drag events |
| Queue reorder/delete | Add four tracks, drag first to third and another to the 🗑 icon; inspect feedback before release | Insertion line/arrow, moving-row translucent ghost and MOVE source→destination label appear; trash highlights and says release to remove; real queue order/actions remain intact |
| Transparency / alignment | Compare normal and maximized windows at 960–1920px widths | Exactly 14px between centre and right outer frames; upper and lower right panels align; lyric outer border preserved without a second interior border |
| Ornaments | Check the two right-hand cards, centre/left panels and footer | Bundled rose-gold floral corner art appears mirrored correctly in all four orientations |

## Known limits to report separately

- Glass playlist, queue target and Glass Search now use regular child-window JS panels for keyboard focus and OLE drag/drop compatibility with the original Panels UI DLL. Test actual transparency and event routing: those behaviors cannot be fully simulated offline.
- Glass Search now shows a blinking caret in its focused child window and consumes committed Unicode characters. **Native IME pre-edit / candidate-window positioning is not exposed as an editable Windows control by the current JS Panel host**; Japanese/CJK composition and caret positioning must be checked on Windows and may not be identical to an EDIT control.
- **Original Panels UI (reborn) cannot directly host ESLyric's Columns UI/Default UI panel**. AnnaLyrics now reads *only previously saved local LRC/TXT files and embedded tags*; ESLyric handles all online searching/saving independently. An in-panel ESLyric host would still require bridge/DLL work.
- The full-skin Windows ZIP includes the existing wallpaper, play-ring, speaker and decorative assets; the minimal repo UI overlay includes only the referenced rose-gold corner ornament.
- ESLyric's main-menu path can differ by version or localization. The desktop lyrics control will report an unknown command rather than simulate a successful toggle; set the exact menu path via right-click if needed.
- The experimental DLL must be validated later for actual resize, maximize/restore, Snap, DPI and drag freeze.

For failures, record the relevant test, exact behavior, screenshot (if visual), foobar2000 Console error, UI component versions, and display resolution / scaling.

## Latest seven-issue visual corrections (pending Windows acceptance)

The middle Glass playlist remains frozen visually. Only the surrounding skin and helper panels changed: the lyric frame is external-only; centre/right gutters are 14px; transport icons are transparent vector painting with the centre ring integrated; volume percent sits at the bottom-right; all now-playing metadata is laid out by one `NowDetails` script using the existing font sizes; queue drags show a clear insertion line and trash feedback; the GLASS/NATIVE control shows a mode-dependent action label. The skin still uses the native Panels UI Spectrum.

The source-level suite is run before each test ZIP. Windows checks remain necessary for GDI fonts, drag hover behaviour, ESLyric directory resolution, and input focus.
