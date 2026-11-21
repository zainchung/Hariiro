# Hariiro V2 — Round 14: drag & drop rules (2026-11-20)

## Root causes fixed

1. **The middle list judged "can I accept a drop?" from sidebar bookkeeping**
   (`hariiro.sidebar.editable.name`). That value is empty after start-up, after
   switching the Artists/Playlists tab and after the Now Playing jump, so files and
   tracks were rejected even though an ordinary playlist was on screen. The middle
   list now looks at the playlist that is actually active (`activeDropTarget()`).
2. **Ordinary playlist -> middle list was wrongly rejected** (Round 13 matrix). It now
   adds the playlist's tracks to the ordinary list shown in the middle (never to itself).
3. **Drag start was direction-gated.** Middle-list tracks needed a 32px, almost purely
   horizontal pull; a diagonal pull toward a lower sidebar playlist silently did nothing.
   Middle list: any direction after 8px. Artist / pinned sidebar rows (cannot be
   reordered anyway): 14px rightwards. Ordinary sidebar rows keep the reorder-vs-export
   split (34px, slightly gentler angle).
4. Warnings: pinned/Artist rows now show a dedicated "read-only" warning; the zh-TW
   text of `dropEditable` (which held Japanese) was fixed.

## Drag matrix (as implemented)

| Source | Destination | Result |
|---|---|---|
| Sidebar Artist row / pinned list | Middle | Warning, rejected |
| Sidebar Artist row / pinned list / ordinary playlist | Queue | Adds the whole list |
| Sidebar Artist row / pinned list | Sidebar | Rejected |
| Sidebar ordinary playlist | Middle (ordinary list, other than itself) | Adds its tracks |
| Sidebar ordinary playlist | Middle (same list / Artist / pinned) | Warning, rejected |
| Sidebar ordinary playlist | Sidebar | Vertical drag reorders only |
| Middle selection (multi-select) | Ordinary sidebar playlist (other than source) | Adds tracks |
| Middle selection | Artist / pinned sidebar row | Warning, rejected |
| Middle selection | Queue | Adds tracks |
| External files | Ordinary sidebar playlist | Adds tracks |
| External files | Artist / pinned sidebar row | Warning, rejected |
| External files | Blank sidebar space | New ordinary playlist, only if audio arrives |
| External files | Middle showing an ordinary playlist | Adds tracks |
| External files | Middle showing Artist / pinned list | Warning, rejected |

Origin marker format is now `sidebar:<kind>:<index>` (kind = artist, library,
fixedFavorites, fixedSearch, playlist) so the middle list can tell them apart.

## Limits (unchanged from Round 13)

- Rules for the MIDDLE window are enforced by the GLASS playlist. In NATIVE mode the
  middle is the built-in Single Column Playlist and the host decides what it accepts.
- Not verified on Windows: only the offline OLE model (tests/test_round14_dnd.mjs) ran.
- Back up `playlists-v2.0` before testing.
