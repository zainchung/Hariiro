// Hariiro: a short "undo" notice for destructive actions (Round 17, Phase E2).
// SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
// The newest action of a panel is shown at its bottom edge for DURATION ms; the panel
// draws it and routes clicks to hit() / undo().
// Round 24: every action also stays on a per-panel stack (LIMIT entries) and the panel
// name goes on a shared order (PVAR.undoOrder, newest last). Ctrl+Z in any panel calls
// keyUndo(): the newest action of the whole skin is undone, in its own panel
// (JSPANEL:<panel>:hariiro.undo -> notify(), for panels that are not the focused one).
// create(repaint) uses window.SetTimeout / ClearTimeout of the including panel.
'use strict';
var HariiroUndo=(function(){
 const DURATION=8000,LIMIT=20,ORDER_LIMIT=60,NOTIFY='hariiro.undo';
 const VK_CONTROL=0x11,VK_SHIFT=0x10,VK_MENU=0x12,VK_Z=0x5a;
 const BG=0xe8301f3f,FRAME=0xffffc6df,TEXT=0xffffe8f5,BUTTON=0xff8b3c72,BUTTON_TEXT=0xffffffff;
 // Needs include('hariiro_shared.js') first; without it (or panelsui) only the local stack works.
 function orderKey(){return typeof HariiroShared!=='undefined'?HariiroShared.PVAR.undoOrder:'';}
 function readOrder(){
  try{const k=orderKey();if(!k)return [];const o=JSON.parse(String(panelsui.GetVariable(k,'')||'[]'));
   return Array.isArray(o)?o.map(String):[];}catch(e){return [];}
 }
 function writeOrder(o){try{const k=orderKey();if(k)panelsui.SetVariable(k,JSON.stringify(o.slice(-ORDER_LIMIT)));}catch(e){}}
 function panelName(){try{return String(panelsui.PanelName||'');}catch(e){return '';}}
 // Ctrl+Z without Shift / Alt.
 function isUndoKey(key){
  try{return key===VK_Z&&!!utils.IsKeyPressed(VK_CONTROL)&&!utils.IsKeyPressed(VK_SHIFT)&&!utils.IsKeyPressed(VK_MENU);}
  catch(e){return false;}
 }
 function create(repaint){
  const owner=panelName();
  let item=null,timer=0;
  const stack=[];
  // A restarted panel has nothing to undo: forget its old entries in the shared order.
  if(owner){const o=readOrder();if(o.includes(owner))writeOrder(o.filter(n=>n!==owner));}
  function forgetOne(){
   if(!owner)return;
   const o=readOrder(),i=o.lastIndexOf(owner);
   if(i>=0){o.splice(i,1);writeOrder(o);}
  }
  // Hides the notice; the action stays undoable with Ctrl+Z.
  function dismiss(){
   if(timer){window.ClearTimeout(timer);timer=0;}
   item=null;
  }
  // text: what happened; restore(): puts it back (may throw; the panel reports it).
  function offer(text,restore){
   dismiss();
   item={text:String(text),restore};
   stack.push(item);
   if(stack.length>LIMIT)stack.shift();
   if(owner){const o=readOrder();o.push(owner);writeOrder(o);}
   timer=window.SetTimeout(()=>{timer=0;item=null;repaint();},DURATION);
   repaint();
  }
  function active(){return !!item;}
  function text(){return item?item.text:'';}
  function depth(){return stack.length;}
  // Notice and button rectangles for a panel of w x h (panel coordinates).
  function box(w,h){return {x:3,y:Math.max(0,h-40),w:Math.max(20,w-7),h:34};}
  function button(w,h){const b=box(w,h),bw=Math.min(72,Math.max(40,Math.floor(b.w/3)));return {x:b.x+b.w-bw-4,y:b.y+4,w:bw,h:b.h-8};}
  const inside=(r,x,y)=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
  // 'undo' on the button, 'notice' elsewhere on the notice, '' outside or when idle.
  function hit(x,y,w,h){
   if(!item)return '';
   return inside(button(w,h),x,y)?'undo':inside(box(w,h),x,y)?'notice':'';
  }
  function run(it){
   const i=stack.indexOf(it);if(i>=0)stack.splice(i,1);
   if(item===it)dismiss();
   repaint();
   it.restore();
  }
  // The notice's button: runs the shown restore once. False when no notice is shown.
  function undo(){
   if(!item)return false;
   forgetOne();run(item);
   return true;
  }
  // Undoes this panel's newest action (shared order already updated by the caller).
  function undoLast(){
   if(!stack.length)return false;
   run(stack[stack.length-1]);
   return true;
  }
  // Ctrl+Z: the newest action of any panel. False when there is nothing to undo.
  function keyUndo(){
   const o=readOrder();
   while(o.length){
    const name=o.pop();writeOrder(o);
    if(name===owner){if(undoLast())return true;continue;}
    try{if(panelsui.RunAction('JSPANEL:'+name+':'+NOTIFY)!==false)return true;}catch(e){}
   }
   return undoLast(); // no shared order (no panelsui): this panel only
  }
  // on_notify_data(name,info) of the owner: true when it was the undo request.
  function notify(name,info){
   if(String(info)!==NOTIFY||String(name)!==owner)return false;
   undoLast();
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
  return Object.freeze({offer,dismiss,active,text,depth,hit,undo,undoLast,keyUndo,notify,button,paint});
 }
 return Object.freeze({create,isUndoKey,DURATION,LIMIT,NOTIFY});
})();
