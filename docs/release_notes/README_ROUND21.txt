Hariiro — Round 21 (2026-11-21)

- Wallpapers: every image in images\wallpapers is listed by its file name,
  including the bundled one (now "Hariiro"). Delete a file and it leaves the menu;
  if it was in use, another wallpaper is chosen automatically.
- Much lower CPU while music plays (about a fifth of before on the test machine):
  the lyrics card and the seek bar no longer redraw the whole window on every
  animation step.
- Lower memory: album covers in the glass list are kept at the size they are shown.
- Each redraw the player does while music plays is about 3x cheaper (rows,
  icons and frames are drawn once and reused), so moving the window by
  dragging hitches far less.
- New languages: Español, Português, Français, Deutsch, Русский (menu ☰ →
  Skin language). Every language is listed by its own name; "Auto" now also
  sets the few labels drawn by the layout (sidebar and list headers, queue
  title, "Stopped").

See docs/ROUND21_REVIEW.md. Install this whole skin over the previous build.
