// Anna Glass V2 — optional ESLyric desktop-lyrics integration.
// This panel only triggers ESLyric's own foobar2000 main-menu commands.
// It does not fetch/render desktop lyrics, write ESLyric settings, or assume
// an absent or localized menu command was successfully executed.
'use strict';
include('anna_shared.js');
include('anna_i18n.js');
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


const MENU_PROPERTY='Anna.ESLyric.DesktopMenuCommand.v1';
const DEFAULT_COMMANDS=[
    'View/ESLyric/Desktop Lyric/Show',
    'View/ESLyric/Show desktop lyric'
];
const FONT=gdi.Font('Segoe UI',10,1);
const COLOR_BG=0x643b3556;
const COLOR_FRAME=0xffdba9c6;
const COLOR_ACTIVE=0xffffbad8;
const COLOR_TEXT=0xfff7e7f0;
const COLOR_OFF=0xffa89bac;
const DT_CENTER=0x8025;

let selectedCommand=String(window.GetProperty(MENU_PROPERTY,'')||'').trim();
let installed=false,checked=false,seenCommand=false,error='';
let refreshTimer=0;
function componentPresent(){
    try{return !!utils.CheckComponent('foo_uie_eslyric');}
    catch(e){return false;}
}
function candidates(){
    const unique=[];
    for(const p of [selectedCommand,...DEFAULT_COMMANDS])
        if(p && !unique.includes(p))unique.push(p);
    return unique;
}
function readChecked(){
    installed=componentPresent();
    if(!installed){checked=false;seenCommand=false;return;}
    let active=false;
    for(const path of candidates()){
        try{
            if(fb.IsMainMenuCommandChecked(path)){
                selectedCommand=path;
                active=true;
                break;
            }
        }catch(e){console.log('Anna ESLyric: check '+path+': '+String(e));}
    }
    checked=active;
    // A false result alone cannot distinguish an unchecked command
    // from a menu path not registered by this ESLyric version.
    if(active)seenCommand=true;
}
function refresh(){
    const was=installed+'|'+checked+'|'+error;
    readChecked();
    if(was!==installed+'|'+checked+'|'+error)window.Repaint();
}
function showProblem(message){
    error=message;
    console.log('Anna ESLyric: '+message);
    try{fb.ShowPopupMessage(message,'Anna Glass — ESLyric');}catch(e){}
    window.Repaint();
}
function toggleDesktopLyrics(){
    if(!componentPresent()){
        installed=false;
        showProblem(AnnaI18n.t('missingESLyric'));
        return false;
    }
    for(const path of candidates()){
        try{
            if(fb.RunMainMenuCommand(path)===true){
                selectedCommand=path;
                seenCommand=true;
                window.SetProperty(MENU_PROPERTY,path);
                error='';
                // Read the checkbox from ESLyric itself; do not locally
                // invert a guessed boolean and claim an unverified state.
                readChecked();
                window.Repaint();
                return true;
            }
        }catch(e){
            console.log('Anna ESLyric: command '+path+': '+String(e));
        }
    }
    showProblem(AnnaI18n.t('missingESLyricMenu'));
    return false;
}
// The circle is the toggle knob; its position and hue follow ESLyric's checked state.
// Tight 84px desktop-lyrics switch, same fixed right edge as before.
function on_paint(gr){
 gr=AnnaTheme.graphics(gr);
 const w=window.Width,h=window.Height;
 if(w<65||h<19)return;
 const on=installed&&checked,cy=h/2,cx=on?w-11:11;
 paintSwitch(gr,w,h,on,false,!installed);
 const label=installed?(on?'Desk ON':'Desk OFF'):'Desk —';
 gr.GdiDrawText(label,gdi.Font('Segoe UI',9,1),installed?0xffffe9f4:COLOR_OFF,
     on?4:20,3,on?w-23:w-23,h-6,DT_CENTER);
}
function on_mouse_lbtn_up(x,y){toggleDesktopLyrics();}
function on_mouse_rbtn_up(x,y){
    const menu=window.CreatePopupMenu();
    menu.AppendMenuItem(0,1,AnnaI18n.t('deskToggle'));
    menu.AppendMenuItem(0,2,AnnaI18n.t('deskRefresh'));
    menu.AppendMenuSeparator();
    menu.AppendMenuItem(0,3,AnnaI18n.t('deskConfigure'));
    menu.AppendMenuItem(0,4,AnnaI18n.t('deskReset'));
    const chosen=menu.TrackPopupMenu(x,y);
    if(chosen===1)toggleDesktopLyrics();
    else if(chosen===2)refresh();
    else if(chosen===3){
        try{
            const value=utils.InputBox(window.ID,
                AnnaI18n.t('deskConfigPrompt'),
                AnnaI18n.t('deskConfigTitle'),
                selectedCommand || DEFAULT_COMMANDS[0],true);
            if(value!==undefined && value!==null){
                const path=String(value).trim();
                if(!/^View\/[^\r\n]{3,180}$/.test(path)){
                    showProblem(AnnaI18n.t('invalidESLyricMenu'));
                }else{
                    selectedCommand=path;
                    window.SetProperty(MENU_PROPERTY,path);
                    seenCommand=false;error='';
                    refresh();window.Repaint();
                }
            }
        }catch(e){console.log('Anna ESLyric: menu edit cancelled: '+String(e));}
    }else if(chosen===4){
        selectedCommand='';seenCommand=false;error='';
        window.SetProperty(MENU_PROPERTY,'');refresh();window.Repaint();
    }
    return true;
}
function on_size(){window.Repaint();}
readChecked();
// Low-frequency visual feedback keeps in sync when the user toggles ESLyric
// externally via the View menu or ESLyric preferences.
refreshTimer=window.SetInterval(function(){
    if(window.IsVisible)refresh();
},1500);
function on_script_unload(){if(refreshTimer)window.ClearInterval(refreshTimer);}

function on_panelsui_variable_changed(name){if(name===AnnaShared.PVAR.themeHue||name===AnnaShared.PVAR.language)window.Repaint();}
