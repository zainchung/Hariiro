# Hariiro — Round 13.2: ordinary-playlist file deduplication

## Scope

A normal, editable playlist no longer retains newly imported duplicate files. The
identity key is the full source file path (`FbMetadbHandle.Path`) with slash
normalization and case-insensitive comparison. File directory, basename and
extension must all refer to the same full path. Metadata titles, tags, and
`SubSong` are intentionally not part of the key.

For external file/folder drops, files coming from another playlist, or native
foobar2000 additions, the sidebar's `on_playlist_items_added` observer compares
the pre-addition path snapshot with the updated playlist. It removes only the
new excess copies, preserving any duplicates already present when the feature
started or that were present before the current import. It also preserves the
selection where possible and lets the existing import sort/focus logic continue.

Blank-sidebar drops first use the hidden `Hariiro - Import Staging` playlist. Before
moving imported tracks into a newly created ordinary playlist, this path filters
duplicate files within the same batch.

## Exclusions and limitations

- Music Library (fixed view), Hariiro - Favorites, owned search results, Artist
  scratch views, and the Queue buffer are not deduplicated or modified.
- This never deletes source audio files. Removing a duplicate only removes the
  playlist entry via `plman.RemovePlaylistSelection`.
- If a playlist already had multiple occurrences of a file, they remain.
  Future imported occurrences of that same file are not retained.
- Multiple logical tracks (for example CUE subsongs) sharing the same physical
  `Path` are considered duplicates because the requested key is the file path.
- foobar2000's native OLE drag-and-drop processor inserts tracks asynchronously.
  The JavaScript observer therefore removes extras as soon as the playlist-add
  event is delivered, rather than blocking the insertion before it occurs.
  A brief transient insertion in the UI remains possible; a strict pre-insert
  guarantee would require host/plugin support.
- When no pre-import baseline exists (e.g. a playlist appears with content
  before the observer is initialized), the script takes a baseline instead of
  deleting any unknown original entries. Newly created playlists register an
  empty baseline before insertion.

## Tests

Run `node tests/test_round13_2_dedup.mjs` to cover Windows path normalization,
existing repeated entries, within-batch duplicates, non-active ordinary
playlists, exclusions, blank-area creation, and selection restoration. All
earlier Round 3–13 tests are also retained.
