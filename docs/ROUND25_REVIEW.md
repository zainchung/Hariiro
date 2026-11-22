# Round 25 review — installer, bundled components, screenshots (2026-11-22)

Owner's request: make installing simpler (bundle the plug-ins or foobar2000 and set the first
settings), then ship it with screenshots.

## What can be bundled

- **foobar2000: no.** Its licence (`doc\license.html`) allows redistributing only the unmodified
  installer; "redistribution of foobar2000 binaries in any other form is not permitted". A
  ready-made, pre-configured portable foobar2000 is therefore not shipped.
- **Panels UI (reborn) and foo_js_panel: yes.** Both by Santiago Rodriguez, MIT
  (github.com/santiagorod92/foo_ui_panels, …/foo_js_panel). The ZIP carries the 64-bit DLLs
  unmodified (1.27.1 / 1.9.2, the latest releases) with their licences
  (`third_party/<name>/LICENSE.txt`, `third_party/THIRD-PARTY-NOTICES.txt`). The DLLs are not in
  the repository: `package_skin.py --components` / `HARIIRO_COMPONENTS_DIR` points at an
  installed `user-components-x64`. Without it the script builds a test ZIP and says so.
- **ESLyric: no** (optional, not ours to ship).
- **First settings: not edited.** foobar2000 keeps the UI module and Panels UI the skin path in
  `config.sqlite` (undocumented). The installer only copies files.

## ZIP layout (new)

```
Hariiro/                  skin folder (main.txt, foo_ui_panels.ini, LICENSE, js/, images/)
Install-Hariiro.cmd/.ps1  installer
components/<name>/        <name>.dll + LICENSE.txt
preview/*.png             screenshots (docs/preview)
Hariiro-README.txt, LICENSE, THIRD-PARTY-NOTICES.txt
```

The skin moved from the ZIP root into `Hariiro/`: Panels UI lists one skin per subfolder of
its skins root, so the folder can be dropped in as it is.

## Installer (`tools/installer/Install-Hariiro.ps1`)

Finds foobar2000 (`-FoobarDir`, else the running process, else the standard folders), portable
(`portable_mode_enabled` → `profile\`) or installed (`%APPDATA%\foobar2000-v2`); asks before
closing it; copies a component only when `user-components-x64\<name>\<name>.dll` is missing;
copies an existing `Hariiro` skin folder to `Hariiro.backup-<time>` before overwriting; starts
foobar2000 and prints the two first-start choices. It deletes nothing and touches no
configuration or playlists. The `.ps1` is written with a BOM (Windows PowerShell 5.1).

## Windows check (clean portable foobar2000 2.26.3 in a temporary folder)

The owner's own foobar2000 was not used for the clean run.

1. Program files copied without `profile\` = a fresh portable install; test ZIP extracted;
   `Install-Hariiro.ps1 -FoobarDir … -Yes`: both components installed, skin copied, foobar2000
   started.
2. foobar2000: "New user interface module(s) found" → Panels UI (reborn) → OK.
3. Panels UI first run writes its own default layout ("first run, default layout written to …")
   and opens the layout wizard, although `Hariiro` is already in the skins root. Closing the
   wizard and choosing View → Panels UI → Skins → Hariiro loads it.
4. Restart: `loading skin …\Hariiro` - the choice is kept. No JS warnings or errors.
5. A fictional sample album added with `foobar2000.exe /add` and two screenshots taken
   (`docs/preview`: pink accent + night wallpaper, blue accent + sakura wallpaper).

Remaining manual steps for a new user: install foobar2000, run the installer, two clicks on the
first start. Not checked: a standard (non-portable) foobar2000 install, a profile where the
components are already installed in another version.

Screenshots: no real music is shown. `tools/make_preview_album.py` writes the sample album
"Glass Garden" by "Hariiro Ensemble" (16 silent MP3s, invented titles, a drawn cover embedded
in the ID3 tags); the first version with a commercial album was replaced at the owner's request.

## Tests

- `tests/test_round25_installer.mjs`: component list and licences; ZIP with fake components
  (layout, DLLs + licences, ≥ 2 screenshots, skin only under `Hariiro/`); ZIP without
  components; a missing component DLL fails and writes no ZIP; the installer deletes nothing,
  touches no configuration, keeps installed components, backs up the skin.
- `npm test`: all files pass.
