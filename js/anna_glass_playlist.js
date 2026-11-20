// Anna Glass V2 Stage 3J: long-title hover preview and distinct playing/selected states.
// Source interaction model: official foo_js_panel Playlist sample, adapted to grouped rows.
// This file NEVER changes/overwrites user's native playlist or saved playlists.
// MODE: GLASS is the current-mode label; click to toggle back to MODE: NATIVE.
'use strict';
include('anna_i18n.js');
include('anna_theme.js');
const VK_UP=0x26, VK_DOWN=0x28, VK_RETURN=0x0D, VK_DELETE=0x2e, VK_HOME=0x24, VK_END=0x23;
const VK_PRIOR=0x21, VK_NEXT=0x22, VK_A=0x41, VK_ESCAPE=0x1b;
const MK_CONTROL=8, MK_SHIFT=4;
const HEADER_H=132, ROW_H=39, GROUP_GAP=4, BORDER_X=6;
const COVER_SIZE=90, REFLECTION_HEIGHT=21;
const DT=0x8024; // single-line + vertical centre + ellipsis
// Stage 3C palette: soft outlines keep Anna and the lake visible through every row.
// JS Panel painting uses ARGB colours (alpha in the highest byte).
const TXT=0xfff0f3fb, SOFT=0xffd4d7e6, GOLD=0xffebc29a, PINK=0xffffbfd8;
const FRAME=0x58a4afcb, GROUP_FRAME=0x92c9ac99;
// Active row colors are selected at paint time to match the concept palette.
const GLOW_FAR=0x24ff8fca, GLOW_MID=0x48ff9fd0, GLOW_NEAR=0x78ffc0d9;
const FONT=gdi.Font('Yu Gothic UI',13,0), BOLD=gdi.Font('Yu Gothic UI',13,1);
const SMALL=gdi.Font('Yu Gothic UI',11,0), HEAD=gdi.Font('Yu Gothic UI',17,1);
const GLYPH=gdi.Font('Segoe UI Symbol',17,0);
const TF_GROUP=fb.TitleFormat('$if2(%album artist%,$if2(%artist%,Unknown Artist))');
const TF_ALBUM=fb.TitleFormat('$if2(%album%,Singles / Unknown Album)');
const TF_DATE=fb.TitleFormat('[$meta(date)]');
const TF_TITLE=fb.TitleFormat('$if2(%title%,Untitled)');
const TF_NUMBER=fb.TitleFormat('$if(%tracknumber%,$ifgreater($num(%discnumber%,1),1,$num(%discnumber%,1)-$num(%tracknumber%,2),$num(%tracknumber%,2)),)');
const TF_ARTIST=fb.TitleFormat('$if2(%artist%,Unknown Artist)');
const TF_DURATION=fb.TitleFormat('%length%');
let data=[], nodes=[], trackNodes=[], totalHeight=0, scroll=0, anchor=-1, downAt=null, hover=-1, hoverAction='';
let scrollingThumb=false,scrollThumbGrab=0;
let miniEqFrame=0,miniEqTimer=0; // low-rate animated playing-row glyph only
function glassScrollbar(){
 const h=Math.max(1,window.Height),w=window.Width,max=maxScroll();
 if(max<=0)return null;
 const thumb=Math.min(h,Math.max(35,Math.floor(h*h/Math.max(1,totalHeight))));
 const travel=Math.max(1,h-thumb);
 return {x:w-15,y:Math.round(travel*scroll/max),w:12,thumb,travel,max};
}
function dragGlassScrollbar(y){
 const b=glassScrollbar();if(!b)return;
 scroll=clamp(Math.round((y-scrollThumbGrab)/b.travel*b.max),0,b.max);
 cancelTip();window.Repaint();
}

