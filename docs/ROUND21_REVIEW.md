# Round 21 review — equal wallpapers, CPU, memory, window dragging (2026-11-21)

Owner's report after 1.0.0:

1. The Wallpaper menu always had *Default (Anna)*, even after its file was deleted.
2. CPU and memory use were high once the skin was loaded.
3. Moving the main window by dragging stuttered.

## 1. Wallpapers are peers

The bundled picture is now `images/wallpapers/Anna.jpg` (git rename of `wallpaper.jpg`) and
is listed like every other image, by file name. `anna_top_chrome.js` has no built-in entry
any more; the `wallpaperDefault` string is gone.

The saved choice must be an existing image (`ensureWallpaper`, on load and each time the
menu opens): a deleted file, or `wallpaper.jpg` saved by an older build, moves to `Anna.jpg`
if it exists, otherwise to the first image by name. Nothing is written when the folder is
empty or cannot be read. `pvar.once` in the ini and the `main.txt` fallback name `Anna.jpg`.

## 2. CPU — what the Windows measurement showed

foobar2000 2.26.2, foo_js_panel 1.9.0, window ≈ 1460 × 1100 px. A temporary counter
appended to the *installed* scripts logged `on_paint` calls and their time per panel;
process CPU from `Get-Process` over 10 s (one core = 100 %).

| State | CPU | JS panels repainted | JS paint time |
| --- | --- | --- | --- |
| 1.0.0, playing | 78–106 % | all 14, ~11 × a second | ~470 ms/s |
| 1.0.0, stopped | 1–5 % | none | — |
| Round 21, playing | **21 %** | 2 × a second (+ the seek bar alone, 11 ×) | ~110 ms/s |
| Round 21, stopped | 0.3 % | none | — |

**Cause.** A repaint of a *windowless* panel makes Panels UI redraw the whole layout, and
with it every JS panel. Two windowless panels animate while playing: the lyrics card (karaoke
timer, up to 20 repaints a second) and the seek bar (the butterfly's breathing glow, every
120 ms, even though it only asked for a 50 px `RepaintRect`). A repaint of a *child-window*
panel (`windowless = 0`) stays inside it: the GLASS list's 6-a-second now-playing glyph did
not make any other panel repaint.

Checked and ruled out: the wallpaper's size (a 1280 × 720 copy made no difference), the
`%playback_time%` and `%bitrate%` fields in `main.txt` (the remaining 2 redraws a second stay
without them). The native Spectrum panel itself costs about 10 %; it stays.

**Changes.**

- `foo_ui_panels.ini`: `AnnaLyrics` and `FooterSeek` are child windows. As the rules require,
  both scripts now go through `AnnaDpi` (fonts, width/height, popup menu, `repaintRect`,
  `install()` last); `test_round15_dpi` checks them with the other child windows.
  `FooterVolume` shares the script and stays windowless (`AnnaDpi` then has scale 1).
  The lyrics card only rejects drops, so it needs no `AnnaDropFix`.
- `anna_glass_playlist.js`: the now-playing glyph repaints only its own 20 px rectangle, and
  nothing while its row is collapsed or scrolled out of view.

## 3. Memory

