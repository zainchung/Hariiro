# Anna GLASS — replaceable transparent controls

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

The native foobar2000 **Shuffle (folders)** playback order is intentionally not exposed by Anna GLASS and has no dedicated PNG. Native playback order index 6 still exists in foobar2000.

The ±5-second PNGs contain an explicit **5s** label. The extra note and disc badges are enlarged in the two shuffle assets.

## Anna Glass accent palettes

Default Rose pink assets are now in `pink/`; `violet/`, `blue/`, and `teal/`
subfolders contain alpha-preserving variants with matching filenames.
The setting changes vector accent colors and footer icons, **not** the
illustrated wallpaper or the native foobar2000/ESLyric menus.
To create custom palettes, keep filenames and transparency unchanged.
