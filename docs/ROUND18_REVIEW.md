# Round 18 review — lyrics: more file names, per-track offset, better progress (Phase E1, 2026-11-21)

## What changed

1. **More ESLyric file-name patterns** when looking for saved lyrics (track folder, profile
   lyrics folder or the chosen folders): `Artist_Title`, `Artist - Album - Title`,
   `AlbumArtist - Title` (when it differs from the artist), `NN. Title`, `NN - Title`,
   `NN Title`, `NN. Artist - Title`, `Album\NN. Title`, `Album\NN - Title` (NN = two-digit
   track number). The Round 11 patterns are tried first, in the same order.
2. **Per-track timing offset.** Right-click the lyrics → *Show lyrics earlier (+0.5 s)*,
   *Show lyrics later (−0.5 s)*, *Reset lyric offset (…)*. It applies to timed lyrics only,
   is remembered per track (up to 500 tracks, `Anna.Lyrics.TrackOffsets.v1`), is shown at the
   top right while it is not zero, and seeking by dragging the lyrics lands where the line
   plays with the offset. It adds to an `[offset:]` tag in the file.
3. **Better progress for LRC files with line timestamps only.** The glyph-by-glyph estimate
   now runs over the time the line takes to sing (about 0.32 s per CJK/kana character, less
   for Latin letters, at least 1 s) instead of the whole time until the next line. A short
   line before a long instrumental gap no longer creeps along through the gap. Every glyph is
   still lit by the next timestamp.

4. **Fix found in the Windows check: lyrics next to tracks of a portable foobar2000.** A
   portable install stores track paths relative to its own folder
   (`file-relative://..\Music\x.flac`). The lyrics panel treated anything with `://` as a
   stream, so in track-folder mode it never found saved lyrics there, and file-name patterns
   based on the audio file name were empty. `AnnaLyricTools.localPath` resolves such paths
   against `fb.FoobarPath` (never above the drive root).

New module `js/anna_lyric_tools.js` (`AnnaLyricTools.fileNames`, `localPath`, `singSeconds`,
`createOffsets`).

## Tests

`tests/test_round18_lyrics.mjs` (failed before the change): patterns and order, sing-time
estimate, offset store (step, clamp to ±30 s, limit, corrupt property), and the lyrics panel
in the fake host: menu nudges move the current line, label, seek with offset, reset, and the
short-line-before-a-gap progress. Round 6's progress test still passes. `npm test`: 25/25.

## Windows check

See `docs/PHASE_E_REVIEW.md`.
