// Stage 3I.3 — seek slider previews position during drag and seeks only on release.
// The parent skin hosts this SAME script in two JS Panels: FooterVolume (windowless) and,
// since Round 21, FooterSeek as a child window, so its animation does not redraw the layout.
'use strict';
include('hariiro_shared.js');
include('hariiro_theme.js');
include('hariiro_dpi.js');
include('hariiro_paint_cache.js');
const SEEK = panelsui.PanelName === 'FooterSeek';
const TRACK = 0xa0443b59;
const FILL = 0xffefa7c1;
const KNOB = 0xffffe0e8;
// Image-backed seek butterfly and volume grip. Glass rails are still painted dynamically.
let BUTTERFLY=null,VOLUME_THUMB=null,loadedTheme='';
function loadAssets(){
 const id=HariiroTheme.folder();if(id===loadedTheme)return;
 loadedTheme=id;
 const folder='../images/controls/'+id+'/'; // Round 22: the colour's own folder
 try{BUTTERFLY=gdi.Image(folder+'butterfly.png');}catch(e){BUTTERFLY=null;}
 try{VOLUME_THUMB=gdi.Image(folder+'volume_thumb.png');}catch(e){VOLUME_THUMB=null;}
}
let breathPhase=0,breathTimer=0;
// Round 21: thumbs are resized once (HariiroPaintCache). FooterSeek is a child window and
// knows its exact scale; FooterVolume is windowless and scaled by the host (2x: sharp to 200 %).
function drawAsset(gr,img,x,y,size,alpha=255){
 if(!img)return;
 const factor=SEEK?HariiroDpi.scale():2;
 HariiroPaintCache.drawIcon(gr,img,Math.round(x-size/2),Math.round(y-size/2),size,size,alpha,factor);
}
let dragging = false;
let over = false;
let lastDragAt = 0;
let seekPreviewFraction = null;
function clamp(x) { return Math.max(0, Math.min(1, Number(x) || 0)); }
// Follow the volume curve used in the JS Panel project's own Seekbar/Volume example.
function volumeFraction(db) { return clamp((Math.pow(10, db/50) - 0.01) / 0.99); }
function fractionToVolume(f) { return 50*Math.log(0.99*clamp(f)+0.01)/Math.LN10; }
function frac() {
    if (SEEK) {
        if (dragging && seekPreviewFraction !== null) return seekPreviewFraction;
        const len=fb.PlaybackLength;
        return len > 0 ? clamp(fb.PlaybackTime/len) : 0;
    }
    return volumeFraction(fb.Volume);
}
function on_paint(gr) {
 gr=HariiroTheme.graphics(gr);
    loadAssets();
    const w=Math.max(1,HariiroDpi.width()),h=Math.max(1,HariiroDpi.height());
    const y=Math.floor((h-5)/2);
    const trackWidth=Math.max(20,w-12);
    const f=frac(), px=Math.round(f*trackWidth)+6;
    if(SEEK){
        // Opaque-enough unplayed track stays visible on both dark and luminous
        // sections of the illustrated wallpaper. A thin highlight defines its edge.
        gr.FillRoundRect(4,y-3,trackWidth+4,12,6,6,0xc431244d);
        gr.DrawRoundRect(4,y-3,trackWidth+4,12,6,6,1,0xffd9a9cd);
        const played=Math.round(trackWidth*f);
        if(played>0){
            gr.FillRoundRect(5,y-5,played+2,16,8,8,0x36ff93d3);
            gr.FillRoundRect(5,y-3,played+2,12,6,6,0x63ffb0da);
            gr.FillRoundRect(6,y,played,5,3,3,0xffffc4e2);
            gr.FillSolidRect(7,y+1,Math.max(1,played-2),1,0xfffff1fa);
        }
        const bx=Math.max(23,Math.min(w-23,px)),by=Math.floor(h/2);
        drawAsset(gr,BUTTERFLY,bx,by,40,Math.round(28+28*(1+Math.sin(breathPhase))/2));
        drawAsset(gr,BUTTERFLY,bx,by,36,255);
    }else{
        // Match the progress rail: rich glass cavity, visible rim, luminous played part.
        const x=4, railY=y-3, railW=trackWidth+4;
        gr.FillRoundRect(x,railY,railW,12,6,6,0xc431244d);
        gr.DrawRoundRect(x,railY,railW,12,6,6,1,0xe9dfb5d7);
        const played=Math.max(0,Math.round(trackWidth*f));
        if(played>0){
            gr.FillRoundRect(x+1,railY-2,played+2,16,7,7,0x3dff98cc);
            gr.FillRoundRect(x+2,railY,played+1,12,6,6,0x74ffafd5);
            gr.FillRoundRect(x+3,railY+3,played,5,3,3,0xffffd0e9);
        }
        const kx=Math.max(6,Math.min(w-7,px));
        if(over||dragging)drawAsset(gr,VOLUME_THUMB,kx,y+2,25,76);
        drawAsset(gr,VOLUME_THUMB,kx,y+2,20,255);
    }
}
function fractionAt(x) {
    const trackWidth=Math.max(20,HariiroDpi.width()-12);
    return clamp((x-6)/trackWidth);
}
// The seek thumb is a visual preview; no audio seek occurs here.
function previewSeek(x) {
    const next=fractionAt(x);
    if (seekPreviewFraction === null || next !== seekPreviewFraction) {
        seekPreviewFraction=next;
        window.Repaint();
    }
}
function applyVolume(x) {
    fb.Volume=fractionToVolume(fractionAt(x));
    window.Repaint();
}
function cancelSeekPreview() {
    if (!SEEK) return;
    const hadPreview=dragging || seekPreviewFraction !== null;
    dragging=false;
    seekPreviewFraction=null;
    if (hadPreview) window.Repaint();
}
function on_mouse_lbtn_down(x,y) {
    // Duration-less streams have no seekable position.
    if (SEEK && !(fb.PlaybackLength>0)) return;
    dragging=true;
    over=true;
    lastDragAt=Date.now();
    if (SEEK) previewSeek(x);
    else applyVolume(x);
}
function on_mouse_move(x,y) {
    if (dragging) {
        const now=Date.now();
        if (now-lastDragAt>=50) {
            lastDragAt=now;
            if (SEEK) previewSeek(x); else applyVolume(x);
        }
    } else if (!over) { over=true; window.Repaint(); }
}
function on_mouse_lbtn_up(x,y) {
    if (!dragging) return;
    if (SEEK) {
        // Compute the final position from mouse-up itself, even if preview was throttled.
        const fraction=fractionAt(x);
        const length=fb.PlaybackLength;
        dragging=false;
        seekPreviewFraction=null;
        if (length>0) fb.PlaybackTime=fraction*length; // exactly ONE seek
        window.Repaint();
    } else {
        dragging=false;
        applyVolume(x);
    }
}
function on_mouse_leave() { over=false; if(!dragging) window.Repaint(); }
function on_mouse_wheel(step) {
    if (SEEK) { if(fb.PlaybackLength>0) fb.PlaybackTime=Math.max(0,Math.min(fb.PlaybackLength,fb.PlaybackTime+step*5)); }
    else fb.Volume=Math.max(-100,Math.min(0,fb.Volume+step*2.5));
    window.Repaint();
}
function on_playback_time(){ if(SEEK) window.Repaint(); }
function on_playback_seek(){ if(SEEK) window.Repaint(); }
function on_playback_new_track(){ cancelSeekPreview(); window.Repaint(); }
function on_playback_stop(){ cancelSeekPreview(); window.Repaint(); }
function on_volume_change(){ if(!SEEK) window.Repaint(); }

// A 90 ms timer animates only the 27px-high seek panel, not the entire skin.
if(SEEK) breathTimer=window.SetInterval(function(){
    // No timer-driven paints for a hidden panel or when playback is stopped.
    if(window.IsVisible===false || !fb.IsPlaying)return;
    breathPhase+=0.24; // about a 3.1-second breathing cycle
    const trackWidth=Math.max(20,HariiroDpi.width()-12);
    const x=Math.max(23,Math.min(HariiroDpi.width()-23,Math.round(frac()*trackWidth)+6));
    // Repaint only the thumb's glow, not every pixel of the seekbar.
    HariiroDpi.repaintRect(Math.max(0,x-25),0,50,HariiroDpi.height());
},120);
function on_script_unload(){if(breathTimer)window.ClearInterval(breathTimer);}

function on_mouse_rbtn_up(){return true;}

function on_panelsui_variable_changed(name){if(name===HariiroShared.PVAR.themeHue||name===HariiroShared.PVAR.language)window.Repaint();}

// Child-window DPI adapter (FooterSeek): must stay the last statement (wraps the callbacks above).
HariiroDpi.install();
