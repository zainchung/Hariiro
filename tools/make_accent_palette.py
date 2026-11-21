"""Build an accent variant of the footer control PNGs from the rose (pink) set.

Usage:  python tools/make_accent_palette.py <palette-id> <hue>
Example: python tools/make_accent_palette.py amber 36

Every pixel goes through the same rule as AnnaTheme.recolor() in js/anna_theme.js:
pinkish colours (hue 275-360) are rotated so that rose (326) lands on <hue>; neutral
colours and the alpha channel are kept. This reproduces the bundled violet / blue / teal
sets, so a new preset in anna_theme.js gets matching images with the same file names.
Needs Pillow only.
"""
import colorsys
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'images' / 'controls'


def recolor(r, g, b, target):
    if r - g < 16 or b - g < 10 or r < 70 or r > b + 100:
        return r, g, b
    if max(r, g, b) - min(r, g, b) < 22:
        return r, g, b
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    h *= 360
    if h < 275 or h > 360:
        return r, g, b
    nh = ((h + (target - 326)) % 360 + 360) % 360
    rr, gg, bb = colorsys.hsv_to_rgb(nh / 360, s, v)
    return round(rr * 255), round(gg * 255), round(bb * 255)


def build(palette, hue):
    out = ROOT / palette
    out.mkdir(exist_ok=True)
    for src in sorted((ROOT / 'pink').glob('*.png')):
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
    if len(sys.argv) != 3 or not sys.argv[2].lstrip('-').isdigit():
        sys.exit(__doc__)
    build(sys.argv[1], int(sys.argv[2]))
