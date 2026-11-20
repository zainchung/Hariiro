// Anna Glass: drop decision for the middle (Glass) list. Moved out of
// anna_glass_playlist.js in Phase D1; the rules are the Round 14 drag matrix.
// Needs include('anna_i18n.js') and include('anna_shared.js') first.
// ownDrag = {active, guardUntil}: the panel's own DoDragDrop state.
'use strict';
var AnnaGlassDrop=(function(){
 // Who started the current OLE session? Marker format: see AnnaShared.parseOrigin.
 function source(ownDrag){
  // ownDrag.active is set synchronously around the panel's own DoDragDrop, so it is
  // the one definitive signal; markers can be stale for a few hundred ms.
  if(ownDrag&&ownDrag.active)return {kind:'glass'};
  const src=AnnaShared.parseOrigin(AnnaShared.getOrigin());
  if(src.kind==='sidebar')return src;
  if(src.kind==='glass')return {kind:'glass'};
  if(ownDrag&&Date.now()<ownDrag.guardUntil)return {kind:'glass'}; // stray callback right after its own drag
  return {kind:'external'};
 }
 // The middle list accepts drops ONLY while it shows an ordinary, unlocked playlist.
 // Derived from the playlist actually on screen, never from sidebar bookkeeping:
 // that state is empty after start-up, tab switches and "now playing" jumps, which
 // made valid drops get rejected.
 function target(){
  try{
   if(String(panelsui.GetVariable(AnnaShared.PVAR.navMode,'library'))!=='library')return -1;
   const p=plman.ActivePlaylist;
   if(p<0||p>=plman.PlaylistCount||plman.IsPlaylistLocked(p))return -1;
   const name=String(plman.GetPlaylistName(p));
   if(AnnaShared.isReservedName(name))return -1;
   const buffer=String(panelsui.GetVariable(AnnaShared.PVAR.queueBuffer,'')||'');
   if(buffer&&name===buffer)return -1;
   const owned=JSON.parse(String(panelsui.GetVariable(AnnaShared.PVAR.searchOwned,'[]')||'[]'));
   if(Array.isArray(owned)&&owned.indexOf(name)>=0)return -1;
   return p;
  }catch(e){return -1;}
 }
 function denyMessage(){
  let artistView=false;
  try{
   artistView=String(panelsui.GetVariable(AnnaShared.PVAR.navMode,'library'))==='artists';
   const p=plman.ActivePlaylist;
   if(p>=0&&AnnaShared.isViewName(String(plman.GetPlaylistName(p)),AnnaShared.LIST.artistView))artistView=true;
  }catch(e){}
  return artistView?AnnaI18n.t('artistHint'):AnnaI18n.t('chooseRegularPlaylist');
 }
 // Single decision point for drag-over and drop, so both always agree.
 //  glass tracks      -> never back onto this panel (no message)
 //  sidebar playlist  -> add to the ordinary playlist shown here (not to itself)
 //  sidebar artist / pinned list -> warning, rejected (they only go to the Queue)
 //  external files    -> add to the ordinary playlist shown here, else warning
 function evaluate(ownDrag){
  const src=source(ownDrag);
  if(src.kind==='glass')return {ok:false,msg:''};
  if(src.kind==='sidebar'&&src.type!=='playlist')
   return {ok:false,msg:AnnaI18n.t('sidebarToMiddleDenied')};
  const p=target();
  if(p<0)return {ok:false,msg:denyMessage()};
  if(src.kind==='sidebar'&&src.index===p)
   return {ok:false,msg:AnnaI18n.t('sameListDenied')};
  return {ok:true,msg:AnnaI18n.t('dropToImport'),target:p};
 }
 return Object.freeze({source,target,denyMessage,evaluate});
})();
