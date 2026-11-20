// Anna Glass V2, Stage 3I.1 - synchronized selection/playing palette in transparent navigator.
// This panel intentionally paints NO opaque background.
// It requires Panels UI (reborn) + JS Panel 1.7.0 (transparent child window, scaled by AnnaDpi).
'use strict';
include('anna_i18n.js');
include('anna_theme.js');
include('anna_playlist_dedup.js');
include('anna_shared.js');
include('anna_scratch_views.js');
include('anna_dpi.js');
include('anna_drop_fix.js');

const ROW = 30;
const TABS = 8; // main navigation moved to the shared header
const NORMAL = AnnaDpi.font('Yu Gothic UI', 12, 0);
const SMALL = AnnaDpi.font('Segoe UI', 10, 0);
const BOLD = AnnaDpi.font('Yu Gothic UI', 12, 1);
const TXT = 0xFFE9F0FB;
const MUTED = 0xFFC0CEE3;
// Match Stage 3I GlassPlaylist's exact alpha/RGB values.
const BORDER = 0x58A4AFCB;
const NORMAL_BG = 0x41121D38;
const HOT = 0x48324667;
const SELECTED = 0x86864B75;
const PLAYING = 0x755B3568;
const SELECTED_BORDER = 0xFFFFB7D8;
const PLAYING_BORDER = 0xFFE8ACCD;
const GLOW = 0x48FF9FD0;
const DT = 0x8024; // single line | vertical center | end ellipsis

let mode = 'playlists'; // matches the initial Library tab highlighted in main.txt
let scroll = 0;
let hover = -1;
let picked = -1;
let playlistDrag=null,playlistWasDragged=false,playlistReorder=null,playlistDropTarget=-1,dragPointerY=0;
let pressedAt=null,pressedMoved=false;
// Classify direction BEFORE starting OLE: vertical -> playlist sort only;
// horizontal -> source track list intended for Queue. The Panels UI host
// must dispatch rejected drops (Effect=0), including self-returns.
// Ordinary playlists can ALSO be reordered, so they need a direction test.
// Artist and pinned rows cannot be reordered, so a short rightward pull is enough
// (a diagonal drag toward a lower Queue/target no longer needs to be "horizontal").
const DRAG_START_X=34,DRAG_START_Y=10,EXPORT_ONLY_START_X=14;
function isOutwardDrag(dx,dy){return dx>=DRAG_START_X&&Math.abs(dx)>Math.abs(dy)*1.2;}
function isSortDrag(dx,dy){return Math.abs(dy)>DRAG_START_Y&&Math.abs(dy)>Math.abs(dx)*0.8;}
let scrollingThumb=false,scrollThumbGrab=0;
// Native OLE drop targets: album/track selection in Glass can be copied into
// any ordinary playlist; pinned sources and Artist mode reject drops.
let trackDropTarget=-1,trackDropNotice='',trackDropInProgress=false;
let sidebarOLEInProgress=false; // prevent internal OLE loops
let sidebarOLEClearTimer=0;
const origin=AnnaShared.getOrigin;
function clearSidebarDragMarker(){sidebarOLEClearTimer=0;AnnaShared.clearOriginIf('sidebar:');}
function dropRowIsEditable(row){return !!row&&editablePlaylistRow(row)&&!plman.IsPlaylistLocked(row.index);}

