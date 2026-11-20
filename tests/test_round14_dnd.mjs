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

// ===== Round 14: the user's drag-and-drop rules, end to end =====
const A=plman.FindPlaylist('User A'),B=plman.FindPlaylist('User B'),FAV=plman.FindPlaylist('Anna - Favorites');
const over=(panel,origin,x,y)=>{vars.set('anna.drag.origin',origin);const a={Effect:1};panels.get(panel).on_drag_enter(a,x,y);panels.get(panel).on_drag_over(a,x,y);return a;};
const drop=(panel,origin,x,y)=>{vars.set('anna.drag.origin',origin);const a={Effect:1};panels.get(panel).on_drag_drop(a,x,y);return a;};
const status=()=>vm.runInContext('importStatus',glass);
const tr=k=>glass.AnnaI18n.t(k);

// --- MIDDLE window as destination ---------------------------------------
// R14-1: a stale/empty sidebar "editable" bookkeeping var must NOT block drops
// onto an ordinary playlist that is actually on screen (start-up, tab switch, now-playing jump).
vars.set('anna.nav.mode','library');vars.set('anna.sidebar.editable.name','');
active=A;
let a=over('GlassPlaylist','',300,100);assert.equal(a.Effect,1,'external -> middle ordinary (no sidebar bookkeeping)');
a=drop('GlassPlaylist','',300,100);assert.equal(a.Effect,1);assert.equal(a.Playlist,A);assert.equal(a.Base,records[A].items.length);

// R14-2: external files onto Favorites / Artist view / Music Library view / search results -> warning, rejected
for(const [nm,msg] of [['Anna - Favorites','chooseRegularPlaylist'],['Anna - Search Results','chooseRegularPlaylist'],
  ['Anna - Sorted Library View','chooseRegularPlaylist'],['Anna - Artist View','artistHint']]){
 let idx=plman.FindPlaylist(nm);if(idx<0)idx=plman.CreatePlaylist(records.length,nm);
 active=idx;
 a=over('GlassPlaylist','',300,100);assert.equal(a.Effect,0,nm);assert.equal(status(),tr(msg),nm);
 a=drop('GlassPlaylist','',300,100);assert.equal(a.Effect,0,nm);
}
active=A;vars.set('anna.nav.mode','artists');
a=over('GlassPlaylist','',300,100);assert.equal(a.Effect,0,'artist tab');assert.equal(status(),tr('artistHint'));
vars.set('anna.nav.mode','library');

// R14-3: sidebar ORDINARY playlist -> middle ordinary list = add its tracks (not to itself)
active=A;
a=over('GlassPlaylist','sidebar:playlist:'+B,300,100);assert.equal(a.Effect,1,'ordinary playlist -> middle');
a=drop('GlassPlaylist','sidebar:playlist:'+B,300,100);assert.equal(a.Effect,1);assert.equal(a.Playlist,A);
a=over('GlassPlaylist','sidebar:playlist:'+A,300,100);assert.equal(a.Effect,0,'same playlist');assert.equal(status(),tr('sameListDenied'));
a=drop('GlassPlaylist','sidebar:playlist:'+A,300,100);assert.equal(a.Effect,0);
// ... but if the middle shows a fixed/artist list it is a warning + reject
active=FAV;a=over('GlassPlaylist','sidebar:playlist:'+B,300,100);assert.equal(a.Effect,0);assert.equal(status(),tr('chooseRegularPlaylist'));
active=A;

// R14-4: sidebar ARTIST / pinned lists -> middle = warning + reject
for(const o of ['sidebar:artist:-1','sidebar:library:-1','sidebar:fixedFavorites:'+FAV,'sidebar:fixedSearch:3']){
 a=over('GlassPlaylist',o,300,100);assert.equal(a.Effect,0,o);assert.equal(status(),tr('sidebarToMiddleDenied'),o);
 a=drop('GlassPlaylist',o,300,100);assert.equal(a.Effect,0,o);
}
// R14-5: own selection never returns to the middle panel
a=over('GlassPlaylist','glass:'+A,300,100);assert.equal(a.Effect,0);

