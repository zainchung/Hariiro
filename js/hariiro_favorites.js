// Hariiro: the playing track in the Favorites playlist (heart buttons).
// SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
// Round 28: moved out of playlist_browser.js so the sidebar and the mini player share it.
'use strict';
include('hariiro_shared.js');
include('hariiro_i18n.js');
var HariiroFavorites=(function(){
 const NAME=HariiroShared.LIST.favorites;
 function indexIn(list,handle){
  if(!handle)return -1;
  try{return list.Find(handle);}catch(e){}
  const items=list.Convert();
  return items.findIndex(h=>h&&h.Path===handle.Path&&h.SubSong===handle.SubSong);
 }
 function isCurrent(){
  try{
   const h=fb.GetNowPlaying(),p=plman.FindPlaylist(NAME);
   return !!(h&&p>=0&&indexIn(plman.GetPlaylistItems(p),h)>=0);
  }catch(e){return false;}
 }
 // hariiro.favorite.current: read by main.txt's heart.
 function publish(){
  try{
   const val=isCurrent()?'1':'0';
   if(typeof panelsui!=='undefined'&&panelsui.GetVariable(HariiroShared.PVAR.favoriteCurrent,'0')!==val)
    panelsui.SetVariable(HariiroShared.PVAR.favoriteCurrent,val);
  }catch(e){console.log('Hariiro favorite state: '+String(e));}
 }
 // Adds the playing track to Favorites (created when missing) or removes it again.
 // Returns '' or a message for the panel to show.
 function toggleCurrent(){
  const h=fb.GetNowPlaying();
  if(!h)return HariiroI18n.t('noPlayingToFavorite');
  try{
   const existing=plman.FindPlaylist(NAME);
   const p=existing>=0?existing:plman.FindOrCreatePlaylist(NAME,true);
   if(p<0||plman.IsPlaylistLocked(p))throw new Error('Favorites playlist is locked');
   const index=indexIn(plman.GetPlaylistItems(p),h);
   if(index>=0){
    if(p===plman.PlayingPlaylist)throw new Error('Cannot remove an item from the playing Favorites playlist');
    plman.UndoBackup(p);
    plman.ClearPlaylistSelection(p);
    plman.SetPlaylistSelectionSingle(p,index,true);
    plman.RemovePlaylistSelection(p,false);
   }else{
    const tracks=fb.CreateHandleList();
    tracks.Add(h);
    plman.UndoBackup(p);
    plman.InsertPlaylistItems(p,plman.PlaylistItemCount(p),tracks);
   }
   publish();
   return '';
  }catch(e){const msg=HariiroI18n.t('favoritesFailed')+': '+String(e);console.log(msg);return msg;}
 }
 return Object.freeze({NAME,indexIn,isCurrent,publish,toggleCurrent});
})();
