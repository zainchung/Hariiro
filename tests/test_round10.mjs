import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(root+'/'+p,'utf8');
const main=read('main.txt'),chrome=read('js/anna_top_chrome.js');
assert(main.includes('$panel(TopChrome,JS Panel,$eval(%_width% - 199),6,183,31)'));
assert(main.includes('$panel(GlassSearch,JS Panel,$eval(%_width% - 522),6,304,31)'));
assert(!chrome.includes('⚙') && !chrome.includes('const ICON='));
assert(!chrome.includes("if(i===1)runAction('MENU')"));
assert(chrome.includes('for(let i=0;i<X.length;i++)'));
let menuHits=0,commands=[],min=0,max=0,exit=0,answer=0;
const chromeCtx=vm.createContext({gdi:{Font:()=>({})},window:{Width:190,Height:31,Repaint(){},CreatePopupMenu(){return{AppendMenuItem(){},AppendMenuSeparator(){},AppendTo(){},TrackPopupMenu(){menuHits++;return answer;}};}},
 panelsui:{GetVariable:(_k,d)=>d,SetVariable(){},RunAction:s=>commands.push(s)},fb:{Exit(){exit++}},
 ActiveXObject:function(name){assert.equal(name,'UIWizard');return{WindowMinimize(){min++},ToggleMaximize(){max++}}},console:{log(){}}});
chromeCtx.include=p=>vm.runInContext(read('js/'+p),chromeCtx);
vm.runInContext(chrome,chromeCtx);
const drawn=[];const gr=new Proxy({}, {get:(_o,k)=>(...args)=>drawn.push([k,...args])});
chromeCtx.on_paint(gr);assert(!drawn.some(x=>x.some(v=>typeof v==='number'&&Number.isNaN(v))));
answer=11;chromeCtx.on_mouse_lbtn_up(20,16);assert.equal(menuHits,1);assert(commands.includes('PVAR:TOGGLE:anna.chrome.hidden'));
answer=12;chromeCtx.on_mouse_rbtn_up(20,16);assert.equal(menuHits,2);assert(commands.includes('MENUBAR:toggle'));
chromeCtx.on_mouse_lbtn_up(70,16);chromeCtx.on_mouse_lbtn_up(120,16);chromeCtx.on_mouse_lbtn_up(164,16);
assert.deepEqual([min,max,exit],[1,1,1]);

const source=read('js/playlist_browser.js');
assert(source.includes('sidebarOLEInProgress'));
assert(source.includes("source.kind==='fixedFavorites'"));
assert(source.includes("AnnaI18n.t('duplicatePlaylist')"));
const rows=[
{name:'Original',items:[{Path:'A.flac'}]},
{name:'Anna - Favorites',items:[{Path:'Fav.flac'}]},
{name:'Anna - Search Results',items:[{Path:'Found.flac'}]},
{name:'Mix',items:[{Path:'Mix.flac'}]}];
let active=0,dragged=[],selfDrop=[];let popupAnswer=0;const info=[];
const handles=arr=>({Count:arr.length,Item:i=>arr[i],Convert:()=>arr.slice(),Add:h=>arr.push(h)});
const plman={get PlaylistCount(){return rows.length},get ActivePlaylist(){return active},set ActivePlaylist(i){active=i},PlayingPlaylist:-1,
 FindPlaylist:n=>rows.findIndex(x=>x.name===n),GetPlaylistName:i=>rows[i]?.name||'',GetPlaylistItems:i=>handles(rows[i].items),PlaylistItemCount:i=>rows[i].items.length,
 GetPlaybackQueueContents:()=>[],IsPlaylistLocked:()=>false,GetPlayingItemLocation:()=>({IsValid:false}),GetPlaylistFocusItemIndex:()=>-1,
 DuplicatePlaylist(i,name){const at=rows.length;rows.push({name,items:rows[i].items.slice()});return at;}};
let sidebar;
const fb={GetLibraryItems:()=>handles([{Path:'Library.flac'}]),CreateHandleList:()=>handles([]),TitleFormat:()=>({EvalWithMetadb:()=>''}),GetNowPlaying:()=>null,
 DoDragDrop(_id,list){dragged.push(list.Convert().map(x=>x.Path));const action={Effect:1};sidebar.on_drag_over(action,20,8+6*30);selfDrop.push(action.Effect);}};
