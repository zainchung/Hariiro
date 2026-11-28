// Hariiro titlebar: a single hamburger settings menu, minimize, maximize and exit.
// SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
'use strict';
include('hariiro_shared.js');
include('hariiro_i18n.js');
include('hariiro_theme.js');
const T=k=>HariiroI18n.t(k);
const LINE=0xffefd9e9,HOT=0xffffafda;
const X=[8,56,103,148], W=[38,38,38,35];
let hover=-1;
function hit(x){return X.findIndex((v,i)=>x>=v&&x<v+W[i]);}
function runAction(key){try{return panelsui.RunAction(key)===true;}catch(e){console.log('Hariiro action: '+String(e));return false;}}
function windowAction(kind){
 try{const w=new ActiveXObject('UIWizard');
  if(kind==='min'&&typeof w.WindowMinimize==='function'){w.WindowMinimize();return;}
  if(kind==='max'&&typeof w.ToggleMaximize==='function'){w.ToggleMaximize();return;}
 }catch(e){console.log('Hariiro window: '+String(e));}
 try{fb.ShowPopupMessage(T('missingScriptWindowControl'),'Hariiro');}catch(e){}
}
// Round 19: wallpaper choice. Images live in <skin>\images\wallpapers\; the value is
// relative to images\ (main.txt and background.image_pvar in foo_ui_panels.ini read it).
// Round 21: every image there is a peer, listed by file name. Hariiro_UI_2560x1440.png (Round 22) is only the file
// main.txt and new installs start with; once deleted it is gone from the menu like any other.
const DEFAULT_WALLPAPER='wallpapers/Hariiro_UI_2560x1440.png';
const SKIN_NAMES=['Hariiro']; // fallback when utils.Glob cannot list folders
const BS='\\';
function skinFolder(){
 try{
  const root=String(fb.ProfilePath||'').replace(/[\\/]+$/,'')+BS+'foo_ui_panels-skins'+BS;
  let dirs=[];
  try{dirs=utils.Glob(root+'*',0,0x10)||[];}catch(e){} // folders, where the host supports masks
  for(const d of [...dirs.map(String),...SKIN_NAMES.map(n=>root+n)]){
   const dir=d.replace(/[\\/]+$/,'')+BS;
   if(utils.IsFile(dir+'js'+BS+'hariiro_top_chrome.js'))return dir;
  }
 }catch(e){console.log('Hariiro wallpaper: '+String(e));}
 return '';
}
function wallpaperChoices(){
 const out=[];
 const skin=skinFolder();if(!skin)return out;
 let found=[];
 try{found=utils.Glob(skin+'images'+BS+'wallpapers'+BS+'*')||[];}catch(e){console.log('Hariiro wallpaper: '+String(e));}
 const names=found.map(p=>String(p).split(/[\\/]/).pop())
  .filter(n=>/^[^\\/:*?"<>|]+\.(jpe?g|png|bmp)$/i.test(n));
 names.sort((x,y)=>x.toLowerCase().localeCompare(y.toLowerCase()));
 for(const n of names)out.push({file:'wallpapers/'+n,label:n.replace(/\.[^.]+$/,'')});
 return out;
}
// The saved choice must be an existing image: a deleted file, or wallpaper.jpg saved by
// builds before Round 21, moves to Hariiro_UI_2560x1440.png if it exists, else to the first image.
// Nothing is written when the folder cannot be read or is empty.
function ensureWallpaper(choices){
 try{
  if(!choices.length)return;
  const now=currentWallpaper().toLowerCase();
  if(choices.some(w=>w.file.toLowerCase()===now))return;
  const pick=choices.find(w=>w.file.toLowerCase()===DEFAULT_WALLPAPER.toLowerCase())||choices[0];
  panelsui.SetVariable(HariiroShared.PVAR.wallpaper,pick.file);
 }catch(e){console.log('Hariiro wallpaper: '+String(e));}
}
ensureWallpaper(wallpaperChoices());
// Round 21: main.txt draws a few labels itself and cannot resolve "auto"; publish the
// language the skin actually shows. Written on load and whenever the setting changes.
function publishLanguage(){
 try{const shown=HariiroI18n.current();
  if(String(panelsui.GetVariable(HariiroShared.PVAR.languageShown,''))!==shown)panelsui.SetVariable(HariiroShared.PVAR.languageShown,shown);
 }catch(e){console.log('Hariiro language: '+String(e));}
}
publishLanguage();
// Round 22: accent colours are the folders in images\controls (HariiroTheme.scan). The saved one
// must exist, and its hue / accent are published for the other panels and main.txt.
function colourChoices(){const list=HariiroTheme.scan(skinFolder());return list.length?list:[...HariiroTheme.PRESETS];}
function ensureTheme(list){
 try{
  if(!list.length)return;
  const now=HariiroTheme.selected().toLowerCase();
  const pick=list.find(t=>t.id.toLowerCase()===now)||list.find(t=>t.id===HariiroTheme.BASE)||list[0];
  const saved=String(panelsui.GetVariable(HariiroShared.PVAR.themeHue,''));
  const stale=saved!==pick.id||String(panelsui.GetVariable(HariiroShared.PVAR.themeDegree,''))!==String(pick.hue)||
   String(panelsui.GetVariable(HariiroShared.PVAR.themeAccent,''))!==pick.accent;
  if(stale&&HariiroTheme.set(pick)){try{window.NotifyOthers('Hariiro.ThemeChanged',pick.id);}catch(e){}}
 }catch(e){console.log('Hariiro theme: '+String(e));}
 publishLayoutColors();
}
// Round 22: main.txt draws frames, lines and labels itself; it reads each colour recoloured
// for the accent from hariiro.tc.<base r-g-b>. Only changed values are written.
function publishLayoutColors(){
 try{
  for(const c of HariiroTheme.LAYOUT_COLORS){
   const key=HariiroShared.PVAR.themeColorPrefix+c,value=HariiroTheme.layoutColor(c);
   if(String(panelsui.GetVariable(key,''))!==value)panelsui.SetVariable(key,value);
  }
 }catch(e){console.log('Hariiro layout colours: '+String(e));}
}
ensureTheme(colourChoices());
function currentWallpaper(){
 try{return String(panelsui.GetVariable(HariiroShared.PVAR.wallpaper,DEFAULT_WALLPAPER)||DEFAULT_WALLPAPER);}
 catch(e){return DEFAULT_WALLPAPER;}
}
// Only a file from wallpaperChoices() is accepted.
function setWallpaper(file){
 if(!wallpaperChoices().some(w=>w.file===file))return false;
 try{panelsui.SetVariable(HariiroShared.PVAR.wallpaper,file);}catch(e){return false;}
 applyTone();return true;
}
// Round 27: interface tone. The owner picks Automatic (default), Dark or Light in the ☰ menu;
// Automatic reads the wallpaper's brightness once per file (cached in hariiro.tone.auto).
// The tone shown is published as hariiro.tone, with hariiro.controls.light for main.txt and the
// control images, and the recoloured main.txt colours.
const TONE_MODES=['auto','dark','light'];
function toneMode(){try{const m=String(panelsui.GetVariable(HariiroShared.PVAR.toneMode,'auto'));return TONE_MODES.includes(m)?m:'auto';}catch(e){return 'auto';}}
function autoTone(){
 const file=currentWallpaper();
 try{
  const cached=String(panelsui.GetVariable(HariiroShared.PVAR.toneAuto,'')||'');
  const bar=cached.lastIndexOf('|');
  if(bar>0&&cached.slice(0,bar)===file&&/^(light|dark)$/.test(cached.slice(bar+1)))return cached.slice(bar+1);
 }catch(e){}
 const skin=skinFolder();if(!skin)return 'dark';
 let img=null,t=null;
 try{img=gdi.Image(skin+'images'+BS+file.replace(/\//g,BS));t=HariiroTheme.wallpaperTone(img);}
 catch(e){console.log('Hariiro wallpaper tone: '+String(e));}
 finally{try{if(img&&typeof img.Dispose==='function')img.Dispose();}catch(e){}}
 if(!t)return 'dark';
 try{panelsui.SetVariable(HariiroShared.PVAR.toneAuto,file+'|'+t);}catch(e){}
 return t;
}
function hasLightImages(){
 const skin=skinFolder();if(!skin)return false;
 try{return !!utils.IsFile(skin+'images'+BS+'controls'+BS+HariiroTheme.folder()+BS+'light'+BS+'play.png');}catch(e){return false;}
}
function applyTone(){
 const mode=toneMode(),t=mode==='auto'?autoTone():mode;
 let changed=false;
 try{
  const sub=t==='light'&&hasLightImages()?'light/':'';
  // The icon folder first: panels repaint on the tone and must then find both values.
  if(String(panelsui.GetVariable(HariiroShared.PVAR.controlsLight,''))!==sub){panelsui.SetVariable(HariiroShared.PVAR.controlsLight,sub);changed=true;}
  if(String(panelsui.GetVariable(HariiroShared.PVAR.tone,''))!==t){panelsui.SetVariable(HariiroShared.PVAR.tone,t);changed=true;}
 }catch(e){console.log('Hariiro tone: '+String(e));}
 publishLayoutColors();
 if(changed){try{window.NotifyOthers('Hariiro.ThemeChanged',HariiroTheme.key());}catch(e){}}
 return t;
}
function setToneMode(mode){
 if(!TONE_MODES.includes(mode))return false;
 try{panelsui.SetVariable(HariiroShared.PVAR.toneMode,mode);}catch(e){return false;}
 applyTone();return true;
}
applyTone();
// Round 26: the last menu entry opens the project's public releases in the default browser.
// A fixed address only; utils.Run (JS Panel 1.9.2) goes through ShellExecute.
const RELEASES_URL='https://github.com/zainchung/Hariiro/releases';
function openReleases(){
 try{
  if(typeof utils.Run==='function'&&utils.Run(RELEASES_URL)!==false)return true;
  if(typeof ActiveXObject==='function'){new ActiveXObject('WScript.Shell').Run(RELEASES_URL,1,false);return true;}
 }catch(e){console.log('Hariiro releases: '+String(e));}
 try{fb.ShowPopupMessage(RELEASES_URL,'Hariiro');}catch(e){}
 return false;
}
function chromeFlag(key){try{return String(panelsui.GetVariable(key,'0'))==='1';}catch(e){return false;}}
function settingsMenu(x,y){
 const menu=window.CreatePopupMenu(),language=window.CreatePopupMenu(),colors=window.CreatePopupMenu(),walls=window.CreatePopupMenu();
 const hidden=chromeFlag(HariiroShared.PVAR.chromeHidden),mb=chromeFlag('menubar');
 menu.AppendMenuItem(0,16,T('miniPlayer')); // Round 28: Panels UI mini mode (mini.size in the ini)
 menu.AppendMenuSeparator();
 menu.AppendMenuItem(0,11,T(hidden?'showtitle':'hidetitle'));
 menu.AppendMenuItem(0,12,T(mb?'hidemenu':'showmenu'));
 menu.AppendMenuSeparator();
 menu.AppendMenuItem(0,13,T('preferences'));
 menu.AppendMenuItem(0,14,T('foobarMenu'));
 menu.AppendMenuSeparator();
 // Round 21: nine languages, each by its own name, in the owner's reference order.
 const langs=['auto','en','es','pt','zh-CN','zh-TW','ja','fr','de','ru'];
 const chosen=HariiroI18n.mode();
 for(let i=0;i<langs.length;i++)language.AppendMenuItem(0,200+i,(chosen===langs[i]?'✓ ':'   ')+
  (langs[i]==='auto'?T('auto'):HariiroI18n.nativeName(langs[i])));
 language.AppendTo(menu,0,T('language'));
 const colours=colourChoices();
 ensureTheme(colours); // folders may have been added or deleted while foobar2000 runs
 const activeHue=HariiroTheme.selected().toLowerCase();
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
 const tones=window.CreatePopupMenu(),mode=toneMode(),toneKeys={auto:'toneAuto',dark:'toneDark',light:'toneLight'};
 for(let i=0;i<TONE_MODES.length;i++)tones.AppendMenuItem(0,400+i,(mode===TONE_MODES[i]?'✓ ':'   ')+T(toneKeys[TONE_MODES[i]]));
 tones.AppendTo(menu,0,T('tone'));
 menu.AppendMenuSeparator();
 menu.AppendMenuItem(0,15,T('githubReleases'));
 const cmd=menu.TrackPopupMenu(x,y);
 if(cmd===11)runAction('PVAR:TOGGLE:'+HariiroShared.PVAR.chromeHidden);
 else if(cmd===12)runAction('MENUBAR:toggle');
 else if(cmd===13)runAction('PREFERENCES');
 else if(cmd===14)runAction('MENU');
 else if(cmd===15)openReleases();
 else if(cmd===16)runAction('MINIMODE:TOGGLE');
 else if(cmd>=200&&cmd<200+langs.length){HariiroI18n.change(langs[cmd-200]);publishLanguage();}
 else if(cmd>=400&&cmd<400+TONE_MODES.length)setToneMode(TONE_MODES[cmd-400]); // after the 60 wallpaper ids
 else if(cmd>=300&&cmd<300+Math.min(60,wallpapers.length))setWallpaper(wallpapers[cmd-300].file);
 else if(cmd>=230&&cmd<230+Math.min(60,colours.length)){
  if(HariiroTheme.set(colours[cmd-230])){
   applyTone(); // the new colour may have no light/ images; also publishes the colours
   try{window.NotifyOthers('Hariiro.ThemeChanged',HariiroTheme.selected());}catch(e){}
  }
 }
 window.Repaint();return true;
}
// Round 22: the power button looked rough (9° straight segments, and this windowless panel
// draws without antialiasing - SetSmoothingMode on its gr has no effect). It is drawn once per
// look at 2x size, antialiased, into a bitmap that is scaled down onto the button area.
const POWER_SS=2,POWER_H=32,powerLooks=new Map();
function powerBitmap(w,over){
 const key=w+'|'+(over?1:0)+'|'+HariiroTheme.key();
 if(powerLooks.has(key))return powerLooks.get(key);
 let img=null;
 try{
  img=gdi.CreateImage(w*POWER_SS,POWER_H*POWER_SS);
  const raw=img.GetGraphics();
  try{
   raw.SetSmoothingMode(4); // SmoothingModeAntiAlias
   const g=HariiroTheme.graphics(raw),S=POWER_SS,cx=w/2*S,cy=16*S,red=over?0xffff829d:0xffe5a6bd;
   g.DrawRoundRect(1*S,4*S,(w-3)*S,25*S,8*S,8*S,1*S,over?0xffff859a:0xa8e9a2b6);
   let last=null;
   for(let deg=-38;deg<=218;deg+=2){const a=deg*Math.PI/180,p={x:cx+7*S*Math.cos(a),y:cy+7*S*Math.sin(a)};if(last)g.DrawLine(last.x,last.y,p.x,p.y,2*S,red);last=p;}
   g.DrawLine(cx,cy-10*S,cx,cy-1*S,2.2*S,red);
  }finally{img.ReleaseGraphics(raw);}
 }catch(e){console.log('Hariiro power button: '+String(e));img=null;}
 for(const [k,v] of powerLooks)if(k.startsWith(w+'|'+(over?1:0)+'|')){try{v&&v.Dispose();}catch(e){}powerLooks.delete(k);} // old accent
 powerLooks.set(key,img);return img;
}
function drawPower(gr,x,w,over){
 const img=powerBitmap(w,over);
 if(img){gr.DrawImage(img,x,0,w,POWER_H,0,0,img.Width,img.Height);return;}
 // Fallback without bitmaps: the plain vector glyph.
 const cx=x+w/2,cy=16,red=over?0xffff829d:0xffe5a6bd;
 gr.DrawRoundRect(x+1,4,w-3,25,8,8,1,over?0xffff859a:0xa8e9a2b6);
 let last=null;
 for(let deg=-38;deg<=218;deg+=2){const a=deg*Math.PI/180,p={x:cx+7*Math.cos(a),y:cy+7*Math.sin(a)};if(last)gr.DrawLine(last.x,last.y,p.x,p.y,2,red);last=p;}
 gr.DrawLine(cx,cy-10,cx,cy-1,2.2,red);
}
function on_paint(gr){
 gr=HariiroTheme.graphics(gr);
 const cy=16;
 // No frame: the hamburger and power buttons are aligned to the right card edge.
 for(let i=0;i<X.length;i++){
  const cx=X[i]+W[i]/2,over=hover===i,col=over?HOT:LINE;
  if(over){gr.FillRoundRect(X[i]+2,3,W[i]-4,26,7,7,i===3?0x907b3f56:0x654f305e);}
  if(i===0){
    // Former three-line button now owns the entire Hariiro settings menu.
    for(let d=-5;d<=5;d+=5)gr.DrawLine(cx-7,cy+d,cx+7,cy+d,1.5,col);
  }
  else if(i===1)gr.DrawLine(cx-7,cy,cx+7,cy,1.8,col);
  else if(i===2)gr.DrawRoundRect(cx-7,cy-6,14,12,2,2,1.6,col);
  else drawPower(gr,X[i],W[i],over);
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
function on_panelsui_variable_changed(name){if(name===HariiroShared.PVAR.language)publishLanguage();
 if(HariiroTheme.isLookVariable(name)||[HariiroShared.PVAR.language,HariiroShared.PVAR.chromeHidden,'menubar'].includes(name))window.Repaint();}