The GLASS list cached up to 18 covers at full resolution (a 1400 px cover is ~8 MB as a
bitmap, often more) and scaled each down again on every repaint — most of its 14 ms per
paint. Covers are now resized once to the drawn size (90 layout px × the panel's DPI scale)
and the original is released at once. Process memory while playing went from 160–230 MB
(private) to ~125 MB; the GLASS list's paint time from 240 ms/s to ~30 ms/s.

## 4. Window dragging

With 1.0.0 the UI thread spent most of each second in full-layout redraws (~70 ms each,
~11 a second), so window moves were handled late. During a drag of the caption in Round 21
neither CPU nor the repaint counts rose above the playing baseline, and the window followed.

## 5. Second pass: cheaper host redraws (owner: "dragging still hitches, less often")

**What is left.** While playing, Panels UI itself redraws the whole layout every 500 ms
(stops when paused). Not from the skin: it stays without any playback field in `main.txt`,
without the Album Art and Spectrum panels, and no JS panel requests repaints at that rate.
foo_js_panel 1.9.0 / 1.9.2 has no window-move callback (`UIHacks.MoveStyle` is a stub), so
"no repaint while dragging" is not possible; skipping a host-requested paint would leave the
panel transparent for a frame. JS Panel 1.9.2 (API names case-insensitive) changed nothing
here: same 21 %, same 500 ms rhythm.

**Where the time went.** A probe timing each `gr` method (performance.now) and a one-off
benchmark in the host:

| Call | Cost |
| --- | --- |
| `FillRoundRect` / `DrawRoundRect`, antialiased, 600 × 35 | 0.30 / 0.40 ms |
| `DrawImage` of a 192 px PNG at 39 px | 0.64 ms |
| … from a 78 px copy / a 39 px copy | 0.17 / 0.03 ms |
| `DrawImage` / `GdiAlphaBlend` of a ready 620 × 45 bitmap | 0.08–0.10 ms |
| `GdiDrawText` | ~0.035 ms |

**Change.** `js/anna_paint_cache.js`: `shape()` draws a fixed look (round rects, glows,
lines; never text, which loses alpha in a bitmap) once per key, size, DPI scale and accent
into a bitmap and then only blits it (LRU, 96 bitmaps, released when evicted); `icon()`
resizes an image once. Used for GLASS rows, album boxes, cover frame and scrollbar, sidebar
rows and scrollbar, transport icons, seek and volume thumbs. Child windows cache at their
exact scale; windowless panels (transport, volume) at 2 device px per layout px, because the
host scales them — sharp up to 200 %.

**Result** (JS time of one host redraw, all panels): ~47 ms → ~13.5 ms (GLASS list 14.9 →
4.2, transport 6.9 → 1.7, sidebar 3.9 → 1.0). Playing: 21 % → 15 % of one core.

## 6. Five more languages (owner's request)

Español, Português, Français, Deutsch and Русский join English, 简体中文, 繁體中文 and 日本語
(繁體中文 kept although the owner's reference list did not show it). `anna_i18n.js` keeps the
four original columns in `ROWS` and the new ones in `MORE` (key → es, pt, fr, de, ru); all 152
keys exist in all nine. Loanwords stay where usual (pt/fr/de "Playlists"). "Auto" maps
`es-*`, `pt-*`, `fr-*`, `de-*`, `ru-*`; other unknown locales still fall back to 日本語 as before.

The language submenu lists every language by its own name in the reference order
(Auto, English, Español, Português, 中文（简体）, 中文（繁體）, 日本語, Français, Deutsch,
Русский); the former `langZhCN/langZhTW/langJa/langEn` strings are gone
(`AnnaI18n.nativeName`).

`main.txt` drew four labels by testing `anna.language` itself, so with "Auto" they showed the
Japanese fallback. TopChrome now publishes the resolved language as
`anna.language.shown` (`AnnaShared.PVAR.languageShown`, on load and on every change) and
`main.txt` tests that, with branches for all nine languages.

Windows check: the submenu showed the ten entries in order with the tick on 中文（简体）;
Deutsch and Русский switched the tabs, search hint, sidebar and list headers (Cyrillic drawn
correctly); switched back to 中文（简体）. The album header's "N tracks" is still English in
every language (pre-existing, not a dictionary string).

## Tests

`tests/test_round21_paint_cache.mjs` (failed before the change): the cache module (one
resize per size, no upscaling, one bitmap per look, accent recolouring, LRU release, fallback
without `CreateImage`), and that the GLASS list paints rows and album boxes as blits only,
creating no bitmaps on later paints.
`tests/test_round21_perf.mjs` (failed before the change): wallpaper list and fallbacks
(bundled file deleted, old saved names, unset, deleted while running, empty folder), the two
child windows, the glyph's `repaintRect`, and the cover cache size and release. Round 19 and
20 tests follow the new wallpaper rules. `tests/test_round21_languages.mjs` (failed before
section 6): all keys in nine languages, "auto" per locale, menu order and native names,
the published language, and `main.txt`'s branches; Round 9's test follows the new menu
order. `npm test`: 29/29.

## Windows check (2026-11-21)

Deployed (scripts, `main.txt`, ini; the installed `images` were left as they were). The
owner had deleted `wallpaper.jpg` from the installed skin and added two PNGs: the Wallpaper
submenu listed exactly those two, with the tick on the one in use. This display is high-DPI,
so the two new child windows run with a scale other than 1: the seek bar spans its full
width, a click in its middle seeked a 4:00 track to 2:00 with the butterfly under the
pointer, and the lyrics card's right-click menu opened at the pointer. GLASS list as before;
JS log without errors; playlist counts unchanged against the backup. After the second pass
rows, album boxes, sidebar and transport icons looked unchanged in a zoomed screenshot (this
machine runs at scale 1; 2x icons at other scales are not checked). Later a track with synced lyrics played: the
child-window lyrics card scrolled and highlighted lines as before. Not covered: other DPI
settings than this machine's.
