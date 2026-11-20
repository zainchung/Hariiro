Anna Glass V2 — Round 15 (2026-11-20)

Fix: drag & drop now goes where the hint says.
- Tracks dragged inside foobar2000 (middle list, sidebar, Queue): Panels UI
  misrouted drops on windowless panels into the playlist open in the middle
  list, even when the drop was shown as rejected. The sidebar, middle list and
  Queue are real child windows again (windowless = 0).
- Files dragged from File Explorer: foobar2000 itself put them into the open
  playlist. js/anna_drop_fix.js now moves them to the playlist row, new
  playlist (blank sidebar) or Queue you dropped on, or takes them back out for
  a read-only target.

js/anna_dpi.js keeps the child-window panels (including the search box) at
the right size on high-DPI displays.

See docs/ROUND15_REVIEW.md for causes, tests and the Windows check. Back up
playlists-v2.0 and the skin folder, then install this whole skin over Round 14.
