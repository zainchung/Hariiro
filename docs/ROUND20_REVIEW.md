# Round 20 review — GLASS by default, one wallpaper folder (2026-11-21)

Owner's decisions after Phase E.

## What changed

1. **New installs start in GLASS mode.** `foo_ui_panels.ini`:
   `pvar.once.hariiro.playlist.experimental = 1` (was `0`). `pvar.once` only sets a value that
   does not exist yet, so an existing install keeps the mode it is in; the GLASS / NATIVE
   switch works as before. See `docs/NATIVE_VS_GLASS.md`.
2. **All wallpapers live in `images/wallpapers/`.** The bundled picture moved from
   `images/wallpaper.jpg` to `images/wallpapers/wallpaper.jpg` (git rename, same file). The
   default value is `wallpapers/wallpaper.jpg` in the ini (`pvar.once`), in `main.txt`'s
   fallback and in the settings menu, where it is listed once as *Default (Hariiro)*.
   A choice saved by an older build (`wallpaper.jpg`) is rewritten to the new path when the
   title-bar panel loads, so the background does not go blank after an update. The package
   now always contains the `wallpapers` folder.

## Tests

`tests/test_round20_defaults.mjs` (failed before the change): ini defaults, file location,
`main.txt` fallback, the menu list (default once, other images after it), the migration of
the old value, and that other or missing values are left alone. Round 19's test follows the
new path. `npm test`: 26/26.

## Windows check (2026-11-21)

Deployed, then removed the old `images\wallpaper.jpg` from the installed skin (as a fresh
package has it) while foobar2000 was closed; the saved setting was still `wallpaper.jpg`.
After the start the background showed the bundled picture from `images\wallpapers\`, the
Wallpaper submenu listed *Default (Hariiro)* once with the tick, and the JS log had no errors.
The GLASS default only applies to a first run (`pvar.once`); this install keeps its mode,
so that part is covered by the offline test only.
