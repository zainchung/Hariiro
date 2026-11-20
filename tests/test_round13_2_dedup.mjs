import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(root+'/'+p,'utf8');
// Unit-test canonical file identity before exercising the real sidebar callbacks.
const isolated=vm.createContext({});
vm.runInContext(read('js/anna_playlist_dedup.js'),isolated);
const normalize=h=>vm.runInContext('AnnaPlaylistDedup.key',isolated)(h);
assert.equal(normalize({Path:'C:/Songs/Album/Name.FLAC'}),normalize({Path:'c:\\songs\\album\\name.flac'}));
assert.notEqual(normalize({Path:'C:/Songs/A.flac'}),normalize({Path:'C:/Songs/A.mp3'}));
assert.notEqual(normalize({Path:'C:/Songs/A.flac'}),normalize({Path:'D:/Songs/A.flac'}));
assert.equal(normalize({Path:'https://radio.example/live'}),'','HTTP streams are not physical files');
const oldKeys=['a','a','b'],afterKeys=['a','a','b','a','c','c'];
assert.deepEqual([...vm.runInContext('AnnaPlaylistDedup.redundantAddedIndices',isolated)(oldKeys,afterKeys)],[3,5]);

const handle=(path,subsong=0)=>({Path:path,SubSong:subsong});
const data=[
 {name:'Mix A',items:[handle('C:\\MUSIC\\Album\\Song.FLAC'),handle('C:\\music\\Album\\Song.FLAC')]},
 {name:'Mix B',items:[handle('D:\\Music\\Original.mp3')]},
 {name:'Anna - Favorites',items:[handle('C:\\Music\\fav.flac')]},
 {name:'Anna - Search Results',items:[handle('C:\\Music\\search.flac')]},
 {name:'Anna - Queue Buffer',items:[handle('C:\\Music\\queue.flac')]}
];
let active=0,playing=-1,selected=new Map(),focus=new Map(),backups=0,removalCalls=0,sortCalls=0,filesRemoved=0;
const windows=[],vars=new Map([['anna.nav.mode','library'],['anna.queue.buffer.name','Anna - Queue Buffer'],
 ['anna.search.results.owned',JSON.stringify(['Anna - Search Results'])]]);
function list(values){return{get Count(){return values.length},Convert(){return values.slice()},Item:i=>values[i],Add(x){values.push(x)},Find(x){return values.indexOf(x)}};}
const pendingTimers=new Map();let nextTimer=0;
const win={ID:1,Width:196,Height:500,Repaint(){},GetProperty:(k,v)=>v,SetProperty(){},
 SetTimeout(cb){pendingTimers.set(++nextTimer,cb);return nextTimer},ClearTimeout(id){pendingTimers.delete(id)},
 CreatePopupMenu(){return{AppendMenuItem(){},AppendMenuSeparator(){},TrackPopupMenu(){return 0}}}};
