// Compact fixed-endpoint GLASS/NATIVE switch. Neither panel can drift.
'use strict';
include('hariiro_shared.js');
include('hariiro_theme.js');
// Pill drawing and colours are shared: HariiroTheme.paintSwitch / HariiroTheme.COLORS.

const IS_GLASS=panelsui.PanelName==='SwitchGlass';
const FONT=gdi.Font('Segoe UI',9,1);
let over=false;
function on_paint(gr){
 gr=HariiroTheme.graphics(gr);
 const w=window.Width,h=window.Height,cy=h/2;
 HariiroTheme.paintSwitch(gr,w,h,IS_GLASS,over);
 // 9px text and a 14px knob: 74px is the minimum reliable panel width.
 gr.GdiDrawText(IS_GLASS?'GLASS':'NATIVE',FONT,0xffffedf5,
    IS_GLASS?4:20,3,IS_GLASS?w-23:w-23,h-6,0x8025);
}
function on_mouse_move(){if(!over){over=true;window.Repaint();}}
function on_mouse_leave(){over=false;window.Repaint();}
function on_mouse_lbtn_up(){panelsui.RunAction('PVAR:TOGGLE:'+HariiroShared.PVAR.playlistExperimental);}

function on_mouse_rbtn_up(){return true;}

function on_panelsui_variable_changed(name){if(name===HariiroShared.PVAR.themeHue||name===HariiroShared.PVAR.language)window.Repaint();}
