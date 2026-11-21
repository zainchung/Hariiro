// Hariiro: drop decision for the middle (Glass) list. Moved out of
// hariiro_glass_playlist.js in Phase D1; the rules are the Round 14 drag matrix.
// Needs include('hariiro_i18n.js') and include('hariiro_shared.js') first.
// ownDrag = {active, guardUntil}: the panel's own DoDragDrop state.
'use strict';
var HariiroGlassDrop=(function(){
 // Who started the current OLE session? Marker format: see HariiroShared.parseOrigin.
 function source(ownDrag){
  // ownDrag.active is set synchronously around the panel's own DoDragDrop, so it is
  // the one definitive signal; markers can be stale for a few hundred ms.
  if(ownDrag&&ownDrag.active)return {kind:'glass'};
  const src=HariiroShared.parseOrigin(HariiroShared.getOrigin());
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
   if(String(panelsui.GetVariable(HariiroShared.PVAR.navMode,'library'))!=='library')return -1;
   const p=plman.ActivePlaylist;
   if(p<0||p>=plman.PlaylistCount||plman.IsPlaylistLocked(p))return -1;
   const name=String(plman.GetPlaylistName(p));
   if(HariiroShared.isReservedName(name))return -1;
   const buffer=String(panelsui.GetVariable(HariiroShared.PVAR.queueBuffer,'')||'');
   if(buffer&&name===buffer)return -1;
   const owned=JSON.parse(String(panelsui.GetVariable(HariiroShared.PVAR.searchOwned,'[]')||'[]'));
   if(Array.isArray(owned)&&owned.indexOf(name)>=0)return -1;
   return p;
  }catch(e){return -1;}
 }
 function denyMessage(){
  let artistView=false;
  try{
   artistView=String(panelsui.GetVariable(HariiroShared.PVAR.navMode,'library'))==='artists';
   const p=plman.ActivePlaylist;
   if(p>=0&&HariiroShared.isViewName(String(plman.GetPlaylistName(p)),HariiroShared.LIST.artistView))artistView=true;
  }catch(e){}
  return artistView?HariiroI18n.t('artistHint'):HariiroI18n.t('chooseRegularPlaylist');
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
   return {ok:false,msg:HariiroI18n.t('sidebarToMiddleDenied')};
  const p=target();
  if(p<0)return {ok:false,msg:denyMessage()};
  if(src.kind==='sidebar'&&src.index===p)
   return {ok:false,msg:HariiroI18n.t('sameListDenied')};
  return {ok:true,msg:HariiroI18n.t('dropToImport'),target:p};
 }
 return Object.freeze({source,target,denyMessage,evaluate});
})();
