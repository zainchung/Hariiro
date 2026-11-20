import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {installIncludeShim} from './helpers/js_panel.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

// JS Panel's include() loads shared files into the same script context.
installIncludeShim(vm);
const read=p=>readFileSync(root+'/'+p,'utf8');
const main=read('main.txt'), sidebarCode=read('js/playlist_browser.js');
const glassCode=read('js/anna_glass_playlist.js'),transport=read('js/anna_transport.js');
const navCode=read('js/anna_nav_tabs.js');
assert(main.includes('アーティスト/ライブラリ'));
assert(navCode.includes("label:'artists'"));
assert(!main.includes('$drawstring(プレイリスト,50,64'));
for(const width of [960,1280,1536,1920]){
 const rightOuter=width-16,leftOuter=width*.72-10;
 const specLeft=width*.72+4,specWidth=width*.28-34;
 assert(Math.abs((specLeft-leftOuter)-(rightOuter-(specLeft+specWidth)))<1e-8);
 const seekStart=width*.23,seekEnd=width-350;
 assert.equal(Math.round(seekStart-(seekStart-76+62)),14);
 assert.equal(width-336-seekEnd,14);
}
for(const mark of ['const POS=[25,88,151,214,277,340,403]','function showPlaybackOrder','case 0:showPlaybackOrder(x,y)','if(i===0)return showPlaybackOrder(x,y)'])assert(transport.includes(mark),mark);
assert(!transport.includes('(Number(plman.PlaybackOrder||0)+1)%7'));
for(const mark of ['order_shuffle_tracks','order_shuffle_albums','seek_forward_5','seek_backward_5'])assert(transport.includes(mark));
const pos=[25,88,151,214,277,340,403];for(let i=1;i<pos.length;i++)assert.equal(pos[i]-pos[i-1],63);
let order=0,menuChoice=106;const menu=()=>({AppendMenuItem(){},TrackPopupMenu(){return menuChoice}});
const tctx=vm.createContext({plman:{get PlaybackOrder(){return order},set PlaybackOrder(v){order=v}},fb:{IsPlaying:false,IsPaused:false,PlaybackLength:99},gdi:{Font(){return {}},Image(){return {Width:192,Height:192}}},window:{Height:67,Width:428,CreatePopupMenu:menu,Repaint(){}},console:{log(){}}});
vm.runInContext(transport,tctx);
tctx.on_mouse_lbtn_up(25,35);assert.equal(order,5,'left-click opens menu and selects shuffle albums');
menuChoice=105;tctx.on_mouse_rbtn_up(25,35);assert.equal(order,4,'right click uses the same menu');
const shapes=[];const gr=new Proxy({}, {get:(_,key)=>(...args)=>{shapes.push({key,args});}});
for(let i=0;i<7;i++){order=i;shapes.length=0;tctx.on_paint(gr);assert(shapes.filter(x=>x.key==='DrawImage').length>=7,`mode ${i} has PNG assets`);}
// Shared visual palette for QUEUE, DESK and mode switch.
const queue=read('js/anna_queue_toggle.js'),desk=read('js/anna_desktop_lyrics.js'),toggle=read('js/anna_mode_switch.js');
for(const src of [queue,desk,toggle])assert(src.includes('AnnaTheme.paintSwitch(gr,w,h,'),'active switches share QUEUE highlight'); // Phase D2
assert(read('js/anna_theme.js').includes('0xff93547d'));
// Mock foobar playlists as actual editable entities, not scratch views.
let rows=[
 {name:'Default Playlist',items:[{Path:'a.mp3',SubSong:0,album:'A',disc:1,track:1}]},
 {name:'Anna - Favorites',items:[]},
 {name:'User Mix',items:[{Path:'old.mp3',SubSong:0,album:'B',disc:1,track:2}]},
 {name:'Anna - Search Results',items:[{Path:'q.mp3',SubSong:0,album:'A',disc:1,track:1}]}
];
let active=0,focus=-1,locked=new Map(),select=[],timerId=0,clock=new Map(),menuNext=0,notice=[],dragged=[],actions=[];
const handles=arr=>({Count:arr.length,Convert:()=>[...arr],Item:i=>arr[i],Add:h=>arr.push(h),Find:h=>arr.indexOf(h)});
const lib=[{Path:'lib.mp3',SubSong:0,artist:'Artist 1',album:'Lib',disc:1,track:1}];
const plman={
 get PlaylistCount(){return rows.length},get ActivePlaylist(){return active},set ActivePlaylist(i){active=i},
 get PlayingPlaylist(){return 0},GetPlayingItemLocation(){return{IsValid:false}},
 GetPlaylistName:i=>rows[i].name,GetPlaylistItems:i=>handles(rows[i].items),PlaylistItemCount:i=>rows[i].items.length,
 FindPlaylist:n=>rows.findIndex(r=>r.name===n),FindOrCreatePlaylist(n){let i=rows.findIndex(r=>r.name===n);if(i<0){i=rows.length;rows.push({name:n,items:[]});}return i},
 CreatePlaylist(i,n){rows.splice(i,0,{name:n,items:[]});return i},RemovePlaylist(i){rows.splice(i,1);return true},
 RenamePlaylist(i,n){rows[i].name=n;return true},MovePlaylist(a,b){const [x]=rows.splice(a,1);rows.splice(b,0,x);return true},
 IsPlaylistLocked:i=>(locked.get(i)||[]).length>0,SetPlaylistLockedActions(i,v){locked.set(i,v);},
 GetPlaybackQueueContents(){return[]},GetPlaybackQueueHandles:()=>handles([]),
 ClearPlaylist(i){rows[i].items=[]},InsertPlaylistItems(i,n,list){rows[i].items.splice(n,0,...list.Convert());},
 SortByFormatV2(i){rows[i].items.sort((a,b)=>String(a.album).localeCompare(String(b.album))||a.disc-b.disc||a.track-b.track);return true;},
 ClearPlaylistSelection(){select=[]},SetPlaylistSelectionSingle(_p,i){select=[i]},SetPlaylistFocusItem(_p,i){focus=i},
 EnsurePlaylistItemVisible(_p,i){notice.push('reveal:'+i)},GetPlaylistFocusItemIndex(){return focus},
 UndoBackup(){},RemovePlaylistSelection(){},
};
const fb={
 TitleFormat(pattern){return{EvalWithMetadbs(list){const hs=list.Convert();return hs.map(h=>pattern.includes('%album%')?h.album||'':pattern.includes('%discnumber%')?h.disc||1:pattern.includes('%tracknumber%')?h.track||1:h.artist||'');},EvalWithMetadb(h){return h.artist||''}};},
 GetLibraryItems:()=>handles(lib),CreateHandleList:()=>handles([]),GetNowPlaying:()=>null,GetSelection:()=>handles([]),
 DoDragDrop(_win,list){dragged.push(list.Count)},RunMainMenuCommand(){return true},ShowPopupMessage(message){notice.push(message)}
};
const vars=new Map([['anna.nav.mode','library'],['anna.search.results.name','Anna - Search Results'],['anna.search.results.owned',JSON.stringify(['Anna - Search Results'])]]);
const panelsui={GetVariable:(k,d)=>vars.get(k)??d,SetVariable:(k,v)=>vars.set(k,String(v)),RunAction:s=>{actions.push(s);return true;}};
const utils={InputBox(){return 'Fresh Playlist'},MessageBox(){return 6},IsKeyPressed(){return false}};
const window={ID:1,Width:196,Height:430,GetProperty:(_k,d)=>d,SetProperty(){},Repaint(){},
 SetTimeout(fn){clock.set(++timerId,fn);return timerId},ClearTimeout(id){clock.delete(id)},
 CreatePopupMenu(){return {AppendMenuItem(){},AppendMenuSeparator(){},TrackPopupMenu(){return menuNext}}}};
