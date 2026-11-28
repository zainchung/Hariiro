# Hariiro — Development Plan (from 2026-11-20, after Round 14)

## 1. Repository status

| Item | State |
|---|---|
| `main` | Round 14 skin source, tests (`tests/*.mjs`, 14 files, all passing), images, docs. No CI, no `.github/`. |
| `feature/hariiro-ui-reference-refresh` (PR #1, Draft) | Same runtime source as `main`, plus extra files `main` lacks (`tools/package_ui_preview.py`, `docs/ROUND2_REVIEW.md`, `UI_REFINEMENT_*.md`, `WINDOWS_UI_ACCEPTANCE.md`). 184 commits and it has diverged from `main`. |
| `experiment/16x9-freeze` | Independent 16:9 DLL experiment (C++ plugin, geometry tests, CI). Not part of the skin. |
| Windows acceptance | **Verified by the owner through Round 14** (2026-11-20). Offline tests model OLE/IME/GDI but cannot prove them, so every future round still needs a Windows pass. |

## 2. Problems found

1. **Two sources of truth.** `main` and PR #1 carry the same skin but different tooling/docs; PR #1 is a 184-commit Draft that can no longer be merged cleanly as is.
2. **Broken/legacy test.** `tools/test_ui_reference.mjs` (PR branch only) reads `js/hariiro_now_cover.js`, which no longer exists. The 14 `tests/` files are the real suite, but there is no single runner and no CI.
3. **No packaging on `main`.** `tools/package_ui_preview.py` only exists on the PR branch, and it lists the old 11-file set, not the current 18 JS files + images.
4. **Per-round README/doc sprawl.** `README_ROUND12/13/13_2/14.txt` plus 14 review docs; no single current README describing install, structure and acceptance.
5. **Large files.** `playlist_browser.js` (936 lines) and `hariiro_glass_playlist.js` (630) hold drag/drop, sorting, folders and import logic together; each round has needed edits to both.
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
  child windows again, scaled by `js/hariiro_dpi.js` (also the search box and scroll strip).
  Files from File Explorer were taken by foobar2000's main window in both modes;
  `js/hariiro_drop_fix.js` redirects them. See `docs/ROUND15_REVIEW.md`. Still open on Windows:
  Artist-tab drags, 125 % / 150 % DPI and multi-monitor DPI changes (offline-tested only).

### Phase D — Structure and maintainability (done 2026-11-20)
Done 2026-11-20 (no behaviour change, all tests green):
- `js/hariiro_shared.js` (`HariiroShared`): panel-variable keys, reserved playlist names,
  origin-marker build/parse/clear. `hariiro_glass_playlist.js` and `playlist_browser.js`
  use it instead of their own copies.
- `tests/helpers/js_panel.mjs`: generic `include()` shim (Round 7/8 tests no longer list files).
- `tests/test_shared.mjs`: marker format, reserved names, drift guard (no hard-coded
  copies back in those two panels), and a load test of every `js/*.js` in a fake host.
- PR #1 closed; `main` is the only trunk.

Done after Round 15 (no behaviour change, all tests green; Windows smoke test passed):
- D1 step 1: the middle list's drop decision moved to `js/hariiro_glass_drop.js` (`HariiroGlassDrop`);
  `hariiro_glass_playlist.js` keeps only its own-drag state and a one-line `evaluateDrop()`.
  `tests/test_glass_drop.mjs` covers the source/target/decision matrix directly.
- D2 keys: every panel-variable key is defined once in `HariiroShared.PVAR`; all panels use it
  (`hariiro_theme.js`/`hariiro_i18n.js` own theirs and are checked to match). Drift guard covers all scripts.
- D3 step: the Round 3-6 and vNext suites use the shared `installIncludeShim` instead of their own
  hard-coded include lists.

Done 2026-11-20, D1 step 2 (no behaviour change, all tests green; Windows smoke test passed,
see the end of `docs/ROUND15_REVIEW.md` — it also notes an older cleanup gap for Round 16):
- The sidebar's scratch-view registry (sorted / Artist working playlists: ownership property,
  slot claiming, cleanup of unreferenced numbered copies) moved to `js/hariiro_scratch_views.js`
  (`HariiroScratchViews.isOwned/claim/prune`). `tests/test_scratch_views.mjs` tests it directly.

Done 2026-11-20, last steps (no behaviour change, all tests green; Windows smoke test passed,
see `docs/PHASE_D_REVIEW.md`):
- D1 step 3: the rest of the sidebar logic that does not need the panel's state moved out of
  `playlist_browser.js`: `js/hariiro_sidebar_drop.js` (`HariiroSidebarDrop.decide`, the one drop
  decision behind `on_drag_over`, `on_drag_drop` and the external-file plan, which had three
  copies), `js/hariiro_dedup_tracker.js` (`HariiroDedupTracker`, Round 13.2 duplicate removal) and
  `js/hariiro_import_staging.js` (`HariiroImportStaging`, the hidden list for blank-space drops).
  `tests/test_sidebar_modules.mjs` tests all three directly.