function playlistRowAt(y){
 if(y<TABS || y>=AnnaDpi.height())return null;
 const i=Math.floor((y-TABS+scroll)/ROW),rows=entries();
 return {i,row:rows[i]||null};
}
function clearTrackDrop(){trackDropTarget=-1;trackDropNotice='';trackDropInProgress=false;window.Repaint();}
// Only native OLE data with no Anna source marker is considered external.
// OLE from our Glass panel may copy tracks to ordinary playlists, never create
// a playlist by dropping onto blank sidebar space.
function isExternalFileDrop(){return !origin();}
const IMPORT_STAGING_PROPERTY='Anna.Sidebar.ImportStaging.v1';
let importStageName=String(window.GetProperty(IMPORT_STAGING_PROPERTY,'')||'');
let importStageTimer=0;
function stagingPlaylist(){
 if(importStageName){const p=plman.FindPlaylist(importStageName);if(p>=0)return p;}
 for(let i=0;i<10000;i++){
  const name=AnnaShared.LIST.importStaging+(i?' #'+(i+1):'');
  if(plman.FindPlaylist(name)>=0)continue;
  const p=plman.CreatePlaylist(plman.PlaylistCount,name);
  if(p>=0){importStageName=name;window.SetProperty(IMPORT_STAGING_PROPERTY,name);return p;}
 }
 return -1;
}
function blankDropAllowed(y){
 return mode==='playlists'&&isExternalFileDrop()&&
  (y<TABS||!playlistRowAt(y).row);
}
function on_drag_enter(action,x,y){on_drag_over(action,x,y);}
function glassOriginIndex(){const src=AnnaShared.parseOrigin(origin());return src.kind==='glass'?src.index:-2;}
// Tracks dragged out of the middle list may be copied into any ORDINARY playlist
// except the one they came from. Artist and pinned rows are read-only (warning).
function on_drag_over(action,x,y){
 const src=origin();
 // Sidebar-to-sidebar can only reorder locally without OLE.
 if(sidebarOLEInProgress||src.startsWith('sidebar:')||mode==='artists'){
  action.Effect=0;trackDropTarget=-1;
  trackDropNotice=mode==='artists'?AnnaI18n.t('artistHint'):AnnaI18n.t('sidebarToMiddleDenied');
  trackDropInProgress=true;window.Repaint();return;
 }
 const hit=playlistRowAt(y);
 const target=hit&&dropRowIsEditable(hit.row)?hit:null;
 const same=!!target&&src.startsWith('glass:')&&target.row.index===glassOriginIndex();
 const readOnlyRow=!target&&!!hit&&!!hit.row;
 const newList=!target&&blankDropAllowed(y);
 trackDropTarget=target&&!same?target.i:-1;
 trackDropNotice=same?AnnaI18n.t('sameListDenied'):
   target?AnnaI18n.t('dropTo')+' '+target.row.name:
   newList?AnnaI18n.t('dropNewPlaylist'):
   readOnlyRow?AnnaI18n.t('listReadOnlyDrop'):AnnaI18n.t('dropEditable');
 action.Effect=(target&&!same)||newList?1:0;
 trackDropInProgress=true;window.Repaint();
}
function on_drag_leave(){clearTrackDrop();}
function on_drag_drop(action,x,y){
 const src=origin();
 if(sidebarOLEInProgress||src.startsWith('sidebar:')||mode==='artists'){
  action.Effect=0;clearTrackDrop();return;
 }
 const hit=playlistRowAt(y),row=hit&&hit.row;
 const ordinary=dropRowIsEditable(row);
 const isBlank=!ordinary&&blankDropAllowed(y);
 if(!ordinary&&!isBlank){action.Effect=0;clearTrackDrop();return;}
 if(ordinary&&src.startsWith('glass:')&&row.index===glassOriginIndex()){action.Effect=0;clearTrackDrop();return;}
 try{
  const p=isBlank?stagingPlaylist():row.index;
  if(p<0)throw new Error(AnnaI18n.t('playlistCreateFailed'));
  // The host only commits accepted playable files/tracks after Drop returns.
  // For blank space, a staging callback creates a real playlist ONLY when
  // at least one playable track was imported.
  if(!isBlank)activateDropTarget(p);
  action.Playlist=p;action.Base=plman.PlaylistItemCount(p);
  action.ToSelect=!isBlank;action.Effect=1;error='';
 }catch(e){action.Effect=0;error=AnnaI18n.t('dropFailed')+': '+String(e);}
 clearTrackDrop();
}
function activateDropTarget(p){
 plman.ActivePlaylist=p;setEditable(p);
 picked=entries().findIndex(e=>e.kind==='playlist'&&e.index===p);
}
// Files from another program never reach on_drag_drop (see anna_drop_fix.js):
// the same decision as on_drag_drop, for AnnaDropFix to carry out.
function externalDropPlan(_x,y){
 if(mode==='artists')return {kind:'reject'};
 const hit=playlistRowAt(y),row=hit&&hit.row;
 if(dropRowIsEditable(row))return {kind:'playlist',p:row.index,select:true,activate:true};
 if(blankDropAllowed(y)){const s=stagingPlaylist();if(s>=0)return {kind:'playlist',p:s,select:false,activate:false};}
 return {kind:'reject'};
}
function completeStagingImport(){
 importStageTimer=0;
 const stage=importStageName?plman.FindPlaylist(importStageName):-1;
 if(stage<0)return;
 try{
  const list=plman.GetPlaylistItems(stage);
  if(!list||list.Count<=0)return; // no audio -> no new ordinary playlist
  const base=AnnaI18n.t('importedPlaylistName');
  let name=base,number=2;
  while(plman.FindPlaylist(name)>=0)name=base+' ('+(number++)+')';
  const p=plman.CreatePlaylist(plman.PlaylistCount,name);
  if(p<0)throw new Error(AnnaI18n.t('playlistCreateFailed'));
  refreshOrdinaryBaseline(p); // Record the empty normal playlist before the first insertion.
  // Deduplicate a newly created ordinary playlist before insertion.
  const unique=AnnaPlaylistDedup.uniqueHandleList(list,()=>fb.CreateHandleList());
  plman.InsertPlaylistItems(p,0,unique);
  if(typeof plman.SortByFormatV2==='function')plman.SortByFormatV2(p,SORT_EXPR,1);
  plman.ClearPlaylist(stage);
  plman.ActivePlaylist=p;setEditable(p);
  picked=entries().findIndex(e=>e.kind==='playlist'&&e.index===p);
  plman.SetPlaylistSelectionSingle(p,0,true);
  plman.SetPlaylistFocusItem(p,0);
  plman.EnsurePlaylistItemVisible(p,0);
  error='';
 }catch(e){error=AnnaI18n.t('importFailed')+': '+String(e);}
 window.Repaint();
}
function onStagingItemsAdded(p){
 if(!importStageName||p!==plman.FindPlaylist(importStageName))return false;
 if(importStageTimer)window.ClearTimeout(importStageTimer);
 importStageTimer=window.SetTimeout(completeStagingImport,550);
 return true;
}

function sidebarScrollbar(){
 const h=AnnaDpi.height(),w=AnnaDpi.width(),avail=Math.max(1,h-TABS);
 const max=Math.max(0,entries().length*ROW-avail);
 if(max<=0)return null;
 const thumb=Math.min(avail,Math.max(28,Math.floor(avail*avail/(avail+max))));
 const travel=Math.max(1,avail-thumb);
 return {x:w-13,top:TABS,height:avail,thumb,travel,max,
  y:TABS+Math.round(travel*scroll/max)};
}
function dragSidebarScrollbar(y){
 const b=sidebarScrollbar();if(!b)return;
 scroll=clamp(Math.round((y-scrollThumbGrab-b.top)/b.travel*b.max),0,b.max);
 window.Repaint();
}

// Both browse modes open a sorted working view, never reorder saved playlists.
const SORTED_VIEW = AnnaShared.LIST.sortedView;
const ARTIST_VIEW = AnnaShared.LIST.artistView;
// Scratch-view registry (own, unreferenced copies only): js/anna_scratch_views.js.
function pruneScratchViews(){return AnnaScratchViews.prune();}

