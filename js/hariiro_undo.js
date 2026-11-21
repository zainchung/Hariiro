// Hariiro: a short "undo" notice for destructive actions (Round 17, Phase E2).
// SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
// One pending action per panel; a newer one replaces it; it expires after DURATION ms.
// The panel draws it at its bottom edge and routes clicks to hit() / undo().
// create(repaint) uses window.SetTimeout / ClearTimeout of the including panel.
'use strict';
var HariiroUndo=(function(){
 const DURATION=8000;
 const BG=0xe8301f3f,FRAME=0xffffc6df,TEXT=0xffffe8f5,BUTTON=0xff8b3c72,BUTTON_TEXT=0xffffffff;
 function create(repaint){
  let item=null,timer=0;
  function dismiss(){
   if(timer){window.ClearTimeout(timer);timer=0;}
   item=null;
  }
  // text: what happened; restore(): puts it back (may throw; the panel reports it).
  function offer(text,restore){
   dismiss();
   item={text:String(text),restore};
   timer=window.SetTimeout(()=>{timer=0;item=null;repaint();},DURATION);
   repaint();
  }
  function active(){return !!item;}
  function text(){return item?item.text:'';}
  // Notice and button rectangles for a panel of w x h (panel coordinates).
  function box(w,h){return {x:3,y:Math.max(0,h-40),w:Math.max(20,w-7),h:34};}
  function button(w,h){const b=box(w,h),bw=Math.min(72,Math.max(40,Math.floor(b.w/3)));return {x:b.x+b.w-bw-4,y:b.y+4,w:bw,h:b.h-8};}
  const inside=(r,x,y)=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
  // 'undo' on the button, 'notice' elsewhere on the notice, '' outside or when idle.
  function hit(x,y,w,h){
   if(!item)return '';
   return inside(button(w,h),x,y)?'undo':inside(box(w,h),x,y)?'notice':'';
  }
  // Runs the pending restore once. Returns false when there was nothing to undo.
  function undo(){
   if(!item)return false;
   const it=item;dismiss();repaint();
   it.restore();
   return true;
  }
  function paint(gr,w,h,font,boldFont){
   if(!item)return;
   const b=box(w,h),u=button(w,h);
   gr.FillRoundRect(b.x,b.y,b.w,b.h,6,6,BG);
   gr.DrawRoundRect(b.x,b.y,b.w,b.h,6,6,1,FRAME);
   gr.GdiDrawText(item.text,font,TEXT,b.x+8,b.y,Math.max(10,u.x-b.x-12),b.h,0x8024);
   gr.FillRoundRect(u.x,u.y,u.w,u.h,5,5,BUTTON);
   gr.GdiDrawText(HariiroI18n.t('undo'),boldFont,BUTTON_TEXT,u.x,u.y,u.w,u.h,0x8025);
  }
  return Object.freeze({offer,dismiss,active,text,hit,undo,button,paint});
 }
 return Object.freeze({create,DURATION});
})();
