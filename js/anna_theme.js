// Anna Glass accent palette. Controls use the same saved Panels UI variable.
'use strict';
var AnnaTheme=(function(){
 const PRESETS=[
  {id:'rose',label:'themeRose',accent:'249-165-210',hue:326},
  {id:'violet',label:'themeViolet',accent:'190-151-255',hue:278},
  {id:'blue',label:'themeBlue',accent:'118-183-255',hue:211},
  {id:'teal',label:'themeTeal',accent:'118-224-213',hue:174}
 ];
 const byId=Object.fromEntries(PRESETS.map(p=>[p.id,p]));
 let cachedId='',cached=new Map();
 function selected(){try{const s=String(panelsui.GetVariable('anna.theme.hue','rose')||'rose');return byId[s]?s:'rose';}catch(e){return 'rose';}}
 function set(id){if(!byId[id])return false;
  try{panelsui.SetVariable('anna.theme.hue',id);panelsui.SetVariable('anna.glass.v2.accent',byId[id].accent);}catch(e){return false;}
  cachedId='';cached.clear();return true;
 }
 function recolor(argb){const id=selected();if(id==='rose'||typeof argb!=='number')return argb;
  if(id!==cachedId){cachedId=id;cached.clear();}if(cached.has(argb))return cached.get(argb);
  const a=(argb>>>24)&255,r=(argb>>>16)&255,g=(argb>>>8)&255,b=argb&255;
  if(r-g<16||b-g<10||r<70||r>b+100){cached.set(argb,argb);return argb;}
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  if(d<22){cached.set(argb,argb);return argb;}
  let hue=mx===r?((g-b)/d+6)%6:mx===g?(b-r)/d+2:(r-g)/d+4;hue*=60;
  if(hue<275||hue>360){cached.set(argb,argb);return argb;}
  const target=byId[id].hue;let nh=((hue+(target-326))%360+360)%360;
  const sat=(mx===0?0:d/255),v=mx/255,h6=nh/60,c=v*sat,x=c*(1-Math.abs(h6%2-1)),m=v-c;
  let v3=h6<1?[c,x,0]:h6<2?[x,c,0]:h6<3?[0,c,x]:h6<4?[0,x,c]:h6<5?[x,0,c]:[c,0,x];
  let rr=Math.round((v3[0]+m)*255),gg=Math.round((v3[1]+m)*255),bb=Math.round((v3[2]+m)*255);
  const out=((a<<24)|(rr<<16)|(gg<<8)|bb)>>>0;cached.set(argb,out);return out;
 }
 const colorIndex={FillSolidRect:4,FillRoundRect:6,DrawRoundRect:7,DrawRect:5,DrawLine:5,FillEllipse:4,DrawEllipse:5,GdiDrawText:2,DrawString:2,FillPolygon:0,DrawPolygon:0};
 function graphics(gr){if(selected()==='rose')return gr;return new Proxy(gr,{get(target,key){const v=target[key];if(typeof v!=='function')return v;const index=colorIndex[key];if(index===undefined)return (...args)=>v.apply(target,args);return (...args)=>{if(typeof args[index]==='number')args[index]=recolor(args[index]);return v.apply(target,args);};}});}
 return {PRESETS,selected,set,recolor,graphics};
})();
