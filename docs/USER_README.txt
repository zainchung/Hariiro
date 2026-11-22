Hariiro — version 1.1.0 (Round 24, 2026-11-22)

A transparent "glass" skin for foobar2000.

License: MIT License (see LICENSE in this package). Copyright (c) 2026 zainchung.
Covers the scripts, layout and all bundled images, including the wallpapers.

Requirements
- foobar2000 v2, 64-bit (tested with 2.26.3), standard or portable install:
  https://www.foobar2000.org/ (not included: its licence allows sharing only the
  unmodified installer)
- Panels UI (reborn) 1.27.1 and JS Panel (foo_js_panel) 1.9.2: included in
  components\ (MIT, see THIRD-PARTY-NOTICES.txt); the installer adds them
- Optional: ESLyric (x64) for downloading lyrics and the desktop lyrics overlay

What is in this ZIP
- Hariiro\                 the skin folder
- Install-Hariiro.cmd      the installer (Install-Hariiro.ps1 does the work)
- components\              Panels UI (reborn) and JS Panel, with their licences
- preview\                 screenshots

Install
1. Install foobar2000 and start it once. (Back up your profile first if you
   already use foobar2000, especially the playlists-v2.0 folder.)
2. Extract the whole ZIP to any folder and double-click Install-Hariiro.cmd.
   It finds foobar2000, asks before closing it, adds Panels UI (reborn) and
   JS Panel if foobar2000 does not have them yet (installed ones are kept),
   copies Hariiro\ to <profile>\foo_ui_panels-skins\Hariiro (an existing
   Hariiro folder is first copied to Hariiro.backup-<time>) and starts
   foobar2000. It changes no foobar2000 settings and no playlists.
   foobar2000 in an unusual folder: start it before running the installer, or
   run: powershell -ExecutionPolicy Bypass -File Install-Hariiro.ps1 -FoobarDir "<folder>"
3. First start after adding the components, two clicks:
   a. "New user interface module(s) found": choose "Panels UI (reborn)", OK.
   b. Panels UI opens its own layout wizard. Use the menu
      View > Panels UI > Skins (last entry) > Hariiro. foobar2000 keeps it.
   Hariiro starts in GLASS mode; the GLASS / NATIVE switch is above the middle list.

Manual install (without the installer): install the two components (copy
components\<name>\<name>.dll to <profile>\user-components-x64\<name>\, or use the
official .fb2k-component files), copy the Hariiro folder into
<profile>\foo_ui_panels-skins\, then step 3. <profile> is the "profile" folder
next to foobar2000.exe for a portable install, else %APPDATA%\foobar2000-v2.

Rollback: delete <profile>\foo_ui_panels-skins\Hariiro and rename
Hariiro.backup-<time> back to Hariiro (and restore the profile backup, if needed).

Features
- Glass playlist with album art and reflections; Artist / Library / Playlist sidebar.
- Playback Queue panel; Undo for deleted playlists, removed tracks and Queue entries
  (notice button for 8 seconds, Ctrl+Z in the sidebar, middle list or Queue).
- Sidebar: Ctrl + click / Shift + click select several playlists; Delete removes them.
- Lyrics from files saved by ESLyric or from tags; right-click the lyrics to move
  them 0.5 s earlier or later for the current track.
- Menu ☰ → Accent colour: every folder in images\controls, by folder name (six
  bundled). Copy a folder, change its pictures and theme.json, and it appears.
- Menu ☰ → Wallpaper: every .jpg / .png / .bmp file in images\wallpapers in the
  skin folder, listed by file name (two Hariiro_UI pictures are bundled). Delete a file
  and it leaves the menu; if it was in use, another one is chosen.
- Languages: English, Español, Português, 简体中文, 繁體中文, 日本語, Français,
  Deutsch, Русский (menu ☰ → Skin language; "Auto" follows Windows).

Known limits
- ESLyric's own panel cannot be embedded; the skin shows lyrics ESLyric has
  saved (or lyrics in tags). Online search stays in ESLyric.
- In NATIVE mode the middle list follows foobar2000's own rules, not the Glass ones.
- Not yet tested on Windows: 125 % / 150 % display scaling and moving the window
  between monitors with different scaling, Japanese IME pre-edit text in the
  search box.

Updating from 1.0.0
- Run Install-Hariiro.cmd (or copy the Hariiro folder over your skin folder with
  foobar2000 closed). Settings, playlists and the skin's own lists are kept.
- If your Hariiro skin lives in another folder than <profile>\foo_ui_panels-skins,
  choose the new one once in View > Panels UI > Skins.
- If you moved the foobar2000 folder, Panels UI shows its welcome page once:
  choose the skin folder (foo_ui_panels-skins\Hariiro) again.

Updating from a test build
- 1.0.0 is the first release under the name Hariiro. Settings, window
  properties and the skin's own playlists of earlier test builds (which used
  another name) are not carried over: the skin starts with its defaults and
  creates its own playlists "Favorites", "Queue Buffer", "Search Results",
  "Sorted Library View", "Artist View" and "Import Staging". A playlist of yours
  with one of these names is used by the skin as that list.
- The old playlists of a test build stay in foobar2000 as normal playlists.
  To keep your favourites, copy the tracks of the old Favorites playlist into
  "Favorites", then delete the old playlists you no longer need.
- Install into a new, empty skin folder (for example foo_ui_panels-skins\Hariiro)
  and choose it in Panels UI, rather than over a test build.

What is new in 1.1.0
- Installer: Install-Hariiro.cmd sets up Panels UI (reborn), JS Panel and the
  skin in one step; screenshots in preview\.
- Files dragged from File Explorer onto the Queue are queued while Music Library
  is selected too (they were dropped before).
- Sidebar: Ctrl + click / Shift + click select several playlists; Delete removes
  them, with one Undo for all.
- Ctrl+Z undoes the last removal of playlists, tracks or Queue entries, with the
  focus in the sidebar, the middle list or the Queue. The middle list now shows
  an Undo notice after removing tracks, too.

What is new in 1.0.0 (Rounds 20-23)
- New name: Hariiro. Second bundled wallpaper now 2560 x 1440.
- New installs start in GLASS mode.
- Two new bundled wallpapers; every image in images\wallpapers is listed by name.
- Accent colours are folders in images\controls; corners, frames, buttons and
  now-playing texts all follow the chosen colour, in GLASS and NATIVE mode.
- Five more languages: Español, Português, Français, Deutsch, Русский.
- Much lower CPU and memory while music plays; moving the window hitches less.
- Smoother power button in the title bar.