const FAVORITES = AnnaShared.LIST.favorites;
// Ordinary playlists are real foobar2000 lists; obsolete virtual-folder UI code is removed.
let loadingView = false;
let artists = [];
let artistHandles = [];
let libraryCount = 0;
let error = '';
let playingArtistKey = '';
const TF_PLAYING_ARTIST = fb.TitleFormat('$if2(%album artist%,$if2(%artist%,Unknown Artist))');
function nameKey(s) { return String(s || '').trim().toLocaleLowerCase(); }
function findFavoriteIndex(list, handle) {
    if(!handle)return -1;
    try {return list.Find(handle);}catch(e){}
    const items=list.Convert();
    return items.findIndex(h=>h && h.Path===handle.Path && h.SubSong===handle.SubSong);
}
function updateFavoriteIndicator() {
    try {
        const h=fb.GetNowPlaying(),p=plman.FindPlaylist(FAVORITES);
        const active=h && p>=0 && findFavoriteIndex(plman.GetPlaylistItems(p),h)>=0;
        if(typeof panelsui!=='undefined'){
            const val=active?'1':'0';
            if(panelsui.GetVariable(AnnaShared.PVAR.favoriteCurrent,'0')!==val)
                panelsui.SetVariable(AnnaShared.PVAR.favoriteCurrent,val);
        }
    } catch(e){console.log('Anna favorite state: '+String(e));}
}
function toggleCurrentFavorite() {
    const h=fb.GetNowPlaying();
    if(!h){error=AnnaI18n.t('noPlayingToFavorite');window.Repaint();return;}
    try {
        const existing=plman.FindPlaylist(FAVORITES);
        const p=existing>=0?existing:plman.FindOrCreatePlaylist(FAVORITES,true);
        if(p<0 || plman.IsPlaylistLocked(p))throw new Error('Favorites playlist is locked');
        const index=findFavoriteIndex(plman.GetPlaylistItems(p),h);
        if(index>=0){
            if(p===plman.PlayingPlaylist)throw new Error('Cannot remove an item from the playing Favorites playlist');
            plman.UndoBackup(p);
            plman.ClearPlaylistSelection(p);
            plman.SetPlaylistSelectionSingle(p,index,true);
            plman.RemovePlaylistSelection(p,false);
        } else {
            const tracks=fb.CreateHandleList();
            tracks.Add(h);
            plman.UndoBackup(p);
            plman.InsertPlaylistItems(p,plman.PlaylistItemCount(p),tracks);
        }
        error='';
        updateFavoriteIndicator();
    }catch(e){error=AnnaI18n.t('favoritesFailed')+': '+String(e);console.log(error);}
    window.Repaint();
}
function refreshPlayingArtist() {
    try {
        const h = fb.GetNowPlaying();
        playingArtistKey = h ? nameKey(TF_PLAYING_ARTIST.EvalWithMetadb(h)) : '';
    } catch (e) { playingArtistKey = ''; }
    updateFavoriteIndicator();
    window.Repaint();
}

