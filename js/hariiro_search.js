// Hariiro — single translucent library search with live Unicode input.
// Enter searches foobar2000's *actual* media library. Results are placed in an
// owned working playlist, never into a user's saved playlist with the same name.
'use strict';
include('hariiro_shared.js');
include('hariiro_i18n.js');
include('hariiro_theme.js');
include('hariiro_dpi.js');
const FONT=HariiroDpi.font('Yu Gothic UI',11,0);
const SMALL=HariiroDpi.font('Segoe UI',10,0);
const GLYPH=HariiroDpi.font('Segoe UI Symbol',18,0), CLEAR_FONT=HariiroDpi.font('Segoe UI',15,0);
const GLASS=0xa8142347,FRAME=0xbfeab5d4,INK=0xfff6e8f4,MUTED=0xffbdacc5,PINK=0xffffb9d7;
const OWNED_PROPERTY='Hariiro.OwnedSearchResults.v1';
const QUERY_PROPERTY='Hariiro.Search.LastQuery.v1';
const RESULT_ROOT='Search Results';
const SORT_EXPR='$lower($if2(%album%,~Singles))|'+
    '$num(%discnumber%,4)|$num(%tracknumber%,5)|'+
    '$lower($if2(%album artist%,$if2(%artist%,Unknown Artist)))';
const MAX_QUERY=200;
let query=String(window.GetProperty(QUERY_PROPERTY,'')||'').slice(0,MAX_QUERY);
let focused=false,selectAll=false,error='',countLabel='',cursorOn=false;
let caret=Array.from(query).length;
let blinkTimer=0;
function ownedNames(){
    try{
        const a=JSON.parse(String(window.GetProperty(OWNED_PROPERTY,'[]')||'[]'));
        return new Set(Array.isArray(a)?a.filter(s=>typeof s==='string' &&
            (s===RESULT_ROOT||s.startsWith(RESULT_ROOT+' #'))):[]);
    }catch(e){return new Set();}
}
const owned=ownedNames();
function publishOwnedResults(){
 try{
  panelsui.SetVariable(HariiroShared.PVAR.searchOwned,JSON.stringify([...owned]));
  const names=[...owned].filter(n=>plman.FindPlaylist(n)>=0);
  if(names.length)panelsui.SetVariable(HariiroShared.PVAR.searchName,names[names.length-1]);
 }catch(e){console.log('Hariiro search ownership: '+String(e));}
}
publishOwnedResults();

