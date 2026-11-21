# Round 19 review — two more accent colours and a wallpaper choice (Phase E3, 2026-11-21)

## What changed

1. **Accent colours Amber and Mint** (☰ → Accent colour), after Rose, Violet, Sky blue and
   Teal. Like the others they recolour the JS-drawn accents and the footer control images.
   The images are in `images/controls/amber/` and `images/controls/mint/`, made with the new
   `tools/make_accent_palette.py <id> <hue>` (Pillow only). It uses the same rule as
   `AnnaTheme.recolor`, and it reproduces the bundled teal set to within rounding.
2. **Wallpaper** (☰ → Wallpaper): *Default (Anna)* plus every `.jpg` / `.png` / `.bmp` in
   `images/wallpapers/` of the installed skin, by file name. The choice is the Panels UI
   variable `anna.glass.v2.wallpaper` (relative to `images/`); `main.txt` now draws
   `images/$if2($getpvar(anna.glass.v2.wallpaper),wallpaper.jpg)`, and
   `background.image_pvar` in `foo_ui_panels.ini` already used the same variable for native
   panels. Only names from the list are accepted.
   The skin folder is found under `fb.ProfilePath\foo_ui_panels-skins\` (any folder that
   contains `js\anna_top_chrome.js`).

`AnnaShared.PVAR.wallpaper` added. The package does not include an empty `wallpapers`
folder (zip of files only); create `images\wallpapers` in the skin folder to add images.

## Tests

`tests/test_round19_theme.mjs` (failed before the change): preset order and labels in every
language, recolour lands on the new hues, 16 RGBA images per palette, the footer volume icon
in `main.txt` for every palette, the wallpaper list (default first, images sorted, other
files ignored), choosing from the menu, rejecting names not in the list, and the `main.txt`
wallpaper expression. `npm test`: 25/25.

## Windows check

See `docs/PHASE_E_REVIEW.md`. `$getpvar` inside an image path in `main.txt` and the
`utils.Glob` folder listing can only be confirmed there.
