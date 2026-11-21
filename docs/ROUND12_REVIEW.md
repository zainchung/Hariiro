# Hariiro — Round 12 (2026-11-20)

## Changes

1. **Sidebar safe drag:** Vertically dragging/ordering a saved playlist or dragging on a row label never begins `fb.DoDragDrop`. Deliberate **Queue drag** starts from the music-note/grip on the **left edge of the row**, moved horizontally toward the **right edge of the sidebar while staying on the same row**. This works in Playlist mode, and also in Artist mode, so an artist's tracks can still be added to Queue. Music Library cannot be accidentally OLE-exported merely by vertical row movement. The source marker rejects its own sidebar and middle panel.
2. **Glass safe drag:** Dragging inside the same middle panel cannot initiate OLE. Moving a selected track deliberately across the **left or right panel edge** initiates a cross-panel drag, while an internal drag remains local. The OLE receive callback rejects all `glass:` / `sidebar:` sources (including after changing the selected playlist).
3. **Queue UI:** The old `+ ADD SELECTED` button is now `Clear playback queue` and calls `plman.FlushPlaybackQueue()` only when explicitly activated. Queue reordering still temporarily rebuilds the original queue order by the native queue API. The `+ selected` handler and unused translation entries were removed.
4. **Queue playback:** Hariiro relies on foobar2000's *native* Playback Queue. To keep it on manual track change, disable **Preferences → Advanced → Playback → Flush playback queue on manual track change** (foobar2000 default is enabled). This must be configured by the user in foobar2000; JS Panel does not expose that Advanced option. A nonempty native queue plays before the ordinary playback mode; normal mode resumes once it is empty. No third-party queue scheduler was installed.
5. **Title bar:** A transparent, narrow `CaptionStrip` JS Panel covers only the empty header span between navigation and search. Double-click toggles window maximization/restoration via `UIWizard.ToggleMaximize()`. Search field, hamburger menu and window buttons keep their own hit areas.
6. **Lyric language:** Added translated empty/no-current-track/no-local/no-tag/read-error messages and drag-release hint for zh-CN, zh-TW, Japanese and English. Language changes reload the message. ESLyric's own native popup remains outside the skin's localization.
7. **Safe cleanup:** Removed dead `addSelectedToQueue` logic and unused translations, obsolete `frame_*.png` and `hariiro_corner.png` ornaments, and the unused heavyweight `wallpaper_concept_master.png` reference from the shipping skin. Kept all actual corner images, wallpapers, control PNGs, four hue variants, localization scripts and design regeneration tool.

## Validation

- `node --check js/*.js`: all active JavaScript files pass syntax.
- `node tests/test_round3.mjs` … `node tests/test_round12.mjs`, plus `tests/test_vnext.mjs`: 11 test suites passed locally, including simulated sidebar→Queue OLE, Artist grip drag, zero OLE for internal row movement, Glass same-source drop guard, explicit queue flush, caption double click and lyric warning localization.
- ZIP integrity (`zipfile.testzip()`) passed.

## Windows acceptance / risks

- **Before testing**: back up user playlists and current skin. Do not delete foobar2000 `playlists-v2.0` files.
- Confirm no `Processing Files` window from vertical sidebar reorders, and no added duplicates from normal center-panel dragging. Intentional outward Queue drags must begin from the dedicated grip/edge rather than an arbitrary row swipe.
- Check Artist drag-from-grip to Queue, Glass drag-to-Queue, exact empty-header double-click region, and four lyric-language error states.
- The Panels UI host may add tracks when an OLE drop lands in a non-registered window area. Starting OLE only for deliberate outward gestures greatly reduces accidental insertion, but **Windows host integration remains the final acceptance gate**.
