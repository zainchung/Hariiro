// Hariiro — unified artwork-side metadata flow.
// SPDX-License-Identifier: MIT - Copyright (c) 2026 zainchung - see LICENSE
// One paint pass owns all text positioning, avoiding independent TitleFormat
// rectangles overlapping when a Japanese title or album wraps.
'use strict';
include('hariiro_shared.js');
include('hariiro_i18n.js');
include('hariiro_theme.js');
const TITLE=gdi.Font('Yu Gothic UI',15,1);
const ARTIST=gdi.Font('Yu Gothic UI',12,1);
const OTHER=gdi.Font('Yu Gothic UI',11,0);
const COLOR_TITLE=0xffffeef7, COLOR_ARTIST=0xfff2d4e5;
const COLOR_ALBUM=0xffdfdfef, COLOR_META=0xffc7d0e6;
const COLOR_CODEC=0xffd2c7dd, DT=0x8024;
const tf={
 title:fb.TitleFormat('$if2(%title%,%filename%)'),
 artist:fb.TitleFormat('$if2(%artist%,%album artist%)'),
 album:fb.TitleFormat('[%album%]'),
 date:fb.TitleFormat('[%date%]'),
 genre:fb.TitleFormat('[%genre%]'),
 codec:fb.TitleFormat('[%codec%][ · %samplerate% Hz][ · %bitspersample% bit]')
};
function field(handle,name){
    try{return String(tf[name].EvalWithMetadb(handle)||'').replace(/[\r\n\t]+/g,' ').trim();}
    catch(e){return '';}
}
function measure(gr,text,font){
    try{return gr.CalcTextWidth(text,font);}
    catch(e){return Array.from(text).length*11;}
}
function trimToWidth(gr,text,font,width){
    if(measure(gr,text,font)<=width)return text;
    const chars=Array.from(text);
    while(chars.length && measure(gr,chars.join('')+'…',font)>width)chars.pop();
    return chars.join('')+'…';
}
function wrapLines(gr,text,font,width,limit){
    const chars=Array.from(text);
    if(!chars.length)return [];
    const lines=[];let current='';
    for(const ch of chars){
        if(current && measure(gr,current+ch,font)>width && lines.length<limit-1){
            lines.push(current.trimEnd());current='';
        }
        current+=ch;
    }
    if(current)lines.push(trimToWidth(gr,current,font,width));
    return lines.slice(0,limit);
}
function on_paint(gr){
 gr=HariiroTheme.graphics(gr);
    const w=window.Width,h=window.Height;if(w<30||h<30)return;
    const handle=fb.GetNowPlaying();
    if(!handle){gr.GdiDrawText(HariiroI18n.t('notPlaying'),TITLE,COLOR_TITLE,1,1,w-2,35,DT);return;}
    let y=2;
    function write(text,font,color,cap,rowH,limit=1){
        if(!text)return;
        const rows=wrapLines(gr,text,font,Math.max(28,cap),limit);
        for(const line of rows){
            if(y+rowH>h)break;
            gr.GdiDrawText(line,font,color,1,y,Math.max(26,cap),rowH,DT);
            y+=rowH;
        }
    }
    // Heart takes the right end of the title row, not the remaining rows.
    // Preserve Yu Gothic UI 15 / 12 / 11 while reducing unused vertical gaps.
    write(field(handle,'title'),TITLE,COLOR_TITLE,w-47,24,2);
    y+=3;
    write(field(handle,'artist'),ARTIST,COLOR_ARTIST,w-6,21,1);
    y+=1;
    write(field(handle,'album'),OTHER,COLOR_ALBUM,w-6,20,2);
    const date=field(handle,'date'),genre=field(handle,'genre');
    if(date)write(date,OTHER,COLOR_META,w-6,18);
    if(genre)write(genre,OTHER,COLOR_META,w-6,18);
    y+=1;
    write(field(handle,'codec'),OTHER,COLOR_CODEC,w-6,20,1);
}
function on_playback_new_track(){window.Repaint();}
function on_playback_stop(){window.Repaint();}
function on_playback_edited(){window.Repaint();}
function on_metadb_changed(){window.Repaint();}
function on_size(){window.Repaint();}

function on_mouse_rbtn_up(){return true;}

function on_panelsui_variable_changed(name){if(HariiroTheme.isLookVariable(name)||name===HariiroShared.PVAR.language)window.Repaint();}
