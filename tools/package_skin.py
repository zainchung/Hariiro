#!/usr/bin/env python3
"""Build the installable Hariiro skin ZIP and verify its contents.

Usage:
    python tools/package_skin.py
    python tools/package_skin.py --output C:\\Temp\\Hariiro.zip

The archive holds exactly what foobar2000 needs at runtime:
    main.txt, foo_ui_panels.ini, js/*.js, images/** (png/jpg, and theme.json of each colour)
plus docs/USER_README.txt as Hariiro-README.txt (end-user notes).
Other docs, tests and tools are not included. Extract into a *backed-up* copy
of the skin folder. Before writing, the script checks that
  * every include('x.js') resolves to a file in js/,
  * every $panel / js reference in main.txt / foo_ui_panels.ini exists,
  * every images/... path used by the sources exists,
  * image files carry a valid PNG/JPEG signature,
  * every theme.json (colour folder, Round 22) has a numeric hue,
  * the user README names the version from package.json.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
PNG = b"\x89PNG\r\n\x1a\n"
JPG = b"\xff\xd8\xff"
TOP_LEVEL = ("main.txt", "foo_ui_panels.ini")
USER_README = ("Hariiro-README.txt", "docs/USER_README.txt")  # (zip path, source)


def collect() -> list[str]:
    files = list(TOP_LEVEL)
    files += sorted(p.relative_to(ROOT).as_posix() for p in (ROOT / "js").glob("*.js"))
    files += sorted(
        p.relative_to(ROOT).as_posix()
        for p in (ROOT / "images").rglob("*")
        if p.is_file() and (p.suffix.lower() in {".png", ".jpg", ".jpeg"} or p.name == "theme.json")
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
        if low.endswith("theme.json"):
            try:
                hue = json.loads(data.decode("utf-8"))["hue"]
                if not isinstance(hue, (int, float)):
                    raise ValueError("hue is not a number")
            except Exception as error:  # noqa: BLE001 - reported, not raised
                problems.append(f"invalid {rel}: {error}")

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
    version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
    readme = ROOT / USER_README[1]
    if not readme.is_file():
        problems.append(f"missing {USER_README[1]}")
    elif f"version {version}" not in readme.read_text(encoding="utf-8").splitlines()[0]:
        problems.append(f"{USER_README[1]}: first line does not name version {version}")
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
        info = ZipInfo(USER_README[0], date_time=(2026, 1, 1, 0, 0, 0))
        info.external_attr = 0o644 << 16
        text = (ROOT / USER_README[1]).read_text(encoding="utf-8").replace("\r\n", "\n")
        # Windows line endings and a BOM so Notepad shows the Chinese/Japanese text correctly.
        z.writestr(info, text.replace("\n", "\r\n").encode("utf-8-sig"), compress_type=ZIP_DEFLATED)
    with ZipFile(output) as z:
        if z.testzip() is not None or z.namelist() != files + [USER_README[0]]:
            raise SystemExit("Archive self-check failed")
    print(f"Created {output} ({output.stat().st_size // 1024} KiB, {len(files) + 1} files)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--output", type=Path, default=ROOT / "dist" / "Hariiro.zip")
    build(ap.parse_args().output)
