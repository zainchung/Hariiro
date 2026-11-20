import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

// JS Panel's include() loads shared files into the same script context
// (generic shim: every include('x.js') resolves to js/x.js).
import {installIncludeShim} from './helpers/js_panel.mjs';
const originalVmRun=installIncludeShim(vm);
const read=f=>readFileSync(root+'/'+f,'utf8');
const main=read('main.txt'), ini=read('foo_ui_panels.ini');
const lyrics=read('js/anna_lyrics.js'),chrome=read('js/anna_top_chrome.js');
const native=read('js/anna_native_scroll.js');
assert.match(lyrics,/PLAYED_NEAR = 0xffec85bb, PLAYED_FAR = 0xffb869a6/);
assert.match(lyrics,/played\?PLAYED_NEAR/);
const active=0xffffedf6, played=0xffec85bb;
assert(Math.abs((active&255)-(played&255))+Math.abs((active>>8&255)-(played>>8&255))+Math.abs((active>>16&255)-(played>>16&255))>110);
assert(main.includes('アーティスト/ライブラリ'));
assert(main.includes('ALBUMS / TRACKS'));
assert(main.includes('$panel(NativeScroll,JS Panel,'));
assert.match(ini,/panel.NativeScroll.script = js\/anna_native_scroll.js/);
assert.match(native,/EnsurePlaylistItemVisible\(active\(\),estimated\)/);
assert.match(ini,/panel.NativeScroll.windowless = 0/);
assert(ini.includes('color.playlist.highlight = 233 119 181'));
assert(!ini.includes('color.playlist.highlight = 205 145 92'));
assert(main.includes('$panel(TopChrome,JS Panel'));
assert(ini.includes('panel.TopChrome.script = js/anna_top_chrome.js'));
assert(chrome.includes('function settingsMenu(x,y)'));
assert(chrome.includes('const red=over?'));
const geom=[];
for(const w of [960,1280,1536,1920]){
 const outerX=w*.72-10, artX=w*.72+4;
 const cover=w>1500?180:w*.12;
 const detailsX=w>1500?w*.72+198:w*.84+18;
 const waveBottom=269+40;
 assert.equal(artX-outerX,14);
 assert(Math.abs(detailsX-(artX+cover)-14)<.001);
 assert.equal(72-58,14);
 assert.equal(323-waveBottom,14);
 geom.push({w,artX,detailsX});
}
const drawings=[];
const gr=new Proxy({}, {get:(_k,key)=>(...args)=>drawings.push({method:key,args})});
function chromeFor(name){
 const ctx=vm.createContext({window:{Width:190,Height:31,Repaint(){}},gdi:{Font:()=>({})},
  panelsui:{PanelName:name,GetVariable:()=>'',RunAction:()=>true},fb:{Exit(){}},console:{log(){}}});
 vm.runInContext(chrome,ctx);drawings.length=0;ctx.on_paint(gr);return ctx;
}
const c=chromeFor('TopChrome');drawings.length=0;c.on_mouse_move(161,16);c.on_paint(gr);
assert(drawings.some(x=>x.method==='DrawRoundRect'&&x.args.includes(0xffff859a)),'power hover should warn red');
const revealed=[];
const nativeWindow={Width:15,Height:500,Repaint(){}};
const nctx=vm.createContext({window:nativeWindow,plman:{ActivePlaylist:0,PlaylistItemCount:()=>90,EnsurePlaylistItemVisible(p,i){revealed.push([p,i]);}},console:{log(){}}});
vm.runInContext(native,nctx);
nctx.on_paint(gr);nctx.on_mouse_lbtn_down(12,18);nctx.on_mouse_move(12,420,1);nctx.on_mouse_lbtn_up(12,420);
assert(revealed.length>=2&&revealed.at(-1)[1]>40);
// Verify the option reveals the actual loaded LRC and does not pretend tags are files.
const popup=[],runs=[];
const lyricCtx=vm.createContext({
 window:{Width:300,Height:380,IsVisible:false,GetProperty:(k,d)=>d,SetProperty(){},SetInterval(){return 1;},ClearInterval(){},Repaint(){}},
 gdi:{Font:()=>({})},fb:{TitleFormat:()=>({EvalWithMetadb:()=>''}),GetNowPlaying:()=>null,ShowPopupMessage(x){popup.push(x)}},
 utils:{IsFile:p=>p==='C:\\Music\\歌詞\\lyric.lrc',Run(...a){runs.push(a);return true;}},console:{log(){}}
});
vm.runInContext(lyrics,lyricCtx);
vm.runInContext("state={kind:'synced',lines:[{time:1,text:'hello'}],filePath:'C:\\\\Music\\\\歌詞\\\\lyric.lrc'}",lyricCtx);
assert.equal(lyricCtx.openCurrentLyricsLocation(),true);
assert.equal(runs.length,1);
assert.equal(runs[0][0],'explorer.exe');
assert(runs[0][1].startsWith('/select,"C:'));
vm.runInContext("state={kind:'synced',lines:[{time:1,text:'hello'}],source:'Embedded · synced'}",lyricCtx);
assert.equal(lyricCtx.openCurrentLyricsLocation(),false);
assert(popup.some(x=>x.includes('タグ')||x.includes('音频标签')||x.includes('audio tags')));
assert(lyrics.includes("AnnaI18n.t('lyricLocate')"));
console.log('PASS round5: contrasting played lyrics; real lyric-file reveal; chrome states and power hover; classic navigation strip; theme colours; header/covers/spectrum geometry at 960–1920px');
