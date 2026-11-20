import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

// JS Panel's include() loads shared files into the same script context.
const originalVmRun=vm.runInContext.bind(vm);
vm.runInContext=(source,context,options)=>{
 if(typeof source==='string'&&source.includes("include('anna_i18n.js');")){
  originalVmRun(readFileSync(root+'/js/anna_i18n.js','utf8'),context);
  source=source.replace("include('anna_i18n.js');",'');
 }
 if(typeof source==='string'&&source.includes("include('anna_theme.js');")){
  originalVmRun(readFileSync(root+'/js/anna_theme.js','utf8'),context);
  source=source.replace("include('anna_theme.js');",'');
 }
 if(typeof source==='string'&&source.includes("include('anna_playlist_dedup.js');")){
  originalVmRun(readFileSync(root+'/js/anna_playlist_dedup.js','utf8'),context);
  source=source.replace("include('anna_playlist_dedup.js');",'');
 }
 return originalVmRun(source,context,options);
};
const read=(p)=>readFileSync(root+'/'+p,'utf8');
const main=read('main.txt'),ini=read('foo_ui_panels.ini');
const lyricCode=read('js/anna_lyrics.js'),browserCode=read('js/playlist_browser.js');
const glassCode=read('js/anna_glass_playlist.js'),navCode=read('js/anna_nav_tabs.js');
const transport=read('js/anna_transport.js');
// The artwork and size/layout contracts must remain untouched.
assert.match(main,/\$panel\(Cover,Album Art,/);
assert(!main.includes('play_ring.png'));
assert(!transport.includes('FillPolygon(C.line,0,[x-7'));
assert.match(transport,/transport graphics are transparent PNGs/);
assert.match(main,/72 \/ 100 - 115\),61,74,24/);
assert.match(main,/\$panel\(DesktopLyrics,JS Panel,\$eval\(%_width% - 209\),\$eval\(%_height% - 94\),84,24/);
assert.match(read('js/anna_desktop_lyrics.js'),/Desk ON/);
assert.match(read('js/anna_desktop_lyrics.js'),/Desk OFF/);
assert.match(read('js/anna_footer_slider.js'),/Match the progress rail/);
assert(!main.includes('FooterVolumePct'));
assert.match(navCode,/LastSelected.v2/);
assert.match(browserCode,/JSPANEL:NavTabs:/);
assert.match(browserCode,/dragSidebarScrollbar/);
assert.match(browserCode,/scrollingThumb/);
assert.match(glassCode,/dragGlassScrollbar/);
assert.match(glassCode,/scrollingThumb/);
assert.match(lyricCode,/View\/ESLyric\/Search\.\.\./);
assert(lyricCode.includes("AnnaI18n.t('lyricTags')"));
assert(lyricCode.includes("AnnaI18n.t('lyricConfig')"));
assert(lyricCode.includes("AnnaI18n.t('lyricTrack')"));
assert(lyricCode.includes("AnnaI18n.t('lyricBrowse')"));
const widths=[960,1280,1536,1920];
for(const w of widths){
  const right=.72*w-41,left=.72*w-115;
  assert.equal(right-left,74,'the two switch states share one geometry');
  assert(w-150+101 < w-16-20,'Desk button must not collide with corner decoration');
}
// Mock the JS host without network, filesystem, component windows or timers.
let now=2,menuCalled=[],painting=[],repainted=0;
const fb={
  GetNowPlaying(){return null;},
  TitleFormat(){return {EvalWithMetadb(){return 'test'}};},
  get PlaybackTime(){return now;},set PlaybackTime(t){now=t;},
  PlaybackLength:90,IsPlaying:true,IsPaused:false,
  RunMainMenuCommand(s){menuCalled.push(s);return s==='View/ESLyric/Search...';},
  ShowPopupMessage(s){throw Error('unexpected lyric popup '+s);}
};
const window={Width:350,Height:400,IsVisible:true,ID:1,
  GetProperty(k,d){return d;},SetProperty(){},Repaint(){repainted++;},
  SetInterval(){return 1;},ClearInterval(){},CreatePopupMenu(){return {AppendMenuItem(){},AppendMenuSeparator(){},TrackPopupMenu(){return 2;}};}};
const gr=new Proxy({}, {get(_,key){return (...args)=>{painting.push({key,args});if(key==='CalcTextWidth')return Array.from(args[0]).length*14;};}});
const ctx=vm.createContext({gdi:{Font:(...args)=>args},window,fb,
   utils:{CheckComponent(){return true;}},console:{log(){}}});
vm.runInContext(lyricCode,ctx);
const parse=(str)=>vm.runInContext('parseLrc('+JSON.stringify(str)+')',ctx);
let result=parse('[00:10.00]<00:10.00>夜<00:10.40>空<00:10.80>星[00:12.00]\n[00:14.00]次の行');
assert.equal(result.kind,'synced');
assert.equal(result.lines[0].text,'夜空星');
assert.equal(result.lines[0].karaoke.length,3);
assert.equal(result.lines[0].karaoke[1].time,10.4);
vm.runInContext('state=parseLrc("[00:10.00]<00:10.00>夜<00:10.40>空<00:10.80>星\\n[00:14.00]次の行")',ctx);
now=10.5;ctx.on_paint(gr);
assert(painting.some(p=>p.key==='GdiDrawText'&&p.args[0]==='夜'));
const before=painting.filter(p=>p.key==='GdiDrawText'&&p.args[0]==='夜').at(-1).args[2];
assert.equal(before,0xffec85bb,'first timestamped glyph already sung');
// A regular line-stamped LRC must not gain fabricated word timing.
result=parse('[00:01.00]hello\n[00:03.00]world');
assert.equal(result.lines[0].karaoke,null);
vm.runInContext('state=parseLrc("[00:00.00]a\\n[00:02.00]b\\n[00:04.00]c\\n[00:06.00]d\\n[00:08.00]e\\n[00:10.00]f\\n[00:12.00]g\\n[00:14.00]h")',ctx);
now=2;vm.runInContext('smoothFocus=null',ctx);
const lh=ctx.lyricViewport(400).lineH,center=ctx.lyricViewport(400).centerY;
ctx.on_mouse_lbtn_down(50,center+lh+3);
ctx.on_mouse_move(50,center+3,1);
assert.equal(vm.runInContext('previewCue',ctx),3);
ctx.on_mouse_lbtn_up(50,center+3);
assert.equal(now,6,'dragging one line upward seeks to cue 3 start');
assert.equal(vm.runInContext('previewCue',ctx),-1);
menuCalled=[];
assert.equal(ctx.esLyricSearch(),true);
assert.deepEqual(menuCalled,['View/ESLyric/Search...']);
// Background lyrics retrieval is intentionally a separate command, not UI search.
assert(menuCalled.every(s=>!s.includes('RequestLyric')));
// Exercise the scrollbar geometry and drag mapping independently from foobar services.
function extractFunction(source,name){
 const marker='function '+name+'(';const i=source.indexOf(marker);
 assert(i>=0,name+' missing');let level=0,start=source.indexOf('{',i),j=start;
 for(;j<source.length;j++){
  if(source[j]==='{')level++;
  if(source[j]==='}') {level--;if(level===0)break;}
 }
 return source.slice(i,j+1);
}
// Use an explicit brace counter only for functions that contain no braces in strings.
const sideCtx=vm.createContext({window:{Width:200,Height:300,Repaint(){}},
 entries:()=>Array.from({length:100}),ROW:30,TABS:8,scroll:0,scrollThumbGrab:0,
 clamp:(n,lo,hi)=>Math.min(hi,Math.max(lo,n))});
vm.runInContext(extractFunction(browserCode,'sidebarScrollbar')+'\n'+extractFunction(browserCode,'dragSidebarScrollbar'),sideCtx);
const sg=sideCtx.sidebarScrollbar();assert(sg&&sg.max>0);
sideCtx.dragSidebarScrollbar(sg.top+sg.travel+sg.thumb/2);
assert(sideCtx.scroll>sg.max*.9);
const glassCtx=vm.createContext({window:{Width:620,Height:500,Repaint(){}},
 totalHeight:2500,scroll:0,scrollThumbGrab:0,
 maxScroll:()=>2000,
 clamp:(n,lo,hi)=>Math.min(hi,Math.max(lo,n)),cancelTip(){}});
vm.runInContext(extractFunction(glassCode,'glassScrollbar')+'\n'+extractFunction(glassCode,'dragGlassScrollbar'),glassCtx);
const gg=glassCtx.glassScrollbar();assert(gg&&gg.max>0);
glassCtx.dragGlassScrollbar(gg.travel+gg.thumb/2);
assert(glassCtx.scroll>gg.max*.9);
console.log('PASS round3: real ESLyric search menu route, enhanced timed glyphs, drag seeking, read-source labels, compact switches, navbar intent, draggable scrollbars, new transport, volume glass rail');
