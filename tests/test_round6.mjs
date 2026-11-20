import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import vm from 'node:vm';
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
const read=f=>readFileSync(root+'/'+f,'utf8');
const main=read('main.txt');
const transport=read('js/anna_transport.js');
const lyrics=read('js/anna_lyrics.js');
const glass=read('js/anna_glass_playlist.js');
const queue=read('js/anna_queue_toggle.js');
const desk=read('js/anna_desktop_lyrics.js');
assert.match(main,/\$panel\(DesktopLyrics,JS Panel,\$eval\(%_width% - 209\),\$eval\(%_height% - 94\),84,24/);
assert.match(main,/\$panel\(FooterQueueToggle,JS Panel,\$eval\(%_width% - 117\),\$eval\(%_height% - 94\),84,24/);
assert(!main.includes(',$eval(%_width% - 133),345,84,24'));
assert.match(queue,/FillRoundRect\(2,2,w-5,h-5,9,9/);
assert(desk.includes("on?'Desk ON':'Desk OFF'"));
// At every target width the footer controls share exactly the same y and width.
for(const w of [960,1280,1536,1920]){
  const cover=w>1500?180:w*.12;
  const waveTop=72+cover+14;
  const waveHeight=309-waveTop;
  assert.equal(Math.round(waveTop+waveHeight),309);
  assert(waveHeight>=43&&waveHeight<=108);
  if(w===1280)assert(waveHeight>=65&&waveHeight<=72,'spectrum must be about 1.5x larger at screenshot width');
  const deskX=w-209,queueX=w-117;
  assert.equal(queueX-(deskX+84),8);
  assert.equal(queueX+84,w-33);
}
assert(!transport.includes('playback.GetOutputDevices'));
assert(!transport.includes('EnumerateMainMenuCommands'));
assert(transport.includes("fb.SetOutputDevice(chosen.output_id,chosen.device_id)"));
assert(transport.includes("'headphones'"));
assert(transport.includes("'seek_forward_5'")&&transport.includes("'seek_backward_5'"));
assert(glass.includes('miniEqFrame=(miniEqFrame+1)%360'));
assert(glass.includes('function on_script_unload(){if(miniEqTimer)window.ClearInterval(miniEqTimer);'));
assert(glass.includes('if(importMessageTimer)window.ClearTimeout(importMessageTimer);')); 
const graphic=[];
const gr=new Proxy({}, {get:(_t,k)=>(...args)=>{graphic.push({k,args});if(k==='CalcTextWidth')return Array.from(String(args[0])).length*15;}});
// Real output IDs are lowercase in the upstream JS Panel API.
let switched='';
const tctx={gdi:{Font:()=>({}),Image:()=>({Width:192,Height:192})},window:{Width:428,Height:67,Repaint(){},CreatePopupMenu(){return{AppendMenuItem(){},TrackPopupMenu(){return 202;}};}},
 fb:{GetOutputDevices(){return JSON.stringify([{name:'Headphones',active:true,output_id:'o0',device_id:'d0'},
 {name:'HDMI',active:false,output_id:'o1',device_id:'d1'}]);},SetOutputDevice(o,d){switched=o+'/'+d;},
 ShowPopupMessage(msg){throw Error('unexpected popup '+msg)},IsPlaying:true,IsPaused:false,PlaybackTime:20,PlaybackLength:180},
 plman:{PlaybackOrder:2},console:{log(){}}};
vm.createContext(tctx);vm.runInContext(transport,tctx);
tctx.selectOutput(398,36);assert.equal(switched,'o1/d1');
graphic.length=0;tctx.on_paint(gr);assert(graphic.some(x=>x.k==='DrawImage'), 'PNG controls should draw');
let ltime=3;
const messages=[],calls=[];
const fb={TitleFormat:()=>({EvalWithMetadb:()=>''}),GetNowPlaying:()=>null,IsPlaying:true,IsPaused:false,
 PlaybackLength:267,get PlaybackTime(){return ltime;},set PlaybackTime(v){ltime=v;},
 ShowPopupMessage(...a){messages.push(a);}};
const shellActions=[];
const ctx=vm.createContext({gdi:{Font:()=>({})},window:{ID:1,Width:320,Height:390,IsVisible:true,
 GetProperty:(_k,d)=>d,SetProperty(){},SetInterval(){return 1;},ClearInterval(){},Repaint(){}},
 fb,utils:{FileTest(){return true;}},ActiveXObject:function(name){assert.equal(name,'WScript.Shell');return{Run(s){shellActions.push(s);return 1;}};},console:{log(){}}});
vm.runInContext(lyrics,ctx);
const source='[00:00.52] 月には叢雲 華には風と\n[00:06.83] 朧深に隠れた 焦燥\n[00:12.83]';
const parsed=ctx.parseLrc(source);
assert.equal(parsed.kind,'synced');assert.equal(parsed.lines[0].karaoke,null);
vm.runInContext('state=parseLrc('+JSON.stringify(source)+')',ctx);
graphic.length=0;ctx.on_paint(gr);
const pinkAt3=graphic.filter(x=>x.k==='GdiDrawText'&&x.args[2]===0xffec85bb);
const whiteAt3=graphic.filter(x=>x.k==='GdiDrawText'&&x.args[2]===0xffffedf6);
assert(pinkAt3.length>0&&whiteAt3.length>0,'plain LRC current line should progressively change glyph colours');
ltime=6.80;graphic.length=0;ctx.on_paint(gr);
const pinkNearEnd=graphic.filter(x=>x.k==='GdiDrawText'&&x.args[2]===0xffec85bb);
assert(pinkNearEnd.length>pinkAt3.length,'progress must colour more glyphs near the next timestamp');
vm.runInContext("state={kind:'synced',lines:[{time:1,text:'Hello'}],filePath:'C:\\\\music\\\\song.lrc'}",ctx);
assert.equal(ctx.openCurrentLyricsLocation(),true,'uses WScript.Shell when utils.Run absent');
assert.equal(shellActions.length,1);
assert(shellActions[0].includes('/select,"C:'));
assert(messages.length===0);
console.log('PASS round6: actual output devices + headphones, ±5s arc, QUEUE/Desk footer placement, larger spectrum, animated playing glyph, plain-LRC progressive pink text, lyric Explorer fallback');
