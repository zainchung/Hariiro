import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>readFileSync(root+'/'+f,'utf8');
const script=(f,extra={})=>{
 const ctx=vm.createContext({console:{log(){}},gdi:{Font:()=>({}),Image:()=>({Width:192,Height:192})},
  panelsui:{PanelName:'TopChrome',GetVariable:(name,d)=>vars.get(name)??d,SetVariable:(k,v)=>vars.set(k,v),RunAction:(k)=>actions.push(k)||true},
  fb:{Exit(){actions.push('exit')}},window:{Width:235,Height:31,Repaint(){},CreatePopupMenu:createMenu},...extra});
 ctx.include=p=>vm.runInContext(read('js/'+p),ctx);
 vm.runInContext(read('js/'+f),ctx);return ctx;
};
const vars=new Map([['anna.language','auto'],['anna.chrome.hidden','1'],['menubar','0']]);
const actions=[];let commands=[],answer=0,menuCalls=[];
const createMenu=()=>{
 const menu={AppendMenuItem:(_flags,id,txt)=>{commands.push([id,txt]);},AppendMenuSeparator(){},
  AppendTo(parent,flags,text){menuCalls.push(['submenu',text]);},TrackPopupMenu(){return answer;}};return menu;
};
// All five language settings localize skin-owned labels; auto persists distinctly.
const i18n=script('anna_top_chrome.js');
for(const [mode,txt] of [['ja','スキンの言語'],['en','Skin language'],['zh-CN','皮肤语言'],['zh-TW','皮膚語言']]){
 vars.set('anna.language',mode);assert.equal(vm.runInContext("AnnaI18n.t('language')",i18n),txt);
 commands=[];menuCalls=[];answer=0;
 i18n.on_mouse_lbtn_up(13,15);assert(menuCalls.some(x=>x[1]===txt),mode+' language submenu');
}
vars.set('anna.language','auto');answer=201;commands=[];i18n.on_mouse_rbtn_up(13,15); // Round 21 order: auto, English, ...
assert.equal(vars.get('anna.language'),'en','language picked by right click must persist in shared PVAR');
answer=11;vars.set('anna.chrome.hidden','1');i18n.on_mouse_lbtn_up(13,15);
assert(actions.includes('PVAR:TOGGLE:anna.chrome.hidden'));
answer=12;i18n.on_mouse_lbtn_up(13,15);assert(actions.includes('MENUBAR:toggle'));
for(const path of ['js/anna_top_chrome.js','js/anna_nav_tabs.js','js/playlist_browser.js','js/anna_lyrics.js',
 'js/anna_search.js','js/anna_queue.js','js/anna_desktop_lyrics.js','js/anna_transport.js','js/anna_glass_playlist.js']){
 assert(read(path).includes("include('anna_i18n.js')"),path+' must use common language dictionary');
}
const footer=read('main.txt'),ini=read('foo_ui_panels.ini');
assert(footer.includes('$panel(TopChrome,JS Panel,'));
assert(!/\$panel\(TopChrome(?:None|Sys|Mb|Both),/.test(footer));
assert.equal((footer.match(/\$panel\(TopChrome,JS Panel,/g)||[]).length,1);
assert(ini.includes('pvar.once.anna.language = auto'));
assert(footer.includes('$getpvar(anna.language.shown)')); // Round 21: resolved language
const side=read('js/playlist_browser.js');
assert(!side.includes('function confirmDeletePlaylist'));
assert(!side.includes('confirmDeletePlaylist('));
assert(!side.includes("menu.AppendMenuItem(0,5,"));
assert(!side.includes('cmd===5&&editablePlaylistRow'));
assert(side.includes('plman[remove](p)'));
const glass=read('js/anna_glass_playlist.js');
assert(glass.includes("AnnaI18n.t('removeSelected')"));
assert(glass.includes('plman.RemovePlaylistSelection(p,false)'));
for(const path of ['anna_mode_switch.js','anna_desktop_lyrics.js','anna_queue_toggle.js']){
 const s=read('js/'+path)+read('js/anna_theme.js'); // Phase D2: shared palette lives in AnnaTheme
 for(const color of ['0xff93547d','0xff43334f','0xffffc8e7','0xffd9b2d2','0xffffe9f5','0xffd8cbdf'])
 assert(s.includes(color),`${path} missing ${color}`);
}
const trans=read('js/anna_transport.js'),gen=read('tools/generate_controls.py');
assert(trans.includes('ORDER_LABELS='));
assert(!trans.includes('order_shuffle_folders'));
assert(!gen.includes("write('order_shuffle_folders'"));
assert(!existsSync(root+'/images/controls/pink/order_shuffle_folders.png'));
assert(gen.includes('>5s</text>'));
assert.equal(readdirSync(root+'/images/controls/pink').filter(x=>x.endsWith('.png')).length,20); // 16 controls + 4 corners (Round 22)
assert(/on_mouse_rbtn_up\(x,y\)/.test(trans));
assert(read('js/anna_top_chrome.js').includes('on_mouse_rbtn_up(x,y)'));
console.log('PASS Round9: 5 locale modes, common i18n menu, dedicated settings click and context menu, no duplicate SYS/MB, direct playlist delete, centre-only track removal, solid unified switch colours, hidden native folder shuffle, 16 controls and 5s assets');
