// Hariiro: redirect for files dropped from OTHER programs (File Explorer).
// SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
// Windows check (Round 15, foo_js_panel 1.9.0 + Panels UI, child or windowless
// panels alike): for an external drop the panel gets on_drag_enter/over and then
// on_drag_leave at release - never on_drag_drop - and foobar2000 appends the files
// to the ACTIVE playlist and selects them. Drags that start inside foobar2000
// reach on_drag_drop normally and are not touched here.
//
// Each drop panel installs HariiroDropFix with a plan(x,y) function giving what its
// own on_drag_drop would have done at the last pointer position:
//   {kind:'playlist',p,select,activate} | {kind:'queue'} | {kind:'reject'} | null (keep)
// On "leave with the left button up" the plan is stored in a panel variable; the
// first on_playlist_items_added for the active playlist then moves the newly
// appended, selected entries to the plan's target (or just removes them).
// Round 24, active playlist locked (the Music Library view carries the skin's own
// AddItems lock): Windows check - foobar2000 refuses the drop, nothing is added. So the
// lock is lifted on release (o.relock), the host appends as usual, and the lock comes
// back as soon as the files have moved (or after RELOCK_MS when nothing arrives).
// A lock that cannot be lifted (another component's): if foobar2000 puts the files in a
// NEW playlist, the plan records all playlist names; the one playlist that appears on
// top of them within NEW_LIST_MS is emptied into the target and removed again.
'use strict';
var HariiroDropFix=(function(){
 // Needs include('hariiro_shared.js') first; looked up on use so this file loads on its own too.
 const TTL_MS=15000, NEW_LIST_MS=3000, RELOCK_MS=3000, VK_LBUTTON=0x01;
 const key=()=>HariiroShared.PVAR.dropPending;
 let hooks={},last=null;
 function isExternal(){return HariiroShared.getOrigin()==='';}
 function buttonDown(){try{return !!utils.IsKeyPressed(VK_LBUTTON);}catch(e){return true;}} // unknown: assume still dragging
 function clear(){try{panelsui.SetVariable(key(),'');}catch(e){}}
 function pending(){
  try{
   const s=String(panelsui.GetVariable(key(),'')||'');if(!s)return null;
   const o=JSON.parse(s);
   if(!o||!o.plan)throw new Error('bad plan');
   if(!(Date.now()-o.at<(Array.isArray(o.names)?NEW_LIST_MS:TTL_MS))){clear();relock(o);return null;}
   return o;
  }catch(e){clear();return null;}
 }
 function names(){const out=[];for(let i=0;i<plman.PlaylistCount;i++)out.push(String(plman.GetPlaylistName(i)));return out;}
 // Lifts a lock this component may change; returns the actions to restore, or null.
 function unlock(p){
  try{
   if(typeof plman.GetPlaylistLockedActions!=='function')return null;
   const acts=Array.from(plman.GetPlaylistLockedActions(p)||[],String);
   if(!acts.length)return null;
   plman.SetPlaylistLockedActions(p,[]); // throws for another component's lock
   if(!plman.IsPlaylistLocked(p))return acts;
   plman.SetPlaylistLockedActions(p,acts);
  }catch(e){}
  return null;
 }
 function relock(o){
  if(!o||!Array.isArray(o.relock))return;
  try{
   const p=o.active<plman.PlaylistCount&&String(plman.GetPlaylistName(o.active))===o.name?o.active:plman.FindPlaylist(o.name);
   if(p>=0&&!plman.IsPlaylistLocked(p))plman.SetPlaylistLockedActions(p,o.relock);
  }catch(e){}
 }
 function arm(plan){
  const a=plman.ActivePlaylist;
  if(!plan||a<0||a>=plman.PlaylistCount)return false;
  if(plan.kind==='playlist'&&plan.p===a)return false; // lands in the right list, or that list refuses files
  const o={at:Date.now(),active:a,name:String(plman.GetPlaylistName(a)),count:plman.PlaylistItemCount(a),plan};
  if(plman.IsPlaylistLocked(a)){
   const acts=plan.kind==='reject'?null:unlock(a); // refused anyway: keep the lock
   if(acts)o.relock=acts;
   else o.names=names(); // the host may create a new playlist
  }
  try{panelsui.SetVariable(key(),JSON.stringify(o));}catch(e){relock(o);return false;}
  if(o.relock){
   try{window.SetTimeout(()=>{const s=String(panelsui.GetVariable(key(),'')||'');
    try{if(s&&JSON.parse(s).at===o.at)clear();}catch(e){}
    relock(o);},RELOCK_MS);}catch(e){}
  }
  return true;
 }
 // True when p is the only playlist added since o.names was recorded.
 function isNewPlaylist(o,p){
  const now=names();
  if(now.length!==o.names.length+1||p<0||p>=now.length)return false;
  now.splice(p,1);
  return now.every((n,i)=>n===o.names[i]);
 }
 function removePlaylist(p){
  const remove=typeof plman.RemovePlaylist==='function'?'RemovePlaylist':'RemovePlaylistSwitch';
  return plman[remove](p)!==false;
 }
 function deliver(plan,moved){
  if(plan.kind==='playlist'&&plan.p>=0&&plan.p<plman.PlaylistCount&&!plman.IsPlaylistLocked(plan.p)){
   if(plan.activate){if(typeof hooks.activate==='function')hooks.activate(plan.p);else plman.ActivePlaylist=plan.p;}
   plman.InsertPlaylistItems(plan.p,plman.PlaylistItemCount(plan.p),moved,plan.select!==false);
  }else if(plan.kind==='queue'){
   for(let i=0;i<moved.Count;i++)plman.AddItemToPlaybackQueue(moved.Item(i));
  }
 }
 // The host's new playlist p holds only the dropped files: move them, remove p.
 function applyCreated(o,p){
  if(!isNewPlaylist(o,p)||plman.PlaylistItemCount(p)<=0)return false;
  clear();
  const moved=plman.GetPlaylistItems(p);
  if(!removePlaylist(p))return false;
  // Indices are those of the recorded names again: o.active and plan.p are valid.
  if(o.active<plman.PlaylistCount&&String(plman.GetPlaylistName(o.active))===o.name)plman.ActivePlaylist=o.active;
  deliver(o.plan,moved);
  return true;
 }
 // Returns true when p received the misrouted files and they were moved away.
 function apply(p){
  const o=pending();
  if(o&&Array.isArray(o.names))return applyCreated(o,p);
  if(!o||p!==o.active||String(plman.GetPlaylistName(p))!==o.name)return false;
  const n=plman.PlaylistItemCount(p);
  if(n<=o.count)return false;
  const indices=[];
  for(let i=o.count;i<n;i++)if(plman.IsPlaylistItemSelected(p,i))indices.push(i);
  if(!indices.length)return false; // not the host's drop (it selects what it adds)
  clear();
  const all=plman.GetPlaylistItems(p),moved=fb.CreateHandleList();
  for(const i of indices)moved.Add(all.Item(i));
  plman.ClearPlaylistSelection(p);
  plman.SetPlaylistSelection(p,indices,true);
  plman.RemovePlaylistSelection(p,false); // playlist entries only; files are never touched
  relock(o);
  deliver(o.plan,moved);
  return true;
 }
 // Wrap the panel's callbacks; call before HariiroDpi.install() so x,y are layout units.
 function install(options){
  hooks=options||{};
  const g=globalThis;
  const wrap=(name,fn)=>{const original=g[name];g[name]=function(...a){return fn(original,this,a);};};
  for(const name of ['on_drag_enter','on_drag_over'])
   wrap(name,(original,self,a)=>{last=isExternal()?{x:a[1],y:a[2]}:null;return typeof original==='function'?original.apply(self,a):undefined;});
  wrap('on_drag_drop',(original,self,a)=>{last=null;return typeof original==='function'?original.apply(self,a):undefined;});
  wrap('on_drag_leave',(original,self,a)=>{
   const at=last;last=null;
   // The panel's own leave runs first (it clears hints); the plan may then show a warning.
   const r=typeof original==='function'?original.apply(self,a):undefined;
   if(at&&isExternal()&&!buttonDown()&&typeof hooks.plan==='function'){
    try{arm(hooks.plan(at.x,at.y));}catch(e){console.log('Hariiro external drop: '+String(e));}
   }
   return r;
  });
  wrap('on_playlist_items_added',(original,self,a)=>{
   let moved=false;
   try{moved=apply(a[0]);}catch(e){console.log('Hariiro external drop redirect: '+String(e));}
   if(moved){window.Repaint();return undefined;}
   return typeof original==='function'?original.apply(self,a):undefined;
  });
 }
 return Object.freeze({install,arm,apply,pending});
})();
