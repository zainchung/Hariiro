# Hariiro — Round 15 review (2026-11-20)

## Bug (found in the Windows smoke test of `b466b2c`)

Drops onto the sidebar or the middle list did not do what the on-screen hint said:

| Drag | Hint shown | Actual result |
|---|---|---|
| Middle track → sidebar ordinary playlist | "拖入：Default Playlist" | Track appended to the playlist **open in the middle list** (e.g. Hariiro - Favorites) |
| Sidebar pinned list (Favorites) → middle list | read-only warning | All of Favorites appended to the open playlist anyway |
| Middle track → sidebar ordinary playlist, middle showing an ordinary list | "拖入：…" | Nothing visible: the track went into the open list and the Round 13.2 dedup removed it again |

Not a regression of `b466b2c`: the Round 14 scripts (`aeeac4c`) behave the same, and
foo_js_panel 1.9.0 was already in use before Round 14 acceptance.

## Root cause

Diagnostic wrappers around every drag callback (deployed skin only) showed, for both
synthetic and the owner's own mouse drags:

```
[SIDEBAR] on_drag_over  OUT eff=1        <- pointer over "Default Playlist", accepted
[SIDEBAR] on_drag_leave                  <- at release: leave, NOT on_drag_drop
[SIDEBAR] items_added p=<active> ...     <- ~100 ms later, host inserts into the ACTIVE playlist
```

Since Round 13, `Playlists`, `GlassPlaylist` and `HariiroQueue` were `windowless = 1`.
Windowless panels have no OLE drop target of their own; Panels UI routes drag events to
them by hit-testing. At release it routes the drop away from the panel under the pointer,
sends `on_drag_leave`, and its root drop target falls back to foobar2000's default:
insert into the active playlist. (Round 13 already noted this fallback "when no
windowless JS Panel occupies the drop point"; here it also happens when one does.)
Queue drops only worked because the host happened to deliver `on_drag_enter` and
`on_drag_drop` together at release. Scripts cannot fix the routing.

With `windowless = 0` the panels are real child windows; foo_js_panel registers an OLE
drop target per window and the sidebar received a real `on_drag_drop` (verified).

## Fix

1. `foo_ui_panels.ini`: `Playlists`, `GlassPlaylist`, `HariiroQueue` → `windowless = 0`.
2. Child windows get **physical pixels** (at 200 % DPI the sidebar is 392 px wide for a
   196 px layout box) and drew at half size. JS Panel's `window.DPI` is a fixed 96 shim,
   so new `js/hariiro_dpi.js` (`HariiroDpi`) derives the scale from
   `window.Width / panelsui.GetPanelRect().Width` (1 for windowless panels and tests):
   - `on_paint` receives a `gr` proxy that multiplies coordinates, sizes and pen widths,
     scales polygon points, keeps image *source* rectangles, uses scaled real fonts, and
     returns `CalcTextWidth` / `MeasureString` / `EstimateLineWrap` in layout units.
   - `HariiroDpi.font()` replaces `gdi.Font()`; real fonts are created per scale on first use.
   - Mouse and drag callbacks get `x, y` divided by the scale. Script-to-script forwarding
     (`on_drag_enter → on_drag_over`, `on_mouse_lbtn_up → on_mouse_rbtn_up`) is not
     converted twice; host modal loops (`HariiroDpi.doDragDrop`, `HariiroDpi.popup`) clear that
     guard, because the host calls `on_paint` / `on_drag_*` of the same panel from inside
     `fb.DoDragDrop` with physical pixels. (A first build crashed there with
     "argument 2 is not a gdi.Font".)
   - `HariiroDpi.width()/height()` replace `window.Width/Height`; `HariiroDpi.install()` is the
     last statement of each of the three scripts.
3. Sidebar row names get 6 more layout px (`w-80`): real 24 px GDI text is a few percent
   wider than the host's scaled 12 px text, which had truncated "Hariiro - Search Result".
4. The two panels that were child windows already — `GlassSearch` (search box) and
   `NativeScroll` (NATIVE-mode scroll strip) — drew at half size too and now use `HariiroDpi`
   as well (`HariiroDpi.repaintRect` for the caret blink, `HariiroDpi.textWidth` for click-to-caret).

## External files (File Explorer) — second bug

Child windows fixed drags that start inside foobar2000, but files dragged from another
program still landed in the active playlist — in **both** window modes, so this was already
broken in Round 14. Owner's own Explorer drag and a test drag source behaved identically:

```
[SIDEBAR] on_drag_enter OUT eff=1
[SIDEBAR] on_drag_leave lbutton=false     <- release, but no on_drag_drop
[SIDEBAR] items_added p=<active> count+1 selected=[last]
```

foo_js_panel's own drop target has no such fallback (it inserts only when `on_drag_drop`
sets `action.Playlist >= 0`), so another window — foobar2000's main window — takes the
external drop and appends the files to the **active** playlist, selecting exactly them.

Fix: `js/hariiro_drop_fix.js` (`HariiroDropFix`), installed in the sidebar, middle list and Queue
right before `HariiroDpi.install()`:

- remembers the last pointer position of an **external** drag (no origin marker);
- on `on_drag_leave` with the left button already **up** (`utils.IsKeyPressed(VK_LBUTTON)`:
  `true` when the pointer merely leaves a panel, `false` at release), asks the panel's
  `externalDropPlan(x, y)` what its `on_drag_drop` would have done and stores it with the
  active playlist's name and count in `hariiro.drop.pending` (expires after 15 s);