function persist(){window.SetProperty(QUERY_PROPERTY,query);}
function addChars(chars){
    const inserted=Array.from(String(chars||''));
    const charsBefore=selectAll?[]:Array.from(query).slice(0,caret);
    const charsAfter=selectAll?[]:Array.from(query).slice(caret);
    const combined=charsBefore.concat(inserted,charsAfter).slice(0,MAX_QUERY);
    caret=Math.min(charsBefore.length+inserted.length,combined.length);
    query=combined.join('');
    selectAll=false;error='';countLabel='';cursorOn=true;
    persist();window.Repaint();
}
function clearText(){
    query='';caret=0;selectAll=false;error='';countLabel='';
    cursorOn=true;persist();window.Repaint();
}
function pruneSearchCaches(){
 if(typeof plman.RemovePlaylist!=='function'||typeof plman.GetPlaybackQueueContents!=='function')return 0;
 const protectedNames=new Set();
 try{
  for(const p of [plman.ActivePlaylist,plman.PlayingPlaylist])
   if(p>=0&&p<plman.PlaylistCount)protectedNames.add(plman.GetPlaylistName(p));
  for(const q of plman.GetPlaybackQueueContents())if(q&&q.PlaylistIndex>=0&&q.PlaylistIndex<plman.PlaylistCount)
   protectedNames.add(plman.GetPlaylistName(q.PlaylistIndex));
  const currentName=String(panelsui.GetVariable(HariiroShared.PVAR.searchName,'')||'');
  if(currentName)protectedNames.add(currentName);
 }catch(e){return 0;}
 let removed=0;
 for(const name of [...owned]){
  const idx=plman.FindPlaylist(name);
  if(idx<0){owned.delete(name);continue;}
  if(name===RESULT_ROOT||protectedNames.has(name)||plman.IsPlaylistLocked(idx))continue;
  try{if(plman.RemovePlaylist(idx)!==false){owned.delete(name);removed++;}}
  catch(e){console.log('Hariiro search cleanup skipped: '+String(e));}
 }
 if(removed){window.SetProperty(OWNED_PROPERTY,JSON.stringify([...owned]));publishOwnedResults();}
 return removed;
}
function safeResultsPlaylist() {
    const protectedIds=new Set();
    if(plman.PlayingPlaylist>=0)protectedIds.add(plman.PlayingPlaylist);
    for(const q of plman.GetPlaybackQueueContents())
        if(q.PlaylistIndex>=0)protectedIds.add(q.PlaylistIndex);
    for(let n=0;n<128;n++){
        const name=n===0?RESULT_ROOT:RESULT_ROOT+' #'+(n+1);
        const existing=plman.FindPlaylist(name);
        if(existing>=0){
            if(!owned.has(name)||protectedIds.has(existing)||plman.IsPlaylistLocked(existing))continue;
            return existing;
        }
        const p=plman.FindOrCreatePlaylist(name,true);
        if(p<0)continue;
        owned.add(name);
        window.SetProperty(OWNED_PROPERTY,JSON.stringify([...owned]));
        publishOwnedResults();
        return p;
    }
    throw new Error(HariiroI18n.t('searchSlotsFull'));
}
function performSearch(){
    const term=query.trim();if(!term){clearText();return;}
    try{
        const library=fb.GetLibraryItems();
        const result=fb.GetQueryItems(library,term);
        const target=safeResultsPlaylist();
        plman.ClearPlaylist(target);
        if(result.Count){
            plman.InsertPlaylistItems(target,0,result);
            if(!plman.SortByFormatV2(target,SORT_EXPR,1))
                throw new Error(HariiroI18n.t('searchSortFailed'));
        }
        plman.ActivePlaylist=target;
        try {panelsui.SetVariable(HariiroShared.PVAR.searchName,plman.GetPlaylistName(target));}catch(e){}
        countLabel=String(result.Count)+' '+HariiroI18n.t('searchResultsCount');
        pruneSearchCaches();
        error='';
    }catch(e){
        error=HariiroI18n.t('searchFailed')+': '+String(e);
        console.log('Hariiro search: '+String(e));
    }
    selectAll=false;window.Repaint();
}
function on_paint(gr){
 gr=HariiroTheme.graphics(gr);
    const w=HariiroDpi.width(),h=HariiroDpi.height();if(w<30||h<18)return;
    gr.FillRoundRect(0,0,w,h,12,12,GLASS);
    gr.DrawRoundRect(1,1,w-3,h-3,11,11,1,focused?PINK:FRAME);
    gr.GdiDrawText('⌕',GLYPH,PINK,9,3,23,h-6,0x8024);
    const hasText=!!query;
    const showText=hasText?query:HariiroI18n.t('searchHint');
    const right=hasText?37:10;
    const visibleWidth=Math.max(10,w-45-right);
    if(focused&&selectAll&&hasText)
        gr.FillRoundRect(37,5,Math.max(1,Math.min(visibleWidth,
            gr.CalcTextWidth(query,FONT)+4)),h-10,3,3,0x8a985278);
    gr.GdiDrawText(showText,FONT,hasText?INK:MUTED,38,2,visibleWidth,h-4,0x8024);
    if(hasText)
        gr.GdiDrawText('×',CLEAR_FONT,PINK,w-31,3,24,h-6,0x8024);
    // Always blink while focused, even in an empty search field.
    if(focused&&cursorOn&&!selectAll){
        const prefix=Array.from(query).slice(0,caret).join('');
        const x=Math.max(38,Math.min(w-45,39+gr.CalcTextWidth(prefix,FONT)));
        gr.FillSolidRect(x,7,1,Math.max(7,h-14),PINK);
    }
    if(error)gr.DrawRect(1,1,w-3,h-3,1,0xffed8bac);
    if(countLabel)gr.GdiDrawText(countLabel,SMALL,PINK,
        Math.max(37,w-104),2,58,h-4,0x8024);
}
function on_focus(value){focused=!!value;cursorOn=true;window.Repaint();}
function on_mouse_move(x,y){window.SetCursor(32513);} // I-beam
function on_mouse_lbtn_down(x,y){
    if(query&&x>HariiroDpi.width()-36){clearText();return;}
    focused=true;cursorOn=true;selectAll=false;
    // Approximate the nearest character boundary using the actual GDI font.
    const points=Array.from(query),target=Math.max(0,x-38);
    caret=points.length;
    for(let i=0;i<points.length;i++){
        const a=graphemeWidth(points.slice(0,i).join(''));
        const b=graphemeWidth(points.slice(0,i+1).join(''));
        if(target<(a+b)/2){caret=i;break;}
    }
    window.Repaint();
}
function graphemeWidth(text){
    try{const w=HariiroDpi.textWidth(text,FONT);return w===null?text.length*8:w;}
    catch(e){return text.length*8;}
}
function on_char(code){
    if(code===8){
        if(selectAll){clearText();return true;}
        const chars=Array.from(query);
        if(caret>0){chars.splice(caret-1,1);caret--;query=chars.join('');persist();window.Repaint();}
        return true;
    }
    if(code===13){performSearch();return true;}
    if(code===27){clearText();return true;}
    if(code>=32&&code!==127&&code<=0x10ffff){
        // WM_CHAR also delivers committed Japanese IME characters (surrogate
        // pairs are preserved when two UTF-16 code units arrive separately).
        addChars(String.fromCodePoint(code));return true;
    }
    return false;
}
function on_key_down(code){
    const ctrl=utils.IsKeyPressed(0x11);
    const chars=Array.from(query);
    if(ctrl&&code===65){selectAll=true;cursorOn=true;window.Repaint();return true;}
    if(ctrl&&code===86){
        try{addChars(utils.GetClipboardText());}
        catch(e){console.log('Hariiro search clipboard: '+String(e));}
        return true;
    }
    if(ctrl&&code===67){
        try{utils.SetClipboardText(query);}
        catch(e){console.log('Hariiro search clipboard: '+String(e));}
        return true;
    }
    if(code===37){caret=selectAll?0:Math.max(0,caret-1);selectAll=false;window.Repaint();return true;}
    if(code===39){caret=selectAll?chars.length:Math.min(chars.length,caret+1);selectAll=false;window.Repaint();return true;}
    if(code===36){caret=0;selectAll=false;window.Repaint();return true;}
    if(code===35){caret=chars.length;selectAll=false;window.Repaint();return true;}
    if(code===46){
        if(selectAll){clearText();return true;}
        if(caret<chars.length){chars.splice(caret,1);query=chars.join('');persist();window.Repaint();}
        return true;
    }
    if(code===13){performSearch();return true;}
    return false;
}
function on_mouse_rbtn_up(x,y){
    const m=window.CreatePopupMenu();
    m.AppendMenuItem(0,1,HariiroI18n.t('searchNow'));
    m.AppendMenuItem(0,2,HariiroI18n.t('paste'));
    m.AppendMenuItem(0,3,HariiroI18n.t('clearSearch'));
    const choice=HariiroDpi.popup(m,x,y);
    if(choice===1)performSearch();
    else if(choice===2){try{addChars(utils.GetClipboardText());}catch(e){console.log('Clipboard: '+String(e));}}
    else if(choice===3)clearText();
    return true;
}

blinkTimer=window.SetInterval(function(){
    if(!focused||!window.IsVisible)return;
    cursorOn=!cursorOn;
    HariiroDpi.repaintRect(37,2,Math.max(1,HariiroDpi.width()-74),Math.max(1,HariiroDpi.height()-4));
},500);
function on_script_unload(){if(blinkTimer)window.ClearInterval(blinkTimer);}

function on_panelsui_variable_changed(name){if(name===HariiroShared.PVAR.themeHue){window.Repaint();return;}
if(name===HariiroShared.PVAR.language)window.Repaint();}

// Child-window DPI adapter: must stay the last statement (wraps the callbacks above).
HariiroDpi.install();
