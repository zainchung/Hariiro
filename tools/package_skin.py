#!/usr/bin/env python3
"""Build the installable Hariiro skin ZIP and verify its contents.

Usage:
    python tools/package_skin.py
    python tools/package_skin.py --output C:\\Temp\\Hariiro.zip

    python tools/package_skin.py --components <foobar profile>\\user-components-x64
    (or set HARIIRO_COMPONENTS_DIR; a release ZIP must be built with the components)

Archive layout (Round 25):
    Hariiro/                 the skin folder: main.txt, foo_ui_panels.ini, LICENSE, js/*.js,
                             images/** (png/jpg, and theme.json of each colour)
    Install-Hariiro.cmd/.ps1 installer (tools/installer): components + skin into foobar2000
    Hariiro-README.txt       docs/USER_README.txt (end-user notes); LICENSE (MIT)
    preview/*.png            screenshots (docs/preview)
    components/<name>/       <name>.dll from --components + third_party/<name>/LICENSE.txt,
                             for every component in third_party/components.json
    THIRD-PARTY-NOTICES.txt  third_party/THIRD-PARTY-NOTICES.txt (only with components)
Other docs, tests and tools are not included. Before writing, the script checks that
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
TOP_LEVEL = ("main.txt", "foo_ui_panels.ini", "LICENSE")
USER_README = ("Hariiro-README.txt", "docs/USER_README.txt")  # (zip path, source)
SKIN_DIR = "Hariiro"
INSTALLER = ("tools/installer/Install-Hariiro.cmd", "tools/installer/Install-Hariiro.ps1")
PREVIEW_DIR = "docs/preview"
COMPONENTS = "third_party/components.json"
NOTICES = ("THIRD-PARTY-NOTICES.txt", "third_party/THIRD-PARTY-NOTICES.txt")


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


def windows_text(path: Path) -> bytes:
    """Windows line endings and a BOM so Notepad (and PowerShell 5.1) read the text as UTF-8."""
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    return text.replace("\n", "\r\n").encode("utf-8-sig")


def extras(components: Path | None) -> list[tuple[str, bytes]]:
    """Everything beside the skin folder: (zip path, data)."""
    out: list[tuple[str, bytes]] = [(USER_README[0], windows_text(ROOT / USER_README[1])),
                                    ("LICENSE", (ROOT / "LICENSE").read_bytes())]
    problems: list[str] = []
    for rel in INSTALLER:
        path = ROOT / rel
        if not path.is_file():
            problems.append(f"missing {rel}")
            continue
        data = windows_text(path) if rel.endswith(".ps1") else path.read_bytes()
        out.append((path.name, data))
    previews = sorted((ROOT / PREVIEW_DIR).glob("*.png")) if (ROOT / PREVIEW_DIR).is_dir() else []
    if not previews:
        problems.append(f"no screenshots in {PREVIEW_DIR}")
    for path in previews:
        data = path.read_bytes()
        if not data.startswith(PNG):
            problems.append(f"invalid PNG: {PREVIEW_DIR}/{path.name}")
        out.append((f"preview/{path.name}", data))
    if components is not None:
        listed = json.loads((ROOT / COMPONENTS).read_text(encoding="utf-8"))["components"]
        for entry in listed:
            name = entry["name"]
            dll = components / name / f"{name}.dll"
            licence = ROOT / "third_party" / name / "LICENSE.txt"
            if not dll.is_file() or not dll.read_bytes().startswith(b"MZ"):
                problems.append(f"component missing or not a DLL: {dll}")
                continue
            if not licence.is_file():
                problems.append(f"missing third_party/{name}/LICENSE.txt")
                continue
            out.append((f"components/{name}/{name}.dll", dll.read_bytes()))
            out.append((f"components/{name}/LICENSE.txt", windows_text(licence)))
        out.append((NOTICES[0], windows_text(ROOT / NOTICES[1])))
    if problems:
        raise SystemExit("Package verification failed:\n  " + "\n  ".join(problems))
    return out


def build(output: Path, components: Path | None) -> None:
    files = collect()
    verify(files)
    extra = extras(components)
    names = [f"{SKIN_DIR}/{rel}" for rel in files] + [name for name, _ in extra]
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "w", ZIP_DEFLATED, compresslevel=9) as z:
        def put(name: str, data: bytes) -> None:
            info = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))  # reproducible
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, data, compresslevel=9)
        for rel in files:
            put(f"{SKIN_DIR}/{rel}", (ROOT / rel).read_bytes())
        for name, data in extra:
            put(name, data)
    with ZipFile(output) as z:
        if z.testzip() is not None or z.namelist() != names:
            raise SystemExit("Archive self-check failed")
    note = "with components" if components is not None else "WITHOUT components - not for release"
    print(f"Created {output} ({output.stat().st_size // 1024} KiB, {len(names)} files, {note})")


if __name__ == "__main__":
    import os

    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--output", type=Path, default=ROOT / "dist" / "Hariiro.zip")
    ap.add_argument("--components", type=Path, default=None,
                    help="folder with <name>/<name>.dll (default: $HARIIRO_COMPONENTS_DIR)")
    args = ap.parse_args()
    env = os.environ.get("HARIIRO_COMPONENTS_DIR")
    build(args.output, args.components or (Path(env) if env else None))
