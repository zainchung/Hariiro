// Hariiro: DPI adapter for real child-window JS Panels.
// SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
// Windowless panels are drawn by Panels UI in layout units and scaled by the
// host. A child window (windowless = 0, needed for correct OLE drop routing)
// gets PHYSICAL pixels instead, so at 200% everything would draw at half size.
// The panel scripts keep working in layout units; this module converts:
//   scale  = window.Width / panelsui.GetPanelRect().Width (1 when windowless)
//   on_paint gets a gr wrapper that multiplies coordinates and uses scaled fonts
//   mouse / drag callbacks get x,y divided by the scale
// window.DPI cannot be used: JS Panel's compatibility shim reports a fixed 96.
'use strict';
var HariiroDpi=(function(){
 let current=1;
 function raw(key){try{return Number(window[key])||0;}catch(e){return 0;}}
 function panelRect(){
  try{
   if(typeof panelsui==='undefined'||typeof panelsui.GetPanelRect!=='function')return null;
   const r=panelsui.GetPanelRect();
   return r&&r.Width>0&&r.Height>0?r:null;
  }catch(e){return null;}
 }
 function measure(){
  const r=panelRect(),w=raw('Width');
  if(!r||w<=0)return 1;
  const s=Math.round(w/r.Width*100)/100;
  if(!isFinite(s)||Math.abs(s-1)<0.02)return 1;
  return Math.min(4,Math.max(0.5,s));
 }
 // Re-measure (cheap); returns true when the scale changed.
 function update(){const s=measure(),changed=s!==current;current=s;return changed;}
 function scale(){return current;}
 function width(){return current===1?raw('Width'):Math.round(raw('Width')/current);}
 function height(){return current===1?raw('Height'):Math.round(raw('Height')/current);}
 const px=v=>typeof v==='number'?(current===1?v:Math.round(v*current)):v;
 const unpx=v=>typeof v==='number'&&current!==1?v/current:v;

 // Font descriptors in layout px; the real GDI font is made per scale on use.
 function font(name,size,style){
  const made=new Map();
  return Object.freeze({__hariiroFont:true,Name:name,Size:size,Style:style||0,
   real(){const s=current;if(!made.has(s))made.set(s,gdi.Font(name,Math.max(1,Math.round(size*s)),style||0));return made.get(s);}});
 }
 const realFont=f=>f&&f.__hariiroFont?f.real():f;

 // Argument positions (0-based) holding layout coordinates / sizes / pen widths.
 const COORDS={FillSolidRect:[0,1,2,3],FillGradRect:[0,1,2,3],FillRoundRect:[0,1,2,3,4,5],
  DrawRoundRect:[0,1,2,3,4,5,6],DrawRect:[0,1,2,3,4],DrawLine:[0,1,2,3,4],FillEllipse:[0,1,2,3],
  DrawEllipse:[0,1,2,3,4],GdiDrawText:[3,4,5,6],DrawString:[3,4,5,6],
  DrawImage:[1,2,3,4],GdiDrawBitmap:[1,2,3,4],GdiAlphaBlend:[1,2,3,4],
  CalcTextWidth:[],CalcTextHeight:[],MeasureString:[2,3,4,5],EstimateLineWrap:[2]};
 const FONT_ARG={GdiDrawText:1,DrawString:1,CalcTextWidth:1,CalcTextHeight:1,MeasureString:1,EstimateLineWrap:1};
 const POINTS={FillPolygon:[2],DrawPolygon:[1,2]}; // DrawPolygon: pen width, points
 function graphics(gr){
  return new Proxy(gr,{get(target,key){
   if(key===SCALED_GR)return true;
   const fn=target[key];
   if(typeof fn!=='function')return fn;
   const coords=COORDS[key],points=POINTS[key],fi=FONT_ARG[key];
   if(!coords&&!points)return (...a)=>fn.apply(target,a);
   return (...a)=>{
    if(fi!==undefined)a[fi]=realFont(a[fi]);
    if(coords)for(const i of coords)a[i]=px(a[i]);
    if(points)for(const i of points)a[i]=Array.isArray(a[i])?a[i].map(px):px(a[i]);
    const r=fn.apply(target,a);
    if(current===1)return r;
    if(key==='CalcTextWidth'||key==='CalcTextHeight')return unpx(r);
    if(key==='MeasureString'&&r)return {X:unpx(r.X),Y:unpx(r.Y),Width:unpx(r.Width),Height:unpx(r.Height),Lines:r.Lines,Chars:r.Chars};
    if(key==='EstimateLineWrap'&&r){const out=[];for(let i=0;i<r.length;i++)out.push(i%2?unpx(r[i]):r[i]);return out;}
    return r;
   };
  }});
 }
 // Wrap the panel's callbacks. A script forwarding one callback to another
 // (on_drag_enter -> on_drag_over) already passes layout units, so nested
 // pointer/drag calls are not converted twice. Host modal loops started from
 // a callback (DoDragDrop, popup menus) call back with PHYSICAL pixels, so the
 // guard is cleared while they run.
 const POINTER=['on_mouse_lbtn_down','on_mouse_lbtn_up','on_mouse_lbtn_dblclk','on_mouse_rbtn_down',
  'on_mouse_rbtn_up','on_mouse_mbtn_down','on_mouse_mbtn_up','on_mouse_move'];
 const DRAG=['on_drag_enter','on_drag_over','on_drag_drop'];
 let depth=0;
 function hostModal(fn){const saved=depth;depth=0;try{return fn();}finally{depth=saved;}}
 function repaintRect(x,y,w,h){window.RepaintRect(px(x),px(y),Math.max(1,px(w)),Math.max(1,px(h)));}
 // gdi.CalcTextWidth outside on_paint (e.g. hit-testing a click), in layout units.
 function textWidth(text,f){
  if(typeof gdi.CalcTextWidth!=='function')return null;
  return unpx(gdi.CalcTextWidth(text,realFont(f)));
 }
 function popup(menu,x,y,...rest){return hostModal(()=>menu.TrackPopupMenu(px(x),px(y),...rest));}
 function doDragDrop(...args){return hostModal(()=>fb.DoDragDrop(...args));}
 const SCALED_GR=Symbol('hariiroDpiGraphics');
 function install(){
  const g=globalThis;
  const wrap=(name,convert,guarded)=>{
   const original=g[name];if(typeof original!=='function'||original.__hariiroDpi)return;
   const wrapped=function(...a){
    if(guarded&&depth>0)return original.apply(this,a);
    depth++;try{return original.apply(this,convert(a));}finally{depth--;}
   };
   wrapped.__hariiroDpi=true;g[name]=wrapped;
  };
  for(const n of POINTER)wrap(n,a=>{update();a[0]=unpx(a[0]);a[1]=unpx(a[1]);return a;},true);
  for(const n of DRAG)wrap(n,a=>{update();a[1]=unpx(a[1]);a[2]=unpx(a[2]);return a;},true);
  // Painting is never forwarded by the scripts: always hand it a scaling gr.
  wrap('on_paint',a=>{update();if(a[0]&&a[0][SCALED_GR]!==true)a[0]=graphics(a[0]);return a;},false);
  wrap('on_size',a=>{update();return a;},false);
  update();
 }
 return Object.freeze({update,scale,width,height,font,graphics,popup,doDragDrop,repaintRect,textWidth,install,SCALED_GR});
})();
