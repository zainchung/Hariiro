# Round 26 review — lyrics card backing, GitHub link in the ☰ menu (2026-11-28)

Owner's request: the lyrics panel's background looked different from the other cards ("use a
light wallpaper to see it"); add a link to the project's public releases at the end of the
three-line menu.

## Lyrics card backing

- **Cause.** Every card in `main.txt` lays a navy tint over the wallpaper (left and middle
  `18-26-49` alpha 53, now-playing `10-20-42` alpha 54, footer `20-25-50` alpha 76). The lyrics
  card drew only its outline (`brushcolor-null`). HariiroLyrics is a transparent child window
  (`windowless = 0` since Round 21) and paints no backing itself, so the bare wallpaper showed
  through. On the dark wallpaper the difference is small; on `Hariiro_UI2_2560x1440.png` the
  card was almost white and "no track playing" was hard to read.
- **Fix.** In lyrics mode `main.txt` now fills the card with the now-playing card's tint
  (`brushcolor-10-20-42 alpha-54`) before the outline and the panel. Queue mode is unchanged (it
  keeps its own coloured fill). The outline keeps alpha 94.
- **Checked in foobar2000** (clean portable copy, light wallpaper): the lyrics card now has the
  same lavender tint as the now-playing card above it. The white lines between cards are the
  uncovered gaps, as before.

## GitHub link

- `js/hariiro_top_chrome.js`: after Wallpaper, a separator and "Hariiro on GitHub (releases)"
  (id 15, nine languages, key `githubReleases`). It opens the fixed address
  `https://github.com/zainchung/Hariiro/releases` with `utils.Run` (JS Panel 1.9.2, via
  ShellExecute), falling back to `WScript.Shell.Run`, else shows the address in a popup.
- **Checked in foobar2000:** the item is last in the menu; choosing it opened
  "Releases · zainchung/Hariiro" in the default browser. No JS errors.

## Tests

`tests/test_round26_maintenance.mjs` (written first, failed on both parts): the lyrics backing
matches the now-playing fill, sits before the panel and only in lyrics mode, the outline is
unchanged; the menu ends with separator + link, nothing opens until it is chosen, the address
is exact, and every language has a label. 39/39 test files pass.
