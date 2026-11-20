// Anna Glass: per-playlist path baselines that let the sidebar remove the duplicate
// copies an import just added (Round 13.2). Moved out of playlist_browser.js in Phase D1;
// rules unchanged. The including panel loads anna_playlist_dedup.js first.
// create(isOrdinary): isOrdinary(p) says which playlists are the user's own lists.
'use strict';
var AnnaDedupTracker=(function(){
 function create(isOrdinary){
  // Track pre-import file paths for every ordinary playlist, including playlists
  // that are not currently active. The foobar2000 OLE host inserts tracks after
  // on_drag_drop returns, so the added callback must remove the excess copies.
  const baselines=new Map();
  const removing=new Set();
  function token(p){
   const name=String(plman.GetPlaylistName(p));
   let serial=0;
   for(let i=0;i<=p;i++)if(String(plman.GetPlaylistName(i))===name)serial++;
   return name+'\u0000'+serial;
  }
  function snapshot(p){return AnnaPlaylistDedup.paths(plman.GetPlaylistItems(p).Convert());}
  function sync(){
   const present=new Set();
   for(let p=0;p<plman.PlaylistCount;p++)if(isOrdinary(p)){
    const t=token(p);present.add(t);
    if(!baselines.has(t))baselines.set(t,snapshot(p));
   }
   for(const t of baselines.keys())if(!present.has(t))baselines.delete(t);
  }
  function refresh(p){
   if(isOrdinary(p))baselines.set(token(p),snapshot(p));
  }
  function removeDuplicates(p,indices){
   const removed=new Set(indices),len=plman.PlaylistItemCount(p);
   const selected=[],canReadSelection=typeof plman.IsPlaylistItemSelected==='function';
   if(canReadSelection)for(let i=0;i<len;i++)if(plman.IsPlaylistItemSelected(p,i))selected.push(i);
   const focus=typeof plman.GetPlaylistFocusItemIndex==='function'?plman.GetPlaylistFocusItemIndex(p):-1;
   function selectIndices(items){
    if(!items.length)return;
    if(typeof plman.SetPlaylistSelection==='function')plman.SetPlaylistSelection(p,items,true);
    else if(typeof plman.SetPlaylistSelectionSingle==='function')for(const i of items)plman.SetPlaylistSelectionSingle(p,i,true);
   }
   plman.UndoBackup(p);
   removing.add(p);
   try{
    plman.ClearPlaylistSelection(p);
    selectIndices(indices);
    plman.RemovePlaylistSelection(p,false); // Remove from playlist only; never delete physical files.
    if(plman.PlaylistItemCount(p)!==len-indices.length)
     throw new Error('Playlist refused to remove duplicate imports');
    // Preserve the user's selection and focused track after the removal.
    plman.ClearPlaylistSelection(p);
    const translated=i=>i-indices.filter(n=>n<i).length;
    selectIndices(selected.filter(i=>!removed.has(i)).map(translated));
    if(focus>=0&&typeof plman.SetPlaylistFocusItem==='function'){
     const adjusted=translated(focus);
     plman.SetPlaylistFocusItem(p,Math.min(Math.max(0,adjusted),Math.max(0,plman.PlaylistItemCount(p)-1)));
    }
   }finally{removing.delete(p);}
  }
  // Removes the copies just added to p whose file was already there; returns how many.
  function dedupe(p){
   if(!isOrdinary(p)||removing.has(p))return 0;
   const t=token(p),after=snapshot(p);
   if(!baselines.has(t)){
    baselines.set(t,after);return 0; // No earlier snapshot: never alter unknown user data.
   }
   const prior=baselines.get(t);
   const duplicates=AnnaPlaylistDedup.redundantAddedIndices(prior,after);
   try{
    if(duplicates.length&&!plman.IsPlaylistLocked(p))removeDuplicates(p,duplicates);
   }finally{baselines.set(t,snapshot(p));}
   return duplicates.length;
  }
  // True while dedupe() is removing from p (its own removal callbacks must be ignored).
  function isRemoving(p){return removing.has(p);}
  return Object.freeze({sync,refresh,dedupe,isRemoving});
 }
 return Object.freeze({create});
})();
