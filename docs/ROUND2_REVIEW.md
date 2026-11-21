# Hariiro: 2026-11-18 Round 2 test build

## Fixes
- Native Album Art replaces custom asynchronous cover JS (MP4/M4A should not stick on Loading artwork; actual embedded covr parsing remains dependent on foobar2000).
- Nav tabs use stronger pink layered backlighting; minimize is mid-line, not underscore.
- GLASS and NATIVE use separate PVAR-state-driven iOS pill panels: GLASS ● / ● NATIVE.
- DESK ON/DESK OFF has clearly different active fill/border.
- Four unique transparent corner image orientations with aligned positions; no rotate-flip guessing.
- ESLyric right-click: optional RequestLyric and registered menu command fallback; no automatic settings sync is claimed. Enable ESLyric Tools > Advanced: pref.script.expose=1 and restart if supported.
- 16:9 aspect lock, window-size preset and custom deferred painting options removed.

## Unverified / limitations
- Top ~7 px strip on screenshot is likely native/non-client window border. Its pixels are outside the skin's drawing area and cannot safely be changed by this skin-only ZIP. No Panels UI DLL changes.
- M4A missing artwork can also be caused by invalid/missing covr atom, unsupported decoder or tagging; user-supplied m4a sample is needed to prove root cause.
- ESLyric external COM RequestLyric may be unsupported by the embedded JS engine even after enabling the API, and search-path menu entries vary by ESLyric version. The right-click action explicitly reports failure and offers configuration.
- No published external API found to read ESLyric Lyric Save path/settings. Hariiro Lyrics four read-side modes remain independently configured.
- Windows real rendering, DPI, m4a metadata, drag/drop, and ESLyric integration require on-device tests.

## Install
Extract to a separate Hariiro skin directory, point Panels UI to the folder, and keep your previous working skin as a backup. Do not replace any DLL.
## Developer test
Run `node tests/test_vnext.mjs` with Node.js 18+ from anywhere.
