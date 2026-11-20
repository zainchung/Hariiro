// Anna GLASS V2 — transport graphics are transparent PNGs in ../images/controls.
// All playback icons, shuffle states and play/pause rings are raster resources.
'use strict';
const POS=[25,88,151,214,277,340,403];
include('anna_i18n.js');
include('anna_theme.js');
const ORDER_LABELS=['orderDefault','orderRepeatPlaylist','orderRepeatTrack','orderRandom','orderShuffleTracks','orderShuffleAlbums'];
const ORDER_IMAGES=['order_default','order_repeat_playlist','order_repeat_track',
 'order_random','order_shuffle_tracks','order_shuffle_albums'];
const IMG_NAMES=[...ORDER_IMAGES,'seek_backward_5','seek_forward_5','previous','next',
                 'play','pause','headphones'];
const PNG={};
let loadedTheme='';
function loadIcons(){
 const id=AnnaTheme.selected();if(id===loadedTheme)return;
 loadedTheme=id;
 const folder='../images/controls/'+(id==='rose'?'pink/':id+'/');
 for(const key of Object.keys(PNG))delete PNG[key];
 for(const name of IMG_NAMES){
  try{PNG[name]=gdi.Image(folder+name+'.png');}
  catch(e){PNG[name]=null;console.log('Anna controls: missing '+folder+name+'.png: '+String(e));}
 }
}
let hot=-1;
function icon(gr,key,cx,cy,size,alpha=255){
 const img=PNG[key];if(!img)return;
 gr.DrawImage(img,Math.round(cx-size/2),Math.round(cy-size/2),size,size,
              0,0,img.Width,img.Height,0,alpha);
}
function nearest(x){let found=-1,dist=22;for(let i=0;i<POS.length;i++){
 const d=Math.abs(POS[i]-x);if(d<dist){dist=d;found=i;}}return found;}
function seekBy(delta){
 if(fb.IsPlaying&&fb.PlaybackLength>0)
   fb.PlaybackTime=Math.max(0,Math.min(fb.PlaybackLength,fb.PlaybackTime+delta));
}
function devices(){
 try{
  if(typeof fb.GetOutputDevices==='function'){
   const raw=fb.GetOutputDevices();
   const entries=typeof raw==='string'?JSON.parse(raw):raw;
   if(Array.isArray(entries))return entries.filter(d=>d&&typeof d.name==='string'
        &&typeof d.output_id==='string'&&typeof d.device_id==='string').slice(0,60);
  }
 }catch(e){console.log('Anna devices: '+String(e));}
 return [];
}
function selectOutput(x,y){
 const d=devices();
 if(!d.length){
  fb.ShowPopupMessage(AnnaI18n.t('deviceMissing'),'Anna Glass');
  return;
 }
 const menu=window.CreatePopupMenu();
 d.forEach((item,i)=>menu.AppendMenuItem(0,201+i,(item.active?'✓ ':'   ')+item.name));
 const picked=menu.TrackPopupMenu(x,y);
 if(picked<201||picked>=201+d.length)return;
 const chosen=d[picked-201];
 try{
  if(typeof fb.SetOutputDevice!=='function')throw new Error(AnnaI18n.t('deviceUnsupported'));
  fb.SetOutputDevice(chosen.output_id,chosen.device_id);
 }catch(e){fb.ShowPopupMessage(AnnaI18n.t('deviceFailed')+String(e),'Anna Glass');}
 window.Repaint();
}
function activate(i,x,y){
 switch(i){
  case 0:showPlaybackOrder(x,y);break;
  case 1:seekBy(-5);break;
  case 2:fb.Prev();break;
  case 3:fb.PlayOrPause();break;
  case 4:fb.Next();break;
  case 5:seekBy(5);break;
  case 6:selectOutput(x,y);break;
 }
 window.Repaint();
}
function on_paint(gr){
 gr=AnnaTheme.graphics(gr);
 loadIcons();
 const y=Math.floor(window.Height/2);
 for(let i=0;i<POS.length;i++){
  const x=POS[i],hover=hot===i;
  const key=i===0?(Number(plman.PlaybackOrder)===6?'order_random':ORDER_IMAGES[Math.max(0,Math.min(5,Number(plman.PlaybackOrder)||0))]):
   i===1?'seek_backward_5':i===2?'previous':i===3?(fb.IsPlaying&&!fb.IsPaused?'pause':'play'):
   i===4?'next':i===5?'seek_forward_5':'headphones';
  // Hover reuses the same artwork, never an extra drawn control glyph.
  if(hover)icon(gr,key,x,y,i===3?69:45,68);
  icon(gr,key,x,y,i===3?65:39,255);
 }
}
function on_mouse_move(x){const i=nearest(x);if(i!==hot){hot=i;window.Repaint();}}
function on_mouse_leave(){hot=-1;window.Repaint();}
function on_mouse_lbtn_up(x,y){const i=nearest(x);if(i>=0)activate(i,x,y);}
function showPlaybackOrder(x,y){
 const menu=window.CreatePopupMenu(),active=Number(plman.PlaybackOrder)||0;
 ORDER_LABELS.forEach((key,k)=>menu.AppendMenuItem(0,101+k,(k===active?'✓ ':'   ')+AnnaI18n.t(key)));
 const selected=menu.TrackPopupMenu(x,y);
 if(selected>=101&&selected<107)plman.PlaybackOrder=selected-101;
 window.Repaint();return true;
}
function on_mouse_rbtn_up(x,y){
 const i=nearest(x);
 if(i===6){selectOutput(x,y);return true;}
 if(i===0)return showPlaybackOrder(x,y);
 return true;
}
function on_playback_pause(){window.Repaint();}
function on_playback_starting(){window.Repaint();}
function on_playback_stop(){window.Repaint();}
function on_playback_order_changed(){window.Repaint();}

function on_panelsui_variable_changed(name){if(name==='anna.theme.hue'||name==='anna.language')window.Repaint();}
