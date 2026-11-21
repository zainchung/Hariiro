// Hariiro: drop decision for the sidebar (Round 14 drag matrix, Round 15 external
// files). Moved out of playlist_browser.js in Phase D1: on_drag_over, on_drag_drop and the
// external-file plan used three copies of these rules. Needs include('hariiro_i18n.js') first.
'use strict';
var HariiroSidebarDrop=(function(){
 // o = {mode, busy, src, hit, editable, blankAllowed, glassIndex}
 //  mode: 'playlists' | 'artists'; busy: the sidebar's own OLE drag is running;
 //  src: origin marker ('' = external); hit: {i,row} under the pointer or null;
 //  editable(row): row accepts tracks; blankAllowed: a drop here may create a playlist;
 //  glassIndex: playlist the middle list's drag came from (-2 if none).
 // Returns {accept, kind: 'row'|'blank'|'reject', target: row number or -1, p, notice}.
 function decide(o){
  const src=String(o.src||'');
  // Sidebar-to-sidebar can only reorder locally without OLE; Artist mode is read-only.
  if(o.busy||src.startsWith('sidebar:')||o.mode==='artists')
   return reject(HariiroI18n.t(o.mode==='artists'?'artistHint':'sidebarToMiddleDenied'));
  const hit=o.hit,row=hit&&hit.row;
  const target=!!row&&o.editable(row);
  // Tracks from the middle list may go to any ordinary playlist except their own.
  const same=target&&src.startsWith('glass:')&&row.index===o.glassIndex;
  if(target&&!same)
   return {accept:true,kind:'row',target:hit.i,p:row.index,notice:HariiroI18n.t('dropTo')+' '+row.name};
  if(!target&&o.blankAllowed)
   return {accept:true,kind:'blank',target:-1,p:-1,notice:HariiroI18n.t('dropNewPlaylist')};
  return reject(HariiroI18n.t(same?'sameListDenied':row?'listReadOnlyDrop':'dropEditable'));
 }
 function reject(notice){return {accept:false,kind:'reject',target:-1,p:-1,notice};}
 return Object.freeze({decide});
})();
