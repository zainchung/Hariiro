# Anna Glass V2

A transparent "glass" skin for foobar2000 built on **Panels UI (reborn)** and JS Panels:
Glass playlist with album art and reflections, Artist/Library/Playlist navigation,
playback Queue with undo, local lyrics (ESLyric-saved files and tags, per-track offset),
image-based transport controls, six accent palettes (pink, blue, teal, violet, amber, mint),
a wallpaper selector (`images/wallpapers/`) and four UI languages
(English, 简体中文, 繁體中文, 日本語). New installs start in GLASS mode.

Current release: **1.0.0** (Round 20, 2026-11-21). Tested with foobar2000 2.26.2,
foo_js_panel 1.9.0 and Panels UI (reborn).

**Windows status.** The full acceptance matrix (`docs/WINDOWS_UI_ACCEPTANCE.md` plus the
Round 14 drag matrix) last ran for Round 14. Rounds 15–20 each had a focused Windows check
(see the round reviews and `docs/PHASE_E_REVIEW.md`). Covered offline only: 125 % / 150 % DPI
and moving between monitors, Artist-tab drags, Japanese IME pre-edit, NATIVE middle-list
behaviour, the Mint accent, wallpapers with other aspect ratios, the undo notice's 8-second
expiry, and the GLASS default on a first run. Known limits: ESLyric cannot be embedded in a
Panels UI panel (the skin reads saved lyrics only), and NATIVE list rules are decided by
the host (`docs/NATIVE_VS_GLASS.md`).

## Install

1. **Back up** your foobar2000 profile (especially `playlists-v2.0`) and your current skin folder.
2. Build the package (or take a release ZIP):
   ```
   npm run package        # -> dist/Anna-Glass-V2.zip
   ```
3. Extract it over a backed-up copy of the skin folder, then restart foobar2000.
   New installs start in **GLASS** mode; an existing install keeps its mode (switch above
   the middle list). The ZIP also holds `Anna-Glass-V2-README.txt` for end users.

Rollback: restore the backed-up skin folder (and profile if you tested playlist features).

## Repository layout

| Path | Content |
|---|---|
| `main.txt`, `foo_ui_panels.ini` | Panels UI skin layout and panel registration |
| `js/` | One JS Panel per file (`anna_*.js`) plus `playlist_browser.js` (sidebar). Shared modules: `anna_i18n.js`, `anna_theme.js` (accents, shared colours, pill switch), `anna_shared.js` (pvar keys, reserved playlist names, drag-origin markers), `anna_playlist_dedup.js`, `anna_dpi.js`, `anna_drop_fix.js`. Logic split out of the two lists: `anna_glass_drop.js`, `anna_sidebar_drop.js`, `anna_scratch_views.js`, `anna_dedup_tracker.js`, `anna_import_staging.js` |
| `images/` | Wallpapers (`images/wallpapers/`), ornaments, and control PNGs per palette (`images/controls/README.md`) |
| `tests/` | Offline regression tests, one file per round (`test_roundNN*.mjs`), `test_shared.mjs`, helpers in `tests/helpers/` (`js_panel.mjs` include shim, `fake_host.mjs` fake foobar2000 host) |
| `tools/` | `run_tests.mjs`, `package_skin.py`, `fb_test.ps1` (Windows checks), `generate_controls.py`, `make_accent_palette.py`, `audit_playlist_databases.py` |
| `docs/` | Review per round (`ROUNDnn_REVIEW.md`), acceptance matrix, `DEVELOPMENT_PLAN.md`, `NATIVE_VS_GLASS.md`, `USER_README.txt` (packaged as `Anna-Glass-V2-README.txt`), `release_notes/` |

## Development

```
npm test                       # all offline test files (Node >= 20)
node tools/run_tests.mjs 14    # only tests whose filename contains "14"
npm run package                # build and verify dist/Anna-Glass-V2.zip
```

The tests model foobar2000/JS Panel callbacks (OLE drag, playlists, GDI) offline; they
do not replace testing on Windows. CI (`.github/workflows/test.yml`) runs the same
commands on every push to `main` and every pull request.

`npm run package` fails if any `include()`d script, panel script, or `images/...`
file referenced by the sources is missing, an image has an invalid header, or the first
line of `docs/USER_README.txt` does not name the version in `package.json`.

## Conventions

- Each round: failing test first, then the fix, `npm test` green, `docs/ROUNDnn_REVIEW.md`,
  and a short note in `docs/release_notes/`.
- Images and Markdown are tracked. Only ZIPs, checksums, `dist/` and OS files are ignored.
- The 16:9 DLL experiment (branch `experiment/16x9-freeze`, last commit `815cb3f`) was dropped
  in Phase E5 (2026-11-20); the branch is deleted.

See `docs/DEVELOPMENT_PLAN.md` for the roadmap.
