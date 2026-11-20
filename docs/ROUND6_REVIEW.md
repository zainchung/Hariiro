# Anna Glass V2 — Round 6 Windows test candidate

Source: `feature/anna-ui-reference-refresh` (Draft PR #1). Test as an isolated skin; **do not replace DLLs or overwrite your working skin**.

## Changes

- **Lyric colour:** `[mm:ss]`-only LRC now uses a visually progressive two-tone *estimated* character transition across each line's time interval. This is not genuine character timing. Enhanced `<mm:ss.xx>` LRC still uses per-syllable tags. Already-finished lyrics remain mauve/pink, current unsung glyphs bright white.
- **Open lyric file:** Guard optional host APIs; try `utils.Run`, else the older JS Panel `WScript.Shell.Run` when available. For embedded tags or invalid locations, show a clear message. No shell command accepts unvalidated quotes or newline in paths.
- **Spectrum:** Align top 14px below the actual embedded cover and extend to y=309. Around 1290px wide the panel becomes ~69px tall instead of 40px; on very wide windows the art cap leaves less spectrum height.
- **Output:** `fb.GetOutputDevices()` JSON fields (`name`, `active`, `output_id`, `device_id`) and `fb.SetOutputDevice()` replace nonexistent `playback`/menu-enumeration APIs. No silent fake device switch. Earphone symbol is now a standalone over-ear outline.
- **±5s:** Curved direction arrows with centre `5` replace the old enclosed full-circle glyph.
- **Footer:** `Desk ON/OFF` and `QUEUE` are both 84×24 round-ended controls, positioned side by side at the top-right of the footer. Both are always visible; opening QUEUE no longer hides DESK. Volume and playback time stay unchanged.
- **Now playing:** The existing 3-bar glyph between track number and title animates gently at a low refresh rate, only for the active playing row in GLASS mode; this is animation, not a new audio visualizer. Classic mode is untouched.

## Playback order: seven real options

| Mode | Glyph design |
| --- | --- |
| Default | One forward arrow |
| Repeat (playlist) | Two circular arrows |
| Repeat (track) | Repeat arrows + 1 |
| Random | Crossing arrows |
| Shuffle (tracks) | Crossing arrows + dot |
| Shuffle (albums) | Crossing arrows + circle |
| Shuffle (folders) | Crossing arrows + folder cue |

First transport button cycles all seven; right-click opens direct choice. The seven-mode enumeration matches `plman.PlaybackOrder` indices 0–6.

## Regression validation and limitations

Run `node tests/test_vnext.mjs` and `node tests/test_round3.mjs` through `node tests/test_round6.mjs`. The environment mock confirms the documented foo_js_panel API and layout/lyric functions; Windows rendering, actual devices and timers still require real-machine acceptance. The supplied user LRC contains only line timestamps, so no exact karaoke progress is claimed. No user media or the supplied LRC is packaged.
