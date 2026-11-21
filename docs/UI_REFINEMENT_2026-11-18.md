# Hariiro — UI refinement test package (2026-11-18)

This archive is a **complete skin test package**, based on `Hariiro-FullSkin-Seven-UI-Fixes-2026-11-18.zip`.
No foobar2000 executable, extra DLL, or test media is included.

## Changes made in this iteration

- Bottom transport: the play/pause ring is redrawn as a thin, integrated, transparent GDI vector. All seven playback-order states have different pictograms. The last transport icon is a compact monitor + headphones + speaker, and opens a real output-device menu using JS Panel playback APIs with a main-menu fallback.
- Right footer: removed volume percentage and its entire JS Panel registration. Speaker and volume slider are now on the bottom-right row; the QUEUE control retains its previous exact skin coordinates but is redrawn as a rounded-square button.
- Top navigation: frameless `ライブラリ` (artist browser), `プレイリスト` (saved playlist browser), `再生中` tabs with icons and a restrained selected-state backlight. `再生中` uses a static mini-spectrum mark; no Favorites tab.
- Search is to the left of the far-right system control group, with consistent right margin. System group has SYS, MB, settings, menu, minimize, maximize, and a power-symbol exit control.
- Minimize and maximize use JS Panel's `new ActiveXObject('UIWizard')` compatibility API (`WindowMinimize()`, `ToggleMaximize()`). This needs a JS Panel release that supports these methods, as documented and covered in the JS Panel upstream tests. Older builds show an explicit message and leave SYS/native title bar as recovery.
- Artist sidebar rows now support dragging every song belonging to that artist into Queue. The existing native OLE/queue path is used, and saved playlists are not changed.
- Lyrics' DESK border is inset, enlarged, and shifted clear of the right ornamental corner. Existing lyrics OUTER border stays. No lyrics inner border is reintroduced.
- Upper-right card is 23 skin pixels shorter; Spectrum moves with it and lyrics start 23px earlier, retaining the same bottom edge. Unified metadata keeps original font sizes and more compact row spacing.

## Testing

- `node tests/test_vnext.mjs`: JS syntax, 960/1280/1536/1920 layout geometry, transport order icons/actions, device selection, UIWizard window controls, Artist drag path, metadata fonts/flow, percent removal, and border safety.
- **Not verified on an actual Windows/foobar2000 installation in this environment**: GDI icon fidelity on the installed fonts, true Windows minimize/maximize behavior, JS Panel output devices on the installed version, cross-panel OLE drag, actual DPI and hover states.

## How to install for testing

1. Back up your current `main.txt`, `foo_ui_panels.ini`, `js/`, and `images/` directories.
2. Unzip the archive into a fresh skin folder. Select that folder through Panels UI (reborn) settings.
3. Do not replace your current Panels UI DLL or combine with the experimental 16:9 DLL for this test.
4. Check the three new navigation tabs, seven playback-order states, output selection, SYS/MB/settings/menu/minimize/maximize/power, Artist-to-Queue drag, DESK ON corners, QUEUE rounded border, and long/missing-tag metadata.
5. If a JS Panel reports an API error, retain the log/Console message and restore your backup.

The preview remains an unmerged draft pending Windows screenshot/interaction acceptance.
