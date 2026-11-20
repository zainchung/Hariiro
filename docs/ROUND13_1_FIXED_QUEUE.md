# Anna GLASS V2 — Round 13.1: pinned playlists to Queue (2026-11-20)

This is a narrowly scoped correction to Round 13.

- Music Library exports all media-library handles to Playback Queue when dragged rightwards.
- Anna - Favorites and Anna - Search Result export all their current playlist tracks, when those lists are populated.
- Empty / unavailable fixed lists do not start an OLE drag.
- Fixed lists remain read-only drop targets: no external file import, no centre-to-fixed copy, and no sidebar reordering.
- An OLE drag that returns to the source sidebar or lands over the Glass middle panel must be declined.
- Artist rows, ordinary playlists, footer controls, lyrics, and theme resources are otherwise unchanged.

Verification: all 12 existing Node regression suites, including updated Round 10–13 pinned-source tests, pass locally. This is NOT a Windows live drag-drop acceptance test.