function clamp(n, low, high) { return Math.min(high, Math.max(low, n)); }
function loadArtists() {
    try {
        const lib = fb.GetLibraryItems();
        artistHandles = lib.Convert();
        libraryCount = artistHandles.length;
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
    } catch (e) { artists = []; libraryCount=0; error = AnnaI18n.t('libraryFailed')+': '+String(e); }
    scroll=0;
    picked=-1; // artist index is no longer stable after a library rebuild
    window.Repaint();
}
// These three entries are permanent, even when their underlying playlists are empty.
// A search result may live in a numbered owned scratch slot: never clear it here.
function searchOwnedNames(){
 try{return new Set(JSON.parse(String(panelsui.GetVariable(AnnaShared.PVAR.searchOwned,'[]')||'[]')));}
 catch(e){return new Set();}
}
function currentSearchPlaylist(){
 const owned=searchOwnedNames();
 const hint=typeof panelsui!=='undefined'?String(panelsui.GetVariable(AnnaShared.PVAR.searchName,'')||''):'';
 if(hint&&owned.has(hint)){
  const p=plman.FindPlaylist(hint);if(p>=0)return p;
 }
 const active=plman.ActivePlaylist;
 if(active>=0&&owned.has(plman.GetPlaylistName(active)))return active;
 for(const name of owned){const p=plman.FindPlaylist(name);if(p>=0)return p;}
 return -1;
}
function fixedRow(item){return !!item&&['library','fixedFavorites','fixedSearch'].includes(item.kind);}
function editablePlaylistRow(item){return !!item&&item.kind==='playlist'&&item.index>=0;}
function entries() {
 if(mode==='artists')return artists;
 const fav=plman.FindPlaylist(FAVORITES),search=currentSearchPlaylist();
 const out=[
   {kind:'library',name:AnnaShared.LIST.library,index:-1,count:libraryCount},
   {kind:'fixedFavorites',name:FAVORITES,index:fav,count:fav>=0?plman.PlaylistItemCount(fav):0},
   {kind:'fixedSearch',name:'Anna - Search Result',index:search,count:search>=0?plman.PlaylistItemCount(search):0}
 ];
 const buffer=typeof panelsui!=='undefined'?String(panelsui.GetVariable(AnnaShared.PVAR.queueBuffer,'')||''):'';
 const searchOwned=searchOwnedNames();
 for(let i=0;i<plman.PlaylistCount;i++){
  const name=plman.GetPlaylistName(i);
  if(name===FAVORITES||name===buffer||name===importStageName||AnnaScratchViews.isOwned(name)||searchOwned.has(name))continue;
  out.push({kind:'playlist',name,index:i,count:plman.PlaylistItemCount(i)});
 }
 return out;
}
function selectedRow(item, i) {
    return i === picked || (mode === 'playlists' && item.index === plman.ActivePlaylist);
}
function playingRow(item) {
    if (mode === 'playlists') return plman.PlayingPlaylist >= 0 && item.index === plman.PlayingPlaylist;
    return !!playingArtistKey && nameKey(item.name) === playingArtistKey;
}
function on_paint(gr) {
    gr=AnnaTheme.graphics(gr);
    const w=AnnaDpi.width(), h=AnnaDpi.height();
    // Navigation labels live in the skin header: more room for artist/library rows.
    gr.FillSolidRect(0,0,w,TABS,0x30202B47);
    // Errors are a nonblocking overlay: user can still use context menus to recover.
    const rows=entries();
    const avail=Math.max(0,h-TABS);
    scroll=clamp(scroll,0,Math.max(0,rows.length*ROW-avail));
    const first=Math.floor(scroll/ROW), visible=Math.ceil(avail/ROW)+1;
    for (let i=first;i<Math.min(rows.length,first+visible);i++) {
        const y=TABS+i*ROW-scroll;
        if (y+ROW<TABS || y>=h)continue;
        const item=rows[i];
        const selected = selectedRow(item, i), playing = playingRow(item);
        const x=2, y0=y+1, width=Math.max(1,w-7), height=ROW-2;
        const fill = selected ? SELECTED : playing ? PLAYING : i===hover ? HOT : NORMAL_BG;
        const frame = selected ? SELECTED_BORDER : playing ? PLAYING_BORDER : BORDER;
        if (selected && width>10){
            gr.DrawRoundRect(x-2,y0-2,width+4,height+4,6,6,1,0x35ff91ce);
            gr.DrawRoundRect(x-1,y0-1,width+2,height+2,5,5,1,GLOW);
        }
        gr.FillRoundRect(x,y0,width,height,4,4,fill);
        if(selected){
            // Fine enamel highlight, close to the reference without turning
            // the whole row opaque over the cherry-blossom wallpaper.
            gr.FillSolidRect(x+11,y0+2,Math.max(1,width-22),1,0x8affe0ef);
        }
        gr.DrawRoundRect(x,y0,width,height,4,4,1,frame);
        if (playing) gr.FillSolidRect(4,y+6,3,ROW-12,PLAYING_BORDER);
        else if (selected) gr.FillSolidRect(4,y+6,3,ROW-12,SELECTED_BORDER);
        // Count is always the real number of tracks from the library/playlist,
        // not a playback count, rating, or a made-up category statistic.
        const isLibrary=mode==='playlists' && item.kind==='library';
        const isFavorite=mode==='playlists' && item.kind==='fixedFavorites';
        const isSearch=mode==='playlists' && item.kind==='fixedSearch';
        const icon=i===hover?'⇥':mode==='artists'?'♪':isLibrary?'♫':isFavorite?'☆':isSearch?'⌕':'≡';
        const indent=item.indent?12:0;
        gr.GdiDrawText(icon,selected?BOLD:NORMAL,
            selected?0xffffc7e4:(playing?0xfff3d9b4:0xffe9bad7),
            9+indent,y+2,19,ROW-5,DT);
        gr.GdiDrawText(item.name,selected||playing?BOLD:NORMAL,
            TXT,29+indent,y+2,
            Math.max(20,w-80-indent),ROW-5,DT); // GDI text at 2x is a little wider than the host's scaled text
        const n=mode==='artists'?item.indices.length:item.count;
        gr.GdiDrawText(Number(n).toLocaleString('en-US'),selected?BOLD:SMALL,
            selected?0xffffdfed:MUTED,Math.max(25,w-56),y+2,46,ROW-5,
            0x2|0x4|0x20);
    }
    if (rows.length===0) gr.GdiDrawText(mode==='artists'?'No library items':'No playlists',NORMAL,MUTED,8,TABS+14,w-16,30,DT);
    if(error){
        gr.FillRoundRect(3,Math.max(TABS+3,h-46),Math.max(20,w-7),40,4,4,0xe328294b);
        gr.GdiDrawText(error,SMALL,0xffffd2e0,8,Math.max(TABS+4,h-43),
            Math.max(20,w-16),34,0x10);
    }
    if(trackDropInProgress){
      if(trackDropTarget>=0){
       const top=TABS+trackDropTarget*ROW-scroll;
       gr.FillRoundRect(1,top+1,Math.max(1,w-17),ROW-2,5,5,0x9eac5688);
       gr.DrawRoundRect(1,top+1,Math.max(1,w-17),ROW-2,5,5,2,0xffffd0ed);
       gr.GdiDrawText('＋ ADD TRACKS',SMALL,0xfffff2fc,19,top+3,w-30,ROW-6,DT);
      }
      gr.GdiDrawText(trackDropNotice,SMALL,0xffffe8f5,5,Math.max(TABS,h-24),w-21,21,DT);
    }
    if(playlistReorder){
      if(playlistDropTarget>=0){
        const iy=TABS+playlistDropTarget*ROW-scroll;
        gr.FillRoundRect(0,Math.max(TABS,iy)-2,w-13,4,2,2,0xc4ff9dca);
        gr.FillEllipse(0,Math.max(TABS,iy)-5,10,10,0xffffc5e4);
      }
      const gy=clamp(dragPointerY-ROW/2,TABS,Math.max(TABS,h-ROW));
      gr.FillRoundRect(2,gy,w-17,ROW-3,5,5,0xb55b345d);
      gr.DrawRoundRect(2,gy,w-17,ROW-3,5,5,1,0xffffc2e2);
      gr.GdiDrawText('⇅  '+playlistReorder.name,SMALL,0xffffeff8,12,gy+3,w-31,ROW-9,DT);
    }
    const bar=sidebarScrollbar();
    if(bar){
        gr.FillRoundRect(w-13,bar.top,10,bar.height,5,5,0x46312749);
        gr.FillRoundRect(w-11,bar.y,6,bar.thumb,3,3,scrollingThumb?0xffffd5e9:0xc3edbad3);
    }
}
// Stable sort by album, then disc number, then track number. A source playlist
// stays untouched, so its original order and all undo history are preserved.
const TF_ALBUM_SORT=fb.TitleFormat('$if2(%album%,~Singles)');
const TF_ARTIST_SORT=fb.TitleFormat('$if2(%album artist%,$if2(%artist%,Unknown Artist))');
const TF_DISC_SORT=fb.TitleFormat('$num(%discnumber%,4)');
const TF_TRACK_SORT=fb.TitleFormat('$num(%tracknumber%,5)');
function loadSortedView(source,name) {
    if(loadingView) return;
    loadingView=true;
    try {
        const handles=source.Convert();
        const alb=TF_ALBUM_SORT.EvalWithMetadbs(source);
        const art=TF_ARTIST_SORT.EvalWithMetadbs(source);
        const discs=TF_DISC_SORT.EvalWithMetadbs(source);
        const tracks=TF_TRACK_SORT.EvalWithMetadbs(source);
        const idx=handles.map((_,i)=>i);
        const cmp=(a,b)=>String(a).toLocaleLowerCase().localeCompare(String(b).toLocaleLowerCase());
        idx.sort((a,b)=>cmp(alb[a],alb[b]) || cmp(art[a],art[b]) ||
            (Number(discs[a])||0)-(Number(discs[b])||0) ||
            (Number(tracks[a])||0)-(Number(tracks[b])||0) || a-b);
        const sorted=fb.CreateHandleList();
        for(const i of idx) sorted.Add(handles[i]);
        const dest=AnnaScratchViews.claim(name);
        plman.ClearPlaylist(dest);
        if(sorted.Count) plman.InsertPlaylistItems(dest,0,sorted);
        // The native classic playlist cannot intercept external file drops. An
        // AddItems lock keeps an Artist/Music Library working copy read-only;
        // playlist mode selects real user playlists, which stay editable.
        try{plman.SetPlaylistLockedActions(dest,['AddItems']);}
        catch(e){console.log('Anna scratch import protection unavailable: '+String(e));}
        plman.ActivePlaylist=dest;
    } finally { loadingView=false; }
    try{pruneScratchViews();}catch(e){console.log('Anna scratch cleanup: '+String(e));}
}
const SORT_EXPR='$lower($if2(%album%,~Singles))|$num(%discnumber%,4)|'+
 '$num(%tracknumber%,5)|$lower($if2(%album artist%,$if2(%artist%,Unknown Artist)))';
