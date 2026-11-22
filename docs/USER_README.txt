Hariiro — version 1.0.0 (2026-11-22)

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

Switching the language
- Click the menu button ☰ (top right, next to the window buttons) > Skin language,
  and pick English, Español, Português, 简体中文, 繁體中文, 日本語, Français, Deutsch
  or Русский. "Follow system (default)" uses the Windows display language.
- The change applies at once to all of Hariiro's labels, notices and menus and is
  kept after a restart.
- Menus that belong to foobar2000, Panels UI or ESLyric (the foobar2000 menu bar,
  the track commands in the middle list's menu, Preferences) keep foobar2000's
  own language.

Using Hariiro
Top bar
- Artists / Playlists: switch the sidebar between artists of the Music Library and
  your playlists. Now playing: jumps to the playing track.
- Search box: type and press Enter to search the Music Library; the results go to
  "Search Result" in the sidebar. Ctrl+A / Ctrl+C / Ctrl+V work in the box;
  right-click for Search now, Paste from clipboard and Clear search.
- ☰: Hariiro settings: show or hide the Windows title bar and the foobar2000 menu
  bar, foobar2000 preferences, foobar2000 main menu, Skin language, Accent colour,
  Wallpaper. Then minimise, maximise and the power button (closes foobar2000).
Sidebar (left)
- Click a row to show it in the middle list. Music Library, Favorites and Search
  Result are pinned at the top; your playlists follow.
- Ctrl + click adds or removes one playlist, Shift + click selects a range (the
  list on screen does not change); Delete removes the selected playlists, or the
  current one. A plain click ends the selection. Playing, locked and queued lists
  are kept.
- Right-click: Create new playlist, Rename, Duplicate, Remove, Import audio folder.
- Drop files or folders from File Explorer on a playlist row to add them there, or
  on the empty space below the rows to make a new playlist.
Middle list (GLASS mode)
- Click selects, Ctrl + click / Shift + click select more, double-click plays.
- The heart on a row adds the track to Favorites or takes it out; "…" (or a
  right-click) opens the menu: Switch to NATIVE playlist, Add selected tracks to
  playback queue, Remove selected tracks from playlist (the files are kept), and
  foobar2000's own track commands.
- Delete removes the selected tracks from the playlist (never the files).
- Drag tracks onto a sidebar playlist or onto the Queue; drop files from File
  Explorer to add them. The mouse wheel scrolls.
- The GLASS / NATIVE switch above the list changes to foobar2000's own list view.
Right side
- The card at the top shows the playing track: cover, title, artist, album.
- Lyrics: the current line is highlighted. Drag the lyrics up or down and release
  (or click a line) to jump there; the wheel scrolls unsynchronised lyrics.
  Right-click: move the lyrics 0.5 s earlier or later for this track, reset the
  offset, reload, open the lyric file's folder, choose where lyrics are read from
  (tags, ESLyric's folder, the track's folder, a folder of your choice) and the
  ESLyric commands.
- QUEUE (bottom right) shows the playback Queue in place of the lyrics. Drag a row
  onto another to reorder it, onto the bin to remove it; the button at the top
  right of the Queue clears it; right-click for Move up / Move down / Remove from
  queue / Clear playback queue. Drop tracks or files on it to queue them.
- Desk (bottom right) turns ESLyric's desktop lyrics on or off (needs ESLyric);
  right-click it to set the ESLyric command.
Bottom bar
- From left to right: playback order (Default, Repeat playlist / track, Random,
  Shuffle tracks / albums), 5 s back, previous, play / pause, next, 5 s forward,
  output device.
- Seek bar and volume: click or drag; the mouse wheel moves 5 s / 2.5 dB.
Undo and keyboard
- Removing playlists, tracks or Queue entries shows an Undo notice for 8 seconds.
- Ctrl+Z undoes the last removal (press again for older ones, up to 20 per panel),
  with the focus in the sidebar,
  the middle list or the Queue - not in the search box.
- Delete: selected playlists (sidebar) or selected tracks (middle list).

Features
- GLASS mode: a transparent playlist grouped by album, with cover art, reflections
  and a heart per track; NATIVE mode switches to foobar2000's own list view.
- Sidebar: Artists (grouped from the Music Library) or Playlists with Music
  Library, Favorites and Search Result pinned on top. Create, rename, duplicate
  and remove playlists, import a folder, select several playlists at once.
- Drag and drop everywhere: tracks to playlists or the Queue, files and folders
  from File Explorer to a playlist, the middle list, the Queue or a new playlist.
  Imported tracks are sorted and duplicates are skipped.
- Library search from the top bar; results go to Search Result.
- Favorites: the heart on a track or on the now-playing card.
- Playback Queue panel: reorder by dragging, remove with the bin, clear, queue
  tracks or files by dropping them.
- Now-playing card with cover, title, artist, album, year, genre and format.
- Lyrics: synchronised or plain, from files saved by ESLyric, the track's folder,
  a folder of your choice or the tags; drag to jump to a line; move them 0.5 s
  earlier or later per track; ESLyric desktop lyrics on / off (Desk).
- Bottom bar: playback order, 5 s back / forward, previous, play / pause, next,
  output device, seek bar and volume.
- Undo for removed playlists, tracks and Queue entries: an 8-second notice and
  Ctrl+Z.
- Menu ☰ → Accent colour: every folder in images\controls, by folder name (six
  bundled: amber, blue, mint, pink, teal, violet). Copy a folder, change its
  pictures and theme.json, and it appears. Corners, frames, buttons and texts
  follow the colour in GLASS and NATIVE mode.
- Menu ☰ → Wallpaper: every .jpg / .png / .bmp file in images\wallpapers in the
  skin folder, listed by file name (two Hariiro_UI pictures are bundled). Delete a
  file and it leaves the menu; if it was in use, another one is chosen.
- Nine languages: English, Español, Português, 简体中文, 繁體中文, 日本語,
  Français, Deutsch, Русский (menu ☰ → Skin language).
- Show or hide the Windows title bar and the foobar2000 menu bar (menu ☰).
- Low CPU and memory use while music plays.
- Installer with Panels UI (reborn) and JS Panel included.

Known limits
- ESLyric's own panel cannot be embedded; the skin shows lyrics ESLyric has
  saved (or lyrics in tags). Online search stays in ESLyric.
- In NATIVE mode the middle list follows foobar2000's own rules, not the Glass ones.
- Not yet tested on Windows: 125 % / 150 % display scaling and moving the window
  between monitors with different scaling, Japanese IME pre-edit text in the
  search box.

Updating
- Run Install-Hariiro.cmd again (or copy the Hariiro folder over your skin folder
  with foobar2000 closed). Settings, playlists and the skin's own lists are kept.
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
