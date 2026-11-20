import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=n=>fs.readFileSync(path.join(root,n),'utf8');
const values=new Map([['anna.nav.mode','library'],['anna.sidebar.editable.name','Personal Playlist'],['anna.search.results.owned','[]']]);
const handles=(items=[])=>({get Count(){return items.length},Convert(){return [...items]},Item:i=>items[i],Add(h){items.push(h)}});
const artistTrack={Path:'art.flac',SubSong:0};
const records=[{name:'Personal Playlist',items:[{Path:'normal.flac',SubSong:0}]},{name:'Anna - Favorites',items:[]}];
let active=0,dragOut=0,accidentalInsert=0,queueTracks=[],manualFlush=0,maximize=0;
const plman={
 get PlaylistCount(){return records.length},get ActivePlaylist(){return active},set ActivePlaylist(i){active=i},PlayingPlaylist:-1,
 FindPlaylist:n=>records.findIndex(r=>r.name===n),GetPlaylistName:i=>records[i]?.name||'',GetPlaylistItems:i=>handles(records[i]?.items||[]),
 PlaylistItemCount:i=>records[i]?.items.length||0,GetPlaylistSelectedItems:()=>handles(records[0].items.slice()),
 IsPlaylistItemSelected:()=>true,GetPlaybackQueueContents:()=>[],GetPlaybackQueueHandles:()=>handles(queueTracks),
 GetPlayingItemLocation:()=>({IsValid:false,PlaylistIndex:-1,PlaylistItemIndex:-1}),GetPlaylistFocusItemIndex:()=>-1,
 AddItemToPlaybackQueue(x){queueTracks.push(x)},FlushPlaybackQueue(){queueTracks=[];manualFlush++},
 InsertPlaylistItems(p,at,list){accidentalInsert++;records[p].items.splice(at,0,...list.Convert());},
 FindOrCreatePlaylist(n){const existing=this.FindPlaylist(n);if(existing>=0)return existing;records.push({name:n,items:[]});return records.length-1},
 IsPlaylistLocked:()=>false,SetPlaylistLockedActions(){},UndoBackup(){},ClearPlaylistSelection(){},
 SetPlaylistFocusItem(){},SetPlaylistSelectionSingle(){},SortByFormatV2:()=>true,
};
const fb={GetLibraryItems:()=>handles([artistTrack]),CreateHandleList:()=>handles(),GetNowPlaying:()=>null,
 TitleFormat:()=>({EvalWithMetadbs:xs=>xs.Convert().map(()=>'Artist A'),EvalWithMetadb:()=>''}),
 DoDragDrop(_id,items){dragOut++;queueTracks.push(...items.Convert());},};
