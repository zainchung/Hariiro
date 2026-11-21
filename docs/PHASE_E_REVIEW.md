# Phase E review — Windows check of Rounds 17–19 (2026-11-21)

foobar2000 2.26.2, foo_js_panel 1.9.0, Panels UI (reborn). Skin deployed with
`tools/fb_test.ps1 deploy -Images`; playlists backed up first.

| Round | Check | Result |
|---|---|---|
| 19 | ☰ → Wallpaper lists *Default (Anna)* and a test image put in the installed skin's `images\wallpapers\` | ✅ — `utils.Glob` found the skin folder |
| 19 | Choosing the test image | ✅ background changed at once (`$getpvar` inside the `main.txt` image path works) |
| 19 | Grey hint in the Wallpaper submenu | ❌ showed "imageswallpapers" (backslash lost) → fixed in the dictionary, test added |
| 19 | ☰ → Accent colour lists Amber and Mint; Amber | ✅ tabs, QUEUE pill, Clear button and footer controls turn amber; `main.txt` blossom shapes stay pink as before |
| 17 | Sidebar: Remove "Default Playlist" → notice → Undo | ✅ back in place with its 12 tracks, shown and selected |
| 17 | Queue: one track queued → Clear → notice "Cleared playback queue: 1" → Undo | ✅ QUEUE · 1 again |
| 18 | Lyrics menu without timed lyrics | ✅ offset items greyed out |
| 18 | Saved lyrics next to a track (track-folder mode) | ❌ "no local lyrics": portable foobar2000 gives `file-relative://..\…` paths, which the panel took for a stream (an old bug, not from Round 18) → fixed, test added |
| 18 | After the fix, with a temporary test LRC | ✅ found and shown |
| 18 | Lyrics earlier ×2 → label, then Reset | ✅ "偏移 +1.0 s" at the top right, the menu shows the value, reset removes it |
| 18 | More file names, progress before a gap | offline only |
| E4 | NATIVE behaviours in `docs/NATIVE_VS_GLASS.md` marked "expected" | not re-tested |

Temporary test files (two `.lrc` next to tracks, a test wallpaper in the installed skin) were
removed afterwards, and the playlists were restored from the backup.

Not checked on Windows: Mint (same mechanism as Amber), a wallpaper with a different aspect
ratio, the 8-second expiry of the undo notice (offline only).
