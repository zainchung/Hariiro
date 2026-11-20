import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {installIncludeShim} from './helpers/js_panel.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

// JS Panel's include() loads shared files into the same script context.
installIncludeShim(vm);
const read=(f)=>readFileSync(root+'/'+f,'utf8');
const transport=read('js/anna_transport.js'),slider=read('js/anna_footer_slider.js');
const nav=read('js/playlist_browser.js'),glass=read('js/anna_glass_playlist.js');
const footer=read('main.txt');
// Controls really are separately replaceable transparent PNG files.
const order=['order_default','order_repeat_playlist','order_repeat_track','order_random',
 'order_shuffle_tracks','order_shuffle_albums'];
const controls=[...order,'seek_backward_5','seek_forward_5','previous','next','play','pause',
 'headphones','butterfly','volume_thumb','speaker'];
for(const c of controls){
 const file=root+'/images/controls/pink/'+c+'.png';assert(existsSync(file),file);
 const data=readFileSync(file);
 assert.equal(data.toString('hex',0,8),'89504e470d0a1a0a');
 assert.equal(data[25],6,'PNG must be RGBA for a theme-ready transparent asset: '+c);
}
assert.equal(readdirSync(root+'/images/controls/pink').filter(x=>x.endsWith('.png')).length,controls.length);
assert(!/function mainControl|function fiveSeconds|function outputDeviceIcon|function trackArrow/.test(transport));
assert(transport.includes("gdi.Image(folder+name+'.png')"));
assert(slider.includes("gdi.Image(folder+'butterfly.png')"));
assert(slider.includes("gdi.Image(folder+'volume_thumb.png')"));
assert(footer.includes('images/controls/pink/speaker.png'));
assert(footer.includes('$eval(%_width% * 23 / 100 - 48)'),'elapsed time label shifted closer');
// DrawImage actually paints each asset: no vector-only placeholder fallback.
const paths=[],drawCalls=[];let orderIndex=0;
const gr=new Proxy({}, {get:(_,k)=>(...args)=>{drawCalls.push({k,args});}});
const tctx=vm.createContext({gdi:{Image:p=>{paths.push(p);return{Width:192,Height:192}},Font:()=>({})},
 plman:{get PlaybackOrder(){return orderIndex}},fb:{IsPlaying:true,IsPaused:false,PlaybackLength:120},
 window:{Height:67,Width:428,Repaint(){},CreatePopupMenu:()=>({AppendMenuItem(){},TrackPopupMenu(){return 0}})},console});
vm.runInContext(transport,tctx);
for(let i=0;i<7;i++){
 orderIndex=i;drawCalls.length=0;tctx.on_paint(gr);
 assert.equal(drawCalls.filter(x=>x.k==='DrawImage').length,7,'all seven buttons draw PNG assets');
}
assert(paths.includes('../images/controls/pink/order_shuffle_albums.png'));
const seekContext=vm.createContext({gdi:{Image:p=>({Width:192,Height:192,path:p})},
 panelsui:{PanelName:'FooterSeek'},fb:{IsPlaying:true,PlaybackLength:120,PlaybackTime:20,Volume:-20},
 window:{Width:350,Height:27,Repaint(){},RepaintRect(){},SetInterval(){return 1},ClearInterval(){}}});
vm.runInContext(slider,seekContext);drawCalls.length=0;seekContext.on_paint(gr);
assert(drawCalls.some(x=>x.k==='DrawImage'&&x.args[0].path.includes('butterfly')));
// All three switch scripts share exactly the same active, inactive and knob palette.
for(const f of ['js/anna_mode_switch.js','js/anna_queue_toggle.js','js/anna_desktop_lyrics.js']){
 const s=read(f);
 for(const value of ['0xff93547d','0xff43334f','0xffffc8e7','0xffd9b2d2',
                     '0xffffe9f5','0xffd8cbdf'])assert(s.includes(value),f+' '+value);
 assert(s.includes('paintSwitch(gr,w,h,'),f);
}

// Mock the actual foobar playlist API; deliberately omit utils.MessageBox and
// plman.RemovePlaylist to reproduce old "TypeError: not a function" conditions.
let rows=[{name:'Normal',items:[{Path:'a.flac',SubSong:0}]},
 {name:'Anna - Favorites',items:[{Path:'fav.flac',SubSong:0}]},
 {name:'Anna - Search Results',items:[{Path:'result.flac',SubSong:0}]},
 {name:'Editable',items:[{Path:'song1.flac',SubSong:0}]},
 {name:'To Delete',items:[{Path:'song2.flac',SubSong:0}]}];
