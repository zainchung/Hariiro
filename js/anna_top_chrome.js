// Anna Glass titlebar: a single hamburger settings menu, minimize, maximize and exit.
'use strict';
include('anna_shared.js');
include('anna_i18n.js');
include('anna_theme.js');
const T=k=>AnnaI18n.t(k);
const LINE=0xffefd9e9,HOT=0xffffafda;
const X=[8,56,103,148], W=[38,38,38,35];
let hover=-1;
function hit(x){return X.findIndex((v,i)=>x>=v&&x<v+W[i]);}
function runAction(key){try{return panelsui.RunAction(key)===true;}catch(e){console.log('Anna Glass action: '+String(e));return false;}}
function windowAction(kind){
 try{const w=new ActiveXObject('UIWizard');
  if(kind==='min'&&typeof w.WindowMinimize==='function'){w.WindowMinimize();return;}
  if(kind==='max'&&typeof w.ToggleMaximize==='function'){w.ToggleMaximize();return;}
 }catch(e){console.log('Anna Glass window: '+String(e));}
 try{fb.ShowPopupMessage(T('missingScriptWindowControl'),'Anna Glass');}catch(e){}
}
// Round 19: wallpaper choice. Images live in <skin>\images\wallpapers\; the value is
// relative to images\ (main.txt and background.image_pvar in foo_ui_panels.ini read it).
const DEFAULT_WALLPAPER='wallpapers/wallpaper.jpg'; // Round 20: all wallpapers in one folder
const LEGACY_WALLPAPER='wallpaper.jpg'; // where builds before Round 20 kept it
const SKIN_NAMES=['Anna_Glass','Anna Glass','Anna-Glass','Anna_Glass_V2','Anna-Glass-V2'];
const BS='\\';
function skinFolder(){
 try{
  const root=String(fb.ProfilePath||'').replace(/[\\/]+$/,'')+BS+'foo_ui_panels-skins'+BS;
  let dirs=[];
  try{dirs=utils.Glob(root+'*',0,0x10)||[];}catch(e){} // folders, where the host supports masks
  for(const d of [...dirs.map(String),...SKIN_NAMES.map(n=>root+n)]){
   const dir=d.replace(/[\\/]+$/,'')+BS;
   if(utils.IsFile(dir+'js'+BS+'anna_top_chrome.js'))return dir;
  }
 }catch(e){console.log('Anna wallpaper: '+String(e));}
 return '';
}
function wallpaperChoices(){
 const out=[{file:DEFAULT_WALLPAPER,label:T('wallpaperDefault')}];
 const skin=skinFolder();if(!skin)return out;
 let found=[];
 try{found=utils.Glob(skin+'images'+BS+'wallpapers'+BS+'*')||[];}catch(e){console.log('Anna wallpaper: '+String(e));}
 const names=found.map(p=>String(p).split(/[\\/]/).pop())
  .filter(n=>/^[^\\/:*?"<>|]+\.(jpe?g|png|bmp)$/i.test(n));
 names.sort((x,y)=>x.toLowerCase().localeCompare(y.toLowerCase()));
 for(const n of names){
  const file='wallpapers/'+n;
  if(file.toLowerCase()!==DEFAULT_WALLPAPER)out.push({file,label:n.replace(/\.[^.]+$/,'')});
 }
 return out;
}
// A choice saved by a build before Round 20 points at images\wallpaper.jpg, which moved.
function migrateWallpaper(){
 try{if(String(panelsui.GetVariable(AnnaShared.PVAR.wallpaper,''))===LEGACY_WALLPAPER)
  panelsui.SetVariable(AnnaShared.PVAR.wallpaper,DEFAULT_WALLPAPER);}
 catch(e){console.log('Anna wallpaper: '+String(e));}
}
migrateWallpaper();
function currentWallpaper(){
 try{return String(panelsui.GetVariable(AnnaShared.PVAR.wallpaper,DEFAULT_WALLPAPER)||DEFAULT_WALLPAPER);}
 catch(e){return DEFAULT_WALLPAPER;}
}
// Only a file from wallpaperChoices() is accepted.
function setWallpaper(file){
 if(!wallpaperChoices().some(w=>w.file===file))return false;
 try{panelsui.SetVariable(AnnaShared.PVAR.wallpaper,file);return true;}catch(e){return false;}
}
function chromeFlag(key){try{return String(panelsui.GetVariable(key,'0'))==='1';}catch(e){return false;}}
function settingsMenu(x,y){
 const menu=window.CreatePopupMenu(),language=window.CreatePopupMenu(),colors=window.CreatePopupMenu(),walls=window.CreatePopupMenu();
 const hidden=chromeFlag(AnnaShared.PVAR.chromeHidden),mb=chromeFlag('menubar');
 menu.AppendMenuItem(0,11,T(hidden?'showtitle':'hidetitle'));
 menu.AppendMenuItem(0,12,T(mb?'hidemenu':'showmenu'));
 menu.AppendMenuSeparator();
 menu.AppendMenuItem(0,13,T('preferences'));
 menu.AppendMenuItem(0,14,T('foobarMenu'));
 menu.AppendMenuSeparator();
 const langs=[['auto','auto'],['zh-CN','langZhCN'],['zh-TW','langZhTW'],['ja','langJa'],['en','langEn']];
 const chosen=AnnaI18n.mode();
 for(let i=0;i<langs.length;i++)language.AppendMenuItem(0,200+i,(chosen===langs[i][0]?'✓ ':'   ')+T(langs[i][1]));
 language.AppendTo(menu,0,T('language'));
 const activeHue=AnnaTheme.selected();
 for(let i=0;i<AnnaTheme.PRESETS.length;i++){
  const item=AnnaTheme.PRESETS[i];
  colors.AppendMenuItem(0,230+i,(activeHue===item.id?'✓ ':'   ')+T(item.label));
 }
 colors.AppendTo(menu,0,T('theme'));
 const wallpapers=wallpaperChoices(),wallNow=currentWallpaper();
 for(let i=0;i<wallpapers.length&&i<60;i++)
  walls.AppendMenuItem(0,300+i,(wallNow===wallpapers[i].file?'✓ ':'   ')+wallpapers[i].label);
 walls.AppendMenuSeparator();
 walls.AppendMenuItem(1,299,T('wallpaperHint')); // MF_GRAYED: a hint, not a command
 walls.AppendTo(menu,0,T('wallpaper'));
 const cmd=menu.TrackPopupMenu(x,y);
 if(cmd===11)runAction('PVAR:TOGGLE:'+AnnaShared.PVAR.chromeHidden);
 else if(cmd===12)runAction('MENUBAR:toggle');
 else if(cmd===13)runAction('PREFERENCES');
 else if(cmd===14)runAction('MENU');
 else if(cmd>=200&&cmd<205)AnnaI18n.change(langs[cmd-200][0]);
 else if(cmd>=300&&cmd<300+wallpapers.length)setWallpaper(wallpapers[cmd-300].file);
 else if(cmd>=230&&cmd<230+AnnaTheme.PRESETS.length){
  if(AnnaTheme.set(AnnaTheme.PRESETS[cmd-230].id)){
   try{window.NotifyOthers('Anna.ThemeChanged',AnnaTheme.selected());}catch(e){}
  }
 }
 window.Repaint();return true;
}
function on_paint(gr){
 gr=AnnaTheme.graphics(gr);
 const cy=16;
 // No frame: the hamburger and power buttons are aligned to the right card edge.
 for(let i=0;i<X.length;i++){
  const cx=X[i]+W[i]/2,over=hover===i,col=over?HOT:LINE;
  if(over){gr.FillRoundRect(X[i]+2,3,W[i]-4,26,7,7,i===3?0x907b3f56:0x654f305e);}
  if(i===0){
    // Former three-line button now owns the entire Anna Glass settings menu.
    for(let d=-5;d<=5;d+=5)gr.DrawLine(cx-7,cy+d,cx+7,cy+d,1.5,col);
  }
  else if(i===1)gr.DrawLine(cx-7,cy,cx+7,cy,1.8,col);
  else if(i===2)gr.DrawRoundRect(cx-7,cy-6,14,12,2,2,1.6,col);
  else {
    gr.DrawRoundRect(X[i]+1,4,W[i]-3,25,8,8,1,over?0xffff859a:0xa8e9a2b6);
    const red=over?0xffff829d:0xffe5a6bd;
    let last=null;
    for(let deg=-38;deg<=218;deg+=9){const a=deg*Math.PI/180,p={x:cx+7*Math.cos(a),y:cy+7*Math.sin(a)};if(last)gr.DrawLine(last.x,last.y,p.x,p.y,2,red);last=p;}
    gr.DrawLine(cx,cy-10,cx,cy-1,2.2,red);
  }
 }
}
function on_mouse_move(x){const i=hit(x);if(i!==hover){hover=i;window.Repaint();}}
function on_mouse_leave(){hover=-1;window.Repaint();}
function select(x,y){const i=hit(x);
 if(i===0)return settingsMenu(x,y);
 if(i===1)windowAction('min');
 if(i===2)windowAction('max');
 if(i===3)fb.Exit();
 return i>=0;
}
function on_mouse_lbtn_up(x,y){return select(x,y);}
function on_mouse_rbtn_up(x,y){return hit(x)===0?settingsMenu(x,y):true;}
function on_panelsui_variable_changed(name){if([AnnaShared.PVAR.language,AnnaShared.PVAR.chromeHidden,'menubar',AnnaShared.PVAR.themeHue].includes(name))window.Repaint();}