// --- SIDEBAR as destination ------------------------------------------------
const rowY=n=>yOf(n);
vars.set('anna.nav.mode','library');
// middle -> ordinary playlist (multi-select copies all selected); not onto its own source list
a=over('Playlists','glass:'+A,80,rowY('User B'));assert.equal(a.Effect,1,'middle -> other ordinary playlist');
a=drop('Playlists','glass:'+A,80,rowY('User B'));assert.equal(a.Effect,1);assert.equal(a.Playlist,B);
a=over('Playlists','glass:'+A,80,rowY('User A'));assert.equal(a.Effect,0,'middle -> its own playlist');
// middle -> Music Library / Favorites / Search rows = rejected with the read-only warning
for(const n of ['Music Library','Anna - Favorites','Anna - Search Result']){
 a=over('Playlists','glass:'+A,80,rowY(n));assert.equal(a.Effect,0,n);
 assert.equal(vm.runInContext('trackDropNotice',sidebar),sidebar.AnnaI18n.t('listReadOnlyDrop'),n);
 a=drop('Playlists','glass:'+A,80,rowY(n));assert.equal(a.Effect,0,n);
}
// middle -> blank sidebar area never creates a playlist
a=over('Playlists','glass:'+A,80,440);assert.equal(a.Effect,0,'glass tracks over blank sidebar area');
// sidebar items never drop back onto the sidebar
a=over('Playlists','sidebar:playlist:'+B,80,rowY('User A'));assert.equal(a.Effect,0);
// external files: ordinary row accepted, pinned rows rejected + warning, blank area = new playlist
a=over('Playlists','',80,rowY('User B'));assert.equal(a.Effect,1);
for(const n of ['Music Library','Anna - Favorites','Anna - Search Result']){
 a=over('Playlists','',80,rowY(n));assert.equal(a.Effect,0,n);
 assert.equal(vm.runInContext('trackDropNotice',sidebar),sidebar.AnnaI18n.t('listReadOnlyDrop'),n);
}
a=over('Playlists','',80,440);assert.equal(a.Effect,1,'external files over blank sidebar area');
vm.runInContext("mode='artists'",sidebar);
a=over('Playlists','',80,rowY0());assert.equal(a.Effect,0,'artist mode rejects external files');
a=over('Playlists','glass:'+A,80,rowY0());assert.equal(a.Effect,0,'artist mode rejects glass tracks');
vm.runInContext("mode='playlists'",sidebar);
function rowY0(){return 8+14}

// --- Drag START: diagonal pulls must work (previously silently ignored) -------
vars.set('anna.drag.origin','');
let before=dragStarts;sourceTarget='AnnaQueue';sourceDropOn={x:25,y:110};
// pinned row, diagonal down-right pull toward the queue
const yl=yOf('Anna - Favorites');sidebar.on_mouse_lbtn_down(50,yl);sidebar.on_mouse_move(50+18,yl+40,1);
assert.equal(dragStarts,before+1,'pinned row: diagonal pull starts export');
// ordinary playlist, 40px right / 20px down still exports; mostly vertical still reorders
before=dragStarts;const yu=yOf('User B');
sidebar.on_mouse_lbtn_down(50,yu);sidebar.on_mouse_move(50+60,yu+22,1);assert.equal(dragStarts,before+1,'ordinary row: rightward-diagonal exports');
before=dragStarts;sidebar.on_mouse_lbtn_down(50,yu);sidebar.on_mouse_move(50+6,yu+40,1);assert.equal(dragStarts,before,'ordinary row: vertical stays a reorder');
sidebar.on_mouse_lbtn_up(56,yu+40);
// Glass: any direction, only once a real drag distance is covered
selected=[0,1];active=A;
before=dragStarts;vm.runInContext('downAt={x:200,y:200,i:0,deferred:false};',glass);
glass.on_mouse_move(203,201,1);assert.equal(dragStarts,before,'jitter');
glass.on_mouse_move(204,212,1);assert.equal(dragStarts,before+1,'diagonal/vertical pull starts OLE');
console.log('PASS round14: drag & drop rules matrix (middle/sidebar/external), stale-editable fix, diagonal drag start');