const panelsui={GetVariable:(k,def)=>values.get(k)??def,SetVariable:(k,v)=>values.set(k,v),RunAction:()=>true};
function context(name,windowOptions={}){
 const props=new Map();const c=vm.createContext({console:{log(){}},plman,fb,panelsui,
  gdi:{Font:()=>({})},utils:{},ActiveXObject:function(name){if(name==='UIWizard')return {ToggleMaximize(){maximize++}};return null;},
  window:{ID:name,Width:196,Height:430,IsVisible:true,Repaint(){},SetTimeout(){return 3},ClearTimeout(){},SetInterval(){return 5},ClearInterval(){},GetProperty:(k,d)=>props.get(k)??d,SetProperty:(k,v)=>props.set(k,v),...windowOptions}});
 c.include=filename=>vm.runInContext(src('js/'+filename),c);return c;
}
const s=context('Playlists');vm.runInContext(src('js/playlist_browser.js'),s);
const y=n=>8+n*30+14;
// Vertical movement over other sidebar rows never starts an OLE job.
s.on_mouse_lbtn_down(54,y(0));s.on_mouse_move(54,y(1),1);s.on_mouse_lbtn_up(54,y(1));
assert.equal(dragOut,0);assert.equal(accidentalInsert,0);
// On an ordinary playlist, short or mostly vertical motion stays local.
const normalRow=s.entries().findIndex(r=>r.name==='Personal Playlist');
s.on_mouse_lbtn_down(20,y(normalRow));s.on_mouse_move(40,y(normalRow),1);assert.equal(dragOut,0);
s.on_mouse_move(80,y(normalRow)+55,1);assert.equal(dragOut,0);
s.on_mouse_lbtn_up(80,y(normalRow)+55);
// Horizontal drag from ordinary playlists exports to Queue.
s.on_mouse_lbtn_down(20,y(normalRow));s.on_mouse_move(185,y(normalRow),1);
assert.equal(dragOut,1);assert.equal(queueTracks.at(-1).Path,'normal.flac');
// Artist list rows may export their tracks even when dragging from text.
vm.runInContext("mode='artists'",s);
s.on_mouse_lbtn_down(54,y(0));s.on_mouse_move(185,y(0),1);
assert.equal(dragOut,2);assert.equal(queueTracks.at(-1).Path,'art.flac');
// Source OLE marker explicitly prevents receiving it back in the centre.
const g=context('GlassPlaylist',{ID:33,Width:650,Height:470});vm.runInContext(src('js/anna_glass_playlist.js'),g);
values.set('anna.nav.mode','library');values.set('anna.drag.origin','sidebar:-1');
let accept={Effect:1};g.on_drag_over(accept,80,130);assert.equal(accept.Effect,0);
accept={Effect:1};g.on_drag_drop(accept,80,130);assert.equal(accept.Effect,0);
values.set('anna.drag.origin','');
// Pointer jitter (< 8px) does not start OLE. Once a real drag distance is
// crossed - in ANY direction, Round 14 - it begins, and the origin marker
// prevents self-drop duplication.
vm.runInContext('downAt={x:235,y:180,i:0,deferred:false};',g);
const dragBefore=dragOut;g.on_mouse_move(239,180,1);assert.equal(dragOut,dragBefore);
g.on_mouse_move(450,180,1);assert.equal(dragOut,dragBefore+1);
assert.equal(accidentalInsert,0);
// Guard on a self-origin drag even when the current playlist changes.
values.set('anna.drag.origin','glass:999');accept={Effect:1};g.on_drag_over(accept,80,160);assert.equal(accept.Effect,0);
values.set('anna.drag.origin','');
// Header now clears the actual queue only when explicitly clicked; regular callbacks do not flush it.
const q=context('AnnaQueue',{ID:55,Width:400,Height:410});vm.runInContext(src('js/anna_queue.js'),q);
q.on_playback_queue_changed();assert.equal(manualFlush,0);
const before=queueTracks.length;assert(before>=2);
q.on_mouse_lbtn_up(390,12);assert.equal(manualFlush,1);assert.equal(queueTracks.length,0);
assert(!src('js/anna_queue.js').includes('function addSelectedToQueue'));
// Caption hit-area is transparent and responds to double-click only.
const cap=context('CaptionStrip');vm.runInContext(src('js/anna_caption_strip.js'),cap);
assert.equal(cap.on_mouse_lbtn_dblclk(50,15),true);assert.equal(maximize,1);
assert(src('main.txt').includes('$panel(CaptionStrip,JS Panel,367,4,$eval(%_width% - 889),37)'));
assert(src('foo_ui_panels.ini').includes('panel.CaptionStrip.windowless = 1'));
// Both previously Japanese-only lyric warnings now use the shared locale dictionary.
assert(src('js/anna_lyrics.js').includes("AnnaI18n.t('lyricRightClickHint')"));
assert(src('js/anna_lyrics.js').includes("AnnaI18n.t('lyricReleaseJump')"));
for(const x of ['images/ornaments/anna_corner.png','images/ornaments/frame_tl.png','images/wallpaper_concept_master.png'])
 assert(!fs.existsSync(path.join(root,x)),x);
for(const hue of ['blue','teal','violet']) assert(fs.existsSync(path.join(root,'images/controls',hue,'pause.png')));
console.log('PASS round12: directional drag, Artist-to-Queue, source guards, clear Queue, caption double-click, lyrics locales and asset pruning');
