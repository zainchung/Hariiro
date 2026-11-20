// Anna Glass — frameless, vector icon navigation with a restrained rose active glow.
'use strict';
include('anna_shared.js');
include('anna_i18n.js');
include('anna_theme.js');
const FONT=gdi.Font('Yu Gothic UI',12,1);
const TXT=0xffefebf5, ACTIVE=0xffffe4f1, ICON=0xfff3b8d5;
const TABS=[
 {x:0,w:117,label:'artists',mode:'artists',state:'artists'},
 {x:119,w:123,label:'playlists',mode:'playlists',state:'library'},
 {x:244,w:106,label:'nowplaying',mode:'nowplaying',state:'nowplaying'}
];
let hovered=-1;
let active='library';
let nowPressed=false, pressTimer=0;
try{const saved=String(window.GetProperty('Anna.NavTabs.LastSelected.v2',''));
 if(['artists','library'].includes(saved))active=saved;
 else {const v=String(panelsui.GetVariable(AnnaShared.PVAR.navMode,'library'));
       if(['artists','library'].includes(v))active=v;}
}catch(e){}
function setActive(v){
 if(!['artists','library'].includes(v))return;
 active=v;
 try{window.SetProperty('Anna.NavTabs.LastSelected.v2',v);}catch(e){}
 window.Repaint();
}
function selected(t){return t.state!=='nowplaying'&&active===t.state;}
function line(gr,x,y,X,Y,color,width=2){gr.DrawLine(x,y,X,Y,width,color);}
function drawIcon(gr,i,cx,cy,col){
 if(i===0){ // paired music note, a library of tracks
  line(gr,cx+1,cy-8,cx+1,cy+5,col,2);line(gr,cx+9,cy-11,cx+9,cy+2,col,2);
  line(gr,cx+1,cy-8,cx+9,cy-11,col,2);
  gr.FillEllipse(cx-5,cy+2,7,5,col);gr.FillEllipse(cx+3,cy-1,7,5,col);
 }else if(i===1){ // playlist glyph (not a heart)
  for(let k=0;k<3;k++){gr.FillEllipse(cx-9,cy-8+k*7,3,3,col);line(gr,cx-3,cy-6+k*7,cx+10,cy-6+k*7,col,1.6);}
 }else{ // miniature static spectrum, as specifically requested
  const hs=[6,12,17,10,14,7];
  for(let k=0;k<hs.length;k++)gr.FillRoundRect(cx-11+k*4,cy+8-hs[k],3,hs[k],1,1,col);
 }
}
function on_paint(gr){
 gr=AnnaTheme.graphics(gr);
 for(let i=0;i<TABS.length;i++){
  const t=TABS[i],on=selected(t),over=hovered===i,pressed=i===2&&nowPressed;
  if(on){
   // Overlapping translucent bloom layers emulate the concept's pink backlighting.
   gr.FillRoundRect(t.x,1,t.w,37,15,15,0x179a2f6c);
   gr.FillRoundRect(t.x+2,4,t.w-4,32,13,13,0x26d35c9a);
   gr.FillRoundRect(t.x+5,7,t.w-10,26,12,12,0x55a23f7a);
   gr.FillRoundRect(t.x+8,10,t.w-16,20,10,10,0x44d85d9e);
   gr.DrawLine(t.x+13,35,t.x+t.w-13,35,2.5,0xffffb0db);
   gr.DrawLine(t.x+22,37,t.x+t.w-22,37,1.2,0xbfffd1ed);
  }else if(pressed){
   // Now Playing is an ACTION: pressed feedback only, never a persistent tab.
   gr.FillRoundRect(t.x+4,7,t.w-8,27,11,11,0x86ac507d);
   gr.DrawRoundRect(t.x+5,8,t.w-10,25,10,10,1,0xffe9add0);
  }else if(over)gr.FillRoundRect(t.x+3,7,t.w-6,26,9,9,0x365a3a67);
  const col=on||over||pressed?ACTIVE:TXT;
  drawIcon(gr,i,t.x+18,20,on||pressed?0xffffb7d8:ICON);
  gr.GdiDrawText(AnnaI18n.t(t.label),FONT,col,t.x+36,7,t.w-39,26,0x8024);
 }
}
function tabAt(x){return TABS.findIndex(t=>x>=t.x&&x<t.x+t.w);}
function on_mouse_move(x,y){const i=tabAt(x);if(i!==hovered){hovered=i;window.Repaint();}}
function on_mouse_leave(){hovered=-1;window.Repaint();}
function on_mouse_lbtn_down(x,y){if(tabAt(x)===2){nowPressed=true;window.Repaint();}}
function clearNowPress(){nowPressed=false;pressTimer=0;window.Repaint();}
function on_mouse_lbtn_up(x,y){
 const t=TABS[tabAt(x)];if(!t)return;
 try{
  if(t.state==='nowplaying'){
    nowPressed=true;
    if(pressTimer)window.ClearTimeout(pressTimer);
    if(typeof window.SetTimeout==='function')pressTimer=window.SetTimeout(clearNowPress,180);
    // Do not touch the Library/Playlist selection when revealing the playing track.
    panelsui.RunAction('JSPANEL:Playlists:nowplaying');
  }else{setActive(t.state);panelsui.SetVariable(AnnaShared.PVAR.navMode,t.state);panelsui.RunAction('JSPANEL:Playlists:'+t.mode);}
 }
 catch(e){console.log('Anna nav: '+String(e));}
 window.Repaint();
}
function on_panelsui_variable_changed(name){if(name===AnnaShared.PVAR.themeHue){window.Repaint();return;}

 if(name===AnnaShared.PVAR.language){window.Repaint();return;}
 if(name!==AnnaShared.PVAR.navMode)return;
 try{const v=String(panelsui.GetVariable(name,active));if(['artists','library'].includes(v))setActive(v);}catch(e){}
}
function on_notify_data(name,info){if(name==='NavTabs'){const v=String(info||'');if(['artists','library'].includes(v))setActive(v);}}
function on_size(){window.Repaint();}

function on_script_unload(){if(pressTimer)window.ClearTimeout(pressTimer);}

function on_mouse_rbtn_up(){return true;}