let watchIndex=-1,watchName='',knownTracks=new Map(),pendingAdds=[],sortImportTimer=0;
function trackKey(h){return h?String(h.Path)+'#'+String(h.SubSong||0):'';}
function keyCounts(p){
 const map=new Map();if(p<0)return map;
 for(const h of plman.GetPlaylistItems(p).Convert()){
  const k=trackKey(h);map.set(k,(map.get(k)||0)+1);
 }
 return map;
}
// Track pre-import file paths for every ordinary playlist, including playlists
// that are not currently active. The foobar2000 OLE host inserts tracks after
// on_drag_drop returns, so the added callback must remove the excess copies.
const ordinaryPathBaselines = new Map();
const dedupRemoving = new Set();
function ordinaryPlaylistForDedup(p){
 if(!Number.isInteger(p)||p<0||p>=plman.PlaylistCount)return false;
 const name=String(plman.GetPlaylistName(p));
 if(name===FAVORITES||name===importStageName||AnnaScratchViews.isOwned(name)||searchOwnedNames().has(name))return false;
 try{if(name===String(panelsui.GetVariable(AnnaShared.PVAR.queueBuffer,'')||''))return false;}catch(e){}
 return true;
}
function ordinaryToken(p){
 const name=String(plman.GetPlaylistName(p));
 let serial=0;
 for(let i=0;i<=p;i++)if(String(plman.GetPlaylistName(i))===name)serial++;
 return name+'\u0000'+serial;
}
function pathSnapshot(p){return AnnaPlaylistDedup.paths(plman.GetPlaylistItems(p).Convert());}
function syncOrdinaryBaselines(){
 const present=new Set();
 for(let p=0;p<plman.PlaylistCount;p++)if(ordinaryPlaylistForDedup(p)){
  const token=ordinaryToken(p);present.add(token);
  if(!ordinaryPathBaselines.has(token))ordinaryPathBaselines.set(token,pathSnapshot(p));
 }
 for(const token of ordinaryPathBaselines.keys())if(!present.has(token))ordinaryPathBaselines.delete(token);
}
function refreshOrdinaryBaseline(p){
 if(ordinaryPlaylistForDedup(p))ordinaryPathBaselines.set(ordinaryToken(p),pathSnapshot(p));
}
function removeImportDuplicates(p, indices){
 const removed=new Set(indices), len=plman.PlaylistItemCount(p);
 const selected=[],canReadSelection=typeof plman.IsPlaylistItemSelected==='function';
 if(canReadSelection)for(let i=0;i<len;i++)if(plman.IsPlaylistItemSelected(p,i))selected.push(i);
 const focus=typeof plman.GetPlaylistFocusItemIndex==='function'?plman.GetPlaylistFocusItemIndex(p):-1;
 function selectIndices(items){
  if(!items.length)return;
  if(typeof plman.SetPlaylistSelection==='function')plman.SetPlaylistSelection(p,items,true);
  else if(typeof plman.SetPlaylistSelectionSingle==='function')for(const i of items)plman.SetPlaylistSelectionSingle(p,i,true);
 }
 plman.UndoBackup(p);
 dedupRemoving.add(p);
 try{
  plman.ClearPlaylistSelection(p);
  selectIndices(indices);
  plman.RemovePlaylistSelection(p,false); // Remove from playlist only; never delete physical files.
  if(plman.PlaylistItemCount(p)!==len-indices.length)
   throw new Error('Playlist refused to remove duplicate imports');
  // Preserve the user's selection and focused track after the removal.
  plman.ClearPlaylistSelection(p);
  const translated=i=>i-indices.filter(n=>n<i).length;
  selectIndices(selected.filter(i=>!removed.has(i)).map(translated));
  if(focus>=0&&typeof plman.SetPlaylistFocusItem==='function'){
   const adjusted=translated(focus);
   plman.SetPlaylistFocusItem(p,Math.min(Math.max(0,adjusted),Math.max(0,plman.PlaylistItemCount(p)-1)));
  }
 }finally{dedupRemoving.delete(p);}
}
function deduplicateNewTracks(p){
 if(!ordinaryPlaylistForDedup(p)||dedupRemoving.has(p))return 0;
 const token=ordinaryToken(p), after=pathSnapshot(p);
 if(!ordinaryPathBaselines.has(token)){
  ordinaryPathBaselines.set(token,after);return 0; // No earlier snapshot: never alter unknown user data.
 }
 const prior=ordinaryPathBaselines.get(token);
 const duplicates=AnnaPlaylistDedup.redundantAddedIndices(prior,after);
 try{
  if(duplicates.length&&!plman.IsPlaylistLocked(p))removeImportDuplicates(p,duplicates);
 }finally{ordinaryPathBaselines.set(token,pathSnapshot(p));}
 return duplicates.length;
}
function setEditable(p){
 watchIndex=p;watchName=p>=0?plman.GetPlaylistName(p):'';
 knownTracks=keyCounts(p);pendingAdds=[];
 try{panelsui.SetVariable(AnnaShared.PVAR.sidebarEditable,watchName);}catch(e){}
}
// Called by the middle list right before it accepts a drop: make the sidebar's
// import bookkeeping (post-import sort + reveal) follow the playlist on screen.
function syncActiveEditable(){
 const p=plman.ActivePlaylist;
 if(mode!=='playlists'||p<0||p>=plman.PlaylistCount||watchIndex===p)return;
 const rows=entries(),i=rows.findIndex(e=>e.kind==='playlist'&&e.index===p);
 if(i<0||plman.IsPlaylistLocked(p))return;
 picked=i;setEditable(p);window.Repaint();
}
function editableDestination(){
 if(mode!=='playlists'||watchIndex<0||watchIndex>=plman.PlaylistCount)return -1;
 if(plman.GetPlaylistName(watchIndex)!==watchName||plman.ActivePlaylist!==watchIndex)return -1;
 if(watchName===FAVORITES||searchOwnedNames().has(watchName)||AnnaScratchViews.isOwned(watchName))return -1;
 return plman.IsPlaylistLocked(watchIndex)?-1:watchIndex;
}
function choose(x,y,doubleClick) {
 const rows=entries(),i=Math.floor((y-TABS+scroll)/ROW);
 if(i<0||i>=rows.length)return;
 const item=rows[i];picked=i;error='';
 try{
  if(mode==='artists'){
   setEditable(-1);
   const list=fb.CreateHandleList();
   for(const k of item.indices)if(artistHandles[k])list.Add(artistHandles[k]);
   loadSortedView(list,ARTIST_VIEW);
   panelsui.SetVariable(AnnaShared.PVAR.navMode,'artists');
  }else if(item.kind==='library'){
   setEditable(-1);loadSortedView(fb.GetLibraryItems(),SORTED_VIEW);
  }else if(item.kind==='fixedFavorites'){
   setEditable(-1);
   let p=item.index;
   if(p<0)p=plman.FindOrCreatePlaylist(FAVORITES,true);
   if(p>=0)plman.ActivePlaylist=p;
  }else if(item.kind==='fixedSearch'){
   setEditable(-1);
   if(item.index>=0)plman.ActivePlaylist=item.index;
   else error=AnnaI18n.t('noSearchResults');
  }else if(editablePlaylistRow(item)){
   // Use the REAL user playlist, not a scratch copy. External drops then
   // target the actual saved playlist, and its native/Glass controls agree.
   plman.ActivePlaylist=item.index;
   setEditable(item.index);
  }
  if(mode==='playlists')panelsui.SetVariable(AnnaShared.PVAR.navMode,'library');
 }catch(e){error=AnnaI18n.t('selectionFailed')+': '+String(e);setEditable(-1);}
 window.Repaint();
}
function collectImport(p){
 if(p!==editableDestination())return;
 const next=keyCounts(p),difference=new Map(next),items=plman.GetPlaylistItems(p).Convert();
 for(const [k,old]of knownTracks)difference.set(k,Math.max(0,(difference.get(k)||0)-old));
 for(const h of items){const k=trackKey(h),n=difference.get(k)||0;if(n>0){pendingAdds.push(k);difference.set(k,n-1);}}
 knownTracks=next;
 if(!pendingAdds.length)return;
 if(sortImportTimer)window.ClearTimeout(sortImportTimer);
 sortImportTimer=window.SetTimeout(finishImport,260);
}
function finishImport(){
 sortImportTimer=0;
 const p=editableDestination();if(p<0){pendingAdds=[];return;}
 const imported=new Set(pendingAdds);pendingAdds=[];
 try{
  if(typeof plman.SortByFormatV2!=='function'||!plman.SortByFormatV2(p,SORT_EXPR,1))
   throw new Error(AnnaI18n.t('sortUnavailable'));
  const list=plman.GetPlaylistItems(p).Convert();
  const newIndex=list.findIndex(h=>imported.has(trackKey(h)));
  knownTracks=keyCounts(p);
  if(newIndex>=0){
   plman.ClearPlaylistSelection(p);
   plman.SetPlaylistSelectionSingle(p,newIndex,true);
   plman.SetPlaylistFocusItem(p,newIndex);
   plman.EnsurePlaylistItemVisible(p,newIndex);
   try{panelsui.RunAction('JSPANEL:GlassPlaylist:revealimported');}catch(e){}
  }
  error='';
 }catch(e){error=AnnaI18n.t('importFailed')+': '+String(e);console.log(error);}
 window.Repaint();
}
function openDragAsHandles(source){
 // Source permissions are distinct from destination permissions: pinned rows
 // can COPY their tracks to Queue, but never accept drops or reorder here.
 if(!source)return false;
 let handles;
 if(source.kind==='artist'){
  if(mode!=='artists')return false;
  handles=fb.CreateHandleList();
  for(const i of source.indices||[]){const track=artistHandles[i];if(track)handles.Add(track);}
 }else if(source.kind==='library'){
  if(mode!=='playlists')return false;
  handles=fb.GetLibraryItems();
 }else if(source.kind==='playlist'||source.kind==='fixedFavorites'||source.kind==='fixedSearch'){
  if(mode!=='playlists'||!Number.isInteger(source.index)||source.index<0)return false;
  // Confirm the pinned row still refers to its original source at drag time.
  if(source.kind==='fixedFavorites'&&source.index!==plman.FindPlaylist(FAVORITES))return false;
  if(source.kind==='fixedSearch'&&source.index!==currentSearchPlaylist())return false;
  handles=plman.GetPlaylistItems(source.index);
 }else return false;
 if(handles&&handles.Count){
  // This OLE session can target Queue or other panels, but not our own sidebar.
  sidebarOLEInProgress=true;
  if(sidebarOLEClearTimer){window.ClearTimeout(sidebarOLEClearTimer);sidebarOLEClearTimer=0;}
  AnnaShared.setOrigin(AnnaShared.sidebarMarker(source.kind,source.index));
  try{AnnaDpi.doDragDrop(window.ID,handles,1,{});} // COPY only: never move source entries.
  finally{
   sidebarOLEInProgress=false;clearTrackDrop();
   // OLE callbacks may arrive after the synchronous source call completes.
   sidebarOLEClearTimer=window.SetTimeout(clearSidebarDragMarker,350);
  }
  return true;
 }
}
function on_mouse_lbtn_down(x,y){
 pressedAt={x,y};pressedMoved=false;
 playlistDrag=null;playlistWasDragged=false;playlistReorder=null;playlistDropTarget=-1;
 const bar=sidebarScrollbar();
 if(bar&&x>=bar.x){scrollingThumb=true;
  scrollThumbGrab=y>=bar.y&&y<=bar.y+bar.thumb?y-bar.y:bar.thumb/2;
  dragSidebarScrollbar(y);return;}
 if(y<TABS)return;
 const row=entries()[Math.floor((y-TABS+scroll)/ROW)];
 if(!row)return;
 if(mode==='artists'){
  playlistDrag={x,y,kind:'artist',name:row.name,indices:row.indices};
 }else if(editablePlaylistRow(row)&&!plman.IsPlaylistLocked(row.index)){
  playlistDrag={x,y,index:row.index,kind:'playlist',name:row.name};
 }else if(fixedRow(row)){
  // Music Library, Favorites and Search Result are export-only Queue sources.
  // Unlike a normal playlist, these cannot be moved or dropped into.
  playlistDrag={x,y,index:row.index,kind:row.kind,name:row.name};
 }
}
function on_mouse_lbtn_up(x,y){
 const moved=pressedMoved||(pressedAt&&(Math.abs(x-pressedAt.x)>9||Math.abs(y-pressedAt.y)>9));
 pressedAt=null;pressedMoved=false;
 if(scrollingThumb){scrollingThumb=false;window.Repaint();return;}
 const dragging=playlistReorder,wasDrag=playlistWasDragged;
 playlistDrag=null;playlistWasDragged=false;playlistReorder=null;
 if(dragging&&playlistDropTarget>=0){
  const rows=entries(),target=rows[playlistDropTarget];
  if(editablePlaylistRow(target)&&dragging.name!==target.name){
   try{
    if(plman.IsPlaylistLocked(dragging.index)||plman.IsPlaylistLocked(target.index))throw new Error(AnnaI18n.t('playlistLocked'));
    if(!plman.MovePlaylist(dragging.index,target.index))throw new Error(AnnaI18n.t('cannotMovePlaylist'));
    picked=entries().findIndex(e=>e.kind==='playlist'&&e.name===dragging.name);
    const newId=plman.FindPlaylist(dragging.name);
    if(watchName===dragging.name&&newId>=0)setEditable(newId);
    error='';
   }catch(e){error=AnnaI18n.t('reorderFailed')+': '+String(e);}
  }
 }else if(!wasDrag&&!moved)choose(x,y,false);
 playlistDropTarget=-1;window.Repaint();
}
function askPlaylistName(message,title,initial=''){
 try{return String(utils.InputBox(window.ID,message,title,initial,true)||'').trim();}
 catch(e){return '';}
}
function guardedQueueReferences(p){
 if(typeof plman.GetPlaybackQueueContents!=='function')return false;
 const items=plman.GetPlaybackQueueContents();
 return Array.isArray(items)&&items.some(q=>q&&q.PlaylistIndex===p);
}
function confirmRemove(item,x=20,y=20){
 if(!editablePlaylistRow(item))return;
 const p=item.index;
 if(p===plman.PlayingPlaylist||plman.IsPlaylistLocked(p)||guardedQueueReferences(p))
    throw new Error(AnnaI18n.t('cannotDeletePlaylist'));
 const remove=typeof plman.RemovePlaylist==='function'?'RemovePlaylist':
   typeof plman.RemovePlaylistSwitch==='function'?'RemovePlaylistSwitch':'';
 if(!remove)throw new Error(AnnaI18n.t('cannotDeleteApi'));
 const result=plman[remove](p);
 if(result===false)throw new Error(AnnaI18n.t('cannotDeleteRefused'));
 picked=-1;setEditable(-1);error='';window.Repaint();
}
function on_mouse_rbtn_up(x,y){
 try{
  const menu=window.CreatePopupMenu(),rows=entries();
  const i=Math.floor((y-TABS+scroll)/ROW),row=i>=0?rows[i]:null;
  if(mode!=='playlists'){
   menu.AppendMenuItem(0,1,AnnaI18n.t('artistHint'));
   AnnaDpi.popup(menu,x,y);return true;
  }
  menu.AppendMenuItem(0,1,AnnaI18n.t('createPlaylist'));
  if(editablePlaylistRow(row)){
   menu.AppendMenuSeparator();
   menu.AppendMenuItem(0,2,AnnaI18n.t('renamePlaylist'));
   menu.AppendMenuItem(0,3,AnnaI18n.t('removePlaylist'));
   menu.AppendMenuItem(0,4,AnnaI18n.t('importFolder'));
   menu.AppendMenuItem(0,6,AnnaI18n.t('duplicatePlaylist'));
  }
  const cmd=AnnaDpi.popup(menu,x,y);
  if(cmd===1){
   const name=askPlaylistName(AnnaI18n.t('newPlaylistName'),AnnaI18n.t('createPlaylist'));
   if(!name)return true;
   if(plman.FindPlaylist(name)>=0)throw new Error(AnnaI18n.t('playlistExists'));
   const p=plman.CreatePlaylist(plman.PlaylistCount,name);
   if(p<0)throw new Error(AnnaI18n.t('playlistCreateFailed'));
   refreshOrdinaryBaseline(p);
   plman.ActivePlaylist=p;setEditable(p);picked=entries().findIndex(e=>e.index===p);
  }else if(cmd===2&&editablePlaylistRow(row)){
   const name=askPlaylistName(AnnaI18n.t('newName'),AnnaI18n.t('renamePlaylist'),row.name);
   if(name&&name!==row.name){
    if(plman.FindPlaylist(name)>=0)throw new Error(AnnaI18n.t('playlistExists'));
    if(!plman.RenamePlaylist(row.index,name))throw new Error(AnnaI18n.t('playlistRenameFailed'));
    if(watchName===row.name)setEditable(row.index);
   }
  }else if(cmd===3&&editablePlaylistRow(row))confirmRemove(row,x,y);
  else if(cmd===6&&editablePlaylistRow(row)){
   if(typeof plman.DuplicatePlaylist!=='function')throw new Error(AnnaI18n.t('playlistDuplicateUnsupported'));
   const base=row.name+' - Copy';let name=base,n=2;
   while(plman.FindPlaylist(name)>=0){name=base+' ('+(n++)+')';if(n>9999)throw new Error(AnnaI18n.t('playlistDuplicateFailed'));}
   const copy=plman.DuplicatePlaylist(row.index,name);
   if(!Number.isInteger(copy)||copy<0)throw new Error(AnnaI18n.t('playlistDuplicateFailed'));
   refreshOrdinaryBaseline(copy); // A copy inherits its original playlist history.
   plman.ActivePlaylist=copy;setEditable(copy);
   picked=entries().findIndex(e=>editablePlaylistRow(e)&&e.index===copy);
   error='';
  }
  else if(cmd===4&&editablePlaylistRow(row)){
   plman.ActivePlaylist=row.index;setEditable(row.index);
   if(!fb.RunMainMenuCommand('File/Add folder...'))throw new Error(AnnaI18n.t('folderMenuMissing'));
  }
  window.Repaint();return true;
 }catch(e){error=AnnaI18n.t('playlistFailed')+': '+String(e);console.log(error);window.Repaint();return true;}
}
function on_mouse_lbtn_dblclk(x,y){ choose(x,y,true); }
function on_mouse_move(x,y,mask){
 if((mask&1)&&pressedAt&&(Math.abs(x-pressedAt.x)>9||Math.abs(y-pressedAt.y)>9))pressedMoved=true;
 if(scrollingThumb){if(mask&1){dragSidebarScrollbar(y);return;}scrollingThumb=false;}
 const rows=entries(),n=y<TABS?-1:Math.floor((y-TABS+scroll)/ROW);
 if(n!==hover){hover=n;window.Repaint();}
 dragPointerY=y;
 // A horizontal source drag exports tracks; a vertical drag sorts only
 // ordinary playlists. Fixed sources export only; they never reorder.
 if(playlistDrag&&(mask&1)){
  const dx=x-playlistDrag.x,dy=y-playlistDrag.y;
  const exportOnly=playlistDrag.kind!=='playlist';
  if(exportOnly?dx>=EXPORT_ONLY_START_X:isOutwardDrag(dx,dy)){
   const source=playlistDrag;playlistDrag=null;playlistWasDragged=true;
   playlistReorder=null;playlistDropTarget=-1;
   try{openDragAsHandles(source);}catch(e){error=AnnaI18n.t('dropFailed')+': '+String(e);console.log(error);}
   window.Repaint();return;
  }
  if(isSortDrag(dx,dy)){
   if(mode==='playlists'&&playlistDrag.kind==='playlist'){
    playlistReorder=playlistDrag;playlistWasDragged=true;
   }
   playlistDrag=null;
  }
 }
 // Never transform a sidebar reorder into an OLE track-copy operation.
 if(playlistReorder){
  playlistDropTarget=(n>=0&&n<rows.length&&editablePlaylistRow(rows[n]))?n:-1;
  window.Repaint();
 }
}
function on_mouse_leave(){
 // Do NOT initiate OLE here. This caused brief processing windows and left
 // normal playlists unable to start a valid Queue drag at the source.
 playlistDrag=null;
 playlistReorder=null;playlistDropTarget=-1;
 if(!scrollingThumb){hover=-1;window.Repaint();}
}
function on_mouse_wheel(step){const h=AnnaDpi.height()-TABS;scroll=clamp(scroll-step*ROW*3,0,Math.max(0,entries().length*ROW-h));window.Repaint();}
function on_playlist_switch(){window.Repaint();}
function on_playlists_changed(){
 syncOrdinaryBaselines();
 if(watchName){const p=plman.FindPlaylist(watchName);if(p>=0){watchIndex=p;if(!dedupRemoving.has(p))knownTracks=keyCounts(p);}else setEditable(-1);}
 try{pruneScratchViews();}catch(e){console.log('Anna scratch cleanup: '+String(e));}
    updateFavoriteIndicator();window.Repaint();
}
function on_playlist_items_added(p){
 if(onStagingItemsAdded(p)){window.Repaint();return;}
 try{deduplicateNewTracks(p);}catch(e){console.log('Anna ordinary playlist dedup: '+String(e));}
 collectImport(p);updateFavoriteIndicator();window.Repaint();
}
function on_playlist_items_removed(p){
 if(!dedupRemoving.has(p)){refreshOrdinaryBaseline(p);if(p===watchIndex)knownTracks=keyCounts(p);}
 updateFavoriteIndicator();window.Repaint();
}
function on_playlist_items_reordered(p){if(!dedupRemoving.has(p))refreshOrdinaryBaseline(p);}
function on_playback_new_track(){refreshPlayingArtist();}
function on_playback_stop(){playingArtistKey='';try{pruneScratchViews();}catch(e){}updateFavoriteIndicator();window.Repaint();}
function on_playback_edited(){refreshPlayingArtist();}
function on_library_items_added(){loadArtists();}
function on_library_items_removed(){loadArtists();}
function on_library_items_changed(){loadArtists();}
function on_size(){window.Repaint();}
function on_panelsui_variable_changed(name){if(name===AnnaShared.PVAR.themeHue||name===AnnaShared.PVAR.language)window.Repaint();}
loadArtists();
syncOrdinaryBaselines();
refreshPlayingArtist();

