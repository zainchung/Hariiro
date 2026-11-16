// Anna Glass V2, Stage 2B - transparent library / playlist navigator.
// This panel intentionally paints NO opaque background.
// It requires Panels UI (reborn) + JS Panel 1.7.0 (windowless and transparent).
'use strict';

const ROW = 26;
const TABS = 32;
const NORMAL = gdi.Font('Segoe UI', 12, 0);
const SMALL = gdi.Font('Segoe UI', 10, 0);
const BOLD = gdi.Font('Segoe UI', 11, 1);
const TXT = 0xFFE9F0FB;
const MUTED = 0xFFC0CEE3;
const BORDER = 0x6686A7C9;
const HOT = 0x66567BA7;
const SELECTED = 0x70B25765;
const DT = 0x8024; // single line | vertical center | end ellipsis

let mode = 'artists';
let scroll = 0;
let hover = -1;
let picked = -1;
let artists = [];
let artistHandles = [];
let error = '';

function clamp(n, low, high) { return Math.min(high, Math.max(low, n)); }
function loadArtists() {
    try {
        const lib = fb.GetLibraryItems();
        artistHandles = lib.Convert();
        const values = fb.TitleFormat('$if2(%album artist%,$if2(%artist%,Unknown Artist))').EvalWithMetadbs(lib);
        const byName = new Map();
        for (let i=0; i<values.length; ++i) {
            const name = String(values[i] || 'Unknown Artist');
            let row = byName.get(name);
            if (!row) { row = {name, indices: []}; byName.set(name, row); }
            row.indices.push(i);
        }
        artists = [...byName.values()].sort((a,b)=>a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
        error = '';
    } catch (e) { artists = []; error = 'Library: ' + String(e); }
    scroll=0;
    window.Repaint();
}
function entries() {
    if (mode==='artists') return artists;
    const out=[];
    for (let i=0;i<plman.PlaylistCount;i++) {
        out.push({name:plman.GetPlaylistName(i), index:i, count:plman.PlaylistItemCount(i)});
    }
    return out;
}
function activeRow(item) { return mode==='playlists' && item.index===plman.ActivePlaylist; }
function on_paint(gr) {
    const w=window.Width, h=window.Height;
    // A translucent control strip: background artwork remains visible.
    gr.FillSolidRect(0,0,w,TABS,0x48202B47);
    gr.FillSolidRect(mode==='artists' ? 4 : Math.floor(w/2)+2,TABS-3,Math.max(10,Math.floor(w/2)-6),2,0xFFE5B675);
    gr.GdiDrawText('Artists',BOLD,mode==='artists'?TXT:MUTED,5,1,Math.floor(w/2)-7,TABS-4,DT);
    gr.GdiDrawText('Playlists',BOLD,mode==='playlists'?TXT:MUTED,Math.floor(w/2)+4,1,Math.floor(w/2)-8,TABS-4,DT);
    if (error) { gr.GdiDrawText(error,SMALL,TXT,5,TABS+8,w-12,62,0x10); return; }
    const rows=entries();
    const avail=Math.max(0,h-TABS);
    scroll=clamp(scroll,0,Math.max(0,rows.length*ROW-avail));
    const first=Math.floor(scroll/ROW), visible=Math.ceil(avail/ROW)+1;
    for (let i=first;i<Math.min(rows.length,first+visible);i++) {
        const y=TABS+i*ROW-scroll;
        if (y+ROW<TABS || y>=h)continue;
        const item=rows[i];
        if (activeRow(item)) gr.FillSolidRect(2,y+1,w-7,ROW-2,SELECTED);
        else if (i===hover) gr.FillSolidRect(2,y+1,w-7,ROW-2,HOT);
        gr.DrawRect(2,y+1,Math.max(1,w-7),ROW-2,1,activeRow(item)?0xFFE4BE87:BORDER);
        const label = (mode==='artists' ? '♪ ' : '▸ ') + item.name;
        gr.GdiDrawText(label,NORMAL,TXT,8,y+2,Math.max(30,w-48),ROW-5,DT);
        const n=mode==='artists'?item.indices.length:item.count;
        gr.GdiDrawText(String(n),SMALL,MUTED,Math.max(0,w-40),y+2,27,ROW-5,DT);
    }
    if (rows.length===0) gr.GdiDrawText(mode==='artists'?'No library items':'No playlists',NORMAL,MUTED,8,TABS+14,w-16,30,DT);
    if (rows.length*ROW>avail && avail>0) {
        const thumb=Math.max(20,Math.floor(avail*avail/(rows.length*ROW)));
        const ty=TABS+Math.floor((avail-thumb)*scroll/Math.max(1,rows.length*ROW-avail));
        gr.FillSolidRect(w-4,ty,3,thumb,0x88D8C8B4);
    }
}
function choose(x,y,doubleClick) {
    const w=window.Width;
    if(y<TABS) {
        mode=x<w/2?'artists':'playlists';
        scroll=0; hover=-1; picked=-1; window.Repaint(); return;
    }
    const rows=entries(), i=Math.floor((y-TABS+scroll)/ROW);
    if(i<0 || i>=rows.length)return;
    picked=i;
    if (mode==='playlists') {
        plman.ActivePlaylist=rows[i].index;
    } else if (doubleClick) {
        // Loading an artist populates a separate playlist: existing playlists aren't overwritten.
        try {
            const p=plman.FindOrCreatePlaylist('Anna - Library Selection',true);
            if(p<0) throw new Error('Could not create playlist');
            const list=fb.CreateHandleList();
            for(const index of rows[i].indices) list.Add(artistHandles[index]);
            plman.ClearPlaylist(p);
            plman.InsertPlaylistItems(p,0,list);
            plman.ActivePlaylist=p;
        } catch(e) { error='Selection: '+String(e); }
    }
    window.Repaint();
}
function on_mouse_lbtn_up(x,y){ choose(x,y,false); }
function on_mouse_lbtn_dblclk(x,y){ choose(x,y,true); }
function on_mouse_move(x,y){ const n=y<TABS?-1:Math.floor((y-TABS+scroll)/ROW); if(n!==hover){hover=n;window.Repaint();} }
function on_mouse_leave(){hover=-1;window.Repaint();}
function on_mouse_wheel(step){const h=window.Height-TABS;scroll=clamp(scroll-step*ROW*3,0,Math.max(0,entries().length*ROW-h));window.Repaint();}
function on_playlist_switch(){window.Repaint();}
function on_playlists_changed(){window.Repaint();}
function on_playlist_items_added(){window.Repaint();}
function on_playlist_items_removed(){window.Repaint();}
function on_library_items_added(){loadArtists();}
function on_library_items_removed(){loadArtists();}
function on_library_items_changed(){loadArtists();}
function on_size(){window.Repaint();}
loadArtists();

// Stage 2G: skin header messages. Keep local tab and list behaviour unchanged.
function on_notify_data(name, info) {
    if (name !== 'Playlists') return;
    const action = String(info || '').toLowerCase();
    if (action === 'artists' || action === 'playlists') {
        mode = action; scroll=0; hover=-1; picked=-1;
    } else if (action === 'favorites') {
        mode = 'playlists'; scroll=0; hover=-1; picked=-1;
        const candidates = ['favorites','favourites','お気に入り','收藏','我的最爱','喜欢'];
        for (let p=0;p<plman.PlaylistCount;p++) {
            const n=String(plman.GetPlaylistName(p)).toLowerCase();
            if (candidates.some(q=>n === q || n.indexOf(q)>=0)) {
                plman.ActivePlaylist=p;
                break;
            }
        }
    } else if (action === 'nowplaying') {
        mode='playlists'; scroll=0; hover=-1; picked=-1;
        const playing=plman.PlayingPlaylist;
        if (Number.isInteger(playing) && playing>=0 && playing<plman.PlaylistCount) plman.ActivePlaylist=playing;
    } else return;
    window.Repaint();
}
