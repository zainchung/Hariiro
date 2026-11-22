Hariiro — version 1.1.0 (Round 24, 2026-11-22)

A transparent "glass" skin for foobar2000.

License: MIT License (see LICENSE in this package). Copyright (c) 2026 zainchung.
Covers the scripts, layout and all bundled images, including the wallpapers.

Requirements
- foobar2000 v2 (tested with 2.26.3)
- Panels UI (reborn)
- foo_js_panel (tested with 1.9.2)
- Optional: ESLyric (x64) for downloading lyrics and the desktop lyrics overlay

Install
1. Back up your foobar2000 profile (especially the playlists-v2.0 folder) and your
   current skin folder.
2. Close foobar2000 and extract this whole ZIP over the skin folder.
3. Start foobar2000. New installs start in GLASS mode; an existing install keeps
   its mode. The GLASS / NATIVE switch is above the middle list.

Rollback: restore the backed-up skin folder (and profile, if needed).

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
- Close foobar2000 and extract the ZIP over your Hariiro skin folder. Settings,
  playlists and the skin's own lists are kept.
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
