// Hariiro: the hidden staging playlist that receives files dropped on blank sidebar
// space (Round 13). Moved out of playlist_browser.js in Phase D1; rules unchanged.
// Needs include('hariiro_shared.js') first. The name is a window property of the including
// panel (the sidebar), read once at include time.
'use strict';
var HariiroImportStaging=(function(){
 const PROPERTY='Hariiro.Sidebar.ImportStaging.v1';
 let stageName=String(window.GetProperty(PROPERTY,'')||'');
 // Name of the staging list this panel created ('' before the first blank drop).
 function name(){return stageName;}
 // Index of the staging list, or -1 when it does not exist.
 function find(){return stageName?plman.FindPlaylist(stageName):-1;}
 // Index of the staging list, created (with a free numbered name) if needed; -1 on failure.
 function playlist(){
  if(stageName){const p=plman.FindPlaylist(stageName);if(p>=0)return p;}
  for(let i=0;i<10000;i++){
   const candidate=HariiroShared.LIST.importStaging+(i?' #'+(i+1):'');
   if(plman.FindPlaylist(candidate)>=0)continue;
   const p=plman.CreatePlaylist(plman.PlaylistCount,candidate);
   if(p>=0){stageName=candidate;window.SetProperty(PROPERTY,candidate);return p;}
  }
  return -1;
 }
 return Object.freeze({name,find,playlist});
})();
