// Anna Glass V2 — real playback queue, transparent windowless JS Panel.
// Requires JS Panel 1.6+ for queue APIs, 1.9+ AND Panels UI 1.26+ for
// native drag/drop into a windowless target. No fake drag affordances.
// The buffer playlist keeps queue references valid after the drop.
'use strict';
include('anna_i18n.js');
include('anna_theme.js');
const ROW=35, TOP=29, TXT=0xfff7eaf3, MUTED=0xffc5c5df, PINK=0xffffbbd8;
const FONT=gdi.Font('Yu Gothic UI',11,0), BOLD=gdi.Font('Yu Gothic UI',11,1);
const SMALL=gdi.Font('Segoe UI',9,0), DT=0x8024;
const BUFFER='Anna - Queue Buffer';
const BUFFER_PROPERTY='Anna.OwnedQueueBuffer.v1';
// Do not reuse a pre-existing playlist simply because its name matches BUFFER.
let ownedBufferName=String(window.GetProperty(BUFFER_PROPERTY,'')||'');
if(ownedBufferName!==BUFFER && !/^Anna - Queue Buffer #(?!1$)[1-9][0-9]*$/.test(ownedBufferName))
    ownedBufferName='';
const BUFFER_LIMIT=400; // compact only when all queue items are independent handles
const TF_TITLE=fb.TitleFormat('$if(%tracknumber%,$ifgreater($num(%discnumber%,1),1,$num(%discnumber%,1)-$num(%tracknumber%,2),$num(%tracknumber%,2)). ,)$if2(%title%,Untitled)');
const TF_ARTIST=fb.TitleFormat('$if2(%artist%,Unknown Artist)');
let rows=[], scroll=0,hover=-1,buffer=-1,processed=0,acceptingDrop=false,error='';
let dragIndex=-1,dragTarget=-1,dragStartY=0,movingRow=false;
let dragY=0,trashHover=false;
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function publishBufferName(){
    try {
        if(typeof panelsui!=='undefined' && ownedBufferName &&
           panelsui.GetVariable('anna.queue.buffer.name','')!==ownedBufferName)
            panelsui.SetVariable('anna.queue.buffer.name',ownedBufferName);
    }catch(e){console.log('Anna queue: cannot publish buffer name '+String(e));}
}
function bufferPlaylist(){
    // An owned buffer is persistent because legacy queue items may use playlist indices.
    if(buffer>=0 && buffer<plman.PlaylistCount &&
       plman.GetPlaylistName(buffer)===ownedBufferName){
        publishBufferName();return buffer;
    }
    if(ownedBufferName){
        const owned=plman.FindPlaylist(ownedBufferName);
        if(owned>=0){buffer=owned;processed=plman.PlaylistItemCount(buffer);
            publishBufferName();return buffer;}
    }
    // No recorded ownership: reserve a fresh name, never clear a user playlist.
    for(let n=0;n<1000;n++){
        const candidate=n===0?BUFFER:BUFFER+' #'+(n+1);
        if(plman.FindPlaylist(candidate)>=0)continue;
        const newIndex=plman.FindOrCreatePlaylist(candidate,true);
        if(newIndex<0)continue;
        buffer=newIndex;ownedBufferName=candidate;
        window.SetProperty(BUFFER_PROPERTY,candidate);
        processed=plman.PlaylistItemCount(buffer);
        publishBufferName();return buffer;
    }
    throw new Error(AnnaI18n.t('queueBufferFull'));
}
function refresh(){
    try {
        const handles=plman.GetPlaybackQueueHandles();
        const titles=TF_TITLE.EvalWithMetadbs(handles), artists=TF_ARTIST.EvalWithMetadbs(handles);
        rows=handles.Convert().map((h,i)=>({handle:h,title:String(titles[i]||''),artist:String(artists[i]||'')}));
        error='';
    }catch(e){rows=[];error=AnnaI18n.t('queueUnavailable')+': '+String(e);}
    scroll=clamp(scroll,0,Math.max(0,rows.length*ROW-Math.max(0,window.Height-TOP)));
    window.Repaint();
}
function rowAt(y){
    if(y<TOP||y>=window.Height)return -1;
    const index=Math.floor((y-TOP+scroll)/ROW);
    return index>=0&&index<rows.length?index:-1;
}
function trashHit(x,y){return y>=1&&y<TOP&&x>=window.Width-151&&x<window.Width-122;}
function reorder(from,to){
    if(from<0||to<0||from>=rows.length||to>=rows.length||from===to)return false;
    // The API exposes queue append/remove but not insert. Rebuild in exact
    // handle order, preserving duplicate entries and independent track handles.
    const original=plman.GetPlaybackQueueHandles().Convert();
    const next=original.slice();
    const [item]=next.splice(from,1);
    next.splice(to,0,item);
    try{
        plman.FlushPlaybackQueue();
        for(const h of next)plman.AddItemToPlaybackQueue(h);
        refresh();return true;
    }catch(e){
        // Best-effort restore of the original queue on an add failure.
        try{
            plman.FlushPlaybackQueue();
            for(const h of original)plman.AddItemToPlaybackQueue(h);
        }catch(restoreError){console.log('Anna queue restore: '+String(restoreError));}
        error=AnnaI18n.t('queueReorderFailed')+': '+String(e);window.Repaint();return false;
    }
}
function moveOrRemove(index,delta){
    if(index<0||index>=rows.length)return false;
    if(delta===null){plman.RemoveItemFromPlaybackQueue(index);refresh();return true;}
    return reorder(index,index+delta);
}
function on_paint(gr){
 gr=AnnaTheme.graphics(gr);
    const w=window.Width,h=window.Height;if(w<10||h<10)return;
    // Queue mode is deliberately visually distinct from lyrics: opaque rose/navy.
    // Only an explicit user click on the clear button flushes the playback queue.
    gr.FillSolidRect(1,1,w-2,h-2,0x94502c59);
    gr.DrawRect(1,1,w-3,h-3,1,0xfff7add4);
    gr.FillSolidRect(2,1,w-4,3,0xffffa8d6);
    gr.GdiDrawText('♫ QUEUE · '+rows.length,BOLD,0xffffe5f1,12,4,Math.max(40,w-145),22,DT);
    // A visible trash target also accepts a dragged queue row.
    const removeCue=movingRow&&trashHover;
    if(removeCue)gr.DrawRoundRect(w-155,1,36,29,6,6,2,0xffffe7a7);
    gr.FillRoundRect(w-151,4,29,23,5,5,
        removeCue?0xffc73f67:movingRow?0xff945078:0x99553663);
    gr.GdiDrawText('🗑',gdi.Font('Segoe UI Emoji',14,0),
        removeCue?0xffffffff:0xffffd5e8,w-148,5,24,21,0x8025);
    gr.FillRoundRect(w-119,4,108,23,5,5,0xff8b3c72);
    gr.DrawRoundRect(w-119,4,108,23,5,5,1,0xffffc6df);
    gr.GdiDrawText(AnnaI18n.t('clearQueue'),SMALL,0xffffffff,w-117,5,104,21,0x8025);
    gr.FillSolidRect(12,TOP-4,w-24,1,0x88e8adc4);
    if(error) {gr.GdiDrawText(error,SMALL,PINK,12,40,w-24,56,0x10);return;}
    if(!rows.length) {
        gr.GdiDrawText(AnnaI18n.t('queueEmpty'),BOLD,TXT,12,Math.max(40,h/2-37),w-24,28,0x25);
        gr.GdiDrawText(AnnaI18n.t('dropQueue'),SMALL,TXT,
            12,Math.max(68,h/2+3),w-24,30,0x25);
    }
    const first=Math.floor(scroll/ROW),shown=Math.ceil(Math.max(0,h-TOP)/ROW)+1;
    for(let i=first;i<Math.min(rows.length,first+shown);i++){
        const y=TOP+i*ROW-scroll;
        if(y+ROW<=TOP||y>=h)continue;
        const r=rows[i],active=hover===i||movingRow&&dragTarget===i;
        if(movingRow&&dragTarget===i&&!trashHover){
            gr.FillSolidRect(7,y-3,w-16,7,0x50ffa9d8);
            gr.FillSolidRect(7,y-1,w-16,3,0xffffc8e5);
            gr.FillPolygon(0xffffc8e5,0,[7,y-7,17,y,7,y+7]);
        }
        gr.FillRoundRect(8,y+2,w-18,ROW-4,6,6,active?0x68734c76:0x361b2947);
        gr.DrawRoundRect(8,y+2,w-18,ROW-4,6,6,1,active?0xffefaecf:0x65ddb2c5);
        gr.GdiDrawText(String(i+1).padStart(2,'0'),SMALL,PINK,13,y+3,28,ROW-6,DT);
        gr.GdiDrawText(r.title,active?BOLD:FONT,TXT,43,y+3,Math.max(20,w-142),ROW-6,DT);
        gr.GdiDrawText(r.artist,SMALL,MUTED,Math.max(45,w-100),y+3,83,ROW-6,DT);
    }
    if(movingRow&&dragIndex>=0){
        if(trashHover){
            gr.GdiDrawText(AnnaI18n.t('queueRemoving'),BOLD,0xffffe4c6,
                12,h-33,w-24,28,0x25);
        }else{
            const label=dragTarget>=0?
                AnnaI18n.t('queueMove')+' '+String(dragIndex+1).padStart(2,'0')+' → '+
                String(dragTarget+1).padStart(2,'0'):AnnaI18n.t('queueDragReorder');
            gr.FillRoundRect(18,h-39,w-36,29,7,7,0xba633b68);
            gr.DrawRoundRect(18,h-39,w-36,29,7,7,1,0xffffb9df);
            gr.GdiDrawText(label,BOLD,0xffffffff,22,h-36,w-44,23,0x25);
        }
        const source=rows[dragIndex];
        if(source&&!trashHover&&dragY>=TOP){
            const y=clamp(dragY-ROW/2,TOP,Math.max(TOP,h-ROW));
            gr.FillRoundRect(12,y,w-24,ROW-3,6,6,0xbbb85b92);
            gr.DrawRoundRect(12,y,w-24,ROW-3,6,6,1,0xffffd4ea);
            gr.GdiDrawText(source.title,BOLD,0xffffffff,20,y+2,w-40,ROW-6,DT);
        }
    }
    if(acceptingDrop) {
        gr.DrawRoundRect(4,4,w-9,h-9,8,8,2,0xffffb4d8);
        gr.GdiDrawText(AnnaI18n.t('dropQueue'),BOLD,PINK,12,Math.max(32,h/2-14),w-24,30,0x25);
    }
}
function on_drag_enter(action,x,y){on_drag_over(action,x,y);}
function on_drag_over(action,x,y){
    try{
        const p=bufferPlaylist();
        action.Effect=plman.IsPlaylistLocked(p)?0:1;
        acceptingDrop=action.Effect!==0;
    }catch(e){action.Effect=0;error=AnnaI18n.t('queueUnavailable')+': '+String(e);acceptingDrop=false;}
    window.Repaint();
}
function on_drag_leave(){acceptingDrop=false;window.Repaint();}
function compactBufferIfSafe(p){
    if(plman.PlaylistItemCount(p)<BUFFER_LIMIT || plman.PlayingPlaylist===p)return;
    // A queue item added by an older version might still reference buffer indices.
    // Never delete its source until the user has played or cleared that item.
    const references=plman.GetPlaybackQueueContents();
    if(references.some(q=>q.PlaylistIndex===p))return;
    plman.ClearPlaylist(p); // hides old transient tracks; no user playlists touched
    processed=0;
}
function on_drag_drop(action,x,y){
    acceptingDrop=false;
    try {
        const p=bufferPlaylist();
        if(plman.IsPlaylistLocked(p)) { action.Effect=0;return; }
        compactBufferIfSafe(p);
        processed=plman.PlaylistItemCount(p); // drop appends after this offset
        action.Playlist=p;
        action.Base=processed;
        action.ToSelect=false;
        action.Effect=1;
    }catch(e){action.Effect=0;error=AnnaI18n.t('queueDropFailed')+': '+String(e);window.Repaint();}
}
function on_playlist_items_added(p){
    if(buffer<0||p!==buffer)return;
    // Adding playlist tracks is handled by foobar after on_drag_drop returns.
    // Queue these references before editing or clearing any buffer data.
    try{
        const count=plman.PlaylistItemCount(p);
        const handles=plman.GetPlaylistItems(p);
        for(let i=processed;i<count;i++)
            plman.AddItemToPlaybackQueue(handles.Item(i)); // independent of buffer indices
        processed=count;
    }catch(e){error=AnnaI18n.t('queueDropFailed')+': '+String(e);}
    refresh();
}
function on_mouse_lbtn_down(x,y){
    dragIndex=rowAt(y);dragStartY=y;dragTarget=dragIndex;dragY=y;trashHover=false;movingRow=false;
}
function on_mouse_lbtn_up(x,y){
    const from=dragIndex, wasMoving=movingRow;
    dragIndex=-1;movingRow=false;dragTarget=-1;trashHover=false;
    if(wasMoving&&from>=0){
        if(trashHit(x,y)){moveOrRemove(from,null);return true;}
        const target=rowAt(y);
        if(target>=0&&target!==from){reorder(from,target);return true;}
        window.Repaint();return true;
    }
    if(y>=0&&y<TOP&&x>=window.Width-123){
        if(rows.length)plman.FlushPlaybackQueue();
        refresh();return true;
    }
    if(trashHit(x,y))return true;
    return false;
}
function on_playback_queue_changed(){refresh();}
function on_playlists_changed(){
    if(buffer>=0 && (buffer>=plman.PlaylistCount||plman.GetPlaylistName(buffer)!==ownedBufferName))buffer=-1;
    refresh();
}
function on_mouse_move(x,y,mask){
    const n=rowAt(y);
    if(dragIndex>=0&&(mask&1)&&Math.abs(y-dragStartY)>6){
        movingRow=true;dragTarget=n;dragY=y;trashHover=trashHit(x,y);
    }
    if(n!==hover||movingRow){hover=n;window.Repaint();}
}
function on_mouse_leave(){hover=-1;if(!movingRow)window.Repaint();}
function on_mouse_wheel(step){scroll=clamp(scroll-step*ROW*2,0,Math.max(0,rows.length*ROW-(window.Height-TOP)));window.Repaint();}
function on_mouse_rbtn_up(x,y){
    const i=rowAt(y);
    const m=window.CreatePopupMenu();
    if(i>=0){
        m.AppendMenuItem(0,10,AnnaI18n.t('moveUp'));
        m.AppendMenuItem(0,11,AnnaI18n.t('moveDown'));
        m.AppendMenuItem(0,12,AnnaI18n.t('removeQueue'));
        m.AppendMenuSeparator();
    }
    if(rows.length)m.AppendMenuItem(0,13,AnnaI18n.t('clearQueue'));
    const cmd=m.TrackPopupMenu(x,y);
    if(cmd===10)moveOrRemove(i,-1);
    else if(cmd===11)moveOrRemove(i,1);
    else if(cmd===12)moveOrRemove(i,null);
    else if(cmd===13){plman.FlushPlaybackQueue();refresh();}
    return true;
}
function on_size(){refresh();}
refresh();

function on_panelsui_variable_changed(name){if(name==='anna.theme.hue'||name==='anna.language')window.Repaint();}
