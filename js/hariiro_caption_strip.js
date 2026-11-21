// Transparent interaction slot over empty Hariiro header space only.
// SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
'use strict';
function on_paint(){}
// JS Panel pseudo-caption uses ROOT-window client coordinates. The ordinary
// JS double-click handler alone did not allow dragging the frameless window.
function setCaptionArea(){
 try{
  const width=Math.max(0,window.Width);
  const ui=new ActiveXObject('UIHacks');
  if(typeof ui.SetPseudoCaption==='function')ui.SetPseudoCaption(367,4,width,37);
 }catch(e){console.log('Hariiro caption drag: '+String(e));}
}
function on_size(){setCaptionArea();}
setCaptionArea();
function on_mouse_lbtn_dblclk(x,y){
    try {
        const ui=new ActiveXObject('UIWizard');
        if(typeof ui.ToggleMaximize==='function'){ui.ToggleMaximize();return true;}
    }catch(e){console.log('Hariiro caption double-click: '+String(e));}
    return false;
}
function on_mouse_rbtn_up(){return true;}
