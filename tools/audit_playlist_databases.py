#!/usr/bin/env python3
"""Read-only foobar2000 v2 playlist storage inventory (no files are changed)."""
import argparse
from collections import Counter
from datetime import datetime
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('profile', type=Path, help='foobar2000 profile folder (contains playlists-v2.0)')
parser.add_argument('--limit', type=int, default=30, help='most recently modified files to list')
args = parser.parse_args()
folder = args.profile / 'playlists-v2.0'
if not folder.is_dir():
    parser.error(f'No playlists-v2.0 directory under {args.profile}')
files = sorted((p for p in folder.iterdir() if p.is_file()),
               key=lambda p: p.stat().st_mtime, reverse=True)
counts = Counter(p.suffix.lower() or '(no suffix)' for p in files)
print('Folder:', folder)
print('Files:', len(files), 'by extension:', dict(sorted(counts.items())))
print('Total bytes:', sum(p.stat().st_size for p in files))
print('Recently modified:')
for p in files[:max(0, args.limit)]:
    st = p.stat()
    print(datetime.fromtimestamp(st.st_mtime).isoformat(timespec='seconds'),
          f'{st.st_size:>12,}', p.name)
