#!/usr/bin/env python3
"""Build the installable Anna Glass V2 skin ZIP and verify its contents.

Usage:
    python tools/package_skin.py
    python tools/package_skin.py --output C:\\Temp\\Anna-Glass-V2.zip

The archive holds exactly what foobar2000 needs at runtime:
    main.txt, foo_ui_panels.ini, js/*.js, images/** (png/jpg)
Docs, tests, tools and READMEs are not included. Extract into a *backed-up* copy
of the skin folder. Before writing, the script checks that
  * every include('x.js') resolves to a file in js/,
  * every $panel / js reference in main.txt / foo_ui_panels.ini exists,
  * every images/... path used by the sources exists,
  * image files carry a valid PNG/JPEG signature.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
PNG = b"\x89PNG\r\n\x1a\n"
JPG = b"\xff\xd8\xff"
TOP_LEVEL = ("main.txt", "foo_ui_panels.ini")


def collect() -> list[str]:
    files = list(TOP_LEVEL)
    files += sorted(p.relative_to(ROOT).as_posix() for p in (ROOT / "js").glob("*.js"))
    files += sorted(
        p.relative_to(ROOT).as_posix()
        for p in (ROOT / "images").rglob("*")
        if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg"}
    )
    return files


def verify(files: list[str]) -> None:
    present = set(files)
    problems: list[str] = []
    for rel in files:
        data = (ROOT / rel).read_bytes()
        if not data:
            problems.append(f"empty file: {rel}")
        low = rel.lower()
        if low.endswith(".png") and not data.startswith(PNG):
            problems.append(f"invalid PNG: {rel}")
        if low.endswith((".jpg", ".jpeg")) and not data.startswith(JPG):
            problems.append(f"invalid JPEG: {rel}")

    texts = {rel: (ROOT / rel).read_text(encoding="utf-8", errors="replace")
             for rel in files if rel.endswith((".js", ".txt", ".ini"))}
    for rel, text in texts.items():
        for m in re.finditer(r"include\(\s*['\"]([^'\"]+)['\"]\s*\)", text):
            if f"js/{m.group(1)}" not in present:
                problems.append(f"{rel}: include of missing js/{m.group(1)}")
        for m in re.finditer(r"images/[A-Za-z0-9_./-]+\.(?:png|jpg|jpeg)", text):
            if m.group(0) not in present:
                problems.append(f"{rel}: references missing {m.group(0)}")
    for rel in ("foo_ui_panels.ini", "main.txt"):
        for m in re.finditer(r"js[/\\]+([A-Za-z0-9_]+\.js)", texts[rel]):
            if f"js/{m.group(1)}" not in present:
                problems.append(f"{rel}: references missing js/{m.group(1)}")
    if problems:
        raise SystemExit("Package verification failed:\n  " + "\n  ".join(sorted(set(problems))))


def build(output: Path) -> None:
    files = collect()
    verify(files)
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "w", ZIP_DEFLATED, compresslevel=9) as z:
        for rel in files:
            info = ZipInfo(rel, date_time=(2026, 1, 1, 0, 0, 0))  # reproducible
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, (ROOT / rel).read_bytes(), compresslevel=9)
    with ZipFile(output) as z:
        if z.testzip() is not None or z.namelist() != files:
            raise SystemExit("Archive self-check failed")
    print(f"Created {output} ({output.stat().st_size // 1024} KiB, {len(files)} files)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--output", type=Path, default=ROOT / "dist" / "Anna-Glass-V2.zip")
    build(ap.parse_args().output)
