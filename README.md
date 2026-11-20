# Anna Glass V2

A transparent "glass" skin for foobar2000 built on **Panels UI (reborn)** and JS Panels:
Glass playlist with album art and reflections, Artist/Library/Playlist navigation,
playback Queue, local lyrics (ESLyric-saved files and tags), image-based transport
controls, four accent palettes (pink, blue, teal, violet) and four UI languages
(English, 简体中文, 繁體中文, 日本語).

Current release: **Round 14** (drag & drop rules). Windows-verified through Round 14.

## Install

1. **Back up** your foobar2000 profile (especially `playlists-v2.0`) and your current skin folder.
2. Build the package (or take a release ZIP):
   ```
   npm run package        # -> dist/Anna-Glass-V2.zip
   ```
3. Extract it over a backed-up copy of the skin folder, then restart foobar2000.
   Use **GLASS** mode (switch above the middle list) for the Glass playlist rules.

Rollback: restore the backed-up skin folder (and profile if you tested playlist features).

## Repository layout

| Path | Content |
|---|---|
| `main.txt`, `foo_ui_panels.ini` | Panels UI skin layout and panel registration |
| `js/` | One JS Panel per file (`anna_*.js`) plus `playlist_browser.js` (sidebar) |
| `images/` | Wallpaper, ornaments, and control PNGs per palette (`images/controls/README.md`) |
| `tests/` | Offline regression tests, one file per round (`test_roundNN*.mjs`) |
| `tools/` | `run_tests.mjs`, `package_skin.py`, `generate_controls.py`, `audit_playlist_databases.py` |
| `docs/` | Review per round (`ROUNDnn_REVIEW.md`), acceptance matrix, `DEVELOPMENT_PLAN.md`, `release_notes/` |

## Development

```
npm test                       # all 14 offline test files (Node >= 20)
node tools/run_tests.mjs 14    # only tests whose filename contains "14"
npm run package                # build and verify dist/Anna-Glass-V2.zip
```

The tests model foobar2000/JS Panel callbacks (OLE drag, playlists, GDI) offline; they
do not replace testing on Windows. CI (`.github/workflows/test.yml`) runs the same
commands on every push to `main` and every pull request.

`npm run package` fails if any `include()`d script, panel script, or `images/...`
file referenced by the sources is missing, or an image has an invalid header.

## Conventions

- Each round: failing test first, then the fix, `npm test` green, `docs/ROUNDnn_REVIEW.md`,
  and a short note in `docs/release_notes/`.
- Images and Markdown are tracked. Only ZIPs, checksums, `dist/` and OS files are ignored.
- The 16:9 DLL experiment lives on branch `experiment/16x9-freeze` and is not part of the skin.

See `docs/DEVELOPMENT_PLAN.md` for the roadmap.
