# Phase D review — structure and maintainability (2026-11-20)

Phase D changes structure only. Every step kept the behaviour; the one bug found on the way
(numbered scratch views not cleaned up) was fixed separately as Round 16.

## What moved where

| Step | From | To |
|---|---|---|
| D1.1 | middle-list drop rules in `anna_glass_playlist.js` | `js/anna_glass_drop.js` (`AnnaGlassDrop`) |
| D1.2 | scratch-view registry in `playlist_browser.js` | `js/anna_scratch_views.js` (`AnnaScratchViews`) |
| D1.3 | sidebar drop rules (three copies) | `js/anna_sidebar_drop.js` (`AnnaSidebarDrop.decide`) |
| D1.3 | duplicate-import removal (Round 13.2) | `js/anna_dedup_tracker.js` (`AnnaDedupTracker.create`) |
| D1.3 | hidden staging list for blank-space drops | `js/anna_import_staging.js` (`AnnaImportStaging`) |
| D2 | panel-variable keys | `AnnaShared.PVAR` (`js/anna_shared.js`) |
| D2 | pill switch drawing + colours (three copies), shared row colours | `AnnaTheme.paintSwitch`, `AnnaTheme.COLORS` |
| D3 | per-test include lists | `installIncludeShim` (`tests/helpers/js_panel.mjs`) |
| D3 | per-test fake hosts | `tests/helpers/fake_host.mjs` (`createHost`, `panelContext`) |

`playlist_browser.js` went from 952 to about 790 lines. What it still holds needs the panel's own
state (mode, rows, scroll, selection, error text): paint, mouse, menus, tab switching and the
post-import sort.

## How "no behaviour change" was checked

- Code moved verbatim; where three copies became one (`AnnaSidebarDrop`, `paintSwitch`), the
  merged version was checked case by case against the originals.
- `test_theme_colors.mjs` runs the old `paintSwitch` and `AnnaTheme.paintSwitch` with the same
  sizes and states and compares every draw call.
- The existing round suites (Round 3-16, vNext) still run unchanged against the panels, apart
  from text checks that now look for the shared code in its new place (Round 6-9, vNext).
- `npm test`: 22/22.

## Test changes worth knowing

- The include shim used to expand `include('x.js')` anywhere in the text, comments included.
  That loaded modules twice (a `const` module then fails) and hid missing dependencies in the
  load test. It now only resolves include statements (start of a line or after `;`), and the
  load test in `test_shared.mjs` preloads `anna_i18n.js` / `anna_shared.js` for helper modules,
  as their panels do.
- New suites should use `tests/helpers/fake_host.mjs`. Its locks have an owner, and
  `SetPlaylistLockedActions` throws for a lock owned by another component, as foo_js_panel 1.9 does.

## Windows smoke test (foobar2000 2.26.2, foo_js_panel 1.9.0)

Playlists backed up first and restored afterwards (`tools/fb_test.ps1`).

| Check | Result |
|---|---|
| Skin loads | ✅ no script warnings or errors |
| GLASS, Desk OFF and QUEUE pills, list rows | ✅ drawn as before |
| Middle track → sidebar "123" | ✅ target row highlighted, 109 → 110, 123 shown |
| That track from "123" → "Default Playlist" | ✅ 12 → 13 |
| Same track from Default → "123" again | ✅ duplicate removed, 123 stays 110 |
| External file (test drag source) → blank sidebar space | ✅ new playlist "导入的曲目" (1 track) created and shown; staging list emptied and hidden |
| Artist / sorted views (D1.2), cleanup (Round 16) | ✅ see `docs/ROUND15_REVIEW.md`, `docs/ROUND16_REVIEW.md` |

Not checked on Windows in this pass: accent colours (the colours pass through the same
`AnnaTheme.graphics` recolouring as before; checked offline), the sidebar's own drags to the
Queue (code not touched), 125 % / 150 % DPI and multi-monitor moves (still open from Round 15).
