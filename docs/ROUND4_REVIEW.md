# Hariiro — Round 4 Windows test build (2026-11-19)

Baseline: Round 3 (commit `86cc434`), based on the *actual Windows screenshot* and the eight-point user feedback. The previously supplied concept rendering is deliberately not used.

## Changes

- **Now Playing** is an independent momentary action, with about 180 ms press highlight. Its click reveals the playing playlist/track but does not latch a third pink navigation tab or change the persistent Library/Playlist selection.
- **Playlist GLASS/NATIVE toggle** shrank from 111×28 to 74×24; both states share an identical right edge. **Desktop lyrics** switch shrank from 101×26 to 84×24 without crossing the frame ornament.
- **Synced lyrics** now paint around the actual viewport centre instead of drawing a clamped set of top-origin rows. The first and last cues stay centred with blank virtual rows beyond the timeline. A short ease-out between adjacent cues, stronger already-sung and active text colours, clearer active-line strip/progress and an explicit drag guide/time caption improve tracking. Drag release still seeks to the selected line's real timestamp; no fake character timings are generated for plain LRC.
- **ESLyric search** still opens its official window (`View/ESLyric/Search...`). For up to about 76 s after the command, the in-skin reader checks for newly saved lyrics about every 900 ms (otherwise 4 s). On a **real file change only**, it also attempts an ESLyric `Reload lyric` menu command without toggling desktop-lyrics visibility. Right-click includes **Reload lyric display** and configurable refresh menu path. An independent ESLyric desktop window cannot be forced to instantly change when the plugin merely selects an unsaved/cached result: there is no reliable result-selected callback exposed to this script. The user can verify Save Settings and use the explicit Reload action.
- Bottom transport artwork, seven mode icons, device menu, volume rail, scrollbar dragging, 16:9-free resizing and native Album Art remain unchanged.

## Validation

- `node tests/test_vnext.mjs`: baseline UI/runtime contract and geometry checks passed.
- `node tests/test_round3.mjs`: legacy lyrics, search, drag and scrollbar regression adapted for centred coordinates passed.
- `node tests/test_round4.mjs`: extra centre-first/last, scroll easing, post-search polling, momentary now-playing, compact controls and drag-caption tests passed.
- Source syntax checked for all JS scripts; ZIP verified with `ZipFile.testzip()`.

## Unverified on Windows

- ESLyric desktop-lyrics refresh depends on the installed plugin version, its main-menu command names and whether a search result was actually saved to a path currently being read. A search-result selection *alone* need not save a lyric file; a separate ESLyric window may remain stale.
- Native GDI font rendering, 74px GLASS/NATIVE and 84px Desk text fit at unusual DPI/font substitution, and actual mouse capture must be checked with the next screenshot.

Use a fresh test-skin folder or back up `main.txt`, `foo_ui_panels.ini`, `js/`, `images/`. No DLL or executable is included. The `main` GitHub branch is not changed; this is draft UI PR work.
