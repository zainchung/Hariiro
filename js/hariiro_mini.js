// Hariiro mini player: right-hand button column (back to the full window, favourite) and the
// window size. SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
// Round 28: Panels UI mini mode (ini mini.size) opens the window at a fixed size in device
// pixels; main.txt draws the mini layout whenever the window is at most MINI_MAX layout px
// high. This child window (it knows the display scale) then sizes the window to MINI_W x
// MINI_H layout px, keeping the right edge (mini.anchor = RIGHT TOP).
'use strict';
include('hariiro_shared.js');
include('hariiro_i18n.js');
include('hariiro_theme.js');
include('hariiro_favorites.js');
include('hariiro_dpi.js');
const MINI_W=440,MINI_H=140,MINI_MAX=220;
// main.txt: $panel(MiniSide,JS Panel,$eval(%_width% - 40),6,34,$eval(%_height% - 12))
const SIDE_RIGHT=40,SIDE_TOP=6,SIDE_BOTTOM=6;
const BTN=30,HEART_TOP=34;
const GLYPH=HariiroDpi.font('Segoe UI Symbol',15,0);
let hot=-1;

// The whole window in layout px, from this panel's own rect.
function rootSize(){
 try{
  const r=panelsui.GetPanelRect();
  if(r&&r.Width>0&&r.Height>0)return {w:r.X+SIDE_RIGHT,h:r.Y+r.Height+SIDE_BOTTOM};
 }catch(e){}
 return null;
}
function fitWindow(){
 const root=rootSize();if(!root||root.h>MINI_MAX)return false; // full layout (or leaving mini)
 const s=HariiroDpi.scale()||1;
 const dw=Math.round((MINI_W-root.w)*s),dh=Math.round((MINI_H-root.h)*s);
 if(Math.abs(dw)<=2*s&&Math.abs(dh)<=2*s)return false;
 try{
  const ui=new ActiveXObject('UIWizard');
  const x=ui.WindowX,y=ui.WindowY,w=ui.WindowWidth,h=ui.WindowHeight;
  ui.SetWindowSize(w+dw,h+dh);
  ui.SetWindowPosition(x-dw,y);
  return true;
 }catch(e){console.log('Hariiro mini size: '+String(e));return false;}
}
function restoreFull(){try{panelsui.RunAction('MINIMODE:TOGGLE');}catch(e){console.log('Hariiro mini: '+String(e));}}
function hit(x,y){
 if(x<0||x>=HariiroDpi.width())return -1;
 if(y>=0&&y<BTN)return 0;
 if(y>=HEART_TOP&&y<HEART_TOP+BTN)return 1;
 return -1;
}
function on_paint(gr){
 gr=HariiroTheme.graphics(gr);
 const w=HariiroDpi.width(),cx=Math.round(w/2);
 // Back to the full window: a frame with an arrow to its upper right corner.
 const over=hot===0,line=over?0xffffafda:0xffefd9e9;
 if(over)gr.FillRoundRect(2,1,w-4,BTN-2,8,8,0x40ff9fd0);
 gr.DrawRoundRect(cx-8,7,16,16,3,3,1.4,line);
 gr.DrawLine(cx-2,17,cx+7,8,1.6,line);
 gr.DrawLine(cx+2,8,cx+7,8,1.6,line);
 gr.DrawLine(cx+7,8,cx+7,13,1.6,line);
 // Favourite.
 const fav=HariiroFavorites.isCurrent(),heart=hot===1;
 if(heart)gr.FillRoundRect(2,HEART_TOP+1,w-4,BTN-2,8,8,0x40ff9fd0);
 gr.GdiDrawText(fav?'♥':'♡',GLYPH,fav||heart?0xffffafda:0xffefd9e9,0,HEART_TOP,w,BTN,0x00000001|0x00000004|0x00000020);
}
function on_mouse_move(x,y){const i=hit(x,y);if(i!==hot){hot=i;window.Repaint();}}
function on_mouse_leave(){hot=-1;window.Repaint();}
function on_mouse_lbtn_up(x,y){
 const i=hit(x,y);
 if(i===0)restoreFull();
 else if(i===1){HariiroFavorites.toggleCurrent();window.Repaint();}
 return true;
}
function on_mouse_rbtn_up(){return true;}
function on_size(){fitWindow();}
function on_playback_new_track(){HariiroFavorites.publish();window.Repaint();}
function on_playback_stop(){window.Repaint();}
function on_playlist_items_added(){window.Repaint();}
function on_playlist_items_removed(){window.Repaint();}
function on_panelsui_variable_changed(name){
 if(HariiroTheme.isLookVariable(name))window.Repaint();
}
window.SetTimeout(fitWindow,50);
HariiroDpi.install();
