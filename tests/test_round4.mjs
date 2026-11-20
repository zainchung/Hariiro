import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

// JS Panel's include() loads shared files into the same script context
// (generic shim: every include('x.js') resolves to js/x.js).
import {installIncludeShim} from './helpers/js_panel.mjs';
const originalVmRun=installIncludeShim(vm);
const read=path=>readFileSync(root+'/'+path,'utf8');
const main=read('main.txt'),tabsCode=read('js/anna_nav_tabs.js');
const lyricsCode=read('js/anna_lyrics.js'),deskCode=read('js/anna_desktop_lyrics.js');
assert.match(main,/72 \/ 100 - 115\),61,74,24/);
assert.match(main,/\$eval\(%_width% - 209\),\$eval\(%_height% - 94\),84,24/);
assert(!main.includes('72 / 100 - 152),59,111,28'));
assert.match(read('js/anna_mode_switch.js'),/gdi.Font\('Segoe UI',9,1\)/);
const artwork=read('js/anna_transport.js');
assert(artwork.includes('transport graphics are transparent PNGs')); // intentionally unchanged in round 4
const modes=[];let selectedMode='artists',clock=1_000;
const tabHost={Width:350,Height:38,Repaint(){},SetTimeout(fn){modes.push({type:'timer',fn});return 42;},ClearTimeout(){},GetProperty(){return 'artists';},SetProperty(){}};
const tabs=vm.createContext({window:tabHost,gdi:{Font:()=>({})},panelsui:{
 GetVariable:()=>selectedMode,SetVariable(k,v){selectedMode=v;},RunAction(command){modes.push({type:'action',command});}
},console:{log(){}}});
vm.runInContext(tabsCode,tabs);
assert.equal(tabs.selected({state:'nowplaying'}),false);
tabs.on_mouse_lbtn_down(280,18);
assert.equal(vm.runInContext('nowPressed',tabs),true);
tabs.on_mouse_lbtn_up(280,18);
assert.equal(selectedMode,'artists','Now Playing must not change selected Library/Playlist tab');
assert.equal(vm.runInContext('active',tabs),'artists');
assert.equal(tabs.selected({state:'nowplaying'}),false);
assert(modes.some(x=>x.command==='JSPANEL:Playlists:nowplaying'));
tabs.on_notify_data('NavTabs','nowplaying');
assert.equal(vm.runInContext('active',tabs),'artists');
modes.find(x=>x.type==='timer').fn();
assert.equal(vm.runInContext('nowPressed',tabs),false);
const rec=[];let time=0.1;let intervals=[];
const gdi={Font:(...a)=>({args:a})};
const fb={GetNowPlaying:()=>null,TitleFormat:()=>({EvalWithMetadb:()=>''}),
 get PlaybackTime(){return time;},set PlaybackTime(t){time=t;},
 PlaybackLength:120,IsPlaying:true,IsPaused:false,
 RunMainMenuCommand(x){rec.push({method:'menu',name:x});return x==='View/ESLyric/Search...'||x==='View/ESLyric/Reload lyric';},
 ShowPopupMessage(){throw Error('unexpected popup');}
};
const window={Width:342,Height:355,IsVisible:true,ID:10,GetProperty(k,d){return d;},SetProperty(){},Repaint(){},
 SetInterval(fn,ms){intervals.push({fn,ms});return intervals.length;},ClearInterval(){},
 CreatePopupMenu(){return {AppendMenuItem(){},AppendMenuSeparator(){},TrackPopupMenu(){return 2;}};}
};
const ctx=vm.createContext({fb,gdi,window,utils:{CheckComponent(){return true;}},
 Date:{now(){return clock;}},console:{log(){}},
});
vm.runInContext(lyricsCode,ctx);
const lines=Array.from({length:12},(_,i)=>`[00:${String(i*2).padStart(2,'0')}.00]line${i}`).join('\n');
vm.runInContext('state=parseLrc('+JSON.stringify(lines)+');smoothFocus=null;',ctx);
const gr=new Proxy({}, {get:(_,key)=>(...args)=>{
 rec.push({method:key,args});if(key==='CalcTextWidth')return String(args[0]).length*12;
 }});
const v=ctx.lyricViewport(355);
function renderedCurrentY(){
 const match=rec.filter(x=>x.method==='FillRoundRect'&&x.args[6]===0x75683b67);
 assert(match.length,'current lyric highlight missing');return match.at(-1).args[1];
}
ctx.on_paint(gr);
const yFirst=renderedCurrentY();
const wantCenter=v.centerY-v.lineH/2+1;
assert(Math.abs(yFirst-wantCenter)<2,'First lyric should be vertically centered, not pinned to top');
rec.length=0;time=22.1;ctx.on_playback_seek();ctx.on_paint(gr);
const yLast=renderedCurrentY();
assert(Math.abs(yLast-yFirst)<2,'Last lyric should be centered at same vertical position as first');
// First short transition should animate rather than jump directly.
rec.length=0;time=20.2;ctx.on_playback_seek();clock+=100;ctx.on_paint(gr);
time=22.2;clock+=50;ctx.on_playback_time();ctx.on_paint(gr);
const float=vm.runInContext('smoothFocus',ctx);
assert(float>10&&float<11,'adjacent lyrics should scroll between positions');
for(let j=0;j<26;j++){clock+=55;ctx.on_paint(gr);}
assert(Math.abs(vm.runInContext('smoothFocus',ctx)-11)<0.02,'animation should converge to centered current lyric');
assert(vm.runInContext('PLAYED_FAR',ctx)===0xffb869a6);
assert(vm.runInContext('ACTIVE',ctx)===0xffffedf6);
// Drag should display an explicit target-time strip and seek on release.
rec.length=0;time=8.2;ctx.on_playback_seek();
ctx.on_mouse_lbtn_down(25,v.centerY+v.lineH+2);
ctx.on_mouse_move(25,v.centerY+2,1);
ctx.on_paint(gr);
assert(rec.some(x=>x.method==='GdiDrawText'&&String(x.args[0]).includes(ctx.AnnaI18n.t('lyricReleaseJump'))),
   'missing drag destination caption');
ctx.on_mouse_lbtn_up(25,v.centerY+2);
assert(time>=0&&time<=120);
assert.equal(vm.runInContext('previewCue',ctx),-1);
// ESLyric file watcher is accelerated only after opening the native search window.
rec.length=0;
assert.equal(ctx.esLyricSearch(),true);
assert.equal(rec[0].name,'View/ESLyric/Search...');
assert(intervals.some(t=>t.ms===900));
assert.equal(vm.runInContext('searchPollRemaining',ctx),85);
assert.equal(ctx.reloadESLyricDisplay(true),true);
assert(rec.some(x=>x.method==='menu'&&x.name==='View/ESLyric/Reload lyric'));
// Desktop switch uses 84px, no border clipping or old wide panel.
const dctx=vm.createContext({gdi,window:{Width:84,Height:24,GetProperty:(k,d)=>d,SetProperty(){},SetInterval:()=>1,
 ClearInterval(){},Repaint(){}},utils:{CheckComponent:()=>true},fb:{IsMainMenuCommandChecked:()=>false},console:{log(){}}});
vm.runInContext(deskCode,dctx);
rec.length=0;dctx.on_paint(gr);
assert(rec.some(x=>x.method==='GdiDrawText'&&x.args[0]==='Desk OFF'));
console.log('PASS round4: now-playing momentary action, compact fixed switches, time-centered first/last lyrics, scroll easing, stronger lyric colours, drag time caption, ESLyric search refresh bridge and unchanged transport');
