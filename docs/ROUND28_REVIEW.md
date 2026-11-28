# Round 28 review — NATIVE removed, mini player (2026-11-28)

Owner's request: NATIVE does not look right in the light interface; remove it from the
interface and design an optional compact window instead. Asked which compact window was meant
(compact list view or mini player), the owner chose the **mini player**.

## NATIVE removed

- `main.txt`: no GLASS / NATIVE switch, no `Single Column Playlist`, no NativeScroll strip, no
  dark backing for it (Round 27); the middle list is always `GlassPlaylist`.
- `foo_ui_panels.ini`: no `SwitchGlass` / `SwitchNative` / `NativeScroll` panels and no
  `hariiro.playlist.experimental` default. A saved `0` from an older install is ignored.
  The `color.*` values stay: other native panels (album art, spectrum) still use them.
- Deleted `js/hariiro_mode_switch.js`, `js/hariiro_native_scroll.js`; the Glass list's menu has
  no "Switch to NATIVE playlist"; `switchNative` label and `HariiroShared.PVAR.playlistExperimental`
  removed. `docs/NATIVE_VS_GLASS.md` is marked historical.

## Mini player

- **Mechanism.** Panels UI's mini mode (`MINIMODE:TOGGLE`, View > Panels UI > Mini mode) is
  enabled by `mini.size` in the skin's ini; it resizes the window to that size in device pixels
  at `mini.anchor` (`RIGHT TOP`) and keeps the full size in `hariiro.mini.full.w/h`. It uses the
  same `main.txt`, so the layout is one `$ifgreater(%_height%,220, <full>, <mini>)`: Panels UI
  reads the script as one title-format expression (checked on Windows: the condition spans the
  whole full layout, `//` lines stay comments).
- **Entry / exit.** ☰ → Mini player (first item, id 16). In the mini player the top-right button
  or a double-click on the title area runs `MINIMODE:TOGGLE` again; the full window comes back at
  its old size.
- **Layout** (440 × 140 layout px): glass card with corner ornaments, cover (`Cover`, same
  Album Art panel), title / artist (`main.txt`, the stopped label in nine languages),
  `FooterTransport` in a compact mode (below 400 px: playback order, previous, play / pause,
  next, output device, evenly spread, icons 32 / 52 px), time + `FooterSeek` + length, and
  `MiniSide` (child window, right column: back to full, heart). All colours go through
  `hariiro.tc.*` and the light icons, so the mini player follows accent and light / dark.
- **Window size.** `MiniSide` (`js/hariiro_mini.js`) reads the window size in layout px from its
  own panel rect and the display scale from `HariiroDpi`, and sizes the window to 440 × 140 layout
  px with `UIWizard.SetWindowSize` / `SetWindowPosition`, keeping the right edge. On the test
  machine Panels UI draws at 1:1, so `mini.size = 440 140` is already right and nothing moves.
- **Drag.** `MiniCaption` reuses `hariiro_caption_strip.js`, which now takes its drag rectangle
  from `panelsui.GetPanelRect()` (falls back to the old header slot).
- **Favourites.** The heart logic moved from `playlist_browser.js` to `js/hariiro_favorites.js`
  (`HariiroFavorites.toggleCurrent / isCurrent / publish`); the sidebar and `MiniSide` share it.
  Behaviour unchanged (same messages, same Favorites playlist, undo backup).

## Bug found on Windows: black sidebar after the mini player

Back in the full window the sidebar was black below its rows until the mouse moved over it.
A temporary logger (in a panel variable, read from `config.sqlite`) showed why: Panels UI hides
the full window's panels in mini mode and shows them again without `on_size`, and the child
window's first paint comes before the background is drawn. Fix in `playlist_browser.js`: every
500 ms it checks `window.IsVisible`; when the panel becomes visible again (and after a resize) it
repaints after 300 ms and 1 s. Checked: the sidebar is correct after returning.

## Checked in foobar2000 (clean portable copy)

- Full window: no NATIVE switch; light and dark interfaces as in Round 27.
- ☰ → Mini player: 440 × 140 px window at the top right; cover, title, artist, compact
  transport, seek and times; heart adds to Favorites (the full window's heart shows it too);
  play / pause works; top-right button and title double-click return to the full window.
- Light (sakura) and dark (night) wallpapers: the mini player follows the tone.
- JS log: no errors.

## Tests

`tests/test_round28_mini.mjs` (written first): NATIVE gone from layout, ini, scripts, menu,
labels and `PVAR`; the layout condition and which panels are in which half; ini mini settings;
`MiniSide` window sizing at 200 % and no-op at the right size, back-to-full button, heart
(add / remove / nothing playing); the sidebar uses the shared helper; the sidebar repaints when
shown again and after a resize; caption rectangles and double-click per panel; compact transport
slots, clicks and icon sizes; ☰ entry; labels in nine languages. Updated for NATIVE's removal:
test_round3, 4, 5, 7 (pending-timer count), 8, 9, 15_dpi, 20_defaults, 21_languages (stopped label
twice), 27_light_theme, theme_colors, shared, vnext. 41/41 test files pass.

## Not covered

- Display scaling other than the test machine's: the `MiniSide` sizing is tested offline only.
- Other child windows (Glass list, lyrics, queue) did not show the black area; only the sidebar
  got the visibility repaint.

## Independent review (Codex CLI 0.171.0, read-only sandbox) and fixes

Codex reviewed the uncommitted rounds 26–28. All three findings were checked against the code
and confirmed; each got a failing test first (`tests/test_round28_review.mjs`).

1. **Bug — panels did not repaint on a tone change.** Panels repainted on `hariiro.theme.hue`
   only. Changing the wallpaper repainted everything anyway, but ☰ → Interface colours on the
   same wallpaper could leave transport, lyrics, queue, search… in the old tone until another
   event. Also TopChrome wrote the tone before the light-icon folder, so the first repaint could
   load the old icons. Fix: `HariiroTheme.isLookVariable(name)` (hue, degree, tone, light icons)
   in every themed panel's `on_panelsui_variable_changed`; TopChrome writes
   `hariiro.controls.light` before `hariiro.tone`. Checked on Windows: paused, same wallpaper,
   Dark → Light: every panel changed within a second.
2. **Bug — menu ids with more than 100 wallpapers.** The wallpaper branch tested
   `cmd < 300 + wallpapers.length` (uncapped) before the tone ids 400–402, so with > 100 images
   "Automatic" was read as wallpaper #101. Fix: tone ids first, wallpaper range capped at 60.
3. **Risk — sidebar timers.** The visibility poll and the settle repaint were not cancelled on
   unload. Fix: `on_script_unload` clears both.

Not a finding: `test_round25_installer` failed in Codex's sandbox only because it has no Python.
Codex found no problems in the `main.txt` split, panel reuse across the two layouts, the mini
player's DPI sizing, the favourites extraction, the light-icon fallback or the DPI install order.
42/42 test files pass.