// Stage 2G: skin header messages. Keep local tab and list behaviour unchanged.
function on_notify_data(name, info) {
    if(name==='Anna.ThemeChanged'){window.Repaint();return;}
    if (name !== 'Playlists') return;
    const action = String(info || '').toLowerCase();
    if (action === 'artists' || action === 'playlists' || action==='library') {
        if(action==='library') {
            mode='playlists'; picked=0;setEditable(-1);
            try {loadSortedView(fb.GetLibraryItems(),SORTED_VIEW);}catch(e){error=AnnaI18n.t('libraryFailed')+': '+String(e);}
        } else {mode = action; picked=-1;setEditable(-1);}
        scroll=0; hover=-1;
    } else if (action === 'favorites') {
        mode = 'playlists'; scroll=0; hover=-1; picked=-1;setEditable(-1);
        const candidates = ['favorites','favourites','お気に入り','收藏','我的最爱','喜欢'];
        for (let p=0;p<plman.PlaylistCount;p++) {
            const n=String(plman.GetPlaylistName(p)).toLowerCase();
            if (candidates.some(q=>n === q || n.indexOf(q)>=0)) {
                plman.ActivePlaylist=p;
                break;
            }
        }
    } else if (action === 'syncactive') {
        syncActiveEditable();return;
    } else if (action === 'togglefavorite') {
        toggleCurrentFavorite();return;
    } else if (action === 'nowplaying') {
        mode='playlists'; scroll=0; hover=-1; picked=-1;setEditable(-1);
        const playing=plman.PlayingPlaylist;
        if (Number.isInteger(playing) && playing>=0 && playing<plman.PlaylistCount) {
            plman.ActivePlaylist=playing;
            const location=plman.GetPlayingItemLocation();
            if(location&&location.IsValid&&location.PlaylistIndex===playing){
                plman.SetPlaylistFocusItem(playing,location.PlaylistItemIndex);
                try{
                    if(typeof panelsui!=='undefined')
                        panelsui.RunAction('JSPANEL:GlassPlaylist:revealnowplaying');
                }catch(e){console.log('Anna reveal: '+String(e));}
            }
            const name=plman.GetPlaylistName(playing);
            if(name===ARTIST_VIEW || name.startsWith(ARTIST_VIEW+' #')) {
                mode='artists';
                picked=artists.findIndex(a=>nameKey(a.name)===playingArtistKey);
            } else if(name===SORTED_VIEW || name.startsWith(SORTED_VIEW+' #')) {
                picked=0; // Music Library
            } else {
                picked=entries().findIndex(e=>e.index===playing);
                if(picked>=0&&editablePlaylistRow(entries()[picked]))setEditable(playing);
            }
        }
    } else return;
    if(typeof panelsui!=='undefined'){
        // Now Playing is momentary: do not make it a latched navigation tab.
        if(action!=='nowplaying'){
            const active=action==='playlists'?'library':action;
            panelsui.SetVariable(AnnaShared.PVAR.navMode,active);
            panelsui.RunAction('JSPANEL:NavTabs:'+active);
        }
    }
    window.Repaint();
}

AnnaDropFix.install({plan:externalDropPlan,activate:activateDropTarget});
// Child-window DPI adapter: must stay the last statement (wraps the callbacks above).
AnnaDpi.install();
