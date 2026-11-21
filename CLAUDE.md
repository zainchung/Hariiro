# Hariiro — notes for Claude

foobar2000 skin: Panels UI (reborn) layout (`main.txt`, `foo_ui_panels.ini`) + foo_js_panel
scripts (`js/*.js`) + `images/`. `main` is the only trunk. Plan and history: `README.md`,
`docs/DEVELOPMENT_PLAN.md`, latest `docs/ROUND*_REVIEW.md`. Machine-specific notes, if any:
`CLAUDE.local.md` (not committed).

## Commands

```
npm test                      # all offline tests; prints one PASS/FAIL line per file
node tools/run_tests.mjs 15   # only test files whose name contains "15"
npm run package               # dist/Hariiro.zip, verified
```

## Rules that are easy to break

- Bug fixes: failing test first, then the fix, then `docs/ROUNDxx_REVIEW.md` and a note in
  `docs/release_notes/`. Refactors (Phase D) must not change behaviour.
- Panel-variable keys: only via `HariiroShared.PVAR` (`js/hariiro_shared.js`); test_shared rejects literals.
- Colours used by more than one panel: only via `HariiroTheme.COLORS` / `HariiroTheme.paintSwitch`
  (`js/hariiro_theme.js`); test_theme_colors rejects copies.
- Every `windowless = 0` panel uses `js/hariiro_dpi.js` (`HariiroDpi.width/height/font/popup/
  doDragDrop/repaintRect/textWidth`, `HariiroDpi.install()` last). Drop targets also install
  `HariiroDropFix` right before it. Why: `docs/ROUND15_REVIEW.md`.
- Tests load scripts with `tests/helpers/js_panel.mjs` (`installIncludeShim`); new suites build their
  host with `tests/helpers/fake_host.mjs` (`createHost`, `panelContext`).
- Offline tests cannot prove OLE / DPI / host behaviour: drag-and-drop or layout changes need a
  Windows check in the real foobar2000.

## Windows checks — keep them cheap

- Use `tools/fb_test.ps1` (`status`, `backup`, `deploy`, `restore`, `restart`) instead of
  hand-written PowerShell. `backup` before anything that changes playlists, `restore` after.
- Verify with text, not pictures: `fb_test.ps1 status` (skin vs repo, playlist counts, JS log
  errors) and, for drag issues, a temporary logger appended to the *installed* scripts only.
- When a screenshot is needed: `scale` 0.5–0.6 or a `zoom` of the relevant region; batch
  actions and take one screenshot at the end.
- The user may be listening to music: ask before restarting foobar2000 (restart also clears
  the playback queue).

## Token economy

- Search first (`Grep`, `offset`/`limit`), read whole files only when editing most of them.
- Show only test summaries / failures, not full logs.
- For external sources (e.g. foo_js_panel on GitHub), ask a sub-agent for specific functions,
  not whole files.