let covers=new Map(), groupCollapsed=new Set(), playlistId=-1, error='';
let acceptingImport=false,importStatus='',importMessageTimer=0;
let localGlassTrackOLE=false; // track selection leaving this panel for Queue/sidebar
let clearGlassOriginTimer=0,localGlassGuardUntil=0;
// Glass has no local drag-reorder, so ANY small pointer movement over a pressed
// track starts the OLE copy. (The former "mostly horizontal, 32px" rule made
// diagonal drags toward a lower sidebar playlist silently do nothing.)
const OLE_START_DIST=8;
function leavingGlassForTarget(x,down){
 if(!down||typeof down.x!=='number')return false;
 const dx=x-down.x,dy=hoverMouseY-down.y;
 return Math.sqrt(dx*dx+dy*dy)>=OLE_START_DIST;
}
let hoverMouseY=0;
function dragOrigin(){try{return String(panelsui.GetVariable('anna.drag.origin','')||'');}catch(e){return '';}}
function clearGlassOrigin(){clearGlassOriginTimer=0;if(dragOrigin().startsWith('glass:'))try{panelsui.SetVariable('anna.drag.origin','');}catch(e){}}
// Who started the current OLE session?  Origin markers:
//   glass:<playlist>                this panel's own selection
//   sidebar:<kind>:<index>          kind = artist | library | fixedFavorites | fixedSearch | playlist
//   (no marker)                     external files / another application
function dragSource(){
 // localGlassTrackOLE is set synchronously around our own DoDragDrop, so it is
 // the one definitive signal; markers can be stale for a few hundred ms.
 if(localGlassTrackOLE)return {kind:'glass'};
 const o=dragOrigin();
 if(o.startsWith('sidebar:')){
  const m=/^sidebar:(?:([A-Za-z]+):)?(-?\d+)$/.exec(o);
  return {kind:'sidebar',type:m&&m[1]?m[1]:'unknown',index:m?parseInt(m[2],10):-1};
 }
 if(o.startsWith('glass:'))return {kind:'glass'};
 if(Date.now()<localGlassGuardUntil)return {kind:'glass'}; // stray callback right after our own drag
 return {kind:'external'};
}
function clearImportMessage(){if(importMessageTimer){window.ClearTimeout(importMessageTimer);importMessageTimer=0;}importStatus='';}
function isViewName(n,base){return n===base||n.indexOf(base+' #')===0;}
// The middle list accepts drops ONLY while it shows an ordinary, unlocked playlist.
// Derived from the playlist actually on screen, never from sidebar bookkeeping:
// that state is empty after start-up, tab switches and "now playing" jumps, which
// made valid drops get rejected.
function activeDropTarget(){
 try{
  if(String(panelsui.GetVariable('anna.nav.mode','library'))!=='library')return -1;
  const p=plman.ActivePlaylist;
  if(p<0||p>=plman.PlaylistCount||plman.IsPlaylistLocked(p))return -1;
  const name=String(plman.GetPlaylistName(p));
  if(name==='Anna - Favorites'||name==='Music Library'||name==='Anna - Queue Buffer'||
     isViewName(name,'Anna - Sorted Library View')||isViewName(name,'Anna - Artist View')||
     name.indexOf('Anna - Import Staging')===0)return -1;
  const buffer=String(panelsui.GetVariable('anna.queue.buffer.name','')||'');
  if(buffer&&name===buffer)return -1;
  const owned=JSON.parse(String(panelsui.GetVariable('anna.search.results.owned','[]')||'[]'));
  if(Array.isArray(owned)&&owned.indexOf(name)>=0)return -1;
  return p;
 }catch(e){return -1;}
}
function dropAllowed(){return activeDropTarget()>=0;}
function denyMessage(){
 let artistView=false;
 try{
  artistView=String(panelsui.GetVariable('anna.nav.mode','library'))==='artists';
  const p=plman.ActivePlaylist;
  if(p>=0&&isViewName(String(plman.GetPlaylistName(p)),'Anna - Artist View'))artistView=true;
 }catch(e){}
 return artistView?AnnaI18n.t('artistHint'):AnnaI18n.t('chooseRegularPlaylist');
}
// Single decision point for drag-over and drop, so both always agree.
//  glass tracks      -> never back onto this panel (no message)
//  sidebar playlist  -> add to the ordinary playlist shown here (not to itself)
//  sidebar artist / pinned list -> warning, rejected (they only go to the Queue)
//  external files    -> add to the ordinary playlist shown here, else warning
function evaluateDrop(){
 const src=dragSource();
 if(src.kind==='glass')return {ok:false,msg:''};
 if(src.kind==='sidebar'&&src.type!=='playlist')
  return {ok:false,msg:AnnaI18n.t('sidebarToMiddleDenied')};
 const target=activeDropTarget();
 if(target<0)return {ok:false,msg:denyMessage()};
 if(src.kind==='sidebar'&&src.index===target)
  return {ok:false,msg:AnnaI18n.t('sameListDenied')};
 return {ok:true,msg:AnnaI18n.t('dropToImport'),target};
}
function flashImportStatus(ms){
 if(importMessageTimer)window.ClearTimeout(importMessageTimer);
 importMessageTimer=window.SetTimeout(function(){importMessageTimer=0;importStatus='';window.Repaint();},ms);
}
function on_drag_enter(action,x,y){on_drag_over(action,x,y);}
function on_drag_over(action,x,y){
 const r=evaluateDrop();
 acceptingImport=r.ok;action.Effect=r.ok?1:0;importStatus=r.msg;
 window.Repaint();
}
function on_drag_leave(){acceptingImport=false;importStatus='';window.Repaint();}
function on_drag_drop(action,x,y){
 const r=evaluateDrop();acceptingImport=false;
 if(!r.ok){
  action.Effect=0;importStatus=r.msg;
  if(r.msg)flashImportStatus(2800);
  window.Repaint();return;
 }
 try{
  const p=r.target;
  // Tell the sidebar which playlist is receiving, so its post-import sort and
  // reveal logic follows the list that is actually on screen.
  try{panelsui.RunAction('JSPANEL:Playlists:syncactive');}catch(e){}
  action.Playlist=p;action.Base=plman.PlaylistItemCount(p);action.ToSelect=true;action.Effect=1;
  importStatus=AnnaI18n.t('importSorting');
  flashImportStatus(2800);
 }catch(e){action.Effect=0;importStatus=AnnaI18n.t('importFailed')+': '+String(e);}
 window.Repaint();
}

