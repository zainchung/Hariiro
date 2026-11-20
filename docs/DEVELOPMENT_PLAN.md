# Anna Glass V2 — Development Plan (from 2026-11-20, after Round 14)

## 1. Repository status

| Item | State |
|---|---|
| `main` | Round 14 skin source, tests (`tests/*.mjs`, 14 files, all passing), images, docs. No CI, no `.github/`. |
| `feature/anna-ui-reference-refresh` (PR #1, Draft) | Same runtime source as `main`, plus extra files `main` lacks (`tools/package_ui_preview.py`, `docs/ROUND2_REVIEW.md`, `UI_REFINEMENT_*.md`, `WINDOWS_UI_ACCEPTANCE.md`). 184 commits and it has diverged from `main`. |
| `experiment/16x9-freeze` | Independent 16:9 DLL experiment (C++ plugin, geometry tests, CI). Not part of the skin. |
| Windows acceptance | **Verified by the owner through Round 14** (2026-11-20). Offline tests model OLE/IME/GDI but cannot prove them, so every future round still needs a Windows pass. |

## 2. Problems found

1. **Two sources of truth.** `main` and PR #1 carry the same skin but different tooling/docs; PR #1 is a 184-commit Draft that can no longer be merged cleanly as is.
2. **Broken/legacy test.** `tools/test_ui_reference.mjs` (PR branch only) reads `js/anna_now_cover.js`, which no longer exists. The 14 `tests/` files are the real suite, but there is no single runner and no CI.
3. **No packaging on `main`.** `tools/package_ui_preview.py` only exists on the PR branch, and it lists the old 11-file set, not the current 18 JS files + images.
4. **Per-round README/doc sprawl.** `README_ROUND12/13/13_2/14.txt` plus 14 review docs; no single current README describing install, structure and acceptance.
5. **Large files.** `playlist_browser.js` (936 lines) and `anna_glass_playlist.js` (630) hold drag/drop, sorting, folders and import logic together; each round has needed edits to both.
6. **Known limits** (from reviews): NATIVE middle list rules are decided by the host; true ESLyric embedding is unsupported by the Panels UI host; IME pre-edit not guaranteed; `fb.DoDragDrop` / `UIHacks.SetPseudoCaption` untested on Windows.

## 3. Plan

### Phase A — Housekeeping (DONE 2026-11-20, no behaviour change)
- A1. Decide the integration branch: **`main` is the trunk.** Port the extra PR-only files worth keeping (`WINDOWS_UI_ACCEPTANCE.md`, `UI_REFINEMENT_*.md`, `ROUND2_REVIEW.md`); close PR #1 or retarget it into a small docs-only PR. Do not merge the 184-commit history.
- A2. Add `tools/run_tests.mjs` (runs every `tests/*.mjs`, prints a summary, non-zero on failure) and a `package.json` `npm test` script.
- A3. Add GitHub Actions `test.yml` (Node 22, `npm test`) so `main` is checked on every push. Keep it cheap (the 16:9 branch already trimmed Actions minutes).
- A4. Delete or fix `tools/test_ui_reference.mjs`; rewrite `tools/package_ui_preview.py` to build the current skin ZIP (all `js/`, `main.txt`, `foo_ui_panels.ini`, `images/`, README) and verify the file list.
- A5. Replace per-round READMEs with one `README.md` (install/backup/rollback, folder map, test command, link to latest `ROUNDxx_REVIEW.md`). Keep review docs as history.

### Phase B — Windows acceptance gate (Round 14 passed; repeat for each later round)
Round 14 and earlier are accepted. For later rounds, run `docs/WINDOWS_UI_ACCEPTANCE.md` plus the Round 14 drag matrix on a **backed-up** foobar2000 profile and record pass/fail per row in `docs/ACCEPTANCE_LOG.md`:
- B1. Drag matrix (Round 14 table): sidebar ↔ middle ↔ Queue ↔ external files.
- B2. Queue reorder/remove, search input (incl. Japanese IME), lyrics location modes.
- B3. Title-bar controls (double-click, drag, settings menu), footer toggles, transparency at 960–1920 px and 100/125/150 % DPI.
- B4. Playlist dedup (Round 13.2) on a real library, backing up `playlists-v2.0` first.
Failures become Round 15 bug fixes; nothing new is built on unverified behaviour.

### Phase C — Round 15: fix what Phase B finds
- Triage by severity (data loss > wrong drop result > cosmetic). One bug = one failing offline test first, then the fix.
- Expect the likely weak spots: OLE drop targets over windowless panels, stale origin markers, NATIVE-mode drops, HiDPI geometry.
- **Round 15 (2026-11-20):** confirmed the first weak spot — windowless drop targets were
  misrouted by Panels UI (drops went to the active playlist). Sidebar / middle / Queue are
  child windows again, scaled by `js/anna_dpi.js` (also the search box and scroll strip).
  Files from File Explorer were taken by foobar2000's main window in both modes;
  `js/anna_drop_fix.js` redirects them. See `docs/ROUND15_REVIEW.md`. Still open on Windows:
  Artist-tab drags, 125 % / 150 % DPI and multi-monitor DPI changes (offline-tested only).

### Phase D — Structure and maintainability (in progress)
Done 2026-11-20 (no behaviour change, all tests green):
- `js/anna_shared.js` (`AnnaShared`): panel-variable keys, reserved playlist names,
  origin-marker build/parse/clear. `anna_glass_playlist.js` and `playlist_browser.js`
  use it instead of their own copies.
- `tests/helpers/js_panel.mjs`: generic `include()` shim (Round 7/8 tests no longer list files).
- `tests/test_shared.mjs`: marker format, reserved names, drift guard (no hard-coded
  copies back in those two panels), and a load test of every `js/*.js` in a fake host.
- PR #1 closed; `main` is the only trunk.

Done after Round 15 (no behaviour change, all tests green; Windows smoke test pending):
- D1 step 1: the middle list's drop decision moved to `js/anna_glass_drop.js` (`AnnaGlassDrop`);
  `anna_glass_playlist.js` keeps only its own-drag state and a one-line `evaluateDrop()`.
  `tests/test_glass_drop.mjs` covers the source/target/decision matrix directly.
- D2 keys: every panel-variable key is defined once in `AnnaShared.PVAR`; all panels use it
  (`anna_theme.js`/`anna_i18n.js` own theirs and are checked to match). Drift guard covers all scripts.
- D3 step: the Round 3-6 and vNext suites use the shared `installIncludeShim` instead of their own
  hard-coded include lists.

Remaining:
- D1. Split `playlist_browser.js` (sidebar drag/drop, import + dedup bookkeeping, scratch views).
  Larger move: one module per round, each followed by a Windows smoke test.
- D2 (rest). Colour constants into `anna_theme.js`.
- D3 (rest). Grow `tests/helpers/` into a reusable fake host (plman/fb/window) and migrate the
  per-test mocks to it gradually.

### Phase E — Feature backlog (only after B/C are green)
- E1. Lyrics: more ESLyric file-name patterns, per-track offset, better plain-LRC progress.
- E2. Playlist: undo for destructive operations (delete playlist, clear Queue).
- E3. Theming: additional accent sets beyond pink/blue/teal/violet; wallpaper selector.
- E4. NATIVE mode parity: document exactly which Glass rules the host decides; consider a Glass-only default.
- E5. 16:9: decide whether `experiment/16x9-freeze` becomes a documented optional add-on (its own CI/release) or stays frozen.

## 4. Working rules
- Every round: failing test first, `npm test` green, review doc `docs/ROUNDnn_REVIEW.md`, short release note, ZIP via `package_ui_preview.py`.
- Never ship without stating what is *not* verified on Windows.
- Back up `playlists-v2.0` and the skin folder before any acceptance run.
- Commit images and docs normally (`.gitignore` only excludes ZIPs/checksums/OS files).

## 5. Suggested order
A (housekeeping) → B (Windows acceptance, user) → C (Round 15 fixes) → D (refactor) → E (features).
