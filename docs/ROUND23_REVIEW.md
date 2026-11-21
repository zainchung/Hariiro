# Round 23 review — the project is called Hariiro (2026-11-21)

Owner's decisions before release 1.0.0: the old name came from a game, so the project, the
skin and everything inside it are renamed to **Hariiro**. Saved data of earlier builds is not
migrated. The second bundled wallpaper is brought to its nominal 2560×1440.

## Rename

- Product name: *Hariiro* (no "Glass V2"; the GLASS / NATIVE mode names stay).
- Files: `js/hariiro_*.js`, `tests/…`, `images/wallpapers/Hariiro_UI_2560x1440.png` and
  `Hariiro_UI2_2560x1440.png`; package `dist/Hariiro.zip` with `Hariiro-README.txt`;
  `package.json` name `hariiro`, version still 1.0.0.
- Code: every module object (`HariiroShared`, `HariiroTheme`, `HariiroDpi`, …), panel names
  in `foo_ui_panels.ini`, log and popup texts, the settings title in all nine languages.
- Saved data, **not migrated** (owner's choice):
  - panel variables `hariiro.*` (accent and wallpaper are now `hariiro.accent` and
    `hariiro.wallpaper`, without the old product part; the others only changed their prefix), `hariiro.tc.<r-g-b>` in
    `main.txt`, the `pvar.once` defaults in the ini;
  - window properties `Hariiro.*` (search query, tab, scratch ownership, lyric offsets, …);
  - reserved playlists `Hariiro - Favorites / Queue Buffer / Sorted Library View /
    Artist View / Import Staging`.
  An install of a test build starts with defaults; its old reserved playlists stay as normal
  playlists. `docs/USER_README.txt` tells users how to move their favourites by hand.
- The skin-folder lookup (`hariiro_top_chrome.js`) still finds the skin in any folder under
  `foo_ui_panels-skins` by its `js/hariiro_top_chrome.js`; the fallback name is `Hariiro`.
- `tools/fb_test.ps1`: `$env:HARIIRO_FOOBAR_DIR`, backups in `%TEMP%\hariiro-tests`, and a new
  `-SkinFolder` (or `$env:HARIIRO_SKIN_FOLDER`, default `Hariiro`) for an installed skin folder
  with another name.
- Historical docs and release notes use the new name as well; git history keeps the old one.

## Wallpaper

`Hariiro_UI2_2560x1440.png` was 1672×941. Upscaled to 2560×1440 with Lanczos and a light
unsharp mask (radius 1.2, 60 %, threshold 2). The aspect ratio differs by 0.05 %, so the
picture is not visibly stretched. This adds pixels, not detail; an AI upscaler or a native
2560×1440 render would be sharper.

## Tests

`tests/test_round23_name.mjs` (failed before the rename): no file name or text file of the
project contains the old name (only the uncommitted `CLAUDE.local.md` is skipped),
`package.json` is `hariiro` 1.0.0, and the reserved playlists are `Hariiro - …`. Four older
suites matched the escaped ini keys and now expect `hariiro\.accent` / `hariiro\.wallpaper`;
`test_round22_unified_colours` looks 40 characters back for `$getpvar(hariiro.tc.…)` (was
30, too short for the longer prefix). `npm test`: 35/35. `npm run package`: 160 files, no old
name in any path or text file of the ZIP.

## Windows check (2026-11-21)

Playlists and the installed skin folder backed up first. With foobar2000 closed, the 30 old
script and wallpaper files were removed from the installed folder (still named after the
old name, so `fb_test.ps1 -SkinFolder`), then `deploy -Images`: skin vs repo identical, JS
log and Panels UI log without errors or missing images after the start. The configuration
now holds the `hariiro.*` defaults written by `pvar.once`: accent pink, `theme.hue=pink`
(colour folder found), GLASS mode, language Auto (shown as Japanese, the Windows language),
wallpaper `wallpapers/Hariiro_UI_2560x1440.png`. The values saved under the old prefix stay unused in the
configuration. No `Hariiro - …` playlist was created at start (they are created on first
use); the playlist index is identical to the backup, so no restore was needed.

Not checked: the screen itself (screen control was not granted for this pass), the first
use of Favorites / Queue / search under the new playlist names.
