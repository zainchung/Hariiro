# Round 17 review — undo for deleting a playlist and clearing the Queue (Phase E2, 2026-11-21)

## What changed

After **deleting a playlist** from the sidebar (right-click → Remove playlist) or **clearing
the Queue** (the Clear button or the right-click menu), the panel shows a notice at its
bottom edge with an **Undo** button for 8 seconds. A newer action replaces the older one.

- Playlist: recreated at its old position with the same tracks in the same order, then
  shown and selected. If a playlist with that name was created meanwhile, the restored one
  is called `Name (2)`; nothing is overwritten. The restore is not treated as an import, so
  duplicates the list already had are kept.
- Queue: the cleared items come back first; anything queued after clearing stays, after
  them (foobar2000's API can only append to the queue).
- Switching the sidebar to the Artists tab drops the notice.

New module `js/anna_undo.js` (`AnnaUndo.create(repaint)`): one pending action per panel,
notice/button layout, hit test, painting.

## Tests

`tests/test_round17_undo.mjs` (failed before the change): the module (replace, expire, only
once), sidebar delete → click Undo → same place, same tracks, old duplicate kept, name
clash; Queue clear (button and menu) → Undo → old items first. `npm test`: 25/25.

`tests/helpers/fake_host.mjs` gained `gdi`, `utils`, `FlushPlaybackQueue` and
`RemoveItemFromPlaybackQueue`, and overrides now keep getters/setters.

## Windows check

See `docs/PHASE_E_REVIEW.md`.
