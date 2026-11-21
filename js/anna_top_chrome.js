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
// Round 21: every image there is a peer, listed by file name. Anna_GLASS_UI_2560x1440.png (Round 22) is only the file
// main.txt and new installs start with; once deleted it is gone from the menu like any other.
const DEFAULT_WALLPAPER='wallpapers/Anna_GLASS_UI_2560x1440.png';
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
 const out=[];
 const skin=skinFolder();if(!skin)return out;
 let found=[];
 try{found=utils.Glob(skin+'images'+BS+'wallpapers'+BS+'*')||[];}catch(e){console.log('Anna wallpaper: '+String(e));}
 const names=found.map(p=>String(p).split(/[\\/]/).pop())
  .filter(n=>/^[^\\/:*?"<>|]+\.(jpe?g|png|bmp)$/i.test(n));
 names.sort((x,y)=>x.toLowerCase().localeCompare(y.toLowerCase()));
 for(const n of names)out.push({file:'wallpapers/'+n,label:n.replace(/\.[^.]+$/,'')});
 return out;
}
// The saved choice must be an existing image: a deleted file, or wallpaper.jpg saved by
// builds before Round 21, moves to Anna_GLASS_UI_2560x1440.png if it exists, else to the first image.
// Nothing is written when the folder cannot be read or is empty.
function ensureWallpaper(choices){
 try{
  if(!choices.length)return;
  const now=currentWallpaper().toLowerCase();
  if(choices.some(w=>w.file.toLowerCase()===now))return;
  const pick=choices.find(w=>w.file.toLowerCase()===DEFAULT_WALLPAPER.toLowerCase())||choices[0];
  panelsui.SetVariable(AnnaShared.PVAR.wallpaper,pick.file);
 }catch(e){console.log('Anna wallpaper: '+String(e));}
}
ensureWallpaper(wallpaperChoices());
// Round 21: main.txt draws a few labels itself and cannot resolve "auto"; publish the
// language the skin actually shows. Written on load and whenever the setting changes.
function publishLanguage(){
 try{const shown=AnnaI18n.current();
  if(String(panelsui.GetVariable(AnnaShared.PVAR.languageShown,''))!==shown)panelsui.SetVariable(AnnaShared.PVAR.languageShown,shown);
 }catch(e){console.log('Anna language: '+String(e));}
}
publishLanguage();
// Round 22: accent colours are the folders in images\controls (AnnaTheme.scan). The saved one
// must exist, and its hue / accent are published for the other panels and main.txt.
function colourChoices(){const list=AnnaTheme.scan(skinFolder());return list.length?list:[...AnnaTheme.PRESETS];}
function ensureTheme(list){
 try{
  if(!list.length)return;
  const now=AnnaTheme.selected().toLowerCase();
  const pick=list.find(t=>t.id.toLowerCase()===now)||list.find(t=>t.id===AnnaTheme.BASE)||list[0];
  const saved=String(panelsui.GetVariable(AnnaShared.PVAR.themeHue,''));
  const stale=saved!==pick.id||String(panelsui.GetVariable(AnnaShared.PVAR.themeDegree,''))!==String(pick.hue)||
   String(panelsui.GetVariable(AnnaShared.PVAR.themeAccent,''))!==pick.accent;
  if(stale&&AnnaTheme.set(pick)){try{window.NotifyOthers('Anna.ThemeChanged',pick.id);}catch(e){}}
 }catch(e){console.log('Anna theme: '+String(e));}
 publishLayoutColors();
}
// Round 22: main.txt draws frames, lines and labels itself; it reads each colour recoloured
// for the accent from anna.tc.<base r-g-b>. Only changed values are written.
function publishLayoutColors(){
 try{
  for(const c of AnnaTheme.LAYOUT_COLORS){
   const key=AnnaShared.PVAR.themeColorPrefix+c,value=AnnaTheme.layoutColor(c);
   if(String(panelsui.GetVariable(key,''))!==value)panelsui.SetVariable(key,value);
  }
 }catch(e){console.log('Anna layout colours: '+String(e));}
}
ensureTheme(colourChoices());
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
 // Round 21: nine languages, each by its own name, in the owner's reference order.
 const langs=['auto','en','es','pt','zh-CN','zh-TW','ja','fr','de','ru'];
 const chosen=AnnaI18n.mode();
 for(let i=0;i<langs.length;i++)language.AppendMenuItem(0,200+i,(chosen===langs[i]?'✓ ':'   ')+
  (langs[i]==='auto'?T('auto'):AnnaI18n.nativeName(langs[i])));
 language.AppendTo(menu,0,T('language'));
 const colours=colourChoices();
 ensureTheme(colours); // folders may have been added or deleted while foobar2000 runs
 const activeHue=AnnaTheme.selected().toLowerCase();
 for(let i=0;i<colours.length&&i<60;i++)
  colors.AppendMenuItem(0,230+i,(activeHue===colours[i].id.toLowerCase()?'✓ ':'   ')+colours[i].label);
 colors.AppendMenuSeparator();
 colors.AppendMenuItem(1,290,T('themeHint')); // MF_GRAYED: a hint, not a command
 colors.AppendTo(menu,0,T('theme'));
 const wallpapers=wallpaperChoices();
 ensureWallpaper(wallpapers); // files may have been deleted while foobar2000 runs
 const wallNow=currentWallpaper().toLowerCase();
 for(let i=0;i<wallpapers.length&&i<60;i++)
  walls.AppendMenuItem(0,300+i,(wallNow===wallpapers[i].file.toLowerCase()?'✓ ':'   ')+wallpapers[i].label);
 if(wallpapers.length)walls.AppendMenuSeparator();
 walls.AppendMenuItem(1,299,T('wallpaperHint')); // MF_GRAYED: a hint, not a command
 walls.AppendTo(menu,0,T('wallpaper'));
 const cmd=menu.TrackPopupMenu(x,y);
 if(cmd===11)runAction('PVAR:TOGGLE:'+AnnaShared.PVAR.chromeHidden);
 else if(cmd===12)runAction('MENUBAR:toggle');
 else if(cmd===13)runAction('PREFERENCES');
 else if(cmd===14)runAction('MENU');
 else if(cmd>=200&&cmd<200+langs.length){AnnaI18n.change(langs[cmd-200]);publishLanguage();}
 else if(cmd>=300&&cmd<300+wallpapers.length)setWallpaper(wallpapers[cmd-300].file);
 else if(cmd>=230&&cmd<230+Math.min(60,colours.length)){
  if(AnnaTheme.set(colours[cmd-230])){
   publishLayoutColors();
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
function on_panelsui_variable_changed(name){if(name===AnnaShared.PVAR.language)publishLanguage();
 if([AnnaShared.PVAR.language,AnnaShared.PVAR.chromeHidden,'menubar',AnnaShared.PVAR.themeHue].includes(name))window.Repaint();}
