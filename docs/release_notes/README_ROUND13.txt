Hariiro V2 — Round 13 (2026-11-20) Windows acceptance preview

BACK UP your existing foo_ui_panels-skins/Hariiro folder and playlist configuration before replacing the skin.

1. All four colour palettes now use images/controls/{pink,violet,blue,teal}/.
2. Sidebar / middle / Queue script OLE targets use Panels UI windowless routing and explicit accept/reject rules.
3. External files dropped onto empty Playlist sidebar space create an ordinary playlist only after actual tracks arrive.
4. The blank header uses the main-window pseudo-caption drag region; Desk ON now paints above the footer backing.
5. This is NOT a verified fix for drops onto the NATIVE playlist component or unhandled main-window gaps. A Panels UI DLL change would be needed for absolute suppression of native fallback imports.

See docs/ROUND13_REVIEW.md for the complete interaction matrix and test limitations.
No experimental DLLs are included.
