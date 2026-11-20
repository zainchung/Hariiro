Anna Glass V2 — Round 16 (2026-11-20)

Fix: extra Artist / Music Library working lists are cleaned up again.
- Opening another artist while the Artist view is playing creates a second
  working list ("Anna - Artist View #2"). Once nothing plays or shows it, the
  skin removes it again. Since Round 13 these copies stayed, because the skin's
  own read-only lock on them also stopped the cleanup.
- Lists locked by another component, and the list that is playing, shown or
  queued, are still never removed. Your own playlists are never touched.

Also in this build (no behaviour change): the working-list bookkeeping moved
from js/playlist_browser.js to js/anna_scratch_views.js (Phase D1).

See docs/ROUND16_REVIEW.md. Back up playlists-v2.0 and the skin folder, then
install this whole skin over Round 15.
