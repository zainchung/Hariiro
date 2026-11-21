# Round 22 review — new wallpapers, colours as folders, corners per colour (2026-11-21)

Owner's requests: replace the background pictures with two new ones; make accent colours
addable by dropping a folder in, like wallpapers, named by the folder; move the corner
ornaments into the pink colour and give every other colour its own.

## Wallpapers

`images/wallpapers/` now holds the owner's two pictures, `moon.png` and
`櫻花樹下的水晶茶韻.png` (1672 × 941, copied from the installed skin, unchanged; `Anna.jpg`
removed). `moon.png` is the default (`pvar.once` in the ini, `main.txt` fallback,
`DEFAULT_WALLPAPER`); the Round 21 rules (peers, fallback when deleted) are unchanged.
`moon.png` carries a small leftover overlay in its top-left corner (an icon and "000 | Co")
from its source; it is the owner's artwork and was not edited.

## Accent colours are folders

- `AnnaTheme.scan(skinDir)`: every folder in `images\controls\` with `play.png`, sorted by
  name; label = folder name. Hue and accent come from `theme.json`
  (`{"hue": n, "accent": "r-g-b"}`), else from the bundled table, else from `play.png`
  (`GetColourSchemeJSON`: most frequent colour with saturation ≥ 0.25 and value ≥ 0.35).
  Directory listing uses `utils.Glob(path, 0, 0x10)` (verified on the host).
- Saved state: `anna.theme.hue` = folder (`'rose'` from older builds = `pink`),
  `anna.theme.degree` = hue (new, `AnnaShared.PVAR.themeDegree`), `anna.glass.v2.accent`.
  Panels read the hue from the variable, so they never touch the file system; before
  TopChrome has published one, bundled names use their known hue.
- `recolor()` rotates from the pink base (326) to the stored hue; pink draws unchanged.
  `AnnaPaintCache` keys bitmaps by `AnnaTheme.key()` (folder@hue).
- TopChrome builds the Accent colour submenu from the scan (up to 60, grey hint
  `themeHint` in nine languages) and, on load and each time the menu opens, makes sure the
  saved folder exists (else `pink`, else the first) and that hue and accent are published.
  The per-colour i18n names (`themeRose` … `themeMint`) are gone.
- Transport and seek/volume load images from `../images/controls/<folder>/`.

## Corners per colour

`images/ornaments/corner_*.png` moved (git) to `images/controls/pink/`; the other five
folders got recoloured copies from `tools/make_accent_palette.py <id> <hue> "corner_*.png"`
(new optional file filter, same hue rule as the controls; the gold dots stay gold).
`main.txt` draws corners and the volume icon from
`images/controls/$if($strcmp($getpvar(anna.theme.hue),rose),pink,$if2($getpvar(anna.theme.hue),pink))/…`,
so a new colour folder needs no layout change. `pvar.once.anna.theme.hue = pink`.

`tools/package_skin.py` now ships each `theme.json` and checks it has a numeric hue.

## All frames follow the colour (owner: "some borders did not change")

Two sources stayed fixed: (a) every colour `main.txt` draws itself (card outlines, header
line, cover frame, queue card, labels), and (b) the warm peach/gold frames in the JS panels
(GLASS album and cover frames, tooltip frame, gold highlights, two queue hints, a sidebar
detail), whose hue 0–50 lay outside `recolor`'s pink range.

- `AnnaTheme.recolor`: warm colours (red channel highest, ≥ 120, spread ≥ 22, hue ≤ 50) take
  the colour's hue with their saturation and brightness kept; pink still draws unchanged.
  `tools/make_accent_palette.py` has the same rule; the corner PNGs of the five other
  colours were regenerated (their gold dots now follow too; control icons have no warm
  pixels and are unchanged).
- `main.txt`: each colour that a colour changes is written
  `$if2($getpvar(anna.tc.R-G-B),R-G-B)` (22 places, 16 colours = `AnnaTheme.LAYOUT_COLORS`).
  TopChrome publishes `anna.tc.<base>` = `AnnaTheme.layoutColor(base)` on load, whenever it
  checks the colour, and after a choice (only changed values are written).
  Verified first on the host that `brushcolor-` / `pencolor-` accept `$getpvar`.

Windows check: with blue, the card outlines, header line, album and row frames and the cover
frame were all light blue — no peach or gold frame left; with amber they turned amber.

## One rule for vectors and pictures (owner: "now-playing info and the other icon sets")

The other colour sets still showed pink: the old rule skipped dark tints (red < 70), pale
tints (spread < 22) and some vivid ones, so e.g. the previous/next/order/±5 s/speaker glows,
pause and butterfly rings and headphone cables kept their pink in every set (up to 100 % of a
picture's pink pixels), and the pale pink now-playing texts (top right `anna_now_details.js`,
bottom left in `main.txt`) never changed. Rotating by the full hue distance also let
tints "cross over": a purple glass tone (259°) became magenta under amber.

New rule, identical in `AnnaTheme.recolor` and `tools/make_accent_palette.py`:
- any tint with hue 255–360 and channel spread ≥ 6 (dark, pale or vivid) moves to the target
  hue keeping 30 % of its distance from pink 326° (`SPREAD`), with its saturation and
  brightness — so it stays within about −21…+10° of the target;
- warm frames (hue 0–50, red ≥ 120, spread ≥ 22) take the target hue;
- greys, whites and the blue glass (≈ 220–235°) stay. Pink draws unchanged.
The JS also had a saturation bug (sat = spread/255 times value), which greyed recoloured
vectors; it now uses real HSV. All 20 pictures of the five other sets were regenerated;
`main.txt` gained two more followed colours (queue card fill `58-20-59`, footer artist
`229-214-231`).
 (`foo_ui_panels.ini` `color.*`, NATIVE playlist)

Panels UI reads `color.*` only from the ini (its variable-driven keys are `theme.accent_pvar`,
`theme.index_pvar`, `background.*_pvar`, `font.face_pvar`), and editing the ini does not reload
the skin. Found on the host instead: with no `color.highlight` / `color.playlist.highlight`,
the native playlist highlights selected rows with the accent — and follows a colour change
live (violet → lavender rows, amber → amber rows, no restart). So both highlight lines are
gone, and the other tinted values (separator, hover, text, dim text, selected text) are now
neutral cool greys/whites that suit every colour. Rewriting the ini and reloading the skin on
each change was not chosen: it would restart every panel on each colour change.

## Tests

`tests/test_round22_themes.mjs` (failed first): wallpaper files and defaults; each bundled
folder has the 20 PNGs (alpha kept, corners recoloured) and `theme.json`; `main.txt` paths;
scan (order, labels, theme.json, colour from play.png, folders without play.png ignored);
`set`, legacy `rose`, hue fallback; the menu (order, tick, choice, missing saved folder);
panels load from the folder. Older tests follow (20 PNGs per folder, preset list, menu ids,
corner paths, `themeDegree` owned by anna_theme.js). `tests/test_round22_unified_colours.mjs`
(failed first): warm rule per colour, no fixed accent-dependent colour left in `main.txt`,
`LAYOUT_COLORS` = wrapped colours, TopChrome publishes them, the image tool has the rule.
`tests/test_round22_native_colours.mjs` (failed first): no highlight lines, no tinted `color.*`.
`tests/test_round22_icons.mjs` (failed first): every picture of every set equals the pink one put
through `AnnaTheme.recolor` pixel by pixel (±2), alpha kept; the now-playing texts follow.
`npm test`: 33/33.

## Windows check (2026-11-21)

Deployed with images. The Accent colour submenu listed amber, blue, mint, pink (ticked),
teal, violet and the hint. A test folder `Ocean Test` (blue pictures, no `theme.json`)
appeared after copying it in; choosing it turned pills, icons and corners blue — the colour
derived from `play.png`. No "skin image not found" in `foo_ui_panels.log` after the deploy,
so the folder paths in `main.txt` resolve. Switched back to pink; the test folder was deleted
with foobar2000 closed (Panels UI keeps used images open). JS log without errors.
