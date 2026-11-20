// Anna GLASS: names and drag-origin helpers shared by several JS Panels.
// One definition for panel-variable keys, reserved playlist names and the
// OLE origin marker format, so the sidebar and the Glass list cannot drift.
'use strict';
var AnnaShared=(function(){
 // Panels UI variables (panelsui.GetVariable / SetVariable).
 const PVAR=Object.freeze({
  dragOrigin:'anna.drag.origin',
  navMode:'anna.nav.mode',
  queueBuffer:'anna.queue.buffer.name',
  searchOwned:'anna.search.results.owned',
  searchName:'anna.search.results.name',
  sidebarEditable:'anna.sidebar.editable.name',
  dropPending:'anna.drop.pending', // Round 15: external drop to redirect (AnnaDropFix)
  // Owned by anna_theme.js / anna_i18n.js (they load standalone and keep the same value).
  themeHue:'anna.theme.hue',
  themeAccent:'anna.glass.v2.accent',
  language:'anna.language',
  // Skin toggles; main.txt and foo_ui_panels.ini read them by name too.
  queueOpen:'anna.queue.open',
  chromeHidden:'anna.chrome.hidden',
  favoriteCurrent:'anna.favorite.current',
  playlistExperimental:'anna.playlist.experimental'
 });
 // Playlists created and owned by the skin. Users never drop into these.
 const LIST=Object.freeze({
  favorites:'Anna - Favorites',
  library:'Music Library',
  queueBuffer:'Anna - Queue Buffer',
  sortedView:'Anna - Sorted Library View',
  artistView:'Anna - Artist View',
  importStaging:'Anna - Import Staging'
 });
 // OLE origin markers (value of PVAR.dragOrigin while a drag is in progress):
 //   glass:<playlist>          tracks selected in the Glass (middle) list
 //   sidebar:<kind>:<index>    kind = artist | library | fixedFavorites | fixedSearch | playlist
 //   ''                        no marker: external files / another application
 const SIDEBAR_RE=/^sidebar:(?:([A-Za-z]+):)?(-?\d+)$/;
 const GLASS_RE=/^glass:(-?\d+)$/;
 function getOrigin(){try{return String(panelsui.GetVariable(PVAR.dragOrigin,'')||'');}catch(e){return '';}}
 function setOrigin(v){try{panelsui.SetVariable(PVAR.dragOrigin,v);}catch(e){}}
 // Clear the marker only if it still belongs to the given owner ('glass:' / 'sidebar:').
 function clearOriginIf(prefix){if(getOrigin().startsWith(prefix))setOrigin('');}
 function glassMarker(playlist){return 'glass:'+playlist;}
 function sidebarMarker(kind,index){return 'sidebar:'+kind+':'+String(index===undefined?-1:index);}
 // -> {kind:'sidebar',type,index} | {kind:'glass',index} | {kind:'external'}
 //    type is 'unknown' and index -1 for a malformed sidebar marker;
 //    index is -2 for a malformed glass marker.
 function parseOrigin(o){
  o=String(o||'');
  if(o.startsWith('sidebar:')){
   const m=SIDEBAR_RE.exec(o);
   return {kind:'sidebar',type:m&&m[1]?m[1]:'unknown',index:m?parseInt(m[2],10):-1};
  }
  if(o.startsWith('glass:')){const m=GLASS_RE.exec(o);return {kind:'glass',index:m?parseInt(m[1],10):-2};}
  return {kind:'external'};
 }
 // "Base" or "Base #2", "Base #3"... (numbered duplicates created on name clashes).
 function isViewName(name,base){name=String(name);return name===base||name.indexOf(base+' #')===0;}
 // Reserved by name alone. The Queue buffer and search results are also reserved,
 // but their names are dynamic: check them with the PVARs above.
 function isReservedName(name){
  name=String(name);
  return name===LIST.favorites||name===LIST.library||name===LIST.queueBuffer||
   isViewName(name,LIST.sortedView)||isViewName(name,LIST.artistView)||
   name.indexOf(LIST.importStaging)===0;
 }
 return Object.freeze({PVAR,LIST,getOrigin,setOrigin,clearOriginIf,glassMarker,sidebarMarker,parseOrigin,isViewName,isReservedName});
})();