const ctx=vm.createContext({gdi:{Font:()=>({})},plman,fb,panelsui,utils,window,console:{log(){}}});
vm.runInContext(sidebarCode,ctx);
const initial=ctx.entries();
assert.equal(initial[0].name,'Music Library');assert.equal(initial[1].name,'Anna - Favorites');
assert.equal(initial[2].name,'Anna - Search Result');assert(initial.slice(3).every(x=>x.kind==='playlist'));
assert(!initial.slice(3).some(x=>x.name==='Anna - Search Results'));
const mix=initial.findIndex(x=>x.name==='User Mix');ctx.choose(32,8+mix*30+15,false);
assert.equal(plman.ActivePlaylist,2,'Selecting regular playlist should select original, not scratch');
assert.equal(ctx.editableDestination(),2);
// File or folder payload is added by host, then sidebar callback sorts after its 260ms import burst.
rows[2].items.push({Path:'add-last.flac',SubSong:0,album:'Z',disc:1,track:12},{Path:'add-first.m4a',SubSong:0,album:'A',disc:1,track:1});
ctx.on_playlist_items_added(2);assert.equal(clock.size,1);
for(const [id,fn]of [...clock]){clock.delete(id);fn();}
assert.equal(rows[2].items[0].Path,'add-first.m4a');assert.equal(focus,0);
assert(actions.some(x=>x.includes('revealimported')));
// Drag reorder highlights insertion and moves actual playlist. Pinned entries cannot move.
const rowBefore=ctx.entries(),oldIndex=rowBefore.findIndex(e=>e.name==='Default Playlist'),otherIndex=rowBefore.findIndex(e=>e.name==='User Mix');
ctx.on_mouse_lbtn_down(43,8+oldIndex*30+15);
ctx.on_mouse_move(43,8+otherIndex*30+15,1);
assert.equal(vm.runInContext("playlistDropTarget",ctx),otherIndex);ctx.on_paint(gr);
assert(shapes.length>0);ctx.on_mouse_lbtn_up(20,8+otherIndex*30+15);
assert.equal(ctx.entries()[0].name,'Music Library');assert.equal(ctx.entries()[1].name,'Anna - Favorites');
const after=ctx.entries();assert(after.findIndex(e=>e.name==='Default Playlist')>after.findIndex(e=>e.name==='User Mix'));
// Context create makes actual playlist, with no folder prompts.
menuNext=1;ctx.on_mouse_rbtn_up(30,70);assert(plman.FindPlaylist('Fresh Playlist')>=0);
menuNext=3;const freshIndex=ctx.entries().findIndex(e=>e.name==='Fresh Playlist');ctx.on_mouse_rbtn_up(20,8+freshIndex*30+15);
assert.equal(plman.FindPlaylist('Fresh Playlist'),-1);
// Artist mode must not be an editable playlist.
vm.runInContext("mode='artists';setEditable(-1)",ctx);
assert.equal(ctx.editableDestination(),-1);
assert(sidebarCode.includes("plman.SetPlaylistLockedActions(dest,['AddItems'])"),'native artist scratch should reject new files');
// Glass drag advertises only the real editable selected playlist.
assert(glassCode.includes('action.Playlist=p;action.Base=plman.PlaylistItemCount(p);action.ToSelect=true;action.Effect=1'));
assert((glassCode+read('js/anna_glass_drop.js')).includes("AnnaI18n.t('artistHint')")); // drop rules moved to AnnaGlassDrop (D1)
console.log('PASS round7: equal geometry and transport spacing, iOS mirrored ±5s, same order menu on both clicks, three fixed sidebar rows, real playlist create/delete/reorder with feedback, source import sort/focus, Artist drop safety');