- D2 colours: colours used by more than one panel live in `HariiroTheme.COLORS`; the pill switch
  (GLASS/NATIVE, QUEUE, DESK — three identical copies) is `HariiroTheme.paintSwitch`.
  `tests/test_theme_colors.mjs` compares its draw calls with the old code and rejects copies.
- D3: `tests/helpers/fake_host.mjs` (`createHost`, `panelContext`): playlists, selection,
  focus, locks with an owner, playback queue, panel variables, window properties, timers. The
  Phase D suites use it. The include shim now only resolves include statements, not the text
  "include('x.js')" in a comment. Older round suites keep their own mocks: they record the
  behaviour of their round and are only migrated when they are touched for another reason.

What stays in `playlist_browser.js` is panel glue: paint, mouse, menus, tab switching and the
post-import sort, all of which read and write the panel's own state.

### Phase E — Feature backlog (done 2026-11-21; Windows check in `docs/PHASE_E_REVIEW.md`)
- E1. Lyrics: more ESLyric file-name patterns, per-track offset, better plain-LRC progress.
  **Done** as Round 18 (`docs/ROUND18_REVIEW.md`).
- E2. Playlist: undo for destructive operations (delete playlist, clear Queue).
  **Done** as Round 17: an 8-second Undo notice (`docs/ROUND17_REVIEW.md`).
- E3. Theming: additional accent sets beyond pink/blue/teal/violet; wallpaper selector.
  **Done** as Round 19: Amber, Mint, ☰ → Wallpaper from `images/wallpapers/` (`docs/ROUND19_REVIEW.md`).
- E4. NATIVE mode parity: document exactly which Glass rules the host decides; consider a Glass-only default.
  **Done**: `docs/NATIVE_VS_GLASS.md`. Round 20: new installs start in GLASS (owner's decision).
- E5. 16:9: **done 2026-11-20** — dropped by the owner; branch `experiment/16x9-freeze` deleted (last commit `815cb3f`).

### After Phase E — owner's rounds (2026-11-21)
- Round 20: GLASS by default, wallpapers in `images/wallpapers/` (`docs/ROUND20_REVIEW.md`).
- Release 1.0.0 prepared: README, user README in the ZIP, version check in `package_skin.py`.
- Round 21: wallpapers as peers, lower CPU/memory, `HariiroPaintCache`, nine languages
  (`docs/ROUND21_REVIEW.md`).
- Round 22: owner's Hariiro_UI wallpapers, accent colours as folders with `theme.json`,
  one recolour rule, smooth power button (`docs/ROUND22_REVIEW.md`).
- Round 23: project renamed to Hariiro (files, identifiers, saved keys, reserved playlists;
  no migration, owner's decision); second wallpaper upscaled to 2560×1440 (`docs/ROUND23_REVIEW.md`).
- Round 24: external Queue drop with a locked list active; sidebar multi-select + Delete;
  Ctrl+Z across sidebar / middle list / Queue (`docs/ROUND24_REVIEW.md`).
- Release 1.1.0 prepared (2026-11-22) in the old repository; the project moved to the Hariiro
  repository and its first release there is 1.0.0 (same content, full feature list).
- Round 25: installer (`tools/installer`), bundled Panels UI + JS Panel with licences
  (`third_party/`), screenshots (`docs/preview`), new ZIP layout (`docs/ROUND25_REVIEW.md`).
- Round 26: lyrics card backing matches the other cards; ☰ menu links to the GitHub releases
  (`docs/ROUND26_REVIEW.md`).
- Round 27: light interface for light wallpapers (automatic / dark / light), one tone rule in
  HariiroTheme, light control images (`docs/ROUND27_REVIEW.md`).
- Round 28: NATIVE removed; mini player (Panels UI mini mode, ☰ → Mini player), shared
  favourites helper, sidebar repaint after it is shown again (`docs/ROUND28_REVIEW.md`).
- Release 1.0.1 (2026-11-28): rounds 26-28.

## 4. Working rules
- Every round: failing test first, `npm test` green, review doc `docs/ROUNDnn_REVIEW.md`, short release note, ZIP via `npm run package` (`tools/package_skin.py`); bump `package.json` and the header of `docs/USER_README.txt` for a release.
- Never ship without stating what is *not* verified on Windows.
- Back up `playlists-v2.0` and the skin folder before any acceptance run.
- Commit images and docs normally (`.gitignore` only excludes ZIPs/checksums/OS files).

## 5. Suggested order
A (housekeeping) → B (Windows acceptance, user) → C (Round 15 fixes) → D (refactor) → E (features).
