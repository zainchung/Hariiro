// Anna Glass: redirect for files dropped from OTHER programs (File Explorer).
// Windows check (Round 15, foo_js_panel 1.9.0 + Panels UI, child or windowless
// panels alike): for an external drop the panel gets on_drag_enter/over and then
// on_drag_leave at release - never on_drag_drop - and foobar2000 appends the files
// to the ACTIVE playlist and selects them. Drags that start inside foobar2000
// reach on_drag_drop normally and are not touched here.
//
// Each drop panel installs AnnaDropFix with a plan(x,y) function giving what its
// own on_drag_drop would have done at the last pointer position:
//   {kind:'playlist',p,select,activate} | {kind:'queue'} | {kind:'reject'} | null (keep)
// On "leave with the left button up" the plan is stored in a panel variable; the
// first on_playlist_items_added for the active playlist then moves the newly
// appended, selected entries to the plan's target (or just removes them).
'use strict';
var AnnaDropFix=(function(){
 // Needs include('anna_shared.js') first; looked up on use so this file loads on its own too.
 const TTL_MS=15000, VK_LBUTTON=0x01;
 const key=()=>AnnaShared.PVAR.dropPending;
 let hooks={},last=null;
 function isExternal(){return AnnaShared.getOrigin()==='';}
 function buttonDown(){try{return !!utils.IsKeyPressed(VK_LBUTTON);}catch(e){return true;}} // unknown: assume still dragging
 function clear(){try{panelsui.SetVariable(key(),'');}catch(e){}}
 function pending(){
  try{
   const s=String(panelsui.GetVariable(key(),'')||'');if(!s)return null;
   const o=JSON.parse(s);
   if(!o||!o.plan||!(Date.now()-o.at<TTL_MS)){clear();return null;}
   return o;
  }catch(e){clear();return null;}
 }
 function arm(plan){
  const a=plman.ActivePlaylist;
  if(!plan||a<0||a>=plman.PlaylistCount||plman.IsPlaylistLocked(a))return false;
  if(plan.kind==='playlist'&&plan.p===a)return false; // already lands in the right list
  try{panelsui.SetVariable(key(),JSON.stringify({at:Date.now(),active:a,name:String(plman.GetPlaylistName(a)),
   count:plman.PlaylistItemCount(a),plan}));}catch(e){return false;}
  return true;
 }
 // Returns true when p received the misrouted files and they were moved away.
 function apply(p){
  const o=pending();
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
  const plan=o.plan;
  if(plan.kind==='playlist'&&plan.p>=0&&plan.p<plman.PlaylistCount&&!plman.IsPlaylistLocked(plan.p)){
   if(plan.activate){if(typeof hooks.activate==='function')hooks.activate(plan.p);else plman.ActivePlaylist=plan.p;}
   plman.InsertPlaylistItems(plan.p,plman.PlaylistItemCount(plan.p),moved,plan.select!==false);
  }else if(plan.kind==='queue'){
   for(let i=0;i<moved.Count;i++)plman.AddItemToPlaybackQueue(moved.Item(i));
  }
  return true;
 }
 // Wrap the panel's callbacks; call before AnnaDpi.install() so x,y are layout units.
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
    try{arm(hooks.plan(at.x,at.y));}catch(e){console.log('Anna external drop: '+String(e));}
   }
   return r;
  });
  wrap('on_playlist_items_added',(original,self,a)=>{
   let moved=false;
   try{moved=apply(a[0]);}catch(e){console.log('Anna external drop redirect: '+String(e));}
   if(moved){window.Repaint();return undefined;}
   return typeof original==='function'?original.apply(self,a):undefined;
  });
 }
 return Object.freeze({install,arm,apply,pending});
})();
