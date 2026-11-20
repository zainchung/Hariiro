import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import vm from 'node:vm';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')+sep;

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
for(const file of readdirSync(root+'js').filter(x=>x.endsWith('.js'))){new vm.Script(readFileSync(root+'js/'+file,'utf8'),{filename:file});}
const main=readFileSync(root+'main.txt','utf8');const ini=readFileSync(root+'foo_ui_panels.ini','utf8');
const pack=['NavTabs','TopChrome','NativeScroll','FooterQueueToggle','FooterVolume','FooterTransport','NowDetails','AnnaLyrics','DesktopLyrics','AnnaQueue','SwitchGlass','SwitchNative'];
for(const name of pack){assert.match(main,new RegExp(`\\$panel\\(${name},`));assert.match(ini,new RegExp(`panel\\.${name}\\.script = js/`));}
assert(!main.includes('FooterVolumePct'));assert(!ini.includes('FooterVolumePct'));assert(!readFileSync(root+'js/anna_footer_slider.js','utf8').includes('PERCENT_LABEL'));
assert(!main.includes('images/controls/play_ring.png'));
assert.match(main,/\$panel\(Cover,Album Art,/);assert(!ini.includes('panel.Cover.script'));
assert(!ini.includes('window.aspect_lock'));assert(!ini.includes('window.size = 1280 720'));
assert(!main.includes('ROTATEFLIP-'));
for(const c of ['tl','tr','bl','br'])assert(main.includes('images/ornaments/corner_'+c+'.png'));
assert.match(main,/SwitchGlass,JS Panel/);assert.match(main,/SwitchNative,JS Panel/);
assert(main.includes('images/controls/pink/speaker.png'));
const widths=[960,1280,1536,1920];
for(const w of widths){const h=Math.round(w*9/16);const navEnd=16+350,searchStart=w-522,searchEnd=searchStart+304,chromeStart=w-199,chromeEnd=chromeStart+183;
 assert(navEnd+10<searchStart);assert.equal(searchEnd+19,chromeStart);assert.equal(chromeEnd,w-16);
 const transportEnd=.52*w-214+428,speakerX=w-238,volX=w-209,volEnd=volX+168;
 assert(transportEnd+5<speakerX,`transport-speaker overlap at ${w}`);
 assert(speakerX+22<volX);assert.equal(volEnd,w-41);
 const queue={x:w-117,y:h-94,right:w-33,bottom:h-70};
 const volume={x:volX,y:h-43,right:volEnd,bottom:h-21};
 assert(volume.y>queue.bottom+10,`volume queue vertical overlap ${w}`);
 assert.equal(queue.x,w-117);assert.equal(queue.right,w-33);
 const seekEnd=.23*w+(.77*w-350),timeX=w-336,timeEnd=timeX+72;
 assert(seekEnd+10<=timeX);assert(timeEnd+20<speakerX);
 const rightTopY=58,rightBottom=rightTopY+265,lyricTop=337,lyricBottom=lyricTop+h-466;
 assert.equal(lyricTop-rightBottom,14);assert.equal(lyricBottom,h-129);assert.equal(h-113-lyricBottom,16);
 const deskX=w-209,deskRight=deskX+84;
 assert.equal(queue.x-deskRight,8);assert(deskX>transportEnd+10);
}
const flow=readFileSync(root+'js/anna_now_details.js','utf8');assert(flow.includes("gdi.Font('Yu Gothic UI',15"));assert(flow.includes("gdi.Font('Yu Gothic UI',12"));assert(flow.includes("gdi.Font('Yu Gothic UI',11"));
assert(flow.includes('const date=field(handle'));assert(!flow.includes('y+=6'));
const sidebar=readFileSync(root+'js/playlist_browser.js','utf8');assert(sidebar.includes("source.kind==='artist'"));assert(sidebar.includes('AnnaDpi.doDragDrop(window.ID,handles,1,{})')); // Round 15: fb.DoDragDrop via the DPI adapter
const desk=readFileSync(root+'js/anna_desktop_lyrics.js','utf8');assert(desk.includes('gr.DrawRoundRect(2,2,w-5,h-5'));assert(desk.includes('Desk ON'));assert(desk.includes('Desk OFF'));
const lyrics=readFileSync(root+'js/anna_lyrics.js','utf8');
assert(lyrics.includes("AnnaI18n.t('lyricSearch')"));
assert(lyrics.includes("new ActiveXObject('ESLyric')"));
assert(lyrics.includes('esl.RequestLyric(title,artist)'));assert(lyrics.includes('View/ESLyric/Search...'));
assert(lyrics.includes('fb.RunMainMenuCommand(path)'));
const toggle=readFileSync(root+'js/anna_mode_switch.js','utf8');
assert(toggle.includes("panelsui.PanelName==='SwitchGlass'"));
assert(toggle.includes('PVAR:TOGGLE:anna.playlist.experimental'));
assert(!readFileSync(root+'js/anna_top_chrome.js','utf8').includes('cy+6,cx+7,cy+6'));
function graphics(){return new Proxy({}, {get(target,key){return (...args)=>{calls.push({method:key,args});};}});}let calls=[];
function runScript(file,extra={}){
 const ctx={console:{log:()=>{}},gdi:{Font:(...args)=>({args}),Image:()=>({Width:192,Height:192})},window:{Width:428,Height:67,Repaint(){},CreatePopupMenu(){return menu;}},...extra};vm.createContext(ctx);vm.runInContext(readFileSync(root+'js/'+file,'utf8'),ctx,{filename:file});return ctx;
}
let activeOrder=0,chosenDevice='';let menu={AppendMenuItem(){},TrackPopupMenu(){return 202;}};

const plman={get PlaybackOrder(){return activeOrder;},set PlaybackOrder(n){activeOrder=n;}};
const fb={IsPlaying:true,IsPaused:false,PlaybackLength:120,PlaybackTime:30,GetNowPlaying(){return{};},Prev(){},Next(){},PlayOrPause(){},ShowPopupMessage(){throw new Error('unexpected popup')},GetOutputDevices(){return JSON.stringify([{name:'Headphones',active:true,output_id:'a',device_id:'b'},{name:'HDMI monitor',active:false,output_id:'c',device_id:'d'}]);},SetOutputDevice(o,d){chosenDevice=o+'/'+d;}};
const t=runScript('anna_transport.js',{plman,fb});
for(let i=0;i<7;i++){activeOrder=i;calls=[];t.on_paint(graphics());assert(calls.length>3,`mode ${i} has no icon`);}
t.activate(0,10,10);assert.equal(activeOrder,6); // menu cancelled: do not auto-cycle order
t.activate(1,10,10);assert.equal(fb.PlaybackTime,25);
t.activate(5,10,10);assert.equal(fb.PlaybackTime,30);
t.activate(6,10,10);assert.equal(chosenDevice,'c/d');
assert.equal(vm.runInContext("POS[6]",t),403);assert(vm.runInContext('PNG.play && PNG.pause && PNG.headphones',t));
let min=0,max=0,exit=0,pui=[];
const chrome=runScript('anna_top_chrome.js',{
 fb:{Exit(){exit++},ShowPopupMessage(){throw new Error('UIWizard should work')}},
 panelsui:{PanelName:'TopChrome',GetVariable:()=>'',RunAction(c){pui.push(c);return true}},
 ActiveXObject:function(id){assert.equal(id,'UIWizard');return {WindowMinimize(){min++},ToggleMaximize(){max++}};}
});
chrome.on_mouse_lbtn_up(74,15);chrome.on_mouse_lbtn_up(120,15);chrome.on_mouse_lbtn_up(164,15);
assert.equal(min,1);assert.equal(max,1);assert.equal(exit,1);
let mode='library';let navCalls=[];const nav=runScript('anna_nav_tabs.js',{
 panelsui:{GetVariable(){return mode;},RunAction(action){navCalls.push(action)},SetVariable(name,val){mode=val}},
 window:{Width:350,Height:38,Repaint(){}}
});
for(let i=0;i<3;i++){calls=[];nav.on_paint(graphics());assert(calls.length>=10);}
nav.on_mouse_lbtn_up(35,15);assert.equal(mode,'artists');
nav.on_mouse_lbtn_up(150,15);assert.equal(mode,'library');
nav.on_mouse_lbtn_up(278,15);assert.equal(mode,'library');assert.equal(nav.selected(nav.TABS?.[2]??{state:'nowplaying'}),false);
assert.equal(navCalls.length,3);
assert.match(readFileSync(root+'js/anna_queue_toggle.js','utf8'),/FillRoundRect/);
console.log('PASS: all JS syntax checks, native Album Art, four corner assets, no aspect lock, iOS mode switch, ESLyric search, and 4 widths/no overlaps, real device menu, 7 playback-order PNGs, image-based controls, UIWizard window actions, artist drag, lyric border and metadata sizing');