let active=3,selected=[0],focus=-1,removedPlaylist=-1,calledRemove=0;
let targetAdded=0,notice=[],actions=[],counter=0,cb=new Map();const responses=[3,1];
const handles=(a)=>({Count:a.length,Convert:()=>a.slice(),Item:i=>a[i],Add:x=>a.push(x),Find:x=>a.indexOf(x)});
const plman={get ActivePlaylist(){return active},set ActivePlaylist(v){active=v},
 get PlaylistCount(){return rows.length},get PlayingPlaylist(){return -1},
 GetPlaylistName:i=>rows[i]?.name||'',FindPlaylist:n=>rows.findIndex(r=>r.name===n),
 GetPlaylistItems:i=>handles(rows[i].items),GetPlaylistSelectedItems:i=>handles(selected.map(n=>rows[i].items[n]).filter(Boolean)),
 PlaylistItemCount:i=>rows[i].items.length,GetPlaybackQueueContents:()=>[],
 IsPlaylistLocked:()=>false,GetPlayingItemLocation:()=>({IsValid:false}),
 UndoBackup(){},ClearPlaylistSelection(){selected=[]},
 SetPlaylistSelectionSingle(p,i){selected=[i]},SetPlaylistFocusItem(p,i){focus=i},
 EnsurePlaylistItemVisible(){},SetPlaylistLockedActions(){},GetPlaylistFocusItemIndex(){return focus},
 SetPlaylistSelection(){},IsPlaylistItemSelected:(p,i)=>selected.includes(i),
 RemovePlaylistSelection(p){calledRemove++;rows[p].items=rows[p].items.filter((_,i)=>!selected.includes(i));selected=[]},
 RemovePlaylistSwitch(p){removedPlaylist=p;rows.splice(p,1);return true},
 FindOrCreatePlaylist(n){let i=rows.findIndex(r=>r.name===n);if(i<0){i=rows.length;rows.push({name:n,items:[]});}return i},
 GetPlaybackQueueHandles:()=>handles([]),
 SortByFormatV2:()=>true,InsertPlaylistItems(){},ClearPlaylist(){}
};
const fb={
 TitleFormat:()=>({EvalWithMetadbs:a=>a.Convert().map(()=>''),EvalWithMetadb:()=>''}),
 GetLibraryItems:()=>handles([]),CreateHandleList:()=>handles([]),GetNowPlaying:()=>null,
 ShowPopupMessage:m=>notice.push(m),DoDragDrop(){},RunMainMenuCommand:()=>true,
 GetSelection:()=>handles([])
};
const vars=new Map([['anna.nav.mode','library'],['anna.search.results.owned','["Anna - Search Results"]'],['anna.search.results.name','Anna - Search Results']]);
const ctx=vm.createContext({gdi:{Font:()=>({})},plman,fb,utils:{IsKeyPressed(){return false}},
 panelsui:{GetVariable:(k,d)=>vars.get(k)??d,SetVariable:(k,v)=>vars.set(k,v),RunAction:a=>{actions.push(a);return true}},
 window:{ID:1,Width:196,Height:420,Repaint(){},GetProperty:(k,d)=>d,SetProperty(){},
 CreatePopupMenu(){return{AppendMenuItem(){},AppendMenuSeparator(){},TrackPopupMenu(){return responses.shift()??0}}},
 SetTimeout(fn){cb.set(++counter,fn);return counter},ClearTimeout(id){cb.delete(id)}},console:{log(){}}});
vm.runInContext(nav,ctx);
const hit=(name)=>{const i=ctx.entries().findIndex(r=>r.name===name);assert(i>=0,name);return 8+i*30+10;};
for(const fixed of ['Music Library','Anna - Favorites','Anna - Search Result']){
 const action={Effect:77};ctx.on_drag_over(action,15,hit(fixed));assert.equal(action.Effect,0,fixed+' rejects a drop');
}
const hover={Effect:0};ctx.on_drag_over(hover,20,hit('Editable'));
assert.equal(hover.Effect,1,'editable target accepts OLE copy');
assert.equal(vm.runInContext('trackDropTarget',ctx),ctx.entries().findIndex(x=>x.name==='Editable'));
drawCalls.length=0;ctx.on_paint(gr);assert(drawCalls.some(x=>x.k==='FillRoundRect'),'visible target highlight');
const drop={Effect:0};ctx.on_drag_drop(drop,20,hit('Editable'));
assert.equal(drop.Playlist,3);assert.equal(drop.Base,1);assert.equal(drop.ToSelect,true);assert.equal(drop.Effect,1);
assert.equal(active,3);assert.equal(vm.runInContext('trackDropTarget',ctx),-1);
// Removing a playlist must confirm even without MessageBox and work with fallback removal API.
ctx.on_mouse_rbtn_up(16,hit('To Delete'));assert.equal(removedPlaylist,4);
assert.equal(rows.length,4,'only the requested playlist registry entry is gone');
assert.equal(rows[3].items[0].Path,'song1.flac','existing audio file handle must remain untouched');
// Track removal belongs only to the middle panel, never to sidebar context.
assert.equal(typeof ctx.removeSelectedTracks,'undefined');
assert.equal(calledRemove,0);
assert.equal(rows[3].items[0].Path,'song1.flac');
for(const fixed of ['Music Library','Anna - Favorites','Anna - Search Result']){
 const item=ctx.entries().find(x=>x.name===fixed);assert.equal(ctx.editablePlaylistRow(item),false);
}
assert(glass.includes("AnnaI18n.t('removeSelected')"));
assert(glass.includes('function removeFromCurrentPlaylist()'));
console.log('PASS round8: all 17 transparent control PNGs, image-rendered footer, unified switch palette, seek timing, pinned drop rejection, OLE target highlight, safe playlist deletion fallback, track removal without file deletion');
