// Anna Glass V2 Stage 3I: resilient grouped playlist mouse/keyboard interactions.
// Source interaction model: official foo_js_panel Playlist sample, adapted to grouped rows.
// This file NEVER changes/overwrites user's native playlist or saved playlists.
// MODE: GLASS is the current-mode label; click to toggle back to MODE: NATIVE.
'use strict';
const VK_UP=0x26, VK_DOWN=0x28, VK_RETURN=0x0D, VK_DELETE=0x2e, VK_HOME=0x24, VK_END=0x23;
const VK_PRIOR=0x21, VK_NEXT=0x22, VK_A=0x41, VK_ESCAPE=0x1b;
const MK_CONTROL=8, MK_SHIFT=4;
const HEADER_H=72, ROW_H=36, GROUP_GAP=4, BORDER_X=6;
const DT=0x8024; // single-line + vertical centre + ellipsis
// Stage 3C palette: soft outlines keep Anna and the lake visible through every row.
// JS Panel painting uses ARGB colours (alpha in the highest byte).
const TXT=0xfff0f3fb, SOFT=0xffd4d7e6, GOLD=0xffebc29a, PINK=0xffffbfd8;
const FRAME=0x58a4afcb, GROUP_FRAME=0x92c9ac99;
const GOLD_FRAME=0xf6dfb07e, ACTIVE=0xffffb7d8;
const GLOW_FAR=0x24ff8fca, GLOW_MID=0x48ff9fd0, GLOW_NEAR=0x78ffc0d9;
const FONT=gdi.Font('Segoe UI',13,0), BOLD=gdi.Font('Segoe UI',13,1);
const SMALL=gdi.Font('Segoe UI',11,0), HEAD=gdi.Font('Segoe UI',14,1);
const TF_GROUP=fb.TitleFormat('$if2(%album artist%,$if2(%artist%,Unknown Artist))');
const TF_ALBUM=fb.TitleFormat('$if2(%album%,Singles / Unknown Album)');
const TF_DATE=fb.TitleFormat('[$meta(date)]');
const TF_TITLE=fb.TitleFormat('[$num(%tracknumber%,2). ]$if2(%title%,Untitled)');
const TF_ARTIST=fb.TitleFormat('$if2(%artist%,Unknown Artist)');
const TF_DURATION=fb.TitleFormat('%length%');
let data=[], nodes=[], trackNodes=[], totalHeight=0, scroll=0, anchor=-1, downAt=null, hover=-1;
let covers=new Map(), groupCollapsed=new Set(), playlistId=-1, error='';
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function oneLine(v){return String(v===null||v===undefined?'':v).replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim();}
function current(){return plman.ActivePlaylist;}
function maxScroll(){return Math.max(0,totalHeight-Math.max(0,window.Height));}
function clampScroll(){scroll=clamp(scroll,0,maxScroll());}
function releaseCover(key){const a=covers.get(key);if(a&&typeof a.Dispose==='function')try{a.Dispose();}catch(_){} covers.delete(key);}
function clearCovers(){ for(const key of covers.keys()) releaseCover(key); }
function refreshAfterEdit(){ groupCollapsed.clear(); clearCovers(); anchor=-1; downAt=null; build(); }
function getCover(g){
    if(covers.has(g.key))return covers.get(g.key);
    let im=null;
    try{ im=utils.GetAlbumArtV2(g.handle,0); }catch(_){}
    if(covers.size>=18)releaseCover(covers.keys().next().value);
    covers.set(g.key,im);
    return im;
}
function build(){
    try{
        const p=current(); playlistId=p;
        const list=p>=0?plman.GetPlaylistItems(p):fb.CreateHandleList();
        const handles=list.Convert(), artists=TF_GROUP.EvalWithMetadbs(list), albums=TF_ALBUM.EvalWithMetadbs(list);
        const dates=TF_DATE.EvalWithMetadbs(list), titles=TF_TITLE.EvalWithMetadbs(list);
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
            const node={kind:'song',index:i,y,h:ROW_H,title:oneLine(titles[i]),artist:oneLine(ta[i]),duration:oneLine(durations[i]),group:group.key};
            data.push(node);
            if(!groupCollapsed.has(group.key)){nodes.push(node);trackNodes[i]=node;y+=ROW_H;}
        }
        totalHeight=y;
        clampScroll();error='';
    }catch(e){data=[];nodes=[];trackNodes=[];totalHeight=0;error=String(e);}
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
    // The concept art uses a larger grouped cover, but no reflection.
    const img=getCover(g);const S=56;
    gr.FillRoundRect(x,y,S,S,6,6,0xb2152547);
    if(img && img.Width>0 && img.Height>0){
        const factor=Math.min(S/img.Width,S/img.Height),w=Math.max(1,Math.floor(img.Width*factor)),h=Math.max(1,Math.floor(img.Height*factor));
        gr.DrawImage(img,x+Math.floor((S-w)/2),y+Math.floor((S-h)/2),w,h,0,0,img.Width,img.Height);
    }else gr.GdiDrawText('♪',HEAD,GOLD,x,y,S,S,0x1|0x4|0x20);
    gr.DrawRoundRect(x,y,S,S,6,6,1,0xc8d8a88f);
}
function on_paint(gr){
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
            // Glass album: 56px artwork (no reflection), softer body, restrained warm edging.
            const gx=BORDER_X,gw=Math.max(20,w-BORDER_X*2-2),gy=y+3,gh=HEADER_H-5;
            gr.FillRoundRect(gx,gy,gw,gh,8,8,0x48132242);
            gr.DrawRoundRect(gx,gy,gw,gh,8,8,1,GROUP_FRAME);
            // Discreet upper-corner highlights; decoration never overlaps the title/cover.
            if(gw>145){
                gr.FillSolidRect(gx+9,gy+3,18,1,0x96f1ceab);
                gr.FillSolidRect(gx+4,gy+9,1,11,0x75f1ceab);
                gr.FillSolidRect(gx+gw-27,gy+3,18,1,0x96f1ceab);
                gr.FillSolidRect(gx+gw-5,gy+9,1,11,0x75f1ceab);
            }
            drawCover(gr,n,16,y+8);
            const tx=82,tw=Math.max(40,w-138);
            gr.GdiDrawText(n.album,HEAD,TXT,tx,y+10,tw,27,DT);
            gr.GdiDrawText(n.artist+(n.date?'  ·  '+n.date:'')+'  ·  '+n.count+' tracks',SMALL,SOFT,tx,y+38,tw,22,DT);
            gr.GdiDrawText(groupCollapsed.has(n.key)?'▸':'▾',BOLD,GOLD,Math.max(0,w-31),y+12,22,22,DT);
            continue;
        }
        const selected=plman.IsPlaylistItemSelected(p,n.index),isPlaying=playing.IsValid&&playing.PlaylistIndex===p&&playing.PlaylistItemIndex===n.index;
        const x0=BORDER_X+1,y0=y+2,rw=Math.max(20,w-BORDER_X*2-3),rh=ROW_H-4;
        // Stage 3G increases only the transparent dark backing of ordinary rows; artwork remains visible.
        let bg=0x41121d38,fr=FRAME;
        if(hover===n.index){bg=0x48324667;fr=0x97d0abc2;}
        if(isPlaying){bg=0x656b405d;fr=GOLD_FRAME;}
        if(selected){bg=0x86864b75;fr=ACTIVE;}
        // Layered thin outlines imitate a soft rose glow without obscuring the wallpaper.
        if(selected){
            gr.DrawRoundRect(x0-3,y0-3,rw+6,rh+6,9,9,1,GLOW_FAR);
            gr.DrawRoundRect(x0-2,y0-2,rw+4,rh+4,8,8,1,GLOW_MID);
            gr.DrawRoundRect(x0-1,y0-1,rw+2,rh+2,8,8,1,GLOW_NEAR);
        }
        gr.FillRoundRect(x0,y0,rw,rh,7,7,bg);
        gr.DrawRoundRect(x0,y0,rw,rh,7,7,1,fr);
        // Playing and focus indicators remain distinct (gold vs pink).
        if(isPlaying)gr.FillRoundRect(x0+3,y0+7,3,Math.max(8,rh-14),1,1,0xffedbb86);
        else if(focus===n.index)gr.FillRoundRect(x0+3,y0+7,3,Math.max(8,rh-14),1,1,0xffe4b3cd);
        const f=(isPlaying||selected)?BOLD:FONT;
        gr.GdiDrawText(n.title,f,(isPlaying||selected)?0xfffff1e9:TXT,17,y0+2,Math.max(20,w-120),rh-4,DT);
        gr.GdiDrawText(n.duration,SMALL,selected?PINK:(isPlaying?GOLD:SOFT),Math.max(20,w-89),y0+2,70,rh-4,0x2|0x4|0x20);
    }
    if(totalHeight>h){const s=Math.max(35,Math.floor(h*h/totalHeight)); const yy=Math.floor((h-s)*scroll/Math.max(1,maxScroll()));gr.FillRoundRect(w-5,yy,3,s,2,2,0x9bf4c1c8);}
}
function selectTrack(i,mask){
    const p=current();if(p<0||i<0)return;
    if((mask&MK_SHIFT)&&anchor>=0){let a=Math.min(anchor,i),b=Math.max(anchor,i),ids=[];for(let j=a;j<=b;j++)ids.push(j);plman.ClearPlaylistSelection(p);plman.SetPlaylistSelection(p,ids,true);}
    else if(mask&MK_CONTROL){plman.SetPlaylistSelectionSingle(p,i,!plman.IsPlaylistItemSelected(p,i));anchor=i;}
    else {plman.ClearPlaylistSelection(p);plman.SetPlaylistSelectionSingle(p,i,true);anchor=i;}
    plman.SetPlaylistFocusItem(p,i);window.Repaint();
}
function reveal(i){let n=trackNodes[i];if(!n){build();n=trackNodes[i];}if(!n)return;if(n.y<scroll)scroll=n.y; else if(n.y+n.h>scroll+window.Height)scroll=n.y+n.h-window.Height;clampScroll();}
function toggleGroup(k){if(groupCollapsed.has(k))groupCollapsed.delete(k);else groupCollapsed.add(k);hover=-1;build();}
function on_mouse_lbtn_down(x,y,mask){
    const n=nodeAt(y),p=current();
    downAt=null;
    if(n&&n.kind==='group'){toggleGroup(n.key);return;}
    if(n&&n.kind==='song'){
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
    const down=downAt;downAt=null;
    const n=nodeAt(y);
    if(down&&down.deferred&&n&&n.kind==='song'&&n.index===down.i)
        selectTrack(n.index,0);
}
function on_mouse_lbtn_dblclk(x,y){const n=nodeAt(y);if(n&&n.kind==='song')plman.ExecutePlaylistDefaultAction(current(),n.index);}
function on_mouse_move(x,y,mask){
    const n=nodeAt(y),h=n&&n.kind==='song'?n.index:-1;
    if(h!==hover){hover=h;window.Repaint();}
    // Windowless JS Panel does not implement file drag/drop: use native VIEW for that.
    if(downAt&&(mask&1)&&Math.abs(x-downAt.x)+Math.abs(y-downAt.y)>8)downAt=null;
}
function on_mouse_leave(){hover=-1;window.Repaint();}
function on_mouse_wheel(step){scroll=clamp(scroll-step*ROW_H*3,0,maxScroll());window.Repaint();}
function on_mouse_rbtn_up(x,y){
    const n=nodeAt(y),p=current();
    if(p<0)return false;
    if(n&&n.kind==='song'&&!plman.IsPlaylistItemSelected(p,n.index))selectTrack(n.index,0);
    try{
        const m=window.CreatePopupMenu();m.AppendMenuItem(0,1,'Switch to native playlist (MODE: NATIVE)');
        m.AppendMenuSeparator();
        const cm=fb.CreateContextMenuManager();cm.InitContextPlaylist();cm.BuildMenu(m,100,1000);
        const cmd=m.TrackPopupMenu(x,y);
        if(cmd===1){panelsui.RunAction('PVAR:TOGGLE:anna.playlist.experimental');}
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
    if(key===VK_DELETE){plman.UndoBackup(p);plman.RemovePlaylistSelection(p,false);return true;}
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
function on_size(){clampScroll();window.Repaint();}
function on_playlist_switch(){scroll=0;hover=-1;refreshAfterEdit();}
function on_playlists_changed(){refreshAfterEdit();}
function on_playlist_items_added(p){if(p===current())refreshAfterEdit();}
function on_playlist_items_removed(p){if(p===current())refreshAfterEdit();}
function on_playlist_items_reordered(p){if(p===current())refreshAfterEdit();}
function on_playlist_items_selection_change(){window.Repaint();}
function on_item_focus_change(){window.Repaint();}
function on_metadb_changed(){refreshAfterEdit();}
function on_playback_new_track(){window.Repaint();}
function on_playback_stop(){window.Repaint();}
function on_playback_time(){ /* no repeated repaint needed for static row state */ }
function on_colours_changed(){window.Repaint();}
build();
