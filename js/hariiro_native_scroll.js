// Native playlist helper: draggable seek-to-track strip, not a replacement list.
// SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
// The original Single Column Playlist receives all normal mouse/keyboard/wheel input.
// Panels UI does not expose its internal scroll pixel offset to a skin script;
// dragging calls foobar2000's native EnsurePlaylistItemVisible API instead.
'use strict';
include('hariiro_shared.js');
include('hariiro_theme.js');
include('hariiro_dpi.js');
const BAR=0x59492d58,THUMB=0xffefafd6,HL=0xffffe2f3;
const MIN_THUMB=26;
let grabbed=false,grabOffset=0,estimated=0,lastP=-1,lastCount=-1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function active(){return plman.ActivePlaylist;}
function count(){const p=active();return p>=0?plman.PlaylistItemCount(p):0;}
function geometry(){
 const h=HariiroDpi.height(),n=count();
 if(n<=0||h<50)return null;
 const thumb=clamp(Math.round(h*30/Math.max(30,n)),MIN_THUMB,Math.max(MIN_THUMB,h-4));
 const travel=Math.max(1,h-thumb-4);
 return {h,n,thumb,travel,y:2+Math.round(travel*estimated/Math.max(1,n-1))};
}
function scrollTo(y){
 const g=geometry();if(!g)return;
 estimated=clamp(Math.round((y-grabOffset-2)/g.travel*(g.n-1)),0,g.n-1);
 try{plman.EnsurePlaylistItemVisible(active(),estimated);}catch(e){console.log('Hariiro native scrollbar: '+String(e));}
 window.Repaint();
}
function on_paint(gr){
 gr=HariiroTheme.graphics(gr);
 const p=active(),n=count();if(p!==lastP||n!==lastCount){lastP=p;lastCount=n;estimated=0;}
 const g=geometry();if(!g)return;
 const w=HariiroDpi.width();
 gr.FillRoundRect(w-11,0,9,g.h,4,4,BAR);
 gr.FillRoundRect(w-10,g.y,7,g.thumb,4,4,grabbed?HL:THUMB);
}
function on_mouse_lbtn_down(x,y){
 const g=geometry();if(!g)return;
 grabbed=true;
 grabOffset=y>=g.y&&y<g.y+g.thumb?y-g.y:g.thumb/2;
 scrollTo(y);
}
function on_mouse_move(x,y,mask){
 if(!grabbed)return;
 if(!(mask&1)){grabbed=false;window.Repaint();return;}
 scrollTo(y);
}
function on_mouse_lbtn_up(x,y){if(grabbed){scrollTo(y);grabbed=false;window.Repaint();}}
function on_playlist_switch(){estimated=0;lastP=-1;window.Repaint();}
function on_playlist_items_added(){window.Repaint();}
function on_playlist_items_removed(){window.Repaint();}
function on_playlist_items_reordered(){window.Repaint();}
function on_size(){window.Repaint();}

function on_mouse_rbtn_up(){return true;}

function on_panelsui_variable_changed(name){if(name===HariiroShared.PVAR.themeHue||name===HariiroShared.PVAR.language)window.Repaint();}

// Child-window DPI adapter: must stay the last statement (wraps the callbacks above).
HariiroDpi.install();
