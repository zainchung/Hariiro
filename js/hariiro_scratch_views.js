// Hariiro: registry of the sidebar's scratch views (the sorted / Artist working
// SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
// playlists). Moved out of playlist_browser.js in Phase D1; rules unchanged.
// Needs include('hariiro_i18n.js') and include('hariiro_shared.js') first. The registry is a
// window property of the including panel (the sidebar), loaded once at include time.
'use strict';
var HariiroScratchViews=(function(){
 // Only lists created and registered by this panel can be used as scratch space.
 // A user playlist with an identical name must never be cleared accidentally.
 const PROPERTY='Hariiro.OwnedScratchPlaylists.v1';
 const SORTED_VIEW=HariiroShared.LIST.sortedView,ARTIST_VIEW=HariiroShared.LIST.artistView;
 function isViewName(x){return HariiroShared.isViewName(x,SORTED_VIEW)||HariiroShared.isViewName(x,ARTIST_VIEW);}
 function isDuplicate(x){return x.startsWith(SORTED_VIEW+' #')||x.startsWith(ARTIST_VIEW+' #');}
 function load(){
  try{
   const raw=JSON.parse(String(window.GetProperty(PROPERTY,'[]')));
   return new Set(Array.isArray(raw)?raw.filter(x=>typeof x==='string'&&isViewName(x)):[]);
  }catch(e){return new Set();}
 }
 const owned=load();
 function save(){window.SetProperty(PROPERTY,JSON.stringify([...owned]));}
 function isOwned(name){return owned.has(name);}
 // Returns a cleared-to-use playlist index for `name`, `name #2`, ... (creating and
 // registering one if needed). Throws viewSlotsFull when all 64 slots are taken.
 function claim(name){
  // Never clear a working playlist used by the playback engine or by a
  // queued song. Both references may remain alive even after leaving that view.
  const protectedIds=new Set();
  if(Number.isInteger(plman.PlayingPlaylist)&&plman.PlayingPlaylist>=0)
   protectedIds.add(plman.PlayingPlaylist);
  // The queue API is part of the same supported JS Panel version as the UI.
  // If it fails, fail closed: do not risk deleting referenced tracks.
  const queued=plman.GetPlaybackQueueContents();
  for(const q of queued)
   if(Number.isInteger(q.PlaylistIndex)&&q.PlaylistIndex>=0)
    protectedIds.add(q.PlaylistIndex);
  for(let n=0;n<64;n++){
   const candidate=n===0?name:name+' #'+(n+1);
   const existing=plman.FindPlaylist(candidate);
   if(existing>=0){
    // Unregistered same-named playlists belong to the user. Skip them.
    if(!owned.has(candidate)||protectedIds.has(existing))continue;
    // Our own scratch view is AddItems-locked after population to reject
    // native OLE drops while the Artist tab is active. Unlock only an
    // ownership-registered view; a foreign component lock fails closed.
    try{plman.SetPlaylistLockedActions(existing,[]);}catch(e){continue;}
    return existing;
   }
   const dest=plman.FindOrCreatePlaylist(candidate,true);
   if(dest>=0){owned.add(candidate);save();return dest;}
  }
  throw new Error(HariiroI18n.t('viewSlotsFull'));
 }
 let pruning=false;
 // Removes registered numbered duplicates nothing refers to; returns how many.
 function prune(){
  if(pruning)return 0;
  pruning=true;
  try{
   // Never touch unregistered, playing, active or queued playlists. foobar2000
   // owns the SQLite backing files; playlist removal is its only safe API.
   if(typeof plman.RemovePlaylist!=='function'||typeof plman.GetPlaybackQueueContents!=='function')return 0;
   const protectedNames=new Set();
   try{
    for(const p of [plman.ActivePlaylist,plman.PlayingPlaylist])
     if(p>=0&&p<plman.PlaylistCount)protectedNames.add(plman.GetPlaylistName(p));
    for(const q of plman.GetPlaybackQueueContents())
     if(q&&q.PlaylistIndex>=0&&q.PlaylistIndex<plman.PlaylistCount)
      protectedNames.add(plman.GetPlaylistName(q.PlaylistIndex));
   }catch(e){return 0;}
   let removed=0;
   for(const name of [...owned]){
    const idx=plman.FindPlaylist(name);
    if(idx<0){owned.delete(name);continue;}
    if(!isDuplicate(name)||protectedNames.has(name))continue;
    // Populated views carry our own AddItems lock (see claim). Lifting it only works for
    // our own JS Panel lock; another component's lock throws, and that list is kept.
    const relock=plman.IsPlaylistLocked(idx);
    if(relock){try{plman.SetPlaylistLockedActions(idx,[]);}catch(e){continue;}}
    try{
     if(plman.RemovePlaylist(idx)!==false){owned.delete(name);removed++;continue;}
    }catch(e){console.log('Hariiro scratch cleanup skipped: '+String(e));}
    if(relock){try{plman.SetPlaylistLockedActions(idx,['AddItems']);}catch(e){}}
   }
   save();return removed;
  }finally{pruning=false;}
 }
 return Object.freeze({isOwned,claim,prune});
})();