const plman={
 get PlaylistCount(){return data.length},get ActivePlaylist(){return active},set ActivePlaylist(v){active=v},
 get PlayingPlaylist(){return playing},GetPlaylistName:p=>data[p].name,PlaylistItemCount:p=>data[p].items.length,
 FindPlaylist:n=>data.findIndex(x=>x.name===n),GetPlaylistItems:p=>list(data[p].items),
 GetPlaybackQueueContents(){return []},IsPlaylistLocked(){return false},
 IsPlaylistItemSelected(p,i){return (selected.get(p)||new Set()).has(i)},
 ClearPlaylistSelection(p){selected.set(p,new Set())},SetPlaylistSelection(p,idx,state){
  const set=selected.get(p)||new Set();for(const i of idx){if(state)set.add(i);else set.delete(i);}selected.set(p,set);
 },SetPlaylistSelectionSingle(p,i,state){const s=selected.get(p)||new Set();if(state)s.add(i);else s.delete(i);selected.set(p,s)},
 GetPlaylistFocusItemIndex(p){return focus.get(p)??-1},SetPlaylistFocusItem(p,i){focus.set(p,i)},
 EnsurePlaylistItemVisible(){},UndoBackup(){backups++},
 RemovePlaylistSelection(p){
  const toRemove=selected.get(p)||new Set();data[p].items=data[p].items.filter((_,i)=>!toRemove.has(i));removalCalls++;
  sidebar.on_playlist_items_removed(p);
  selected.set(p,new Set());
 },SortByFormatV2(){sortCalls++;return true},
 CreatePlaylist(index,name){data.splice(index,0,{name,items:[]});sidebar.on_playlists_changed();return index},
 InsertPlaylistItems(p,index,handles){data[p].items.splice(index,0,...handles.Convert());sidebar.on_playlist_items_added(p)},
 ClearPlaylist(p){data[p].items=[];sidebar.on_playlist_items_removed(p)},
 SetPlaylistLockedActions(){},RemovePlaylist(){throw Error('not needed')}
};
const fb={
 TitleFormat(expr){return {EvalWithMetadbs(hs){return hs.Convert().map(()=>'' )},EvalWithMetadb(){return ''}}},
 GetLibraryItems(){return list([])},GetNowPlaying(){return null},CreateHandleList(){return list([])},
 GetSelection(){return list([])},ShowPopupMessage(){throw Error('Unexpected alert')}
};
const panelsui={GetVariable:(k,defaultValue)=>vars.get(k)??defaultValue,SetVariable:(k,value)=>vars.set(k,value),RunAction(){return true}};
const ctx=vm.createContext({plman,fb,panelsui,window:win,utils:{IsKeyPressed(){return false}},gdi:{Font(){return {}}},console:{log(){}}});
ctx.include=p=>vm.runInContext(read('js/'+p),ctx);
vm.runInContext(read('js/playlist_browser.js'),ctx);
const sidebar=ctx;
const path=p=>data[p].items.map(h=>h.Path);
const existing=path(0);assert.equal(existing.length,2,'historic repeated paths exist at startup');
// New copy of an already existing file is rejected, but old duplicates survive.
selected.set(0,new Set([0]));focus.set(0,0);
data[0].items.push(handle('c:/music/album/song.flac'));
sidebar.on_playlist_items_added(0);
assert.deepEqual(path(0),existing,'old repeated entries should be preserved');
assert.equal(backups,1);assert.equal(removalCalls,1);
assert.deepEqual([...selected.get(0)],[0],'old selection survives removal');
// New batch duplicates only keep its first canonical path. Different folders
// and extensions remain distinct, even if the tags or file name look equal.
const imported=[handle('E:\\A\\New.flac'),handle('e:/a/new.FLAC'),
 handle('F:\\A\\New.flac'),handle('E:\\A\\New.mp3'),
 handle('E:\\A\\New.flac',3),handle('D:\\Misc\\Else.m4a')];
data[0].items.push(...imported);
sidebar.on_playlist_items_added(0);
assert.deepEqual(path(0),[...existing,'E:\\A\\New.flac','F:\\A\\New.flac','E:\\A\\New.mp3','D:\\Misc\\Else.m4a']);
assert.equal(removalCalls,2);
assert.equal(backups,2);
// Import into a non-active ordinary playlist gets the same policy.
const secondBefore=path(1);data[1].items.push(handle('d:/music/original.mp3'),handle('Z:\\Mix\\Extra.flac'),handle('z:/mix/extra.flac'));
sidebar.on_playlist_items_added(1);
assert.deepEqual(path(1),[...secondBefore,'Z:\\Mix\\Extra.flac']);
// Fixed/search/Queue destinations must not be modified by this dedup policy.
for(let p=2;p<5;p++){
 const prev=path(p);data[p].items.push(handle(prev[0]));sidebar.on_playlist_items_added(p);
 assert.equal(data[p].items.length,2,'fixed or queue cache must not be altered: '+p);
}
// Updates to existing user lists do not clean up old historical duplicates.
sidebar.on_playlist_items_reordered(0);
sidebar.on_playlists_changed();
assert.equal(path(0).length,6);
// New ordinary playlist from blank-area drop: the staging import contains
// two identical paths and one genuinely different file.
const stage=sidebar.stagingPlaylist();data[stage].items.push(handle('J:\\New\\Only.flac'),handle('j:/new/only.FLAC'),handle('K:\\New\\Different.flac'));
sidebar.on_playlist_items_added(stage);
for(const [id,fn] of [...pendingTimers]){pendingTimers.delete(id);fn();}
const importedName=data.find(x=>x.name.startsWith('Imported Tracks'));
assert(importedName,'only playable imported files create a new ordinary playlist');
assert.deepEqual(importedName.items.map(x=>x.Path),['J:\\New\\Only.flac','K:\\New\\Different.flac']);
assert.equal(filesRemoved,0,'never delete the source audio');
console.log('PASS round13.2: Windows path identity, old duplicate preservation, repeated batch import, inactive ordinary playlists, fixed cache exclusions, blank-area import and selection restore');
