import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>fs.readFileSync(root+'/'+path,'utf8');
const key=(x)=>x.Path;
const handles=(list=[])=>({get Count(){return list.length},Convert:()=>list.slice(),Item:i=>list[i],Add(x){list.push(x);},AddRange(other){list.push(...other.Convert());}});
const rows=[
 {name:'Real Playlist',items:[{Path:'normal.flac'}]},
 {name:'Anna - Favorites',items:[{Path:'favorite.flac'}]},
 {name:'Anna - Search Results',items:[{Path:'search.flac'}]},
 {name:'Anna - Artist View #2',items:[{Path:'cached.flac'}]},
 {name:'Anna - Artist View #3',items:[{Path:'queued.flac'}]},
 {name:'Anna - Artist View #4',items:[{Path:'playing.flac'}]}
];
const variables=new Map([['anna.nav.mode','library'],['anna.search.results.name','Anna - Search Results'],['anna.search.results.owned','["Anna - Search Results"]'],['anna.theme.hue','rose']]);
const props=new Map([['Anna.OwnedScratchPlaylists.v1','["Anna - Artist View #2","Anna - Artist View #3","Anna - Artist View #4"]']]);
let active=0,playing=5,queueRefs=[{PlaylistIndex:4}],queued=[],dragCount=0,sidebarSelfEffects=[],clock=0;
let sidebar,queue;
const plman={
 get PlaylistCount(){return rows.length},get ActivePlaylist(){return active},set ActivePlaylist(n){active=n},get PlayingPlaylist(){return playing},
 FindPlaylist(name){return rows.findIndex(r=>r.name===name)},GetPlaylistName(i){return rows[i]?.name||''},
 GetPlaylistItems(i){return handles(rows[i].items)},PlaylistItemCount(i){return rows[i]?.items.length||0},
 FindOrCreatePlaylist(name){let i=this.FindPlaylist(name);if(i<0){i=rows.length;rows.push({name,items:[]})}return i;},
 RemovePlaylist(i){rows.splice(i,1);return true},IsPlaylistLocked(){return false},
 SetPlaylistLockedActions(){},GetPlaybackQueueContents(){return queueRefs;},GetPlaybackQueueHandles(){return handles(queued)},
 AddItemToPlaybackQueue(h){queued.push(h)},ClearPlaylist(i){rows[i].items=[]},
 InsertPlaylistItems(i,at,list){rows[i].items.splice(at,0,...list.Convert())},
 GetPlayingItemLocation(){return{IsValid:false}},GetPlaylistFocusItemIndex(){return -1},
 GetPlaylistSelectedItems(i){return handles(rows[i].items.slice())},
 UndoBackup(){},SetPlaylistFocusItem(){},SetPlaylistSelectionSingle(){},ClearPlaylistSelection(){},
 SortByFormatV2(){return true},MovePlaylist(){return true}
};
const fbs={
 TitleFormat(){return {EvalWithMetadb:()=>'',EvalWithMetadbs:xs=>xs.Convert().map(()=>'')}} ,
 GetLibraryItems(){return handles([{Path:'library.flac'}]);},GetNowPlaying(){return null;},CreateHandleList(){return handles([]);},
 DoDragDrop(id,list){
  dragCount++;
  const self={Effect:1};sidebar.on_drag_over(self,35,100);sidebarSelfEffects.push(self.Effect);
  const over={Effect:0};queue.on_drag_over(over,20,90);assert.equal(over.Effect,1);
  const drop={Effect:0};queue.on_drag_drop(drop,20,90);assert.equal(drop.Effect,1);
  plman.InsertPlaylistItems(drop.Playlist,drop.Base,list);queue.on_playlist_items_added(drop.Playlist);
 },
 ShowPopupMessage(){throw Error('unexpected popup')}
};
function makePanel(name,extra={}){
 const c={
  console:{log(){}},gdi:{Font:()=>({})},utils:{CheckComponent:()=>false},plman,fb:fbs,
  panelsui:{PanelName:name,GetVariable:(k,d)=>variables.get(k)??d,SetVariable:(k,v)=>variables.set(k,v),RunAction:()=>true},
  window:{ID:name,Width:name==='Playlists'?196:400,Height:420,IsVisible:true,Repaint(){},GetProperty:(k,d)=>props.get(k)??d,
   SetProperty:(k,v)=>props.set(k,v),SetTimeout(){return ++clock},ClearTimeout(){},CreatePopupMenu(){return{AppendMenuItem(){},AppendMenuSeparator(){},TrackPopupMenu(){return 0;}}}},...extra};
 vm.createContext(c);c.include=p=>vm.runInContext(read('js/'+p),c);return c;
}
queue=makePanel('AnnaQueue');vm.runInContext(read('js/anna_queue.js'),queue);
sidebar=makePanel('Playlists');vm.runInContext(read('js/playlist_browser.js'),sidebar);
const y=name=>{const i=sidebar.entries().findIndex(r=>r.name===name);assert(i>=0,name);return 8+i*30+14};
// Vertical movement is an internal action, not an OLE drag. This removes the
// brief processing popup when moving Music Library across sidebar rows.
sidebar.on_mouse_lbtn_down(20,y('Music Library'));
sidebar.on_mouse_move(20,y('Music Library')+35,1);
assert.equal(dragCount,0);
sidebar.on_mouse_leave();assert.equal(dragCount,0);
// A short horizontal movement does not start OLE, but a deliberate outward
// ordinary-playlist drag does. Fixed Music Library may export to Queue too.
sidebar.on_mouse_lbtn_down(50,y('Real Playlist'));
sidebar.on_mouse_move(75,y('Real Playlist'),1);
assert.equal(dragCount,0);
sidebar.on_mouse_move(150,y('Real Playlist'),1);
assert.equal(dragCount,1);assert.equal(queued.at(-1).Path,'normal.flac');
assert.equal(sidebarSelfEffects.at(-1),0);
sidebar.on_mouse_lbtn_down(20,y('Music Library'));
sidebar.on_mouse_move(185,y('Music Library'),1);
assert.equal(dragCount,2);assert.equal(queued.at(-1).Path,'library.flac');
// Artist groups are read-only list sources, but can export songs to Queue
// from the whole row without a tiny special handle.
vm.runInContext("mode='artists';artists=[{name:'Artist 1',indices:[0]}];",sidebar);
sidebar.on_mouse_lbtn_down(50,8+14);sidebar.on_mouse_move(185,8+14,1);
assert.equal(dragCount,3);assert.equal(queued.at(-1).Path,'library.flac');
sidebar.on_mouse_leave();
const declined={Effect:1};sidebar.on_drag_over(declined,40,45);assert.equal(declined.Effect,0);
// The GlassPlaylist declines its own OLE callback, even just after DoDragDrop.
active=0;variables.set('anna.nav.mode','library');variables.set('anna.sidebar.editable.name','Real Playlist');
const glass=makePanel('GlassPlaylist',{window:{ID:33,Width:650,Height:470,IsVisible:true,Repaint(){},SetInterval(){return 1},ClearInterval(){},SetTimeout(){return 1},ClearTimeout(){}}});
vm.runInContext(read('js/anna_glass_playlist.js'),glass);
variables.set('anna.drag.origin','glass:0');
let self={Effect:1};glass.on_drag_over(self,100,40);assert.equal(self.Effect,0);
self={Effect:1};glass.on_drag_drop(self,100,40);assert.equal(self.Effect,0);
variables.set('anna.drag.origin','sidebar:0');self={Effect:1};glass.on_drag_over(self,100,40);assert.equal(self.Effect,0);
variables.set('anna.drag.origin','');self={Effect:0};glass.on_drag_over(self,100,40);assert.equal(self.Effect,1);
assert.equal(vm.runInContext('importStatus',glass),glass.AnnaI18n.t('dropToImport'));
// Safe cleanup prunes ONLY owned scratch #2, preserving queued #3 and playing #4.
vm.runInContext("mode='playlists';",sidebar);
assert.equal(sidebar.pruneScratchViews(),1);
assert.equal(plman.FindPlaylist('Anna - Artist View #2'),-1);
assert(plman.FindPlaylist('Anna - Artist View #3')>=0);
assert(plman.FindPlaylist('Anna - Artist View #4')>=0);
// Both new hue and manual language choices are shared between panels.
const chrome=makePanel('TopChrome',{window:{Width:183,Height:31,Repaint(){},NotifyOthers(){},CreatePopupMenu(){return{AppendMenuItem(){},AppendMenuSeparator(){},AppendTo(){},TrackPopupMenu(){return 235;}}}}});
vm.runInContext(read('js/anna_top_chrome.js'),chrome);
chrome.on_mouse_lbtn_up(15,16);
assert.equal(variables.get('anna.theme.hue'),'violet');
assert.equal(variables.get('anna.glass.v2.accent'),'190-151-255');
for(const v of ['zh-CN','zh-TW','ja','en']){
 variables.set('anna.language',v);assert.notEqual(chrome.AnnaI18n.t('dropFailed'),'Drag-and-drop failed'===v);
 assert(chrome.AnnaI18n.t('theme').length>0);
}
// Invariant: all palette variants are alpha-capable, same filename interface.
for(const mode of ['violet','blue','teal'])for(const f of ['play','pause','speaker','butterfly']){
 const p=resolve(root,'images/controls',mode,f+'.png');assert(fs.existsSync(p));assert.equal(fs.readFileSync(p)[25],6);
}
const main=read('main.txt'),top=read('js/anna_top_chrome.js');
assert(main.includes('$panel(TopChrome,JS Panel,$eval(%_width% - 199),6,183,31)'));
assert(!top.includes('gr.DrawRoundRect(1,3,window.Width-4,26'));
assert(!read('js/playlist_browser.js').includes('new ActiveXObject(\'Scripting.FileSystemObject\')'));
assert(!read('js/anna_search.js').includes('sqlite'));
console.log('PASS round11: directional OLE, Artist-to-Queue, fixed-list Queue export, same-source Glass guard, locales, safe cleanup and accents');
