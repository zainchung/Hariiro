// Stage 3G — same functional footer sliders, softer track glow and improved contrast.
// The parent skin hosts this SAME script in two different windowless JS Panels.
'use strict';
const SEEK = panelsui.PanelName === 'FooterSeek';
const TRACK = 0xa0443b59;
const FILL = 0xffefa7c1;
const KNOB = 0xffffe0e8;
const PERCENT_FONT = gdi.Font('Segoe UI', 10, 0);
const HOVER = 0xffe2bf8c;
let dragging = false;
let over = false;
function clamp(x) { return Math.max(0, Math.min(1, Number(x) || 0)); }
// Follow the volume curve used in the JS Panel project's own Seekbar/Volume example.
function volumeFraction(db) { return clamp((Math.pow(10, db/50) - 0.01) / 0.99); }
function fractionToVolume(f) { return 50*Math.log(0.99*clamp(f)+0.01)/Math.LN10; }
function frac() {
    if (SEEK) { const len=fb.PlaybackLength; return len > 0 ? clamp(fb.PlaybackTime/len) : 0; }
    return volumeFraction(fb.Volume);
}
function on_paint(gr) {
    const w=Math.max(1,window.Width),h=Math.max(1,window.Height);
    const y=Math.floor((h-5)/2);
    const trackWidth=Math.max(20, SEEK ? w-12 : w-49);
    const f=frac(), px=Math.round(f*trackWidth)+6;
    // Decorative halo stays behind the same 5px interactive slider; hit zones are unchanged.
    if (f>0) gr.FillRoundRect(6,y-2,Math.max(2,Math.round(trackWidth*f)),9,4,4,0x23f4a2c3);
    gr.FillRoundRect(6,y,trackWidth,5,3,3,TRACK);
    if (f>0) gr.FillRoundRect(6,y,Math.max(2,Math.round(trackWidth*f)),5,3,3,FILL);
    gr.FillEllipse(Math.max(1,Math.min(trackWidth+1,px-5)),y-4,11,13,over||dragging?HOVER:KNOB);
    if(!SEEK) gr.GdiDrawText(String(Math.round(f*100))+'%',PERCENT_FONT,0xffeddde2,w-38,0,37,h,0x4 | 0x20);
}
function apply(x) {
    const trackWidth=Math.max(20,SEEK?window.Width-12:window.Width-49);
    const f=clamp((x-6)/trackWidth);
    if (SEEK) {
        const len=fb.PlaybackLength;
        if (len>0) fb.PlaybackTime=f*len;
    } else fb.Volume=fractionToVolume(f);
    window.Repaint();
}
function on_mouse_lbtn_down(x,y) { if(!SEEK && x>window.Width-39) return; dragging=true; apply(x); }
function on_mouse_move(x,y) { over=true; if(dragging) apply(x); else window.Repaint(); }
function on_mouse_lbtn_up(x,y) { if(dragging) apply(x); dragging=false; }
function on_mouse_leave() { over=false; if(!dragging) window.Repaint(); }
function on_mouse_wheel(step) {
    if (SEEK) { if(fb.PlaybackLength>0) fb.PlaybackTime=Math.max(0,Math.min(fb.PlaybackLength,fb.PlaybackTime+step*5)); }
    else fb.Volume=Math.max(-100,Math.min(0,fb.Volume+step*2.5));
    window.Repaint();
}
function on_playback_time(){ if(SEEK) window.Repaint(); }
function on_playback_seek(){ if(SEEK) window.Repaint(); }
function on_playback_new_track(){ window.Repaint(); }
function on_playback_stop(){ window.Repaint(); }
function on_volume_change(){ if(!SEEK) window.Repaint(); }
