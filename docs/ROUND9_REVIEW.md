# Hariiro V2 — Round 9 test build

Branch: `feature/hariiro-ui-reference-refresh`. Keep `main` unchanged until Windows acceptance.

## Changes

- GLASS/NATIVE, DesktopLyrics and QUEUE switches now use identical **fully opaque** on/off backgrounds, outlines and knobs. Their former translucent backgrounds appeared different against different portions of the wallpaper.
- Remove playlist directly from the left sidebar (no secondary confirmation). Fixed Music Library, Hariiro - Favorites and Hariiro - Search Result, plus playing/queued/locked playlists remain protected. Removing a playlist does not delete its media files.
- Removed the left-sidebar `Remove selected tracks` action. Multiple selections are removable only from the middle GLASS playlist context menu or Delete key. This uses `plman.RemovePlaylistSelection(p, false)` and retains original media files.
- Repainted `images/controls/seek_backward_5.png` and `seek_forward_5.png` with a visible `5s` text label. Increased the music-note and disc badges in the two late Shuffle icons. Assets remain independent transparent RGBA files.
- `Shuffle (folders)` is a native foobar2000 playback order (index 6), **not** a skin invention. Removed its option and image from Hariiro's skin menu without altering the host. If the host is already in native mode 6, the skin shows the generic Shuffle icon until the user selects a different mode from Hariiro's menu.
- Removed SYS/MB header buttons. One Hariiro settings button opens the same menu with left/right click. It contains native title-bar toggle, foobar2000 menu-bar toggle, Preferences, main menu and language selector. Minimize, maximize and coral-red power buttons remain.
- Added the shared `js/hariiro_i18n.js` dictionary for Simplified Chinese, Traditional Chinese, Japanese and English. New default preference is `hariiro.language = auto`; explicit selections persist through Panels UI PVARs. Skin-created popup menu entries and main navigation labels use a single language. Proper names (GLASS, ESLyric, foobar2000) remain unchanged.
- Added handlers that consume right clicks on skin-owned JS panels without a custom menu. This hides the JS Panel **default editor menu** in those regions; the official JS Panel editor remains accessible through the component's other management entry points.

## Limitations / Windows acceptance

- **System language:** JS Panel's QuickJS fallback `Intl.DateTimeFormat().resolvedOptions().locale` currently reports hard-coded `en-GB`, and its registry shim does not expose Windows `LocaleName`. Auto mode attempts to detect a real browser/system locale where available, otherwise falls back to Japanese. System detection is therefore **best effort, not a guaranteed match** with Windows display language. The four explicit user selections work independently.
- Built-in foobar2000, ESLyric and JS Panel native menus retain their own localizations and cannot be forced to a skin language by these scripts. The GLASS playlist still exposes the native foobar context manager after its own localized actions.
- A foobar2000 host update or an alternate foobar2000 UI can still select native Shuffle (folders); this is not deleted from foobar2000 itself.
- Verify the settings popup submenu and `include('hariiro_i18n.js')` with the installed JS Panel build, test all four translations, and confirm header titlebar recovery before making the new skin default.

## Checks

- `node --check` on every `js/*.js` and `tools/generate_controls.py` via `python -m py_compile`.
- `node tests/test_round3.mjs` through `test_round9.mjs` plus `test_vnext.mjs`.
- RGBA PNG alpha checks, ZIP CRC check and `main.txt`/INI resource path checks.
- Only the complete test skin is delivered; the experimental 16:9 DLL is not included.
