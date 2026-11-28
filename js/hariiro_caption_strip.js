// Transparent interaction slot over empty Hariiro header space only.
// SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
'use strict';
// Round 28: also the mini player's drag area (panel MiniCaption over the title and artist).
const MINI=typeof panelsui!=='undefined'&&panelsui.PanelName==='MiniCaption';
function on_paint(){}
// JS Panel pseudo-caption uses ROOT-window client coordinates (layout units): the panel's own
// rect, from Panels UI when it can tell (Round 28), else the full window's header slot.
// The ordinary JS double-click handler alone did not allow dragging the frameless window.
function captionRect(){
 try{
  const r=panelsui.GetPanelRect();
  if(r&&r.Width>0&&r.Height>0)return [r.X,r.Y,r.Width,r.Height];
 }catch(e){}
 return [367,4,Math.max(0,window.Width),37];
}
function setCaptionArea(){
 try{
  const ui=new ActiveXObject('UIHacks');
  if(typeof ui.SetPseudoCaption==='function')ui.SetPseudoCaption(...captionRect());
 }catch(e){console.log('Hariiro caption drag: '+String(e));}
}
function on_size(){setCaptionArea();}
setCaptionArea();
// Full window: maximise / restore. Mini player: back to the full window.
function on_mouse_lbtn_dblclk(x,y){
    if(MINI){try{panelsui.RunAction('MINIMODE:TOGGLE');}catch(e){console.log('Hariiro mini: '+String(e));}return true;}
    try {
        const ui=new ActiveXObject('UIWizard');
        if(typeof ui.ToggleMaximize==='function'){ui.ToggleMaximize();return true;}
    }catch(e){console.log('Hariiro caption double-click: '+String(e));}
    return false;
}
function on_mouse_rbtn_up(){return true;}
