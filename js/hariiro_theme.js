// Hariiro accent palette. Controls use the same saved Panels UI variable.
// SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
// Round 22: an accent colour is a folder in <skin>\images\controls\ (with play.png), named
// by the folder, like wallpapers. It holds the control and corner images; theme.json gives
// {"hue": 0-359, "accent": "r-g-b"}. Without theme.json the colour is taken from play.png.
// Saved: hariiro.theme.hue = folder, hariiro.theme.degree = hue, hariiro.accent = accent.
// The pink folder (hue 326) is the base palette every colour below is written in.
'use strict';
var HariiroTheme=(function(){
 const BASE='pink',BASE_HUE=326,SPREAD=0.3;
 // The bundled folders (also used before a scan, or when the skin folder is unknown).
 const PRESETS=Object.freeze([
  {id:'amber',label:'amber',accent:'255-196-122',hue:36},
  {id:'blue',label:'blue',accent:'118-183-255',hue:211},
  {id:'mint',label:'mint',accent:'132-226-170',hue:150},
  {id:'pink',label:'pink',accent:'249-165-210',hue:326},
  {id:'teal',label:'teal',accent:'118-224-213',hue:174},
  {id:'violet',label:'violet',accent:'190-151-255',hue:278}
 ].map(Object.freeze));
 const byId=Object.fromEntries(PRESETS.map(p=>[p.id,p]));
 const VALID=/^[^\\/:*?"<>|.][^\\/:*?"<>|]{0,63}$/;
 function variable(key,fallback){try{return String(panelsui.GetVariable(key,fallback)||'');}catch(e){return '';}}
 // 'rose' was the pink folder's id before Round 22.
 function selected(){const s=variable('hariiro.theme.hue',BASE);if(!s||s==='rose'||!VALID.test(s))return BASE;return s;}
 function folder(){return selected();}
 function hue(){
  const d=Number(variable('hariiro.theme.degree',''));
  if(variable('hariiro.theme.degree','')!==''&&isFinite(d))return ((Math.round(d)%360)+360)%360;
  const p=byId[selected()];return p?p.hue:BASE_HUE;
 }
 // Round 27: interface tone. 'light' (published by the title-bar panel for light wallpapers,
 // or chosen in the ☰ menu) mirrors every colour's lightness; 'dark' is the original palette.
 function tone(){return variable('hariiro.tone','dark')==='light'?'light':'dark';}
 // Round 28: Panels UI variables after which every themed panel repaints (hue, tone, light icons).
 const LOOK_VARIABLES=Object.freeze(['hariiro.theme.hue','hariiro.theme.degree','hariiro.tone','hariiro.controls.light']);
 function isLookVariable(name){return LOOK_VARIABLES.includes(String(name));}
 function key(){return selected()+'@'+hue()+'@'+tone();}
 // Folder the panels load control images from: <colour>/light/ while the title-bar panel says
 // the colour has light images and the tone is light (hariiro.controls.light, also main.txt).
 function controlsFolder(){
  const sub=tone()==='light'&&variable('hariiro.controls.light','')==='light/'?'light/':'';
  return '../images/controls/'+folder()+'/'+sub;
 }
 // theme: {id, hue, accent} from scan(), or the id of a bundled folder.
 function set(theme){
  const t=typeof theme==='string'?byId[theme]:theme;
  if(!t||!VALID.test(String(t.id))||!isFinite(Number(t.hue)))return false;
  try{
   panelsui.SetVariable('hariiro.theme.hue',String(t.id));
   panelsui.SetVariable('hariiro.theme.degree',String(Math.round(Number(t.hue))));
   if(/^\d{1,3}-\d{1,3}-\d{1,3}$/.test(String(t.accent)))panelsui.SetVariable('hariiro.accent',String(t.accent));
  }catch(e){return false;}
  cachedHue=-1;cached.clear();return true;
 }
 function hsv(r,g,b){const mx=Math.max(r,g,b),d=mx-Math.min(r,g,b);
  let h=d===0?0:mx===r?((g-b)/d+6)%6:mx===g?(b-r)/d+2:(r-g)/d+4;return {h:h*60,s:mx===0?0:d/mx,v:mx/255};}
 // The most frequent clearly coloured colour of an image (foo_js_panel GetColourSchemeJSON).
 function fromImage(path){
  let img=null;
  try{
   img=gdi.Image(path);if(!img||typeof img.GetColourSchemeJSON!=='function')return null;
   const list=JSON.parse(img.GetColourSchemeJSON(12))||[];
   list.sort((a,b)=>(b.freq||0)-(a.freq||0));
   for(const c of list){
    const col=Number(c.col)>>>0,r=(col>>>16)&255,g=(col>>>8)&255,b=col&255,x=hsv(r,g,b);
    if(x.s>=0.25&&x.v>=0.35)return {hue:Math.round(x.h)%360,accent:r+'-'+g+'-'+b};
   }
  }catch(e){console.log('Hariiro theme colour: '+String(e));}
  finally{try{if(img&&typeof img.Dispose==='function')img.Dispose();}catch(e){}}
  return null;
 }
 function readMeta(dir){
  try{
   if(!utils.IsFile(dir+'theme.json'))return null;
   const m=JSON.parse(utils.ReadTextFile(dir+'theme.json'));
   const h=Number(m&&m.hue);if(!isFinite(h))return null;
   return {hue:((Math.round(h)%360)+360)%360,accent:/^\d{1,3}-\d{1,3}-\d{1,3}$/.test(String(m.accent))?String(m.accent):''};
  }catch(e){console.log('Hariiro theme.json: '+String(e));return null;}
 }
 // Colours in <skinDir>images\controls\, by folder name. Empty when the folder cannot be read.
 function scan(skinDir){
  const BS='\\',root=String(skinDir||'')+'images'+BS+'controls'+BS,out=[];
  if(!skinDir)return out;
  let dirs=[];
  try{dirs=utils.Glob(root+'*',0,0x10)||[];}catch(e){console.log('Hariiro theme scan: '+String(e));}
  for(const d of dirs){
   const name=String(d).replace(/[\\/]+$/,'').split(/[\\/]/).pop();
   if(!VALID.test(name))continue;
   const dir=root+name+BS;
   try{if(!utils.IsFile(dir+'play.png'))continue;}catch(e){continue;}
   const meta=readMeta(dir)||(byId[name]?{hue:byId[name].hue,accent:byId[name].accent}:null)||fromImage(dir+'play.png')||{hue:BASE_HUE,accent:''};
   out.push({id:name,label:name,hue:meta.hue,accent:meta.accent||byId[BASE].accent});
  }
  out.sort((a,b)=>a.id.toLowerCase().localeCompare(b.id.toLowerCase()));
  return out;
 }
 function fromHsv(a,h,s,v){
  const h6=(((h%360)+360)%360)/60,c=v*s,x=c*(1-Math.abs(h6%2-1)),m=v-c;
  const t=h6<1?[c,x,0]:h6<2?[x,c,0]:h6<3?[0,c,x]:h6<4?[0,x,c]:h6<5?[x,0,c]:[c,0,x];
  return ((a<<24)|(Math.round((t[0]+m)*255)<<16)|(Math.round((t[1]+m)*255)<<8)|Math.round((t[2]+m)*255))>>>0;
 }
 // Colours main.txt draws itself (frames, lines, labels). It reads each one recoloured from
 // the panel variable hariiro.tc.<r-g-b>, which TopChrome publishes (layoutColor).
 const LAYOUT_COLORS=Object.freeze(['234-172-197','236-184-177','239-170-200','245-190-213','249-183-211',
  '249-220-217','249-220-235','250-181-211','251-173-207','252-146-204','253-216-227','253-228-240',
  '255-160-211','255-232-246','220-165-187','226-173-197','58-20-59','229-214-231',
  // Round 27: the glass fills and grey text, unchanged by the accent but mirrored by the light tone.
  '24-25-30','9-14-28','15-24-49','18-26-49','10-20-42','20-25-50','198-198-220']);
 function layoutColor(c){
  const p=String(c).split('-').map(Number);if(p.length!==3||p.some(n=>!(n>=0&&n<=255)))return String(c);
  const out=recolor((0xff000000|(p[0]<<16)|(p[1]<<8)|p[2])>>>0);
  return ((out>>>16)&255)+'-'+((out>>>8)&255)+'-'+(out&255);
 }
 let cachedHue=-1,cached=new Map();
 function recolor(argb){const target=hue(),light=tone()==='light';
  if((target===BASE_HUE&&!light)||typeof argb!=='number')return argb;
  const k=target+(light?'L':'D');
  if(k!==cachedHue){cachedHue=k;cached.clear();}if(cached.has(argb))return cached.get(argb);
  let out=target===BASE_HUE?argb:shift(argb,target);
  if(light)out=frost(lighten(out));
  cached.set(argb,out);return out;
 }
 // Round 27: translucent glass that turned pale is made LIGHT_FROST times as opaque, so a busy
 // light wallpaper does not show through rows and cards as much (dark text on it). Images
 // (tools/make_light_controls.py) keep their alpha.
 const LIGHT_FROST=1.5;
 function frost(argb){
  const a=(argb>>>24)&255;if(a===0||a===255)return argb;
  const r=(argb>>>16)&255,g=(argb>>>8)&255,b=argb&255;
  if((Math.max(r,g,b)+Math.min(r,g,b))/510<0.6)return argb;
  return ((Math.min(255,Math.round(a*LIGHT_FROST))<<24)|(argb&0xffffff))>>>0;
 }
 // Round 27: the light tone (also tools/make_light_controls.py, so the icons match). HSL
 // lightness is mirrored (pale text turns dark, dark glass turns pale) and kept between
 // LIGHT_MIN and LIGHT_MAX; hue, saturation and alpha stay.
 const LIGHT_MIN=0.12,LIGHT_MAX=0.96;
 function lighten(argb){
  const a=(argb>>>24)&255,r=((argb>>>16)&255)/255,g=((argb>>>8)&255)/255,b=(argb&255)/255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;
  let h=0,s=0;
  if(d>0){s=d/(1-Math.abs(2*l-1));h=mx===r?((g-b)/d+6)%6:mx===g?(b-r)/d+2:(r-g)/d+4;}
  const L=Math.min(LIGHT_MAX,Math.max(LIGHT_MIN,1-l)),C=(1-Math.abs(2*L-1))*Math.min(1,s),X=C*(1-Math.abs(h%2-1)),m=L-C/2;
  const t=h<1?[C,X,0]:h<2?[X,C,0]:h<3?[0,C,X]:h<4?[0,X,C]:h<5?[X,0,C]:[C,0,X];
  return ((a<<24)|(Math.round((t[0]+m)*255)<<16)|(Math.round((t[1]+m)*255)<<8)|Math.round((t[2]+m)*255))>>>0;
 }
 // Round 27: 'light' or 'dark' for a wallpaper image (gdi.Image): the frequency-weighted luma of
 // its colour scheme, from a small copy when the host can resize. null when it cannot be read.
 const LIGHT_WALLPAPER=0.5;
 function wallpaperTone(img){
  if(!img)return null;
  let small=null;
  try{
   try{small=typeof img.Resize==='function'?img.Resize(64,36):null;}catch(e){small=null;}
   const list=JSON.parse((small||img).GetColourSchemeJSON(24))||[];
   let sum=0,weight=0;
   for(const c of list){
    const col=Number(c.col)>>>0,w=Number(c.freq)||0;
    sum+=w*(0.2126*((col>>>16)&255)+0.7152*((col>>>8)&255)+0.0722*(col&255))/255;weight+=w;
   }
   if(!(weight>0))return null;
   return sum/weight>=LIGHT_WALLPAPER?'light':'dark';
  }catch(e){console.log('Hariiro wallpaper tone: '+String(e));return null;}
  finally{try{if(small&&small!==img&&typeof small.Dispose==='function')small.Dispose();}catch(e){}}
 }
 // The one recolouring rule (also tools/make_accent_palette.py, so pictures match):
 //  - any pink / rose / violet / purple tint (hue 255-360, spread >= 6) - dark, pale or vivid -
 //    moved to the target hue, keeping 30 % of its distance from pink (326) (SPREAD), so tints
 //    stay near the target instead of crossing into other colours;
 //  - warm peach / gold frames (hue 0-50, red >= 120, spread >= 22) take the target hue;
 //  saturation and brightness are kept; greys, whites and the blue glass tones stay.
 // Round 22 widened the first range (it skipped dark and pale tints) and fixed saturation.
 function shift(argb,target){
  const a=(argb>>>24)&255,r=(argb>>>16)&255,g=(argb>>>8)&255,b=argb&255;
  const mx=Math.max(r,g,b),d=mx-Math.min(r,g,b);
  if(d<6)return argb;
  const h=(mx===r?((g-b)/d+6)%6:mx===g?(b-r)/d+2:(r-g)/d+4)*60,s=d/mx,v=mx/255;
  if(h>=255&&h<=360)return fromHsv(a,target+(h-BASE_HUE)*SPREAD,s,v);
  if(r===mx&&h<=50&&r>=120&&d>=22)return fromHsv(a,target,s,v);
  return argb;
 }
 const colorIndex={FillSolidRect:4,FillRoundRect:6,DrawRoundRect:7,DrawRect:5,DrawLine:5,FillEllipse:4,DrawEllipse:5,GdiDrawText:2,DrawString:2,FillPolygon:0,DrawPolygon:0};
 function graphics(gr){if(hue()===BASE_HUE&&tone()!=='light')return gr;return new Proxy(gr,{get(target,key){const v=target[key];if(typeof v!=='function')return v;const index=colorIndex[key];if(index===undefined)return (...args)=>v.apply(target,args);return (...args)=>{if(typeof args[index]==='number')args[index]=recolor(args[index]);return v.apply(target,args);};}});}
 // Colours used by more than one panel, in the pink base palette (graphics() recolours
 // them for the other accents like every other colour). Panels must not keep copies.
 const COLORS=Object.freeze({
  // QUEUE and DESK pills (Round 28: the GLASS/NATIVE switch was removed).
  switchActiveBg:0xff93547d,switchIdleBg:0xff43334f,
  switchActiveFrame:0xffffc8e7,switchIdleFrame:0xffd9b2d2,
  switchActiveKnob:0xffffe9f5,switchIdleKnob:0xffd8cbdf,
  switchGlow:0x74ff8fc6,switchActiveHalo:0x99ffd2eb,switchIdleHalo:0x779ca0b4,
  // Rows of the sidebar and the middle list (Stage 3I).
  rowNormal:0x41121d38,rowHover:0x48324667,rowFrame:0x58a4afcb,rowGlow:0x48ff9fd0
 });
 // The pill switch with its knob at the right (active) or left end.
 function paintSwitch(gr,w,h,active,hover){
  const C=COLORS,cy=Math.round(h/2),cx=active?w-11:11;
  gr.FillRoundRect(2,2,w-5,h-5,9,9,active?C.switchActiveBg:C.switchIdleBg);
  gr.DrawRoundRect(2,2,w-5,h-5,9,9,1,active||hover?C.switchActiveFrame:C.switchIdleFrame);
  if(active)gr.DrawRoundRect(1,1,w-3,h-3,10,10,1,C.switchGlow);
  gr.FillEllipse(cx-8,cy-8,16,16,active?C.switchActiveHalo:C.switchIdleHalo);
  gr.FillEllipse(cx-7,cy-7,14,14,active?C.switchActiveKnob:C.switchIdleKnob);
 }
 return {PRESETS,BASE,LAYOUT_COLORS,selected,folder,hue,key,tone,isLookVariable,controlsFolder,set,scan,recolor,lighten,wallpaperTone,layoutColor,graphics,COLORS,paintSwitch};
})();
