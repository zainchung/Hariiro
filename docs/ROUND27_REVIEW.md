# Round 27 review — light interface for light wallpapers (2026-11-28)

Owner's request: when the wallpaper changes, the interface text should take colours that stay
readable on it. Of the two options offered (A: only make the dark glass more opaque on light
wallpapers; B: a full light interface), the owner chose **B**.

## Design

- **One tone rule** in `HariiroTheme` (`js/hariiro_theme.js`). Every colour the skin draws
  already passes through `HariiroTheme.recolor()` — JS panels via `HariiroTheme.graphics(gr)`,
  `main.txt` via the `hariiro.tc.<base r-g-b>` variables the title-bar panel publishes. In the
  light tone, after the accent hue shift, `lighten()` mirrors the HSL lightness (kept between
  0.12 and 0.96) and keeps hue, saturation and alpha: pale text becomes dark, dark navy glass
  becomes pale. `frost()` then makes translucent fills that turned pale 1.5× as opaque, so a
  busy light wallpaper shows through rows and cards less.
- **Tone** = `hariiro.tone` (`light` / `dark`), written only by TopChrome. The owner's choice
  is `hariiro.tone.mode` (`auto` default, `dark`, `light`; ☰ → Interface colours, ids
  400–402, after the 60 wallpaper ids). Automatic reads the wallpaper once per file:
  `HariiroTheme.wallpaperTone()` takes the frequency-weighted luma of the colour scheme of a
  64×36 copy (`GetColourSchemeJSON`); ≥ 0.5 is light. The result is cached in
  `hariiro.tone.auto` (`<wallpaper>|<tone>`), so starting foobar2000 does not decode the image.
- **Repaint.** A tone change republishes the `main.txt` colours and sends
  `Hariiro.ThemeChanged`; `HariiroTheme.key()` includes the tone, so the paint caches and the
  icon loaders refresh.
- **main.txt.** Every remaining literal colour (the glass fills `24-25-30`, `9-14-28`,
  `15-24-49`, `18-26-49`, `10-20-42`, `20-25-50` and the codec text `198-198-220`) now reads
  `hariiro.tc.*` (added to `LAYOUT_COLORS`; in the dark tone they keep their value). The
  full-window navy veil is drawn only in the dark tone: mirrored it turned into a white veil
  that washed the wallpaper out.
- **Icons.** `tools/make_light_controls.py` writes `images/controls/<colour>/light/*.png` with
  the same `lighten()` rule (alpha kept). TopChrome publishes `hariiro.controls.light`
  (`light/` when the tone is light and the colour has `light/play.png`); `main.txt` and
  `HariiroTheme.controlsFolder()` (transport, seek / volume thumbs) add it to the path. A
  user colour without `light/` keeps its normal images.
- **NATIVE list.** Its colours are fixed in `foo_ui_panels.ini` (Panels UI has no variable for
  them), so in the light tone `main.txt` keeps a dark backing under it (below the card title).

## Checked in foobar2000 (clean portable copy)

- Light sakura wallpaper → light interface on start (automatic); dark plum text and icons in
  the top bar, sidebar, album list, now-playing card, lyrics and footer. Rows are pale frosted
  glass; lyrics: past lines faded, current line dark pink, next lines dark grey-blue.
- Night wallpaper chosen from the menu → dark interface immediately, all panels repainted.
- Interface colours → Light on the night wallpaper works; back to Automatic → dark.
- NATIVE mode in the light tone: dark backing, white native text readable, card title readable.
- JS log: no errors.

## Tests

`tests/test_round27_light_theme.mjs` (written first): the tone rule (text dark, glass pale and
frosted, alpha of `lighten()` kept, accent + tone combined, caches keyed by tone), wallpaper
brightness, no literal colour left in `main.txt` and all published, image paths with
`hariiro.controls.light`, the native backing, a `light/` set for every colour folder, the
loaders, TopChrome (automatic, cache, wallpaper switch, menu modes and ids, colour without
`light/`), labels in nine languages. Updated for the new paths / menu: test_round8,
test_vnext, test_round21_perf, test_round22_themes, test_round26_maintenance, test_shared
(theme.js owns `hariiro.tone` and `hariiro.controls.light`). 40/40 test files pass.