- in the first `on_playlist_items_added` for that playlist, takes the entries past the old
  count **that are selected** (what the host just dropped), removes them, and then inserts
  them into the target (activating it like a sidebar drop), queues them, or — for a
  rejected drop — leaves them removed. Normal import handling (dedup, staging, post-import
  sort) then runs on the target as for any drop.

| Panel | Plan |
|---|---|
| Sidebar ordinary row | that playlist (activated) |
| Sidebar blank space | import staging → new ordinary playlist only if audio arrives |
| Sidebar pinned row / Artist tab | reject |
| Middle showing an ordinary list | keep (already in the right list) |
| Middle showing pinned / Artist list | reject + warning |
| Queue | playback queue |

Limits: if the active playlist is locked, the host does not insert anything, so nothing can
be redirected. A drop on a gap that is not a panel keeps the host's default (active playlist).

## Tests

- New `tests/test_round15_dpi.mjs`: ini routing, no raw `window.Width/Height`,
  `gdi.Font`, `TrackPopupMenu` or `fb.DoDragDrop` left in the three panels; adapter
  scaling of every used `gr` call, fonts, measurements, popups; callback conversion
  without double scaling; host-nested `on_paint` / `on_drag_*` during `DoDragDrop`; the
  real sidebar as a 200 % child window drops onto the row under the physical pointer.
  Also: every `windowless = 0` panel must use `HariiroDpi`; 125 % / 150 % scales; a DPI change
  between paints (moving to another monitor) re-creates fonts; the search box at 200 %.
- New `tests/test_round15_external.mjs`: real sidebar / middle / Queue scripts in one fake
  host; external drop on an ordinary row, pinned row, blank space, middle (ordinary and
  pinned), Queue; plus leave-with-button-held, internal origin, 15 s expiry and unselected
  additions are left alone.
- Updated: `test_round13` (now expects `windowless = 0`), `test_round3` (extracted
  functions get an `HariiroDpi` stub), `test_round5` (include shim knows `hariiro_dpi.js`),
  `test_vnext` (`HariiroDpi.doDragDrop`).
- `npm test`: 17/17 files pass.

## Windows check (2026-11-20, 200 % DPI, foo_js_panel 1.9.0)

| Drag | Result |
|---|---|
| Middle track → sidebar Default Playlist | ✅ 13 → 14, list becomes active, no script error |
| Sidebar Favorites (pinned) → middle list | ✅ warning, nothing added |
| Middle track → Queue | ✅ QUEUE · 1 |
| Sidebar Default Playlist → Queue | ✅ +14 |
| Right-click menus (middle, sidebar) | ✅ open at the pointer |
| Layout | ✅ same size as before; "Hariiro - Search Result" no longer truncated |
| Search box at 200 % | ✅ magnifier and placeholder at full size |
| Layout at 2560×1440 / 100 % (display changed during testing) | ✅ panels match the host-drawn frames |

External files, with a DPI-aware test drag source (`DragSource.exe`, CF_HDROP copy like
Explorer; File Explorer itself could not be driven), logged per drop:

| Drop | Result |
|---|---|
| File → sidebar "123" row, middle showing Default | ✅ host put it in Default (17); moved to 123 (110 → 111), 123 activated, Default back to 16 |
| File → Queue | ✅ QUEUE · 1, active list unchanged |
| File → middle showing Favorites | ✅ host put it in Favorites (25); removed again (24) |
| File → blank sidebar space | ✅ staged, new playlist "导入的曲目" created and activated |
| File → middle showing Default | ✅ stays in Default (16 → 17), sorted |

All test playlist changes were restored from a backup of `playlists-v2.0` afterwards.

Artist tab, checked later the same day (with the Phase D1/D2 build, see below):

| Drag | Result |
|---|---|
| Artist row → Queue | ✅ the artist's tracks queued (QUEUE · 2) |
| Artist row → middle list | ✅ warning, nothing added |
| External file → Artist row | ✅ rejected, taken back out of the active list |
| Middle track → Artist row | ✅ rejected, nothing changed |

Not checked on Windows: 125 % / 150 % and moving between monitors (covered offline only —
changing the Windows display scale is not done by the agent).

## Phase D smoke test (2026-11-20, after `5caabca`)

D3 test shim, D2 `HariiroShared.PVAR` keys and D1 step 1 (`HariiroGlassDrop`) on Windows:
skin loads with no script errors; QUEUE/lyrics toggle, GLASS/NATIVE switch and accent
colour (Sky blue and back to Rose, all panels recolour and the menu tick follows) work;
middle → sidebar drop, pinned → middle rejection and an external file onto the middle list
behave as in Round 15. Playlists were restored from a backup afterwards.

D1 step 2 (`HariiroScratchViews`, same day): skin loads with no script errors. Music Library
and an artist reuse the registered `Hariiro - Sorted Library View` / `Hariiro - Artist View`
(no new lists). Opening another artist while the Artist view is playing creates
`Hariiro - Artist View #2` and leaves the playing list untouched. Playlists restored afterwards.

Seen, not changed (same before the move): `#2` is not removed by the cleanup once it is
no longer active or playing, because the sidebar locks every populated view (`AddItems`,
Round 13) and the cleanup skips locked lists (Round 11). The copy is reused by the next
view that needs a free slot, so it does not pile up, but it stays in the playlist list.
Fixed in Round 16 (`docs/ROUND16_REVIEW.md`).

## Known limits

- Text is rendered by GDI at the real size instead of being scaled by the host, so widths
  can differ by a few percent from Round 14.
- External drops while the active playlist is locked cannot be redirected (see above).
