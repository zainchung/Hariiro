# Round 16 review — numbered scratch views were never cleaned up (2026-11-20)

## Symptom

Found during the Windows smoke test of Phase D1 step 2 (`HariiroScratchViews`, see the end of
`docs/ROUND15_REVIEW.md`): with the Artist view playing, opening another artist creates
`Artist View #2`. After switching to Music Library (which runs the cleanup) `#2`
was neither active nor playing nor queued, but it stayed — also in the state foobar2000
saved on exit. The copy was reused for the next view that needed a slot, so it did not
pile up, but it stayed in the playlist list.

## Cause

Two older rules met:

- Round 13: every populated working view gets an `AddItems` lock
  (`plman.SetPlaylistLockedActions(dest,['AddItems'])` in `loadSortedView`), so native OLE
  drops cannot add files to it.
- Round 11: the cleanup (`pruneScratchViews`, now `HariiroScratchViews.prune`) skipped every
  list for which `plman.IsPlaylistLocked` is true.

So the cleanup could never remove a view the skin had populated. The offline tests did not
catch it because their hosts never locked the views.

## Fix

`js/hariiro_scratch_views.js`, `prune()`: a registered, unreferenced numbered copy that is
locked is first unlocked with `SetPlaylistLockedActions(idx,[])`. foo_js_panel 1.9.0 throws
"playlist %d is locked by another component" for a lock it does not own (checked in the
installed `foo_js_panel.dll`), so a foreign lock still keeps the list — the same rule
`claim()` already used. If the host then refuses `RemovePlaylist`, the `AddItems` lock is
put back.

Unchanged: unregistered lists (the user's), and the active, playing and queued lists are
never removed; the unnumbered base views are kept.

## Tests

- `tests/test_round16_scratch.mjs` (new; failed before the fix): the Windows sequence with a
  host whose locks have an owner; active / playing / foreign-locked copies kept; the lock is
  restored when removal fails.
- `tests/test_scratch_views.mjs`: the "locked list kept" case now uses a foreign lock.
- `npm test`: 20/20.

## Windows check (foobar2000 2.26.2, foo_js_panel 1.9.0, same day)

Same sequence as the smoke test: Artist view playing, another artist opened → `Hariiro -
Artist View #2` created; switched to the Playlists tab and opened Music Library (runs the
cleanup) → `#2` removed, the playing `Artist View` kept, no script errors.
Playlists restored from a backup afterwards.

Not checked on Windows: a view locked by another component (no such component installed;
covered offline, and the foreign-lock error text was checked in the DLL).
