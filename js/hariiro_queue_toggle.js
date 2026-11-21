// Hariiro — compact QUEUE pill matched to DESK, with explicit open/closed state.
// SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
'use strict';
include('hariiro_shared.js');
include('hariiro_theme.js');
// Pill drawing and colours are shared: HariiroTheme.paintSwitch / HariiroTheme.COLORS.


const FONT=gdi.Font('Segoe UI',9,1);
let over=false;
function opened(){try{return String(panelsui.GetVariable(HariiroShared.PVAR.queueOpen,'0'))==='1';}catch(e){return false;}}
function on_paint(gr){
 gr=HariiroTheme.graphics(gr);
 const w=window.Width,h=window.Height,active=opened();
 HariiroTheme.paintSwitch(gr,w,h,active,over);
 gr.GdiDrawText('QUEUE',FONT,0xffffe6f4,active?4:20,3,w-23,h-6,0x8025);
}
function on_mouse_move(){if(!over){over=true;window.Repaint();}}
function on_mouse_leave(){over=false;window.Repaint();}
function on_mouse_lbtn_up(){panelsui.RunAction('PVAR:TOGGLE:'+HariiroShared.PVAR.queueOpen);window.Repaint();}
function on_panelsui_variable_changed(name){if(name===HariiroShared.PVAR.themeHue){window.Repaint();return;}
if(name===HariiroShared.PVAR.queueOpen)window.Repaint();}

function on_mouse_rbtn_up(){return true;}
