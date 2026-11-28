# Hariiro — replaceable transparent controls

All 16 control assets are **192×192 RGBA PNGs with a transparent background**. They are authored as a unified set; the running skin uses images, not font glyphs, for its footer transport.

| Area | Asset(s) | Rendered size |
|---|---|---|
| Playback modes | `order_default`, `order_repeat_playlist`, `order_repeat_track`, `order_random`, `order_shuffle_tracks`, `order_shuffle_albums` | 39×39px |
| ±5 seconds | `seek_backward_5`, `seek_forward_5` | 39×39px |
| Previous/next | `previous`, `next` | 39×39px |
| Primary play/pause | `play`, `pause` (outer ring included) | 65×65px |
| Playback device | `headphones` | 39×39px |
| Seek position | `butterfly` | 36×36px; additional translucent hover/breath layer |
| Volume | `speaker` and `volume_thumb` | 22×22px / 20×20px |

All paths are relative to the skin root's `images/controls/<palette>/` directory. JS scripts in `js/` refer to `../images/controls/<palette>/...png`, while `main.txt` references `images/controls/<palette>/speaker.png`. PNG transparency is required: do not flatten onto a background or change the filenames.

The optional `tools/generate_controls.py` recreates the bundled set with CairoSVG and Pillow; it is not needed to run the skin. To theme the skin, replace the PNGs while preserving aspect ratio and alpha.

The native foobar2000 **Shuffle (folders)** playback order is intentionally not exposed by Hariiro and has no dedicated PNG. Native playback order index 6 still exists in foobar2000.

The ±5-second PNGs contain an explicit **5s** label. The extra note and disc badges are enlarged in the two shuffle assets.

## Accent colours (Round 22)

Every folder in `images/controls/` that contains `play.png` is an accent colour; the menu
(☰ → Accent colour) lists them by **folder name**. Bundled: `amber`, `blue`, `mint`, `pink`,
`teal`, `violet`. A folder holds the 16 control PNGs above plus the four corner ornaments
`corner_tl.png`, `corner_tr.png`, `corner_bl.png`, `corner_br.png` (28×28, drawn by `main.txt`
at the card corners), and `theme.json`:

```json
{"hue": 326, "accent": "249-165-210"}
```

How a colour decides the rest of the interface:

- **Pictures** (transport icons, butterfly, volume thumb, corner ornaments) are simply the
  PNGs in the folder — draw them in any colour.
- **Everything the skin draws itself** (card outlines, header line, row frames, glows,
  pills, labels, also the frames `main.txt` draws) is written in the pink palette and
  recoloured with `hue` (0–359):
  - pink / rose / violet / purple tints (hue 255–360, dark, pale or vivid) move to `hue`,
    keeping 30 % of their distance from pink (326), so they stay close to `hue`;
  - warm peach / gold frames (hue 0–50) take `hue` directly, keeping their brightness;
  - greys, whites and the dark navy glass stay as they are.
  `tools/make_accent_palette.py <folder> <hue>` applies exactly this rule to the pink pictures.
  The `pink` folder is the base and draws the original design unchanged.
- **`accent`** (`r-g-b`) is foobar2000's / Panels UI's accent: native spectrum and the NATIVE
  playlist's selected rows (its other colours in `foo_ui_panels.ini` are neutral).
- Without `theme.json`, both come from `play.png`: its most frequent clearly coloured colour
  gives `hue` and `accent`. Add `theme.json` to choose them yourself.

To add a colour: copy a folder, give it a new name, replace the pictures (keep file names
and transparency) and edit `theme.json`. `python tools/make_accent_palette.py <name> <hue>`
builds a full set from `pink/` by the same hue rule. The illustrated wallpaper and the native
foobar2000/ESLyric menus are not recoloured. If the chosen folder is deleted, the skin
switches to `pink` (or the first folder).

## Light interface (Round 27)

On a light wallpaper (☰ → Interface colours → Automatic, or Light) the skin mirrors the
lightness of every colour it draws: pale text turns dark, the dark glass turns pale and a
little more opaque; hue, saturation and transparency stay. The pictures come from the
colour's `light/` subfolder, made from the folder's own PNGs by the same rule:

```
python tools/make_light_controls.py <folder>   (or no argument: every colour folder)
```

Run it again after replacing a colour's pictures. A colour without `light/` keeps its
normal pictures in the light interface.
