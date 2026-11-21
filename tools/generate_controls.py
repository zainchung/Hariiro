"""Deterministic transparent PNG assets for Hariiro control surfaces."""
from pathlib import Path
from io import BytesIO
import cairosvg
from PIL import Image

OUT=Path(__file__).parent.parent/'images'/'controls'/'pink'
OUT.mkdir(exist_ok=True,parents=True)
WHITE='#fff2fa'; PINK='#ffc0e2'; LIT='#ff90c7'; DEEP='#4d2349'; GLOW='#ffa3d2'

def svg(contents, box=96):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{box}" height="{box}" viewBox="0 0 {box} {box}"><g stroke="{WHITE}" fill="none" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">{contents}</g></svg>'''

def write(name, svgstring, outsize=192):
    raw=cairosvg.svg2png(bytestring=svgstring.encode('utf-8'),output_width=outsize,output_height=outsize)
    p=OUT/(name+'.png')
    # force RGBA, leave all invisible pixels transparent
    Image.open(BytesIO(raw)).convert('RGBA').save(p, optimize=True)

# Playback order: icons all use common 96x96 coordinate grid.
write('order_default',svg('<path d="M19 48 H75 M64 36 L77 48 L64 60"/>'))
repeat='<path d="M27 30 H72 Q80 30 80 38 V45 M69 22 L80 33 L88 22"/><path d="M69 68 H24 Q16 68 16 60 V52 M27 76 L16 65 L8 76"/>'
write('order_repeat_playlist',svg(repeat))
write('order_repeat_track',svg(repeat+'<rect x="42" y="39" width="15" height="19" rx="5" fill="'+DEEP+'" stroke="none"/><text x="49" y="54" fill="'+WHITE+'" stroke="none" font-size="19" font-weight="bold" text-anchor="middle" font-family="Arial">1</text>'))
shuffle='<path d="M13 30 H30 Q39 30 44 38 L64 65 Q68 70 83 70"/><path d="M13 68 H30 Q39 68 44 59 L64 31 Q69 25 83 25"/><path d="M74 16 L86 25 L74 34 M74 61 L86 70 L74 79"/>'
write('order_random',svg(shuffle))
# Three badge overlays sit at the center and are scaled to balance the crossed arrows.
mask='<circle cx="49" cy="48" r="22" fill="'+DEEP+'" stroke="none"/>'
write('order_shuffle_tracks',svg(shuffle+mask+'<path d="M48 33 V57 Q42 53 37 58 Q34 65 43 66 Q52 65 52 60 V38 L68 34 V42" stroke="'+PINK+'" stroke-width="4"/>'))
write('order_shuffle_albums',svg(shuffle+mask+'<circle cx="49" cy="48" r="19" stroke="'+PINK+'" stroke-width="3.8"/><circle cx="49" cy="48" r="5" fill="'+WHITE+'" stroke="none"/><path d="M49 33 A15 15 0 0 0 34 48" stroke="'+WHITE+'" stroke-width="2"/>'))
# Native Shuffle (folders) remains available in foobar2000, but is hidden from Hariiro's menu.

for direction,name in [(1,'seek_forward_5'),(-1,'seek_backward_5')]:
    # true mirrored, same radius, same endpoint and stroke. Numeric badge is separate.
    # canonical arc traverses bottom, right and top with a small gap on upper left
    circle='<path d="M28 33 C34 22 45 19 57 21 C76 23 82 39 78 55 C74 71 60 77 47 75 C33 74 23 65 22 53"/>'
    arrow='<path d="M22 53 L17 43 M22 53 L33 47"/>'
    artwork=circle+arrow+'<text x="49" y="57" font-family="Arial" font-weight="bold" text-anchor="middle" font-size="27" stroke="none" fill="'+WHITE+'">5s</text>'
    if direction == 1:
        # Mirror only the curved arrow. The numeral must NOT be flipped.
        text='<text x="49" y="57" font-family="Arial" font-weight="bold" text-anchor="middle" font-size="27" stroke="none" fill="'+WHITE+'">5s</text>'
        artwork='<g transform="translate(96 0) scale(-1 1)">'+circle+arrow+'</g>'+text
    write(name,svg(artwork))
write('previous',svg('<path d="M64 20 L36 48 L64 76 M28 22 V74"/>'))
write('next',svg('<path d="M32 20 L60 48 L32 76 M68 22 V74"/>'))

# Main play/pause are complete one-piece circular assets; no separately drawn ring.
ring=f'<circle cx="48" cy="48" r="44" fill="{GLOW}" fill-opacity=".065" stroke="none"/><circle cx="48" cy="48" r="39.5" stroke="{PINK}" stroke-width="2.3"/><circle cx="48" cy="48" r="34" stroke="{GLOW}" stroke-opacity=".33" stroke-width="1.1"/>'
write('play',svg(ring+'<path d="M40 29 L65 48 L40 67 Z" stroke="'+WHITE+'" stroke-width="4.5"/>'))
write('pause',svg(ring+'<path d="M40 32 V64 M56 32 V64" stroke="'+WHITE+'" stroke-width="6"/>'))

write('headphones',svg('<path d="M22 53 V43 C22 7 74 7 74 43 V53"/><rect x="16" y="46" width="14" height="29" rx="6" fill="'+PINK+'" fill-opacity=".65"/><rect x="66" y="46" width="14" height="29" rx="6" fill="'+PINK+'" fill-opacity=".65"/><path d="M74 70 Q65 81 56 81" stroke="'+PINK+'" stroke-width="3"/>'))

# A glow-free speaker icon uses clean geometric outlines so the volume panel can tint it.
write('speaker',svg('<path d="M15 41 H30 L48 26 V70 L30 56 H15 Z"/><path d="M58 36 Q70 48 58 60"/><path d="M67 26 Q89 48 67 70"/>'))

# Perforated butterfly silhouette with pink rim and transparent outside.
wings='''<path d="M47 47 C34 22 12 13 12 31 C10 45 24 53 43 51 C27 56 20 64 23 72 C30 85 45 72 47 52 Z" fill="'''+PINK+'''" fill-opacity=".88" stroke="'''+WHITE+'''" stroke-width="2"/><path d="M49 47 C62 22 84 13 84 31 C86 45 72 53 53 51 C69 56 76 64 73 72 C66 85 51 72 49 52 Z" fill="'''+PINK+'''" fill-opacity=".88" stroke="'''+WHITE+'''" stroke-width="2"/><circle cx="29" cy="34" r="5" fill="'''+DEEP+'''" stroke="none"/><circle cx="67" cy="34" r="5" fill="'''+DEEP+'''" stroke="none"/><circle cx="35" cy="66" r="4" fill="'''+DEEP+'''" stroke="none"/><circle cx="61" cy="66" r="4" fill="'''+DEEP+'''" stroke="none"/><path d="M48 37 V68 M48 38 L42 24 M48 38 L54 24" stroke="'''+WHITE+'''" stroke-width="3.3"/>'''
write('butterfly',svg('<circle cx="48" cy="48" r="43" fill="'+GLOW+'" fill-opacity=".12" stroke="none"/>'+wings))

write('volume_thumb',svg('<circle cx="48" cy="48" r="37" fill="'+GLOW+'" fill-opacity=".17" stroke="none"/><circle cx="48" cy="48" r="26" fill="'+PINK+'" fill-opacity=".45" stroke="'+WHITE+'" stroke-width="2"/><circle cx="48" cy="48" r="15" fill="'+WHITE+'" stroke="none"/><circle cx="43" cy="42" r="5" fill="#ffffff" stroke="none"/>'))
print('Generated',len(list(OUT.glob('*.png'))),'PNG controls in',OUT)
