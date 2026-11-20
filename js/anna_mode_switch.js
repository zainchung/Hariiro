// Compact fixed-endpoint GLASS/NATIVE switch. Neither panel can drift.
'use strict';
include('anna_shared.js');
include('anna_theme.js');
const SWITCH_ACTIVE_BG=0xff93547d;
const SWITCH_IDLE_BG=0xff43334f;
const SWITCH_ACTIVE_FRAME=0xffffc8e7;
const SWITCH_IDLE_FRAME=0xffd9b2d2;
const SWITCH_ACTIVE_KNOB=0xffffe9f5;
const SWITCH_IDLE_KNOB=0xffd8cbdf;
function paintSwitch(gr,w,h,active,hover,disabled){
 const cy=Math.round(h/2),cx=active?w-11:11;
 gr.FillRoundRect(2,2,w-5,h-5,9,9,active?SWITCH_ACTIVE_BG:SWITCH_IDLE_BG);
 gr.DrawRoundRect(2,2,w-5,h-5,9,9,1,active||hover?SWITCH_ACTIVE_FRAME:SWITCH_IDLE_FRAME);
 if(active)gr.DrawRoundRect(1,1,w-3,h-3,10,10,1,0x74ff8fc6);
 gr.FillEllipse(cx-8,cy-8,16,16,active?0x99ffd2eb:0x779ca0b4);
 gr.FillEllipse(cx-7,cy-7,14,14,active?SWITCH_ACTIVE_KNOB:SWITCH_IDLE_KNOB);
}

const IS_GLASS=panelsui.PanelName==='SwitchGlass';
const FONT=gdi.Font('Segoe UI',9,1);
let over=false;
function on_paint(gr){
 gr=AnnaTheme.graphics(gr);
 const w=window.Width,h=window.Height,cy=h/2;
 paintSwitch(gr,w,h,IS_GLASS,over,false);
 // 9px text and a 14px knob: 74px is the minimum reliable panel width.
 gr.GdiDrawText(IS_GLASS?'GLASS':'NATIVE',FONT,0xffffedf5,
    IS_GLASS?4:20,3,IS_GLASS?w-23:w-23,h-6,0x8025);
}
function on_mouse_move(){if(!over){over=true;window.Repaint();}}
function on_mouse_leave(){over=false;window.Repaint();}
function on_mouse_lbtn_up(){panelsui.RunAction('PVAR:TOGGLE:'+AnnaShared.PVAR.playlistExperimental);}

function on_mouse_rbtn_up(){return true;}

function on_panelsui_variable_changed(name){if(name===AnnaShared.PVAR.themeHue||name===AnnaShared.PVAR.language)window.Repaint();}