const FAVORITES='Anna - Favorites';
let favoriteKeys=new Set();
function songKey(h){return h?String(h.Path)+'#'+String(h.SubSong||0):'';}
function refreshFavoriteKeys(){
    favoriteKeys.clear();
    try {
        const p=plman.FindPlaylist(FAVORITES);
        if(p>=0)for(const h of plman.GetPlaylistItems(p).Convert())
            favoriteKeys.add(songKey(h));
    }catch(e){console.log('Anna Glass favorite cache: '+String(e));}
}
function toggleTrackFavorite(index){
    const p=current();
    if(p<0||index<0)return false;
    try{
        const source=plman.GetPlaylistItems(p);
        const h=source.Item(index);
        if(!h)return false;
        const existing=plman.FindPlaylist(FAVORITES);
        const dest=existing>=0?existing:plman.FindOrCreatePlaylist(FAVORITES,true);
        if(dest<0||plman.IsPlaylistLocked(dest))throw new Error(AnnaI18n.t('playlistLocked'));
        const all=plman.GetPlaylistItems(dest).Convert();
        const position=all.findIndex(x=>songKey(x)===songKey(h));
        if(position>=0){
            if(dest===plman.PlayingPlaylist)
                throw new Error(AnnaI18n.t('cannotDeletePlaylist'));
            plman.UndoBackup(dest);
            plman.ClearPlaylistSelection(dest);
            plman.SetPlaylistSelectionSingle(dest,position,true);
            plman.RemovePlaylistSelection(dest,false);
        }else{
            const items=fb.CreateHandleList();
            items.Add(h);
            plman.UndoBackup(dest);
            plman.InsertPlaylistItems(dest,plman.PlaylistItemCount(dest),items);
        }
        refreshFavoriteKeys();error='';window.Repaint();return true;
    }catch(e){console.log('Anna Glass favorite: '+String(e));return false;}
}
// Show a delayed in-panel tooltip only for titles that are actually truncated.
// There is no unsupported window tooltip API in this JS Panel build.
let tipIndex=-1, tipTimer=0;
function cancelTip() {
    if (tipTimer) { window.ClearTimeout(tipTimer); tipTimer=0; }
    if (tipIndex!==-1) { tipIndex=-1; window.Repaint(); }
}
function queueTip(index) {
    if (tipTimer) { window.ClearTimeout(tipTimer); tipTimer=0; }
    tipIndex=-1;
    if (index<0) return;
    tipTimer=window.SetTimeout(function() {
        tipTimer=0;
        if (hover===index && !downAt) { tipIndex=index; window.Repaint(); }
    },650);
}

