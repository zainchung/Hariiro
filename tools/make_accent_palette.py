"""Build an accent variant of the footer control PNGs from the rose (pink) set.

Usage:  python tools/make_accent_palette.py <palette-id> <hue> [glob]
Example: python tools/make_accent_palette.py amber 36
         python tools/make_accent_palette.py amber 36 "corner_*.png"   (only those files)

Every pixel goes through the same rule as HariiroTheme.recolor() in js/hariiro_theme.js (see
recolor() below); the alpha channel is kept. Builds the bundled colour folders from pink/,
so a new colour folder gets matching images with the same file names.
Needs Pillow only.
"""
import colorsys
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'images' / 'controls'
SPREAD = 0.3  # as in js/hariiro_theme.js


def recolor(r, g, b, target):
    """The one recolouring rule, identical to HariiroTheme.recolor() in js/hariiro_theme.js:
    - any pink / rose / violet / purple tint (hue 255-360, spread >= 6) - dark, pale or vivid -
      moves to the target hue, keeping 30 % of its distance from pink (326) (SPREAD);
    - warm peach / gold frames (hue 0-50, red >= 120, spread >= 22) take the target hue;
    saturation and brightness are kept; greys, whites and blue glass tones stay.
    (Round 22 widened the first range: dark and pale tints used to be skipped.)
    """
    mx, mn = max(r, g, b), min(r, g, b)
    if mx - mn < 6:
        return r, g, b
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    h *= 360
    if 255 <= h <= 360:
        nh = (target + (h - 326) * SPREAD) % 360
    elif r == mx and h <= 50 and r >= 120 and mx - mn >= 22:
        nh = target % 360
    else:
        return r, g, b
    rr, gg, bb = colorsys.hsv_to_rgb(nh / 360, s, v)
    return round(rr * 255), round(gg * 255), round(bb * 255)


def build(palette, hue, pattern='*.png'):
    out = ROOT / palette
    out.mkdir(exist_ok=True)
    for src in sorted((ROOT / 'pink').glob(pattern)):
        img = Image.open(src).convert('RGBA')
        px = img.load()
        for y in range(img.height):
            for x in range(img.width):
                r, g, b, a = px[x, y]
                if a:
                    px[x, y] = (*recolor(r, g, b, hue), a)
        img.save(out / src.name, optimize=True)
    print(f'{palette}: {len(list(out.glob("*.png")))} images, hue {hue}')


if __name__ == '__main__':
    if len(sys.argv) not in (3, 4) or not sys.argv[2].lstrip('-').isdigit():
        sys.exit(__doc__)
    build(sys.argv[1], int(sys.argv[2]), *sys.argv[3:])
