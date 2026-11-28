"""Build the light-tone control images: images/controls/<colour>/light/*.png.

Usage:  python tools/make_light_controls.py            (every colour folder)
        python tools/make_light_controls.py pink amber  (only those)

Every pixel goes through the same rule as HariiroTheme.lighten() in js/hariiro_theme.js (see
lighten() below); the alpha channel is kept. Run it again after changing a colour's images.
A colour folder without light/ keeps its normal images in the light tone.
Needs Pillow only.
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'images' / 'controls'
LIGHT_MIN, LIGHT_MAX = 0.12, 0.96  # as in js/hariiro_theme.js


def lighten(r, g, b):
    """Identical to HariiroTheme.lighten(): HSL lightness mirrored and kept between LIGHT_MIN
    and LIGHT_MAX; hue and saturation stay."""
    r, g, b = r / 255, g / 255, b / 255
    mx, mn = max(r, g, b), min(r, g, b)
    l, d = (mx + mn) / 2, mx - mn
    h = s = 0.0
    if d > 0:
        s = d / (1 - abs(2 * l - 1))
        h = ((g - b) / d + 6) % 6 if mx == r else (b - r) / d + 2 if mx == g else (r - g) / d + 4
    L = min(LIGHT_MAX, max(LIGHT_MIN, 1 - l))
    C = (1 - abs(2 * L - 1)) * min(1, s)
    X = C * (1 - abs(h % 2 - 1))
    m = L - C / 2
    t = ((C, X, 0) if h < 1 else (X, C, 0) if h < 2 else (0, C, X) if h < 3 else
         (0, X, C) if h < 4 else (X, 0, C) if h < 5 else (C, 0, X))
    return tuple(round((v + m) * 255) for v in t)


def build(folder):
    out = folder / 'light'
    out.mkdir(exist_ok=True)
    n = 0
    for src in sorted(folder.glob('*.png')):
        img = Image.open(src).convert('RGBA')
        px = img.load()
        for y in range(img.height):
            for x in range(img.width):
                r, g, b, a = px[x, y]
                if a:
                    px[x, y] = (*lighten(r, g, b), a)
        img.save(out / src.name, optimize=True)
        n += 1
    print(f'{folder.name}/light: {n} images')


if __name__ == '__main__':
    names = sys.argv[1:] or sorted(p.name for p in ROOT.iterdir() if p.is_dir())
    for name in names:
        if not (ROOT / name / 'play.png').is_file():
            sys.exit(f'{name}: not a colour folder (no play.png)')
        build(ROOT / name)
