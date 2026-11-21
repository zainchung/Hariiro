# Hariiro — Round 5 Windows skin test

Scope: six refinements from the 2026-11-19 user review. Baseline: Round 4 (`a55cf86`). The `main` branch is untouched.

## Changes

1. Played synced-lyric lines use saturated mauve pink (`#EC85BB` near / `#B869A6` far), instead of the pale near-white. The active lyric remains white-pink (`#FFEDF6`). Enhanced LRC finished glyphs use the same higher-contrast palette; line centring and lyric timing are unchanged.
2. Power control keeps a recognizable open-ring/stem glyph with coral-red border and stronger red warning hover. Clicking it still exits foobar2000.
3. SYS and MB backlight are selected by saved skin states: SYS lights when the native title bar is enabled, MB lights when the menu bar is visible. The paint uses the same layered rose glow concept as the active Library tab.
4. Classic/Native playlist remains the original `Single Column Playlist`, with pale rose-pink highlight replacing gold (`color.playlist.highlight = 233 119 181`). Playing rows remain a stronger full gradient; selected rows are translucent. A **separate 15px windowed JS drag-to-track navigation strip** calls `plman.EnsurePlaylistItemVisible()` and leaves native wheel/keyboard behavior intact.
5. Lyrics right-click has `打开当前歌词所在位置`: Explorer selects the actual `.lrc/.txt` supplying the lyrics. For tag-only lyrics or missing files it clearly explains there is no standalone lyric file. Folder selection is safe for absolute Windows paths only.
6. Top/right card artwork and metadata now have a uniform 14px top and horizontal insets; cover-to-text gap is 14px. The native spectrum moves to y=269 with 40px height, reclaiming space while retaining a 14px lower inset. Left/center titles move right by 21/24px to avoid 28px corner ornaments.

## Classic-scroll limitation

The built-in native playlist implements wheel/keyboard and `EnsurePlaylistItemVisible` callbacks, but does not expose its exact scroll pixel offset to skin scripts or paint a real draggable scrollbar. The extra strip approximates position from track index and may not follow ordinary wheel scrolling perfectly, especially with multi-album group headers. This is not a DLL change. The **Glass list's own full scrollbar remains unchanged**. Confirm the new strip is above the native child window in the installed Panels UI/JS Panel version; the JS strip is windowed for correct Windows Z-order.

## Checks

- `node tests/test_vnext.mjs`
- `node tests/test_round3.mjs`
- `node tests/test_round4.mjs`
- `node tests/test_round5.mjs`
- `node --check js/*.js` (check individually)

These are code-level tests, **not** Windows visual/interactive acceptance. In particular, check Native scrollbar Z-order/drag and the SYS/MB menu/heading state across restarts.

## Install and rollback

Back up `main.txt`, `foo_ui_panels.ini`, `js/`, `images/`; extract into a fresh test-skin directory. No custom Panels UI DLL, OS modifications, or 16:9 aspect-lock patch is included. Restore the backup if a panel renders incorrectly.