function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function oneLine(v){return String(v===null||v===undefined?'':v).replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim();}
function current(){return plman.ActivePlaylist;}
// Centralized action hit regions ensure the painted heart/menu and mouse events
// match. These never change playback state merely by hovering.
function rowActionAt(x,width){
    if(x>=width-182&&x<width-136)return 'favorite';
    if(x>=width-44&&x<width-8)return 'menu';
    return '';
}
function maxScroll(){return Math.max(0,totalHeight-Math.max(0,window.Height));}
function clampScroll(){scroll=clamp(scroll,0,maxScroll());}
function releaseCover(key){
    const entry=covers.get(key);
    if(entry)for(const bmp of [entry.image,entry.reflection])
        if(bmp&&typeof bmp.Dispose==='function')try{bmp.Dispose();}catch(_){}
    covers.delete(key);
}
function clearCovers(){ for(const key of covers.keys()) releaseCover(key); }
function refreshAfterEdit(){ cancelTip(); groupCollapsed.clear(); clearCovers(); anchor=-1; downAt=null; build(); }
function getCover(g){
    if(covers.has(g.key))return covers.get(g.key);
    let image=null,reflection=null;
    try{
        image=utils.GetAlbumArtV2(g.handle,0);
        if(image&&image.Width>0&&image.Height>0){
            // Compute once per cover: a vertically flipped 78px bitmap reused by
            // every repaint. The parent draws its alpha falloff in three slices.
            reflection=image.Resize(COVER_SIZE,COVER_SIZE);
            reflection.RotateFlip(6); // GDI+ RotateNoneFlipY
        }
    }catch(e){
        console.log('Anna album art reflection: '+String(e));
        if(reflection&&typeof reflection.Dispose==='function')reflection.Dispose();
        reflection=null;
    }
    if(covers.size>=18)releaseCover(covers.keys().next().value);
    const entry={image,reflection};
    covers.set(g.key,entry);
    return entry;
}
function build(){
    try{
        const p=current(); playlistId=p;
        const list=p>=0?plman.GetPlaylistItems(p):fb.CreateHandleList();
        const handles=list.Convert(), artists=TF_GROUP.EvalWithMetadbs(list), albums=TF_ALBUM.EvalWithMetadbs(list);
        const dates=TF_DATE.EvalWithMetadbs(list), titles=TF_TITLE.EvalWithMetadbs(list), numbers=TF_NUMBER.EvalWithMetadbs(list);
        const ta=TF_ARTIST.EvalWithMetadbs(list), durations=TF_DURATION.EvalWithMetadbs(list);
        data=[]; nodes=[]; trackNodes=[];
        let y=0, previousKey='', group=null, groupSequence=0;
        for(let i=0;i<handles.length;i++){
            const artist=oneLine(artists[i])||'Unknown Artist', album=oneLine(albums[i])||'Unknown Album';
            const date=oneLine(dates[i]), key=artist+'\u0001'+album+'\u0001'+date;
            if(key!==previousKey){
                // Each visible run gets a separate identity even when album metadata repeats later.
                const runKey=String(p)+'\u0001'+String(groupSequence++)+'\u0001'+key;
                group={kind:'group',key:runKey,artist,album,date,count:0,handle:handles[i],index:i, y, h:HEADER_H+GROUP_GAP};
                nodes.push(group); y+=group.h; previousKey=key;
            }
            group.count++;
            const node={kind:'song',index:i,y,h:ROW_H,title:oneLine(titles[i]),number:oneLine(numbers[i]),handle:handles[i],artist:oneLine(ta[i]),duration:oneLine(durations[i]),group:group.key};
            data.push(node);
            if(!groupCollapsed.has(group.key)){nodes.push(node);trackNodes[i]=node;y+=ROW_H;}
        }
        totalHeight=y;
        refreshFavoriteKeys();
        clampScroll();error='';
    }catch(e){data=[];nodes=[];trackNodes=[];totalHeight=0;error=AnnaI18n.t('playlistFailed')+': '+String(e);}
    window.Repaint();
}
function firstVisible(){
    let lo=0,hi=nodes.length;
    while(lo<hi){const m=(lo+hi)>>1;if(nodes[m].y+nodes[m].h<=scroll)lo=m+1;else hi=m;}
    return lo;
}
function nodeAt(y){
    if(y<0||y>=window.Height)return null;
    const sy=y+scroll;let lo=0,hi=nodes.length;
    while(lo<hi){const m=(lo+hi)>>1;if(nodes[m].y+nodes[m].h<=sy)lo=m+1;else hi=m;}
    return lo<nodes.length&&nodes[lo].y<=sy?nodes[lo]:null;
}
function drawCover(gr,g,x,y){
    const entry=getCover(g),img=entry.image,S=COVER_SIZE;
    gr.FillRoundRect(x,y,S,S,6,6,0xb2152547);
    if(img && img.Width>0 && img.Height>0){
        const factor=Math.min(S/img.Width,S/img.Height);
        const w=Math.max(1,Math.floor(img.Width*factor)),h=Math.max(1,Math.floor(img.Height*factor));
        gr.DrawImage(img,x+Math.floor((S-w)/2),y+Math.floor((S-h)/2),
            w,h,0,0,img.Width,img.Height);
        // Reflections are subtle: top is most visible, bottom fades to wallpaper.
        const mirror=entry.reflection;
        if(mirror){
            const top=y+S+3;
            const parts=[{offset:0,height:7,opacity:0.32},
                         {offset:7,height:7,opacity:0.19},
                         {offset:14,height:7,opacity:0.08}];
            for(const part of parts)gr.GdiAlphaBlend(mirror,x,top+part.offset,
                S,part.height,0,part.offset,S,part.height,
                Math.round(part.opacity*255));
        }
    }else gr.GdiDrawText('♪',HEAD,GOLD,x,y,S,S,0x1|0x4|0x20);
    gr.DrawRoundRect(x,y,S,S,6,6,1,0xc8d8a88f);
}
function on_paint(gr){gr=AnnaTheme.graphics(gr);
    const w=window.Width,h=window.Height,p=current();
    if(error){gr.FillRoundRect(9,16,Math.max(30,w-18),60,7,7,0xc01e1b34);gr.GdiDrawText('JS Playlist: '+error,SMALL,PINK,17,16,w-34,60,0x10);return;}
    if(p<0||!nodes.length){gr.GdiDrawText(p<0?'No playlist':'Empty playlist',FONT,TXT,16,14,Math.max(15,w-32),45,DT);return;}
    const playing=plman.GetPlayingItemLocation(),focus=plman.GetPlaylistFocusItemIndex(p);
    // All colours use ARGB translucency. The shared wallpaper is painted by Panels UI beneath us.
    for(let i=firstVisible();i<nodes.length;i++){
        const n=nodes[i],y=n.y-scroll;
        if(y>=h)break;
        if(y+n.h<=0)continue;
        if(n.kind==='group'){
            // Glass album: large 90px artwork and cached soft reflection.
            const gx=BORDER_X,gw=Math.max(20,w-BORDER_X*2-2),gy=y+3,gh=HEADER_H-5;
            const activeAlbum=playing.IsValid&&playing.PlaylistIndex===p&&
                playing.PlaylistItemIndex>=n.index&&
                playing.PlaylistItemIndex<n.index+n.count;
            gr.FillRoundRect(gx,gy,gw,gh,8,8,activeAlbum?0x64263b64:0x52132242);
            gr.DrawRoundRect(gx,gy,gw,gh,8,8,1,
                activeAlbum?0xffeeb3d4:GROUP_FRAME);
            if(activeAlbum)gr.FillRoundRect(gx+3,gy+14,3,gh-28,2,2,0xfff6b5d8);
            // A faint highlight anchors the album without covering the wallpaper.
            gr.FillRoundRect(gx+12,gy+1,Math.max(1,gw-24),2,1,1,0x89e9afca);
            // Discreet upper-corner highlights; decoration never overlaps the title/cover.
            if(gw>145){
                gr.FillSolidRect(gx+9,gy+3,18,1,0x96f1ceab);
                gr.FillSolidRect(gx+4,gy+9,1,11,0x75f1ceab);
                gr.FillSolidRect(gx+gw-27,gy+3,18,1,0x96f1ceab);
                gr.FillSolidRect(gx+gw-5,gy+9,1,11,0x75f1ceab);
            }
            drawCover(gr,n,16,y+8);
            const tx=120,tw=Math.max(40,w-168);
            gr.GdiDrawText(n.album,HEAD,TXT,tx,y+18,tw,36,DT);
            gr.GdiDrawText(n.artist+(n.date?'  ·  '+n.date:''),SMALL,SOFT,tx,y+57,tw,25,DT);
            gr.GdiDrawText(n.count+' tracks',SMALL,GOLD,tx,y+91,tw,20,DT);
            gr.GdiDrawText(groupCollapsed.has(n.key)?'▸':'▾',BOLD,GOLD,Math.max(0,w-31),y+14,22,22,DT);
            continue;
        }
        const selected=plman.IsPlaylistItemSelected(p,n.index),isPlaying=playing.IsValid&&playing.PlaylistIndex===p&&playing.PlaylistItemIndex===n.index;
        const x0=BORDER_X+1,y0=y+2,rw=Math.max(20,w-BORDER_X*2-3),rh=ROW_H-4;
        // Keep playing/selection distinct while protecting the wallpaper below.
        const bg=selected?0x8b965075:isPlaying?0x7c86446b:
            hover===n.index?0x48324667:0x41121d38;
        const fr=selected?0xffffc3e3:isPlaying?0xffffafda:
            hover===n.index?0x97d0abc2:FRAME;
        // A selected or playing track receives the reference-style pink halo.
        if(selected||isPlaying){
            gr.DrawRoundRect(x0-3,y0-3,rw+6,rh+6,9,9,1,GLOW_FAR);
            gr.DrawRoundRect(x0-2,y0-2,rw+4,rh+4,8,8,1,GLOW_MID);
            gr.DrawRoundRect(x0-1,y0-1,rw+2,rh+2,8,8,1,GLOW_NEAR);
        }
        gr.FillRoundRect(x0,y0,rw,rh,7,7,bg);
        gr.DrawRoundRect(x0,y0,rw,rh,7,7,1,fr);
        if(isPlaying)gr.FillRoundRect(x0+3,y0+7,3,Math.max(8,rh-14),1,1,0xffffbed9);
        else if(focus===n.index)gr.FillRoundRect(x0+3,y0+7,3,Math.max(8,rh-14),1,1,0xffe4b3cd);
        const f=(isPlaying||selected)?BOLD:FONT;
        // The number is a separate column; missing TRACKNUMBER stays blank.
        gr.GdiDrawText(n.number||'',SMALL,isPlaying?0xffffd6e7:SOFT,
            15,y0+2,40,rh-4,0x2|0x4|0x20);
        if(isPlaying){
            // Lightweight animated three-bar 'now playing' mark: no FFT/audio sampling.
            const bx=62,by=y0+Math.floor(rh/2);
            const heights=[7+Math.round(4*(1+Math.sin(miniEqFrame*.8))),
                6+Math.round(5*(1+Math.sin(miniEqFrame*.8+2.0))),
                5+Math.round(5*(1+Math.sin(miniEqFrame*.8+4.1)))];
            for(let k=0;k<3;k++)gr.FillRoundRect(bx+k*4,by-heights[k]/2,2.4,heights[k],1,1,
                k===1?0xffffd2e6:0xffffb3d6);
        }
        const titleX=isPlaying?81:63;
        gr.GdiDrawText(n.title,f,(isPlaying||selected)?0xfffff1f8:TXT,
            titleX,y0+2,Math.max(20,w-176-titleX),rh-4,DT);
        const liked=favoriteKeys.has(songKey(n.handle));
        if(hover===n.index&&hoverAction==='favorite')
            gr.FillRoundRect(w-181,y0+3,43,rh-6,6,6,0x7b6e385d);
        gr.GdiDrawText(liked?'♥':'♡',GLYPH,liked?0xffff95ca:0xffefd1e6,
            Math.max(0,w-171),y0+2,29,rh-4,0x8025);
        gr.GdiDrawText(n.duration,SMALL,isPlaying?0xffffd2e5:SOFT,
            Math.max(20,w-119),y0+2,68,rh-4,0x2|0x4|0x20);
        if(hover===n.index&&hoverAction==='menu')
            gr.FillRoundRect(w-44,y0+3,35,rh-6,6,6,0x756e385d);
        gr.GdiDrawText('⋯',GLYPH,SOFT,Math.max(0,w-40),y0+2,25,rh-4,0x8025);
    }
    if(importStatus){
        gr.FillRoundRect(15,Math.max(8,h/2-23),Math.max(45,w-30),46,8,8,0xc82c244d);
        gr.DrawRoundRect(15,Math.max(8,h/2-23),Math.max(45,w-30),46,8,8,1,acceptingImport?0xffffacd6:0xffc894b3);
        gr.GdiDrawText(importStatus,SMALL,0xffffe1f0,22,Math.max(8,h/2-23),Math.max(30,w-44),46,0x8025);
    }
    const bar=glassScrollbar();
    if(bar){
        gr.FillRoundRect(w-15,0,12,h,5,5,0x46252243);
        gr.FillRoundRect(w-12,bar.y,6,bar.thumb,3,3,scrollingThumb?0xffffdeef:0xc6eebed8);
    }
    // Hover preview is painted last so later rows cannot occlude it.
    if (tipIndex>=0 && hover===tipIndex && !downAt) {
        const n=data[tipIndex];
        // The actual title column ends before the Favorites heart and more menu.
        const available=Math.max(20,w-(playing.IsValid&&playing.PlaylistIndex===p&&
            playing.PlaylistItemIndex===n.index?257:239));
        if (n && gr.CalcTextWidth(n.title,FONT)>available) {
            const boxW=Math.max(80,w-28), textW=Math.max(50,boxW-24);
            const metrics=gr.MeasureString(n.title,FONT,0,0,textW,150);
            const lines=Math.min(4,Math.max(1,metrics.lines||1));
            const boxH=Math.max(34,Math.min(102,12+lines*22));
            const source=trackNodes[tipIndex];
            const rowY=source?source.y-scroll:0;
            const ty=clamp(rowY+ROW_H+4,5,Math.max(5,h-boxH-5));
            gr.FillRoundRect(14,ty,boxW,boxH,7,7,0xf219243d);
            gr.DrawRoundRect(14,ty,boxW,boxH,7,7,1,0xffe5b792);
            gr.GdiDrawText(n.title,FONT,TXT,26,ty+5,textW,boxH-10,0x10|0x8000);
        }
    }
}
function selectTrack(i,mask){
    const p=current();if(p<0||i<0)return;
    if((mask&MK_SHIFT)&&anchor>=0){let a=Math.min(anchor,i),b=Math.max(anchor,i),ids=[];for(let j=a;j<=b;j++)ids.push(j);plman.ClearPlaylistSelection(p);plman.SetPlaylistSelection(p,ids,true);}
    else if(mask&MK_CONTROL){plman.SetPlaylistSelectionSingle(p,i,!plman.IsPlaylistItemSelected(p,i));anchor=i;}
    else {plman.ClearPlaylistSelection(p);plman.SetPlaylistSelectionSingle(p,i,true);anchor=i;}
    plman.SetPlaylistFocusItem(p,i);window.Repaint();
}
function reveal(i){let n=trackNodes[i];if(!n){build();n=trackNodes[i];}if(!n)return;if(n.y<scroll)scroll=n.y; else if(n.y+n.h>scroll+window.Height)scroll=n.y+n.h-window.Height;clampScroll();}
function toggleGroup(k){cancelTip();if(groupCollapsed.has(k))groupCollapsed.delete(k);else groupCollapsed.add(k);hover=-1;build();}
function on_mouse_lbtn_down(x,y,mask){
    cancelTip();
    const bar=glassScrollbar();
    if(bar && x>=bar.x){
        scrollingThumb=true;
        scrollThumbGrab=(y>=bar.y&&y<=bar.y+bar.thumb)?y-bar.y:bar.thumb/2;
        downAt=null;dragGlassScrollbar(y);return;
    }
    const n=nodeAt(y),p=current();
    downAt=null;
    if(n&&n.kind==='group'){toggleGroup(n.key);return;}
    if(n&&n.kind==='song'){
        // Keep icon clicks separate from row selection / drag initiation.
        const action=rowActionAt(x,window.Width);
        if(action){downAt={action,index:n.index};return;}
        // A click on an already selected row keeps multiselection until mouse-up,
        // so a later drag or context menu does not silently discard the range.
        const plain=!(mask&(MK_SHIFT|MK_CONTROL));
        const deferred=plain&&plman.IsPlaylistItemSelected(p,n.index);
        downAt={x,y,i:n.index,deferred};
        if(deferred){plman.SetPlaylistFocusItem(p,n.index);window.Repaint();}
        else selectTrack(n.index,mask||0);
    }else if(p>=0 && !(mask&(MK_SHIFT|MK_CONTROL))){
        plman.ClearPlaylistSelection(p);anchor=-1;window.Repaint();
    }
}
function on_mouse_lbtn_up(x,y,mask){
    if(scrollingThumb){scrollingThumb=false;window.Repaint();return;}
    const down=downAt;downAt=null;
    const n=nodeAt(y);
    if(down&&down.action&&n&&n.kind==='song'&&n.index===down.index&&
        rowActionAt(x,window.Width)===down.action){
        if(down.action==='favorite')toggleTrackFavorite(n.index);
        if(down.action==='menu'){
            if(!plman.IsPlaylistItemSelected(current(),n.index))selectTrack(n.index,0);
            on_mouse_rbtn_up(x,y);
        }
        return;
    }
    if(down&&down.deferred&&n&&n.kind==='song'&&n.index===down.i)
        selectTrack(n.index,0);
}
function on_mouse_lbtn_dblclk(x,y){
    const n=nodeAt(y);
    if(n&&n.kind==='song'&&!rowActionAt(x,window.Width))
        plman.ExecutePlaylistDefaultAction(current(),n.index);
}
function queueSelected() {
    const p=current(); if(p<0) return;
    let added=0;
    const handles=plman.GetPlaylistItems(p);
    for(let i=0;i<handles.Count;i++) if(plman.IsPlaylistItemSelected(p,i)) {
        // Queue the track handle, not a temporary sorted-view playlist index.
        // This survives subsequent Artist/Library switching and re-sorting.
        plman.AddItemToPlaybackQueue(handles.Item(i)); added++;
    }
    if(added) console.log('Anna: queued '+added+' selected tracks');
}
function on_mouse_move(x,y,mask){
    hoverMouseY=y;
    if(scrollingThumb){if(mask&1){dragGlassScrollbar(y);return;}scrollingThumb=false;}
    const n=nodeAt(y),h=n&&n.kind==='song'?n.index:-1;
    const action=h>=0?rowActionAt(x,window.Width):'';
    if(h!==hover||action!==hoverAction){
        hover=h;hoverAction=action;
        queueTip(action?-1:h);
        window.Repaint();
    }
    // Only crossing the left/right panel edge begins OLE; internal drags stay local.
    if(downAt&&!downAt.action&&(mask&1)&&leavingGlassForTarget(x,downAt)){
        downAt=null;cancelTip();
        try {
            const selected=plman.GetPlaylistSelectedItems(current());
            if(selected.Count){
                localGlassTrackOLE=true;
                if(clearGlassOriginTimer){window.ClearTimeout(clearGlassOriginTimer);clearGlassOriginTimer=0;}
                try{panelsui.SetVariable('anna.drag.origin','glass:'+current());}catch(e){}
                try{fb.DoDragDrop(window.ID,selected,1,{});}
                finally{
                  localGlassTrackOLE=false;localGlassGuardUntil=Date.now()+350;
                  clearGlassOriginTimer=window.SetTimeout(clearGlassOrigin,350);
                  importStatus='';acceptingImport=false;window.Repaint();
                }
            }
        } catch(e) { console.log('Anna: drag unsupported; use right-click Add to Queue: '+e); }
    }
}
function on_mouse_leave(){if(!scrollingThumb){cancelTip();hover=-1;hoverAction='';window.Repaint();}}
function on_mouse_wheel(step){cancelTip();scroll=clamp(scroll-step*ROW_H*3,0,maxScroll());window.Repaint();}
function removeFromCurrentPlaylist(){
 const p=current(),name=String(p>=0?plman.GetPlaylistName(p):'');
 const editable=String(panelsui.GetVariable('anna.sidebar.editable.name',''));
 if(p<0 || !editable || name!==editable ||
    String(panelsui.GetVariable('anna.nav.mode','library'))!=='library'||
    plman.IsPlaylistLocked(p))return false;
 const selected=plman.GetPlaylistSelectedItems(p);
 if(!selected||!selected.Count)return false;
 plman.UndoBackup(p);
 plman.RemovePlaylistSelection(p,false); // never delete the source audio.
 refreshAfterEdit();window.Repaint();return true;
}
function on_mouse_rbtn_up(x,y){
    const n=nodeAt(y),p=current();
    if(p<0)return false;
    if(n&&n.kind==='song'&&!plman.IsPlaylistItemSelected(p,n.index))selectTrack(n.index,0);
    try{
        const m=window.CreatePopupMenu();m.AppendMenuItem(0,1,AnnaI18n.t('switchNative'));
        m.AppendMenuItem(0,2,AnnaI18n.t('queueSelected'));
        if(String(panelsui.GetVariable('anna.sidebar.editable.name',''))===String(plman.GetPlaylistName(p)))
           m.AppendMenuItem(0,3,AnnaI18n.t('removeSelected'));
        m.AppendMenuSeparator();
        const cm=fb.CreateContextMenuManager();cm.InitContextPlaylist();cm.BuildMenu(m,100,1000);
        const cmd=m.TrackPopupMenu(x,y);
        if(cmd===1){panelsui.RunAction('PVAR:TOGGLE:anna.playlist.experimental');}
        else if(cmd===2){queueSelected();}
        else if(cmd===3){removeFromCurrentPlaylist();}
        else if(cmd>=100)cm.ExecuteByID(cmd-100);
        return true;
    }catch(e){console.log('Anna Glass context menu: '+e);return false;}
}
function on_key_down(key){
    const p=current();if(p<0)return false;
    const focus=plman.GetPlaylistFocusItemIndex(p);
    if(key===VK_RETURN&&focus>=0){plman.ExecutePlaylistDefaultAction(p,focus);return true;}
    if(key===VK_A&&utils.IsKeyPressed(0x11)){
        const count=plman.PlaylistItemCount(p);
        if(count>0){
            const ids=Array.from({length:count},(_,i)=>i);
            plman.ClearPlaylistSelection(p);
            plman.SetPlaylistSelection(p,ids,true);
            if(anchor<0)anchor=Math.max(0,focus);
        }
        window.Repaint();return true;
    }
    if(key===VK_ESCAPE){plman.ClearPlaylistSelection(p);anchor=-1;window.Repaint();return true;}
    if(key===VK_DELETE){return removeFromCurrentPlaylist();}
    if(key===VK_UP||key===VK_DOWN||key===VK_HOME||key===VK_END||key===VK_PRIOR||key===VK_NEXT){
        const count=data.length;if(!count)return false;
        const page=Math.max(1,Math.floor(window.Height/ROW_H)-2);
        const delta=key===VK_UP?-1:key===VK_DOWN?1:key===VK_PRIOR?-page:page;
        const next=key===VK_HOME?0:key===VK_END?count-1:clamp((focus<0?0:focus)+delta,0,count-1);
        // An arrow key into a folded group unfolds it before selecting the target.
        const g=data[next]?.group;
        if(g&&groupCollapsed.has(g)){groupCollapsed.delete(g);build();}
        const shift=utils.IsKeyPressed(0x10);
        if(shift&&anchor<0)anchor=focus>=0?focus:next;
        selectTrack(next,shift?MK_SHIFT:0);reveal(next);window.Repaint();return true;
    }
    return false;
}
function on_notify_data(name,info){
    if(name!=='GlassPlaylist')return;
 if(String(info)==='revealimported'){build();const i=plman.GetPlaylistFocusItemIndex(current());if(i>=0)reveal(i);window.Repaint();return;}
 if(String(info)!=='revealnowplaying')return;
    const loc=plman.GetPlayingItemLocation();
    if(!loc||!loc.IsValid||loc.PlaylistIndex!==current())return;
    if(loc.PlaylistItemIndex<0)return;
    // Rebuild before reveal: playlist-switch callbacks can arrive after
    // the parent navigator issues its explicit reveal notification.
    build();
    const node=trackNodes[loc.PlaylistItemIndex];
    if(node&&groupCollapsed.has(node.group)){
        groupCollapsed.delete(node.group);
        build();
    }
    reveal(loc.PlaylistItemIndex);
    window.Repaint();
}
function on_size(){cancelTip();clampScroll();window.Repaint();}
function on_playlist_switch(){cancelTip();scroll=0;hover=-1;hoverAction='';refreshAfterEdit();}
function on_playlists_changed(){refreshAfterEdit();}
function on_playlist_items_added(p){if(p===current()){clearImportMessage();refreshAfterEdit();}else {refreshFavoriteKeys();window.Repaint();}}
function on_playlist_items_removed(p){if(p===current())refreshAfterEdit();else {refreshFavoriteKeys();window.Repaint();}}
function on_playlist_items_reordered(p){if(p===current())refreshAfterEdit();}
function on_playlist_items_selection_change(){window.Repaint();}
function on_item_focus_change(){window.Repaint();}
function on_metadb_changed(){refreshAfterEdit();}
function on_playback_new_track(){window.Repaint();}
function on_playback_stop(){window.Repaint();}
function on_playback_time(){ /* no repeated repaint needed for static row state */ }
function on_colours_changed(){window.Repaint();}
build();

// Do not animate while no currently-playing row is in the active playlist.
miniEqTimer=window.SetInterval(function(){
    try{
        if(!window.IsVisible||!fb.IsPlaying||fb.IsPaused)return;
        const loc=plman.GetPlayingItemLocation();
        if(!loc||!loc.IsValid||loc.PlaylistIndex!==current())return;
        miniEqFrame=(miniEqFrame+1)%360;window.Repaint();
    }catch(e){/* host may be switching playlists */}
},160);
function on_script_unload(){if(miniEqTimer)window.ClearInterval(miniEqTimer);if(importMessageTimer)window.ClearTimeout(importMessageTimer);if(clearGlassOriginTimer)window.ClearTimeout(clearGlassOriginTimer);}

function on_panelsui_variable_changed(name){if(name==='anna.theme.hue'||name==='anna.language')window.Repaint();}
