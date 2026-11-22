"""Fictional sample album for the screenshots in docs/preview (Round 25): silent MP3s with
ID3v2.3 tags and a drawn cover. Usage: python tools/make_preview_album.py <output folder>
All names are invented; add the folder to a test foobar2000 with foobar2000.exe /add <folder>."""
import io, math, random, struct, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
ALBUM, ARTIST, YEAR = "Glass Garden", "Hariiro Ensemble", "2026"
TRACKS = [("Morning Petals", 214), ("Lantern Road", 187), ("Moonlit Teacup", 241), ("Sakura Drift", 203),
          ("Quiet Harbor", 256), ("Paper Cranes", 178), ("Starlight Window", 229), ("Rain on Glass", 262),
          ("Evening Bell", 195), ("Silver Lake", 248), ("Lavender Sky", 211), ("Night Garden", 274),
          ("Distant Shore", 233), ("Little Comet", 169), ("Slow Snowfall", 287), ("Last Petal", 222)]


def cover() -> bytes:
    n = 600
    img = Image.new("RGB", (n, n))
    d = ImageDraw.Draw(img)
    for y in range(n):  # night gradient
        t = y / n
        d.line([(0, y), (n, y)], fill=(int(40 + 90 * t), int(30 + 40 * t), int(90 + 70 * (1 - t))))
    rnd = random.Random(7)
    for _ in range(140):  # stars
        x, y, r = rnd.randrange(n), rnd.randrange(int(n * .6)), rnd.choice((1, 1, 2))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 245, 230))
    d.ellipse([380, 70, 500, 190], fill=(255, 236, 210))  # moon
    petals = Image.new("RGBA", (n, n)); pd = ImageDraw.Draw(petals)
    for _ in range(60):
        x, y, s = rnd.randrange(n), rnd.randrange(n), rnd.randrange(8, 22)
        pd.ellipse([x, y, x + s, y + s * .6], fill=(255, 170, 200, rnd.randrange(120, 230)))
    img = Image.alpha_composite(img.convert("RGBA"), petals.filter(ImageFilter.GaussianBlur(1))).convert("RGB")
    d = ImageDraw.Draw(img)
    try:
        big, small = ImageFont.truetype("segoeuib.ttf", 64), ImageFont.truetype("segoeui.ttf", 30)
    except OSError:
        big = small = ImageFont.load_default()
    d.text((40, 440), ALBUM, font=big, fill=(255, 255, 255))
    d.text((44, 520), ARTIST, font=small, fill=(255, 215, 235))
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=90)
    return buf.getvalue()


def frame(tag: str, data: bytes) -> bytes:
    return tag.encode() + struct.pack(">I", len(data)) + b"\0\0" + data


def text(tag: str, value: str) -> bytes:
    return frame(tag, b"\x01" + value.encode("utf-16"))  # UTF-16 with BOM


def syncsafe(n: int) -> bytes:
    return bytes([(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127])


art = cover()
(OUT / "cover.jpg").write_bytes(art)
# MPEG-1 Layer III, 32 kbit/s, 44.1 kHz: 104-byte frames of silence (zero side info / data).
FRAME = bytes([0xFF, 0xFB, 0x10, 0x64]) + bytes(100)
for i, (title, secs) in enumerate(TRACKS, 1):
    frames = b"".join([text("TIT2", title), text("TPE1", ARTIST), text("TALB", ALBUM),
                       text("TRCK", f"{i}/{len(TRACKS)}"), text("TYER", YEAR), text("TCON", "Ambient"),
                       frame("APIC", b"\x00image/jpeg\x00\x03\x00" + art)])
    tag = b"ID3\x03\x00\x00" + syncsafe(len(frames)) + frames
    audio = FRAME * math.ceil(secs * 44100 / 1152)
    (OUT / f"{i:02d} {title}.mp3").write_bytes(tag + audio)
print(f"{len(TRACKS)} tracks in {OUT}")
