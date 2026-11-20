import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
const mkHandles=(a=[])=>({get Count(){return a.length},Convert:()=>[...a],Item:i=>a[i],Add(h){a.push(h)},AddRange(other){a.push(...other.Convert())}});
const library=[{Path:'artist1.flac'},{Path:'artist2.mp3'}];
const records=[
 {name:'User A',items:[{Path:'a.flac'},{Path:'b.flac'}]},
 {name:'User B',items:[{Path:'c.flac'}]},
 {name:'Anna - Favorites',items:[{Path:'fav.flac'}]},
 {name:'Anna - Search Results',items:[{Path:'search.flac'}]}
];
const vars=new Map([['anna.nav.mode','library'],['anna.sidebar.editable.name','User A'],
 ['anna.search.results.name','Anna - Search Results'],['anna.search.results.owned','["Anna - Search Results"]'],['anna.theme.hue','rose']]);
let active=0,selected=[0,1],imports=[],queue=[],createCount=0,moveCount=0,dragStarts=0;
const callbacks=[]; const panels=new Map();
const plman={
 get PlaylistCount(){return records.length},get ActivePlaylist(){return active},set ActivePlaylist(v){active=v},get PlayingPlaylist(){return -1},
 FindPlaylist(n){return records.findIndex(x=>x.name===n)},GetPlaylistName(i){return records[i]?.name||''},
 GetPlaylistItems(i){return mkHandles(records[i]?.items.slice()||[])},PlaylistItemCount(i){return records[i]?.items.length||0},
 GetPlaylistSelectedItems(i){return mkHandles(selected.map(x=>records[i]?.items[x]).filter(Boolean))},
 IsPlaylistItemSelected(i,j){return selected.includes(j)},GetPlaylistFocusItemIndex:()=>0,
 GetPlaybackQueueContents(){return[]},GetPlaybackQueueHandles(){return mkHandles(queue)},
 CreatePlaylist(_at,name){createCount++;records.push({name,items:[]});return records.length-1;},
 FindOrCreatePlaylist(name){const i=this.FindPlaylist(name);return i>=0?i:this.CreatePlaylist(records.length,name)},
 InsertPlaylistItems(p,at,h){imports.push({p,items:h.Convert()});records[p].items.splice(at,0,...h.Convert())},
 ClearPlaylist(p){records[p].items=[]},SortByFormatV2(){return true},IsPlaylistLocked(){return false},
 SetPlaylistLockedActions(){},MovePlaylist(){moveCount++;return true},
 ClearPlaylistSelection(){selected=[]},SetPlaylistSelectionSingle(p,i){selected=[i]},SetPlaylistFocusItem(){},EnsurePlaylistItemVisible(){},
 AddItemToPlaybackQueue(h){queue.push(h)},FlushPlaybackQueue(){queue=[]},GetPlayingItemLocation(){return{IsValid:false}}
};
let sourceTarget=null,sourceDropOn=null;
function doNativeDrop(_id,handles){
 dragStarts++;
 const target=panels.get(sourceTarget||'AnnaQueue');
 const loc=sourceDropOn||{x:15,y:75};
 const a={Effect:1};target.on_drag_enter(a,loc.x,loc.y);target.on_drag_over(a,loc.x,loc.y);
 if(a.Effect===0)return;
 target.on_drag_drop(a,loc.x,loc.y);
 if(a.Effect===1){
  assert(Number.isInteger(a.Playlist)&&a.Playlist>=0);
  plman.InsertPlaylistItems(a.Playlist,a.Base,handles);
  const cb=target.on_playlist_items_added;
  if(typeof cb==='function')cb(a.Playlist);
  for(const [n,panel] of panels)if(panel!==target&&typeof panel.on_playlist_items_added==='function')panel.on_playlist_items_added(a.Playlist);
 }
}
const fb={TitleFormat(){return {EvalWithMetadb:()=>'',EvalWithMetadbs:hs=>hs.Convert().map(()=>'Artist 1')}},
 GetLibraryItems(){return mkHandles(library.slice())},GetNowPlaying(){return null},CreateHandleList(){return mkHandles([])},DoDragDrop:doNativeDrop,
 ShowPopupMessage(){throw Error('unexpected popup')},RunMainMenuCommand(){return true}};
