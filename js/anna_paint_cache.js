// Anna Glass: cached drawing for the hot paint paths (Round 21).
// While music plays, Panels UI redraws the whole layout twice a second and every JS panel
// paints again. Measured on Windows: an antialiased FillRoundRect / DrawRoundRect costs
// 0.3-0.5 ms and drawing a 192 px PNG at 39 px 0.6 ms, while blitting a ready bitmap costs
// 0.03-0.1 ms. So:
//   icon(img, w, h, factor)      the image resized once to w x h layout px (factor device
//                                px per layout px; never upscaled)
//   drawIcon(gr, img, x, y, w, h, alpha, factor)
//   shape(gr, key, x, y, w, h, margin, paint)
//                                paint(g, ox, oy) draws a fixed look (round rects, lines) at
//                                (ox, oy); it runs once per key, size, DPI scale and accent
//                                into a bitmap, which is then only blitted. `margin` layout px
//                                around w x h hold glows and strokes. Keep text out of it:
//                                GDI text loses its alpha in a bitmap.
// Needs anna_theme.js; uses anna_dpi.js when the panel includes it (child windows).
'use strict';
var AnnaPaintCache=(function(){
 const MAX_SHAPES=96;
 function dispose(img){try{if(img&&typeof img.Dispose==='function')img.Dispose();}catch(e){}}
 function scale(){try{return typeof AnnaDpi!=='undefined'?AnnaDpi.scale():1;}catch(e){return 1;}}
 function accent(){try{return typeof AnnaTheme!=='undefined'?AnnaTheme.selected():'';}catch(e){return '';}}

 const resized=new WeakMap();
 function icon(img,w,h,factor){
  if(!img||!(img.Width>0)||!(img.Height>0))return null;
  const f=factor>0?factor:1;
  const W=Math.max(1,Math.round(w*f)),H=Math.max(1,Math.round(h*f));
  if(W>=img.Width&&H>=img.Height)return img;
  let sizes=resized.get(img);
  if(!sizes){sizes=new Map();resized.set(img,sizes);}
  const key=W+'x'+H;
  let copy=sizes.get(key);
  if(copy===undefined){
   try{copy=img.Resize(W,H,7);}catch(e){copy=null;} // 7: HighQualityBicubic
   sizes.set(key,copy);
  }
  return copy||img;
 }
 function drawIcon(gr,img,x,y,w,h,alpha,factor){
  const src=icon(img,w,h,factor);if(!src)return;
  gr.DrawImage(src,x,y,w,h,0,0,src.Width,src.Height,0,alpha===undefined?255:alpha);
 }

 // Least recently used first in insertion order.
 const shapes=new Map();
 let canCache=true;
 function remember(key,img){
  shapes.set(key,img);
  while(shapes.size>MAX_SHAPES){const first=shapes.keys().next().value;dispose(shapes.get(first));shapes.delete(first);}
 }
 function render(w,h,margin,s,paint){
  const img=gdi.CreateImage(Math.max(1,Math.round((w+2*margin)*s)),Math.max(1,Math.round((h+2*margin)*s)));
  const raw=img.GetGraphics();
  try{
   let g=raw;
   if(s!==1&&typeof AnnaDpi!=='undefined')g=AnnaDpi.graphics(g);
   if(typeof AnnaTheme!=='undefined')g=AnnaTheme.graphics(g);
   paint(g,margin,margin);
  }finally{img.ReleaseGraphics(raw);}
  return img;
 }
 function shape(gr,key,x,y,w,h,margin,paint){
  if(!canCache||!(w>0)||!(h>0)){paint(gr,x,y);return;}
  const s=scale(),k=key+'|'+w+'x'+h+'|'+margin+'|'+s+'|'+accent();
  let img=shapes.get(k);
  if(img===undefined){
   try{img=render(w,h,margin,s,paint);}
   catch(e){canCache=false;console.log('Anna paint cache: '+String(e));paint(gr,x,y);return;}
  }else shapes.delete(k); // re-inserted below as most recently used
  remember(k,img);
  const W=w+2*margin,H=h+2*margin;
  gr.DrawImage(img,x-margin,y-margin,W,H,0,0,img.Width,img.Height);
 }
 function clear(){for(const img of shapes.values())dispose(img);shapes.clear();}
 return Object.freeze({icon,drawIcon,shape,clear});
})();