const variables=new Map([['anna.nav.mode','library'],['anna.search.results.name','Anna - Search Results'],['anna.search.results.owned','["Anna - Search Results"]']]);
const ctx=vm.createContext({console:{log(){}},gdi:{Font:()=>({})},plman,fb,utils:{InputBox:()=>''},panelsui:{GetVariable:(k,d)=>variables.get(k)??d,SetVariable:(k,v)=>variables.set(k,v)},
 window:{ID:44,Width:196,Height:420,GetProperty:(_k,d)=>d,SetProperty(){},Repaint(){},SetTimeout(){return 0},ClearTimeout(){},CreatePopupMenu(){return{AppendMenuItem(){},AppendMenuSeparator(){},TrackPopupMenu(){return popupAnswer}}}}});
sidebar=ctx;
ctx.include=p=>vm.runInContext(read('js/'+p),ctx);
vm.runInContext(source,ctx);
const yFor=name=>{const i=ctx.entries().findIndex(row=>row.name===name);assert(i>=0,name);return 8+i*30+14;};
let previousCount=0;
// Pinned playlists export their entire track set, but self-drops remain rejected.
for(const [name,track] of [['Music Library','Library.flac'],['Anna - Favorites','Fav.flac'],['Anna - Search Result','Found.flac']]){
 ctx.on_mouse_lbtn_down(20,yFor(name));ctx.on_mouse_move(184,yFor(name),1);
 assert.equal(dragged.at(-1)?.[0],track,`${name} must export its tracks to Queue`);
 assert.equal(selfDrop.at(-1),0,'pinned source may not copy into a sidebar list');
 ctx.on_mouse_lbtn_up(184,yFor(name));
}
previousCount=dragged.length;
for(const [name,expected] of [['Original','A.flac'],['Mix','Mix.flac']]){
 ctx.on_mouse_lbtn_down(20,yFor(name));ctx.on_mouse_move(40,yFor(name),1);
 assert.equal(dragged.length,previousCount,'short motion must not create OLE');
 ctx.on_mouse_move(184,yFor(name),1);
 assert.equal(dragged.at(-1)[0],expected,`${name} should drag to Queue`);
 previousCount=dragged.length;
 assert.equal(selfDrop.at(-1),0,'sidebar-origin OLE may not copy into another sidebar list');
}
assert.equal(rows.length,4,'none of the simulated drags inserted into another playlist');
popupAnswer=6;ctx.on_mouse_rbtn_up(20,yFor('Mix'));
assert.equal(rows.length,5);assert.equal(rows[4].name,'Mix - Copy');
assert.equal(rows[4].items.length,1);assert.notEqual(rows[4].items,rows[3].items);
assert.equal(rows[3].items.length,1);
assert.equal(ctx.entries().filter(x=>x.name==='Mix - Copy').length,1);
assert(read('js/anna_i18n.js').includes("['duplicatePlaylist'"));

const glass=read('js/anna_glass_playlist.js');
assert(glass.includes('localGlassTrackOLE=true'));
assert(read('js/anna_glass_drop.js').includes("if(src.kind==='glass')return {ok:false,msg:''};")); // Round 14: single decision point (moved to AnnaGlassDrop in D1)
const glassCtx=vm.createContext({console:{log(){}},gdi:{Font:()=>({})},utils:{},fb:{TitleFormat:()=>({EvalWithMetadbs:a=>a.Convert().map(()=>'')})},plman,
 panelsui:{GetVariable:(k,d)=>variables.get(k)??d},window:{IsVisible:false,Width:630,Height:470,Repaint(){},SetInterval:()=>1,ClearInterval(){}}});
glassCtx.include=p=>vm.runInContext(read('js/'+p),glassCtx);
vm.runInContext(glass,glassCtx);
vm.runInContext('localGlassTrackOLE=true;',glassCtx);
let hover={Effect:1};glassCtx.on_drag_over(hover,20,40);
assert.equal(hover.Effect,0);assert.equal(vm.runInContext('importStatus',glassCtx),''); // own Glass drag: rejected silently, even if a stale sidebar marker is still set
let ownDrop={Effect:1};glassCtx.on_drag_drop(ownDrop,20,40);assert.equal(ownDrop.Effect,0);
assert(!read('js/anna_top_chrome.js').includes("if(i===1)runAction('MENU')"));
console.log('PASS round10: hamburger-only settings, fixed playlist Queue export, ordinary playlist-to-Queue export, sidebar self-drop rejected, duplication and Glass self-guard');