let timeCounter=0;const timers=new Map();const props=new Map(),captionAreas=[];
function makePanel(name,extras={}){
 const w=name==='Playlists'?196:name==='GlassPlaylist'?620:name==='AnnaQueue'?330:420;
 const win={ID:name,Width:w,Height:450,IsVisible:true,Repaint(){},
  GetProperty:(key,def)=>props.get(name+':'+key)??def,SetProperty:(key,v)=>props.set(name+':'+key,v),
  SetTimeout(fn){const id=++timeCounter;timers.set(id,fn);return id},ClearTimeout(id){timers.delete(id)},
  SetInterval(){return ++timeCounter},ClearInterval(){},
  CreatePopupMenu(){return{AppendMenuItem(){},AppendMenuSeparator(){},TrackPopupMenu(){return 0}}},...extras};
 const ctx=vm.createContext({console:{log(){}},plman,fb,window:win,panelsui:{PanelName:name,GetVariable:(k,d)=>vars.get(k)??d,SetVariable:(k,v)=>vars.set(k,v),RunAction(){return true}},
  utils:{CheckComponent(){return false}},gdi:{Font:()=>({})},
  ActiveXObject:function(name){return name==='UIHacks'?{SetPseudoCaption(...args){captionAreas.push(args)}}:name==='UIWizard'?{ToggleMaximize(){}}:null}});
 ctx.include=file=>vm.runInContext(source('js/'+file),ctx);panels.set(name,ctx);return ctx;
}
const sidebar=makePanel('Playlists');vm.runInContext(source('js/playlist_browser.js'),sidebar);
const glass=makePanel('GlassPlaylist');vm.runInContext(source('js/anna_glass_playlist.js'),glass);
const q=makePanel('AnnaQueue');vm.runInContext(source('js/anna_queue.js'),q);
const yOf=(name)=>{const i=sidebar.entries().findIndex(r=>r.name===name);assert(i>=0,name);return 8+30*i+14};
const startLeft=(name,from=50)=>{const y=yOf(name);sidebar.on_mouse_lbtn_down(from,y);sidebar.on_mouse_move(from+64,y,1)};
// 1. Pinned rows are read-only targets, but can export their tracks to Queue.
sourceTarget='AnnaQueue';sourceDropOn={x:25,y:110};
for(const [name,expected] of [
 ['Music Library',['artist1.flac','artist2.mp3']],
 ['Anna - Favorites',['fav.flac']],
 ['Anna - Search Result',['search.flac']]
]){
 const old=dragStarts,oldQueue=queue.length;
 startLeft(name);
 assert.equal(dragStarts,old+1,`${name} should export to Queue`);
 assert.deepEqual(queue.slice(oldQueue).map(x=>x.Path),expected);
 sidebar.on_mouse_lbtn_up(114,yOf(name));
}
const pinnedDragCount=dragStarts;
// A pinned source with no tracks must not open a native drag session.
const favRecord=records[plman.FindPlaylist('Anna - Favorites')];
const originalFavorites=favRecord.items.slice();favRecord.items.length=0;
startLeft('Anna - Favorites');assert.equal(dragStarts,pinnedDragCount);
favRecord.items.push(...originalFavorites);
// A pinned source cannot be reordered within the sidebar.
const moveBefore=moveCount;
sidebar.on_mouse_lbtn_down(55,yOf('Anna - Favorites'));
sidebar.on_mouse_move(55,yOf('Anna - Favorites')+35,1);
sidebar.on_mouse_lbtn_up(55,yOf('Anna - Favorites')+35);
assert.equal(moveCount,moveBefore);assert.equal(dragStarts,pinnedDragCount);
// Fixed-row clicks can activate a sorted media-library view; disregard that
// legitimate scratch-view refresh when counting unsolicited drag insertions.
const importBaseline=imports.length;
// Left ordinary to its own sidebar/middle is rejected, no new imports.
sourceTarget='Playlists';sourceDropOn={x:44,y:yOf('User B')};
startLeft('User A');assert.equal(imports.length,importBaseline);assert.equal(dragStarts,pinnedDragCount+1);
sourceTarget='GlassPlaylist';sourceDropOn={x:44,y:190};
startLeft('User A');assert.equal(imports.length,importBaseline);assert.equal(dragStarts,pinnedDragCount+2);
// Left regular -> queue adds *all* tracks, with no user-list mutation.
sourceTarget='AnnaQueue';sourceDropOn={x:25,y:110};
startLeft('User A');assert.deepEqual(queue.slice(-2).map(x=>x.Path),['a.flac','b.flac']);
assert.equal(records[0].items.length,2);
// Artist sources can still add all tracks to Queue.
vm.runInContext("mode='artists';artists=[{name:'Artist 1',indices:[0,1]}];",sidebar);
sidebar.on_mouse_lbtn_down(55,22);sidebar.on_mouse_move(120,22,1);
assert.equal(queue.length,8);assert.equal(queue.at(-1).Path,'artist2.mp3');
// Left vertical sorting is local (no OLE call, no source copies).
vm.runInContext("mode='playlists';",sidebar);
const n=dragStarts;const ypos=yOf('User A');
sidebar.on_mouse_lbtn_down(55,ypos);sidebar.on_mouse_move(55,ypos+30,1);sidebar.on_mouse_lbtn_up(55,ypos+30);
assert.equal(dragStarts,n);assert.equal(imports.length,importBaseline+2); // two Queue drops beyond baseline
// 2. Glass selected track batch -> normal sidebar (valid); pinned & artist reject.
sourceTarget='Playlists';sourceDropOn={x:35,y:yOf('User B')};
selected=[0,1];active=plman.FindPlaylist('User A');vars.set('anna.sidebar.editable.name','User A');vars.set('anna.drag.origin','');
vm.runInContext('downAt={x:250,y:180,i:0,deferred:false};',glass);
glass.on_mouse_move(305,180,1);
assert.deepEqual(records[1].items.map(x=>x.Path),['c.flac','a.flac','b.flac']);
// Source returns into Glass -> no duplication (regardless of reentry).
const before=imports.length;sourceTarget='GlassPlaylist';sourceDropOn={x:190,y:250};
vm.runInContext('downAt={x:250,y:180,i:0,deferred:false};',glass);
glass.on_mouse_move(300,180,1);assert.equal(imports.length,before);
// Pinned and Artist targets reject; no new playlist created.
sourceTarget='Playlists';sourceDropOn={x:40,y:yOf('Anna - Favorites')};
vm.runInContext('downAt={x:250,y:180,i:0,deferred:false};',glass);glass.on_mouse_move(300,180,1);
assert.equal(imports.length,before);
vm.runInContext("mode='artists';artists=[{name:'Artist 1',indices:[0,1]}];",sidebar);
sourceDropOn={x:40,y:22};
vm.runInContext('downAt={x:250,y:180,i:0,deferred:false};',glass);glass.on_mouse_move(300,180,1);
assert.equal(imports.length,before);
// 3. External files target ordinary, fixed prohibited, Artist prohibited.
vm.runInContext("mode='playlists'",sidebar);
vars.set('anna.drag.origin','');
const fixed={Effect:1};sidebar.on_drag_over(fixed,40,yOf('Music Library'));assert.equal(fixed.Effect,0);
const artistMode={Effect:1};vm.runInContext("mode='artists'",sidebar);sidebar.on_drag_over(artistMode,40,22);assert.equal(artistMode.Effect,0);
vm.runInContext("mode='playlists'",sidebar);
const regular={Effect:0};sidebar.on_drag_drop(regular,40,yOf('User A'));assert.equal(regular.Effect,1);
assert.equal(regular.Playlist,plman.FindPlaylist('User A'));
// Drop at empty sidebar (no audio): only one hidden staging playlist, no real imported playlist.
const createdBefore=createCount;const empty={Effect:0};sidebar.on_drag_drop(empty,40,400);
assert.equal(empty.Effect,1);assert.equal(createCount,createdBefore+1);
assert.equal(sidebar.entries().some(r=>r.name.includes('Import Staging')),false);
// The playlist name is localised (host locale may be ja/zh), so compare with the i18n string.
const importedTracksName=sidebar.AnnaI18n.t('importedPlaylistName');
assert.equal(sidebar.entries().some(r=>r.name.startsWith(importedTracksName)),false);
// Stage receives audio: once idle, a normal playlist is created and focused.
plman.InsertPlaylistItems(empty.Playlist,0,mkHandles([{Path:'imported.flac'}]));sidebar.on_playlist_items_added(empty.Playlist);
for(const [k,fn] of [...timers]){timers.delete(k);if(typeof fn==='function')fn();}
assert.equal(sidebar.entries().some(r=>r.name.startsWith(importedTracksName)),true);
assert.equal(records[plman.FindPlaylist('Anna - Import Staging')].items.length,0);
// Centre mode: only a regular playlist allows file/dir imports.
vars.set('anna.nav.mode','library');vars.set('anna.sidebar.editable.name','User A');active=plman.FindPlaylist('User A');vm.runInContext('localGlassGuardUntil=0;',glass);
let a={Effect:0};glass.on_drag_over(a,40,120);assert.equal(a.Effect,1);
vars.set('anna.nav.mode','artists');a={Effect:1};glass.on_drag_over(a,40,120);assert.equal(a.Effect,0);
vars.set('anna.nav.mode','library');vars.set('anna.sidebar.editable.name','Anna - Favorites');active=plman.FindPlaylist('Anna - Favorites');a={Effect:1};glass.on_drag_over(a,40,120);assert.equal(a.Effect,0);
// 4. Host routing/caption/assets/paint stacking.
for(const name of ['Playlists','GlassPlaylist','AnnaQueue'])
 assert(source('foo_ui_panels.ini').includes(`panel.${name}.windowless = 1`));
assert(captionAreas.length===0);
const cap=makePanel('CaptionStrip',{Width:398});vm.runInContext(source('js/anna_caption_strip.js'),cap);
assert.deepEqual(captionAreas.at(-1),[367,4,398,37]);
const main=source('main.txt');assert(main.indexOf('$panel(DesktopLyrics,JS Panel')>main.indexOf('$drawrect(16,$eval(%_height% - 113)'));
assert(main.indexOf('$panel(DesktopLyrics,JS Panel')<main.indexOf('$panel(FooterQueueToggle,JS Panel'));
for(const hue of ['pink','violet','blue','teal'])for(const c of ['pause','speaker','butterfly'])
 assert(fs.existsSync(path.join(root,'images/controls',hue,c+'.png')));
assert.equal(fs.readdirSync(path.join(root,'images/controls')).filter(f=>f.endsWith('.png')).length,0);
console.log('PASS round13: drag source/target matrix, no OLE duplication, pinned Queue export and drop rejection, Artist Queue export, blank drop staging, caption drag, 4 palette folders, Desk paint order');
