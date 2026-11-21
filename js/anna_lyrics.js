// Anna Glass V2 — read existing ESLyric-saved lyrics; never search online.
// Transparent display, configurable read-only directories and refresh watcher.
'use strict';
include('anna_shared.js');
include('anna_i18n.js');
include('anna_theme.js');
include('anna_lyric_tools.js');

const F_MAIN = gdi.Font('Yu Gothic UI', 16, 0);
const F_ACTIVE = gdi.Font('Yu Gothic UI', 17, 1);
const F_SMALL = gdi.Font('Segoe UI', 11, 0);
const F_HINT = gdi.Font('Yu Gothic UI', 13, 0);
// Enhanced LRC files may emit the SAME full lyric on many nearby timestamps.
// Merge only adjacent, near-in-time identical lyrics; preserve distant repeats.
const NEAR_DUP_SECONDS = 3.0;
const LINE_H = 44;
const DT_CENTER_SINGLE = 0x8025; // DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS
const LIGHT = 0xffe8eaf7;
const MUTED = 0xffacb9d1;
const ACTIVE = 0xffffedf6;
// Finished lines use a saturated mauve-pink, perceptually distinct from
// the pure white current lyric; future lines remain cool blue-grey.
const PLAYED_NEAR = 0xffec85bb, PLAYED_FAR = 0xffb869a6;
const FUTURE_NEAR = 0xffdce3f3, FUTURE_FAR = 0xffb6c3d9;

let state = { kind: 'empty', lines: [], source: '', message: AnnaI18n.t('noLyrics') };
let plainScroll = 0;
let lastTrack = '';
let lastDrawnCue = -2; // sentinel: initial paint not yet synchronized
let lastFingerprint='';
let watchTimer=0;
let lyricDrag=null, previewCue=-1;
const DRAG_THRESHOLD_PX=6;
const KARAOKE_INTERVAL_MS=50; // 20 fps only while lyrics scroll/word-colour changes
const SCROLL_SETTLE_MS=175;
let karaokeTimer=0;
let smoothFocus=null, lastAnimTime=0, lastKaraokePaint=0;
let searchPollTimer=0, searchPollRemaining=0;
const SEARCH_POLL_INTERVAL_MS=900, SEARCH_POLL_MAX=85;
const ESL_RELOAD_MENU_KEY='Anna.ESLyric.ReloadMenu.v1';
const WATCH_INTERVAL_MS=4000;
const TF_WEB_ARTIST=fb.TitleFormat('$if2(%artist%,$if2(%album artist%,))');
const TF_WEB_TITLE=fb.TitleFormat('$if2(%title%,)');
const TF_ALBUM=fb.TitleFormat('[$meta(album)]');
const TF_ALBUM_ARTIST=fb.TitleFormat('[$meta(album artist)]');
const TF_TRACK=fb.TitleFormat('[$num(%tracknumber%,2)]');
// Round 18: per-track timing offset (+ = lyrics earlier), set from the context menu.
const trackOffsets=AnnaLyricTools.createOffsets('Anna.Lyrics.TrackOffsets.v1');
function lyricOffset(){return trackOffsets.get(lastTrack);}
// Playback time on the lyrics' clock.
function lyricNow(){return (Number(fb.PlaybackTime)||0)+lyricOffset();}
function offsetLabel(v){return (v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(1)+' s';}

function norm(s) { return String(s === null || s === undefined ? '' : s); }
function lrcSeconds(tag,offset){
 const frac=tag[3]?Number(tag[3])/Math.pow(10,tag[3].length):0;
 return Math.max(0,Number(tag[1])*60+Number(tag[2])+frac+offset);
}
function parseLrc(src) {
    const raw = norm(src).replace(/^\ufeff/, '').replace(/\r\n?/g, '\n');
    const input = raw.split('\n').slice(0, 4000);
    const offsetMatch = raw.match(/^\[offset:([+-]?\d+)\]/im);
    const offset = offsetMatch ? Math.max(-30000, Math.min(30000, Number(offsetMatch[1]))) / 1000 : 0;
    const timed = [], plain = [];
    const tagRe = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
    for (const sourceLine of input) {
        const timeTags = [...sourceLine.matchAll(tagRe)];
        const body=sourceLine.replace(tagRe,'');
        const enhancedTag=/<(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?>/g;
        const stripped = body.replace(enhancedTag, '').trim();
        const pieces=[];
        // [mm:ss.xx] line timestamps, <mm:ss.xx> in-line syllable/word timings.
        // The latter are absolute LRC times, not durations.
        const firstTime=timeTags.length?lrcSeconds(timeTags[0],offset):0;
        let cursor=0,previous=null;
        for(const m of body.matchAll(enhancedTag)){
            const before=body.slice(cursor,m.index);
            if(previous)previous.text+=before;
            else if(before.trim())pieces.push({time:firstTime,text:before});
            previous={time:lrcSeconds(m,offset),text:''};pieces.push(previous);
            cursor=m.index+m[0].length;
        }
        if(previous)previous.text+=body.slice(cursor);
        // Do not invent per-character timestamps when only a line stamp exists.
        const karaoke=pieces.filter(v=>v.text.length&&Number.isFinite(v.time));
        if (!stripped || /^\[(ar|al|ti|by|offset|length|re|ve):/i.test(stripped)) continue;
        if (timeTags.length) {
            for (const m of timeTags) {
                const sec=lrcSeconds(m,offset);
                if (Number.isFinite(sec)) timed.push({ time: sec, text: stripped,
                    karaoke:karaoke.length>0?karaoke.map(v=>({...v})):null });
            }
        } else if (!/^\[[^\]]+\]$/.test(stripped)) {
            plain.push(stripped);
        }
    }
    if (timed.length) {
        timed.sort((a, b) => a.time - b.time);
        const lines = [];
        let lastKey = null, lastRawTime = -Infinity;
        for (const cue of timed) {
            // Compare the text, not just the timestamp. Extra spaces, zero-width marks
            // and fullwidth forms should not create apparent duplicates.
            const key = cue.text.normalize('NFKC').replace(/[\s\u200b-\u200d\ufeff]/g, '');
            const duplicate = key && key === lastKey && cue.time >= lastRawTime
                && cue.time - lastRawTime <= NEAR_DUP_SECONDS;
            if (!duplicate) lines.push(cue);
            // Update even when a cue was merged so syllable-by-syllable re-emissions
            // spanning several seconds still collapse to one full lyric line.
            lastKey = key;
            lastRawTime = cue.time;
        }
        if (timed.length !== lines.length)
            console.log('Anna lyrics: merged nearby repeated cues ' + timed.length + ' -> ' + lines.length);
        return { kind: 'synced', lines: lines.slice(0, 3000), rawCount: timed.length };
    }
    if (plain.length) return { kind: 'plain', lines: plain.slice(0, 3000) };
    return { kind: 'empty', lines: [] };
}
function embeddedLyrics(handle) {
    try {
        const info = handle.GetFileInfo();
        // The names are deliberately broad: various Japanese LRC/tagging tools use different fields.
        const wanted = ['SYNCED LYRICS', 'LYRICS', 'UNSYNCED LYRICS', 'SYNCEDLYRICS', 'UNSYNCEDLYRICS', 'LRC'];
        const found = [];
        for (let i = 0; i < info.MetaCount; i++) {
            const key = norm(info.MetaName(i)).toUpperCase().replace(/_/g, ' ').trim();
            if (wanted.includes(key) && info.MetaValueCount(i) > 0) {
                const v = norm(info.MetaValue(i, 0));
                if (v.trim()) found.push(v);
            }
        }
        for (const v of found) {
            const p = parseLrc(v);
            if (p.kind === 'synced') return { ...p, source: 'Embedded · synced' };
        }
        for (const v of found) {
            const p = parseLrc(v);
            if (p.kind !== 'empty') return { ...p, source: 'Embedded · lyrics' };
        }
    } catch (e) { console.log('Anna lyrics: embedded metadata unavailable: ' + String(e)); }
    return null;
}
// Local file path of a track ('' for streams). Handles portable file-relative:// paths.
function trackFilePath(path){return AnnaLyricTools.localPath(path,fb.FoobarPath);}
function sidecars(trackPath) {
    const p = trackFilePath(trackPath);
    if (!p) return [];
    const sep = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
    const dot = p.lastIndexOf('.');
    const stem = dot > sep ? p.slice(0, dot) : p;
    const folder = sep >= 0 ? p.slice(0, sep + 1) : '';
    const out = [stem + '.lrc', stem + '.txt', p + '.lrc'];
    if (folder) out.push(folder + 'lyrics.lrc', folder + 'lyrics.txt');
    return [...new Set(out)];
}
const EXTRA_FOLDERS_KEY='Anna.Lyrics.ExtraFolders.v1';
const SAVE_LOCATION_KEY='Anna.Lyrics.SaveLocation.v1';
const SAVE_LOCATIONS=['tags','config','track','browse'];
function lyricLocationMode(){
    const stored=norm(window.GetProperty(SAVE_LOCATION_KEY,'')).toLowerCase();
    if(SAVE_LOCATIONS.includes(stored))return stored;
    // Preserve the custom directories used by previously installed skins.
    const prior=norm(window.GetProperty(EXTRA_FOLDERS_KEY,'')).trim();
    return prior?'browse':'track';
}
function cleanLyricFilename(s) {
    return norm(s).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')
        .replace(/[. ]+$/g,'').replace(/\s+/g,' ').trim().slice(0,160);
}
function localTrackPath(handle){return trackFilePath(handle&&handle.Path);}
function savedLyricFolders(handle){
    const mode=lyricLocationMode();
    if(mode==='tags')return [];
    if(mode==='config'){
        // ESLyric's Configuration folder mode writes under the foobar2000
        // profile's lyrics folder; fb.ProfilePath supports portable installs.
        const root=norm(fb.ProfilePath).replace(/[\\/]+$/,'');
        return /^(?:[A-Za-z]:[\\/]|\\\\)/.test(root)?[root+'\\lyrics']:[];
    }
    if(mode==='track'){
        const path=localTrackPath(handle);
        const i=Math.max(path.lastIndexOf('\\'),path.lastIndexOf('/'));
        return i>=0?[path.slice(0,i)]:[];
    }
    const configured=norm(window.GetProperty(EXTRA_FOLDERS_KEY,''));
    return [...new Set(configured.split(/[;\r\n]+/).map(v=>v.trim())
        .filter(v=>/^(?:[A-Za-z]:[\\/]|\\\\)/.test(v)))].slice(0,8);
}
function extraLyricSidecars(handle) {
    if(!handle)return [];
    const title=cleanLyricFilename(TF_WEB_TITLE.EvalWithMetadb(handle));
    const artist=cleanLyricFilename(TF_WEB_ARTIST.EvalWithMetadb(handle));
    const album=cleanLyricFilename(TF_ALBUM.EvalWithMetadb(handle));
    const file=localTrackPath(handle).split(/[\\/]/).pop()||'';
    const stem=cleanLyricFilename(file.replace(/\.[^.]+$/,''));
    const albumArtist=cleanLyricFilename(TF_ALBUM_ARTIST.EvalWithMetadb(handle));
    const track=cleanLyricFilename(TF_TRACK.EvalWithMetadb(handle));
    // ESLyric's Filename field is independently configurable, so search the
    // common %title%, %artist% - %title%, audio stem, numbered and nested schemes.
    const names=AnnaLyricTools.fileNames({artist,albumArtist,album,title,track,stem});
    const files=[];
    for(const dir of savedLyricFolders(handle)){
        const root=dir.replace(/[\\/]+$/,'')+'\\';
        for(const name of names)files.push(root+name+'.lrc',root+name+'.txt');
    }
    return [...new Set(files)].slice(0,200);
}
function readLyrics(handle) {
    if (!handle) return { kind: 'empty', lines: [], source: '', message: AnnaI18n.t('lyricsNoPlaying') };
    const path = norm(handle.Path);
    // Follow the same four location modes shown by ESLyric, not a mixture
    // of every folder. Tags means audio metadata, not a disk directory.
    const mode=lyricLocationMode();
    if(mode==='tags')return embeddedLyrics(handle) ||
        {kind:'empty',lines:[],source:'',message:AnnaI18n.t('lyricsNoTags')};
    const candidates=mode==='track'?
        [...sidecars(path),...extraLyricSidecars(handle)]:
        extraLyricSidecars(handle);
    for (const candidate of candidates) {
        try {
            if (!utils.IsFile(candidate)) continue;
            const parsed = parseLrc(utils.ReadTextFile(candidate));
            if (parsed.kind !== 'empty') return { ...parsed,
                source: candidate.toLowerCase().endsWith('.txt')?'Saved lyrics · TXT':'Saved lyrics · LRC', filePath: candidate };
        } catch (e) { console.log('Anna lyrics: cannot read sidecar: ' + String(e)); }
    }
    const embedded = embeddedLyrics(handle);
    if (embedded) return embedded;
    return { kind: 'empty', lines: [], source: '', message: AnnaI18n.t('lyricsNoLocal') };
}
function lyricsFingerprint(result){
    if(!result)return '';
    return result.kind+'|'+(result.source||'')+'|'+(result.filePath||'')+'|'+
        result.lines.map(v=>String(v.time===undefined?'':v.time)+'~'+v.text+'~'+
         (v.karaoke||[]).map(k=>k.time+':'+k.text).join('|')).join('\n');
}
function reloadLyrics(){
    try{
        const handle=fb.GetNowPlaying();
        lastTrack=handle?norm(handle.Path)+'#'+norm(handle.SubSong):'';
        state=readLyrics(handle);
        lastFingerprint=lyricsFingerprint(state);
        plainScroll=0;lastDrawnCue=-2;smoothFocus=null;lastAnimTime=0;
    }catch(e){
        state={kind:'empty',lines:[],source:'',message:AnnaI18n.t('lyricsReadError')};
        lastFingerprint=lyricsFingerprint(state);
        console.log('Anna lyrics: local read '+String(e));
    }
    window.Repaint();
}
// ESLyric saves asynchronously without an event to external panels.
// Scan only while visible, repaint only if the saved file content changes.
function watchSavedLyrics(){
    if(!window.IsVisible)return;
    const handle=fb.GetNowPlaying();
    const key=handle?norm(handle.Path)+'#'+norm(handle.SubSong):'';
    if(key!==lastTrack){reloadLyrics();return;}
    if(!handle)return;
    try{
        const next=readLyrics(handle),fingerprint=lyricsFingerprint(next);
        if(fingerprint!==lastFingerprint){
            state=next;lastFingerprint=fingerprint;plainScroll=0;
            lastDrawnCue=-2;smoothFocus=null;lastAnimTime=0;window.Repaint();
            // The search dialogue does not publish a chosen-lyric callback.
            // Only try ESLyric's non-toggle Reload command after an actual saved-file change.
            if(searchPollTimer){reloadESLyricDisplay(false);stopSearchPoll();}
        }
    }catch(e){console.log('Anna lyrics watch: '+String(e));}
}
function currentIndex() {
    const lines = state.lines;
    if (!lines.length) return -1;
    const t = lyricNow();
    let lo = 0, hi = lines.length - 1, found = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid].time <= t + 0.025) { found = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    return found;
}
// Split only the lyrics that exceed the available width, not every line.
// CalcTextWidth uses the exact GDI font and avoids the previous single-line clipping.
function lyricTextLines(gr, text, font, maxW) {
    const str=String(text||'');
    if (!str || gr.CalcTextWidth(str,font) <= maxW) return [str];
    const glyphs=Array.from(str);
    let lo=1,hi=glyphs.length;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(gr.CalcTextWidth(glyphs.slice(0,mid).join(''),font)<=maxW)lo=mid;else hi=mid-1;}
    let end=Math.max(1,lo);
    // Prefer a natural line boundary when present, without breaking Japanese text mid-byte.
    for(let i=end-1;i>=Math.max(0,end-8);i--){
        if(/[\s、。，。！？!?]/.test(glyphs[i])){end=i+1;break;}
    }
    const first=glyphs.slice(0,end).join('').trim();
    let second=glyphs.slice(end).join('').trim();
    if(gr.CalcTextWidth(second,font)>maxW){
        const tail=Array.from(second);let low=0,high=tail.length;
        while(low<high){const mid=Math.ceil((low+high)/2);if(gr.CalcTextWidth(tail.slice(0,mid).join('')+'…',font)<=maxW)low=mid;else high=mid-1;}
        second=tail.slice(0,low).join('')+'…';
    }
    return [first,second];
}
function paintLyricLine(gr,text,font,color,x,y,w,h) {
    if(h<39){gr.GdiDrawText(text,font,color,x,y,w,h,DT_CENTER_SINGLE);return;}
    const lines=lyricTextLines(gr,text,font,w);
    if(lines.length===1){gr.GdiDrawText(lines[0],font,color,x,y,w,h,DT_CENTER_SINGLE);return;}
    const half=Math.floor(h/2);
    gr.GdiDrawText(lines[0],font,color,x,y,w,half,DT_CENTER_SINGLE);
    gr.GdiDrawText(lines[1],font,color,x,y+half,w,h-half,DT_CENTER_SINGLE);
}
// Enhanced LRC: colour individual glyphs progressively, using the supplied
// syllable/word time boundaries. For multi-character pieces, divide their
// interval uniformly; this interpolation is approximate, not a claimed exact
// phoneme timestamp. Ordinary line-only LRC keeps whole-line highlighting.
function karaokeGlyphs(cue,index){
 const parts=cue.karaoke||[],out=[];
 for(let i=0;i<parts.length;i++){
    const chars=Array.from(parts[i].text),at=parts[i].time;
    const after=i+1<parts.length?parts[i+1].time:
       (state.lines[index+1]&&Number.isFinite(state.lines[index+1].time)?
         state.lines[index+1].time:at+Math.max(.8,chars.length*.22));
    const end=Math.max(at+.05,Math.min(at+Math.max(.8,chars.length*.32),after));
    for(let c=0;c<chars.length;c++)out.push({char:chars[c],at:at+(end-at)*c/Math.max(1,chars.length),
       end:at+(end-at)*(c+1)/Math.max(1,chars.length)});
 }
 return out;
}
function paintKaraokeLine(gr,cue,index,x,y,w,h){
 const glyphs=karaokeGlyphs(cue,index);
 if(!glyphs.length){paintLyricLine(gr,cue.text,F_ACTIVE,ACTIVE,x,y,w,h);return;}
 // Preserve the original lyric's horizontal alignment and two-line rule.
 const font=F_ACTIVE,lineSets=[[]];let width=0;
 for(const g of glyphs){
    const charW=Math.max(0,gr.CalcTextWidth(g.char,font));
    if(width+charW>w&&lineSets.length<2&&lineSets[0].length){lineSets.push([]);width=0;}
    if(lineSets.length===2&&width+charW>w)break; // same clipping budget as ordinary lyrics
    lineSets[lineSets.length-1].push({ ...g, width:charW });width+=charW;
 }
 const rowH=h/lineSets.length,t=lyricNow();
 for(let row=0;row<lineSets.length;row++){
   const group=lineSets[row],length=group.reduce((v,g)=>v+g.width,0);
   let cx=x+(w-length)/2,cy=y+row*rowH;
   for(const g of group){
      const played=t+0.02>=g.end;
      const tint=played?PLAYED_NEAR:(t>=g.at?0xffffb7d9:LIGHT);
      gr.GdiDrawText(g.char,font,tint,cx,cy,g.width+3,rowH,0x4|0x20);
      cx+=g.width;
   }
 }
}
// Plain LRC has only [mm:ss] line-start stamps. The progress below is
// deliberately an ESTIMATE, not exact karaoke timing. Round 18: it runs over the time
// the line takes to sing (AnnaLyricTools.singSeconds), so a short line before a long
// instrumental gap is not stretched over the gap; all glyphs are still revealed by the
// next real timestamp.
function paintEstimatedLine(gr,cue,index,x,y,w,h){
  const next=state.lines[index+1];
  const songEnd=Number(fb.PlaybackLength)||cue.time+6;
  const lineEnd=next&&Number.isFinite(next.time)?next.time:Math.max(cue.time+3,songEnd);
  const finish=Math.min(lineEnd,cue.time+AnnaLyricTools.singSeconds(cue.text));
  const duration=Math.max(.1,finish-cue.time),now=lyricNow();
  const fraction=Math.max(0,Math.min(1,(now-cue.time)/duration));
  const font=F_ACTIVE,chars=Array.from(cue.text),groups=[[]];let width=0;
  for(const ch of chars){
    const cw=Math.max(0,gr.CalcTextWidth(ch,font));
    if(width+cw>w&&groups.length<2&&groups[0].length){groups.push([]);width=0;}
    if(groups.length===2&&width+cw>w)break;
    groups[groups.length-1].push({char:ch,width:cw});width+=cw;
  }
  const total=groups.reduce((sum,g)=>sum+g.length,0);
  const done=fraction>=.95?total:Math.round(fraction*total);
  let n=0;
  for(let r=0;r<groups.length;r++){
    const g=groups[r],tw=g.reduce((sum,v)=>sum+v.width,0);
    let cx=x+(w-tw)/2;
    for(const ch of g){
      gr.GdiDrawText(ch.char,font,n<done?PLAYED_NEAR:ACTIVE,cx,y+r*h/groups.length,
          ch.width+3,h/groups.length,0x4|0x20);
      n++;cx+=ch.width;
    }
  }
}
// Smooth lyric-centred scrolling. The focus row is anchored at the panel midpoint,
// including the first and last cues; virtual blank rows occupy unused space.
function lyricViewport(H){
 const lineH=Math.min(LINE_H,Math.max(32,Math.floor((H-38)/5)));
 const top=32,bottom=Math.max(top+lineH,H-6);
 return {lineH,top,bottom,visible:Math.max(1,Math.floor((bottom-top)/lineH)),
         centerY:Math.round((top+bottom)/2)};
}
function desiredFocus(){return previewCue>=0?previewCue:Math.max(0,currentIndex());}
function syncSmoothFocus(snap=false){
 const target=desiredFocus(),now=Date.now();
 if(smoothFocus===null||snap||Math.abs(smoothFocus-target)>12){
   smoothFocus=target;lastAnimTime=now;return false;
 }
 const dt=Math.max(1,Math.min(110,now-(lastAnimTime||now-35)));
 lastAnimTime=now;
 const diff=target-smoothFocus;
 if(Math.abs(diff)<0.006){smoothFocus=target;return false;}
 smoothFocus+=diff*(1-Math.exp(-dt/SCROLL_SETTLE_MS));
 if(Math.abs(target-smoothFocus)<0.006)smoothFocus=target;
 return smoothFocus!==target;
}
function shownFocus(){
 if(previewCue>=0)return previewCue;
 if(smoothFocus===null)smoothFocus=desiredFocus();
 return smoothFocus;
}
function currentViewportStart(){
 const v=lyricViewport(window.Height);
 return Math.floor(shownFocus()-(v.centerY-v.top)/v.lineH);
}
function cueAtY(y){
 const v=lyricViewport(window.Height);
 return Math.max(0,Math.min(state.lines.length-1,
     Math.round(shownFocus()+(y-v.centerY)/v.lineH)));
}
function on_mouse_lbtn_down(x,y){
 const {top,bottom}=lyricViewport(window.Height);
 if(state.kind!=='synced'||y<top||y>=bottom||!fb.PlaybackLength)return;
 lyricDrag={y,first:cueAtY(y),moved:false};previewCue=-1;
}
function on_mouse_move(x,y,mask){
 if(!lyricDrag||!(mask&1))return;
 const delta=lyricDrag.y-y;
 if(Math.abs(delta)>DRAG_THRESHOLD_PX)lyricDrag.moved=true;
 if(!lyricDrag.moved)return;
 const {lineH}=lyricViewport(window.Height);
 const next=Math.max(0,Math.min(state.lines.length-1,
       lyricDrag.first+Math.round(delta/lineH)));
 if(next!==previewCue){previewCue=next;window.Repaint();}
}
function on_mouse_lbtn_up(x,y){
 if(!lyricDrag)return;
 const drag=lyricDrag;lyricDrag=null;
 const target=drag.moved?previewCue:cueAtY(y);
 previewCue=-1;
 if(target>=0&&state.lines[target]&&Number.isFinite(state.lines[target].time)){
   // Scrubbing should land directly on the chosen line, without an unrelated flyover.
   smoothFocus=target;lastAnimTime=Date.now();
   fb.PlaybackTime=Math.max(0,Math.min(fb.PlaybackLength,state.lines[target].time-lyricOffset()));
 }
 window.Repaint();
}
function on_mouse_leave(){
 if(!lyricDrag&&previewCue!==-1){previewCue=-1;window.Repaint();}
}
function cueTime(t){
 if(!Number.isFinite(t))return '--:--';
 const secs=Math.max(0,Math.floor(t));
 return Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0');
}
function paintCue(gr,cue,index,focus,y,lineH,W,dragging){
 const isCurrent=index===focus;
 const n=currentIndex(),played=n>=0&&index<n;
 if(isCurrent){
   gr.FillRoundRect(3,y+1,Math.max(1,W-6),lineH-2,9,9,dragging?0xb66b335c:0x75683b67);
   gr.FillRoundRect(5,y+4,3,Math.max(7,lineH-8),2,2,dragging?0xffffe4ee:0xffffb7da);
   gr.DrawLine(11,y+lineH-3,W-11,y+lineH-3,1.6,dragging?0xffffdcf0:0xa6edabc9);
   // Subtle time-progress line, derived only from real LRC line timestamps.
   if(!dragging&&state.lines[index+1]&&Number.isFinite(state.lines[index+1].time)){
     const dur=state.lines[index+1].time-cue.time;
     if(dur>0){const fraction=Math.max(0,Math.min(1,(lyricNow()-cue.time)/dur));
       if(fraction>0)gr.FillRoundRect(12,y+lineH-5,Math.max(2,(W-24)*fraction),3,1,1,0xb6ffc9e4);
     }
   }
 }
 const color=isCurrent?ACTIVE:played?(focus-index<3?PLAYED_NEAR:PLAYED_FAR):
       (index-focus<3?FUTURE_NEAR:FUTURE_FAR);
 if(index===n&&previewCue<0){
   if(cue.karaoke&&cue.karaoke.length)
      paintKaraokeLine(gr,cue,index,12,y+2,Math.max(1,W-24),lineH-5);
   else paintEstimatedLine(gr,cue,index,12,y+2,Math.max(1,W-24),lineH-5);
 }else paintLyricLine(gr,cue.text,isCurrent?F_ACTIVE:F_MAIN,
            color,12,y+2,Math.max(1,W-24),lineH-5);
}
function on_paint(gr){
 gr=AnnaTheme.graphics(gr);
 const W=window.Width,H=window.Height;
 if(W<4||H<4)return;
 if(state.kind==='empty'){
   lastDrawnCue=-1;
   gr.GdiDrawText(state.message,F_HINT,LIGHT,6,Math.max(36,H/2-26),W-12,32,DT_CENTER_SINGLE);
   if(fb.GetNowPlaying()){
     gr.GdiDrawText(AnnaI18n.t('saveESLyric'),F_SMALL,MUTED,6,Math.max(63,H/2+12),W-12,23,DT_CENTER_SINGLE);
     gr.GdiDrawText(AnnaI18n.t('lyricRightClickHint'),F_SMALL,MUTED,6,Math.max(85,H/2+35),W-12,23,DT_CENTER_SINGLE);
   }
   return;
 }
 const v=lyricViewport(H),{lineH,top,bottom,visible,centerY}=v;
 if(state.kind==='plain'){
   for(let row=0;row<visible&&row+plainScroll<state.lines.length;row++){
     paintLyricLine(gr,state.lines[row+plainScroll],F_MAIN,LIGHT,12,top+row*lineH,
           Math.max(1,W-24),lineH-5);
   }
   return;
 }
 const offset=lyricOffset();
 if(offset)gr.GdiDrawText(AnnaI18n.t('lyricOffset')+' '+offsetLabel(offset),F_SMALL,MUTED,6,6,W-12,20,0x8026);
 syncSmoothFocus(false);
 const focus=previewCue>=0?previewCue:Math.max(0,currentIndex());
 const display=shownFocus();
 lastDrawnCue=currentIndex();
 const start=Math.max(0,Math.floor(display-(centerY-top)/lineH)-1);
 const end=Math.min(state.lines.length-1,Math.ceil(display+(bottom-centerY)/lineH)+1);
 for(let index=start;index<=end;index++){
   const y=centerY+(index-display)*lineH-lineH/2;
   if(y+lineH<top||y>=bottom)continue;
   paintCue(gr,state.lines[index],index,focus,y,lineH,W,previewCue>=0);
 }
 if(lyricDrag&&previewCue>=0&&state.lines[previewCue]){
   // A visible scrub ruler and target-time caption. This never covers DESK ON.
   const y=centerY+lineH/2;
   gr.DrawLine(10,y,W-10,y,1.8,0xffffcfe9);
   gr.FillRoundRect(8,H-37,W-16,28,8,8,0xbd41264e);
   gr.DrawRoundRect(8,H-37,W-16,28,8,8,1,0xfff4b9d8);
   gr.GdiDrawText('↕ '+cueTime(state.lines[previewCue].time)+'  ·  '+AnnaI18n.t('lyricReleaseJump'),
      F_SMALL,0xffffe6f4,13,H-34,W-26,22,DT_CENTER_SINGLE);
 }
}
function selectLocationMode(mode){
    if(!SAVE_LOCATIONS.includes(mode))return false;
    window.SetProperty(SAVE_LOCATION_KEY,mode);
    reloadLyrics();
    return true;
}
// ESLyric documents RequestLyric(title,artist) via its optional external JS COM API.
// Some JS hosts implement ActiveXObject('ESLyric') as a compatibility stub; in that
// case try a registered main-menu command, never claim search succeeded if absent.
const ESL_SEARCH_MENU_KEY='Anna.ESLyric.LyricSearchMenu.v1';
function stopSearchPoll(){
 if(searchPollTimer){window.ClearInterval(searchPollTimer);searchPollTimer=0;}
 searchPollRemaining=0;
}
function reloadESLyricDisplay(showError){
 if(!utils.CheckComponent('foo_uie_eslyric'))return false;
 const configured=norm(window.GetProperty(ESL_RELOAD_MENU_KEY,'')).trim();
 const commands=[configured,'View/ESLyric/Reload lyric',
  'View/ESLyric/Panels/Reload lyric','View/ESLyric/Panels/Reload lyrics'];
 for(const path of [...new Set(commands.filter(Boolean))]){
   try{if(fb.RunMainMenuCommand(path)===true){
     console.log('Anna lyrics: ESLyric refresh via '+path);return true;
   }}catch(e){console.log('Anna lyrics: refresh failed '+path+' '+String(e));}
 }
 if(showError)fb.ShowPopupMessage(AnnaI18n.t('lyricsReloadMissing'),'Anna Lyrics');
 return false;
}
function configureReloadMenu(){
 try{const old=norm(window.GetProperty(ESL_RELOAD_MENU_KEY,''));
   const v=utils.InputBox(window.ID,AnnaI18n.t('lyricsReloadPrompt'),'ESLyric refresh path',old||'View/ESLyric/Reload lyric',true);
   if(v!==null&&v!==undefined){const val=norm(v).trim();
     if(!val||/^View\/ESLyric\/[^\r\n]{3,180}$/i.test(val))window.SetProperty(ESL_RELOAD_MENU_KEY,val);
   }
 }catch(e){console.log('Anna lyrics: refresh menu configure '+String(e));}
}
function startSearchPoll(){
 stopSearchPoll();searchPollRemaining=SEARCH_POLL_MAX;
 searchPollTimer=window.SetInterval(function(){
   if(!window.IsVisible)return;
   if(--searchPollRemaining<=0){stopSearchPoll();return;}
   watchSavedLyrics();
 },SEARCH_POLL_INTERVAL_MS);
}

function esLyricSearch(){
 if(!utils.CheckComponent('foo_uie_eslyric')){
    fb.ShowPopupMessage(AnnaI18n.t('missingESLyric'),'Anna Lyrics');return false;
 }
 // This exact static main-menu path opens the real Lyric Search WINDOW.
 // RequestLyric() only launches background retrieval and is not equivalent.
 const configured=norm(window.GetProperty(ESL_SEARCH_MENU_KEY,'')).trim();
 const paths=[configured,'View/ESLyric/Search...','View/ESLyric/Search',
              'View/ESLyric/Panels/Lyric search'];
 for(const path of [...new Set(paths.filter(Boolean))]){
   try{
      if(fb.RunMainMenuCommand(path)===true){
         // Manual selection in ESLyric's own window does not notify JS Panel.
         // Watch saved local lyrics promptly, without claiming the desktop overlay is updated.
         startSearchPoll();
         console.log('Anna lyrics: opened ESLyric search via '+path);return true;
      }
   }catch(e){console.log('Anna lyrics: search menu failed '+path+': '+String(e));}
 }
 fb.ShowPopupMessage(AnnaI18n.t('lyricsSearchWindowFailed'), 'Anna Lyrics');
 return false;
}
function requestLyricInBackground(){
 const playing=fb.GetNowPlaying();if(!playing)return false;
 try{
  const esl=new ActiveXObject('ESLyric');
  if(!esl||typeof esl.RequestLyric!=='function')return false;
  const title=norm(TF_WEB_TITLE.EvalWithMetadb(playing)).trim();
  const artist=norm(TF_WEB_ARTIST.EvalWithMetadb(playing)).trim();
  esl.RequestLyric(title,artist);
  return true;
 }catch(e){console.log('Anna lyrics: background request unavailable: '+String(e));return false;}
}
function configureSearchMenu(){
    try{
        const old=norm(window.GetProperty(ESL_SEARCH_MENU_KEY,''));
        const v=utils.InputBox(window.ID,AnnaI18n.t('lyricsSearchPrompt'),'ESLyric lyric search',old||'View/ESLyric/Search...',true);
        if(v!==null&&v!==undefined){
            const cmd=norm(v).trim();
            if(cmd&&!/^View\/ESLyric\/[^\r\n]{3,180}$/i.test(cmd)){fb.ShowPopupMessage(AnnaI18n.t('lyricsInvalidMenu'),'Anna Lyrics');return;}
            window.SetProperty(ESL_SEARCH_MENU_KEY,cmd);
        }
    }catch(e){console.log('Anna lyrics: search-menu input '+String(e));}
}
// Reveal the actual file that supplied the currently visible lyrics.
// Embedded tag lyrics have no separate file and are reported as such.
function openCurrentLyricsLocation(){
  const path=norm(state.filePath||'');
  if(!path){
    fb.ShowPopupMessage(state.kind==='empty'?AnnaI18n.t('lyricsMissing'):AnnaI18n.t('lyricsEmbedded'),'Anna Lyrics');
    return false;
  }
  // Never pass an unvalidated shell command or path to explorer.
  if(!/^(?:[A-Za-z]:[\\/]|\\\\)/.test(path)||/["\r\n]/.test(path)){
    fb.ShowPopupMessage(AnnaI18n.t('lyricsPathInvalid'),'Anna Lyrics');
    return false;
  }
  try{
    // Not all installed JS Panel versions implement utils.IsFile or utils.Run.
    const check=typeof utils.IsFile==='function'?utils.IsFile(path):
        typeof utils.FileTest==='function'?!!utils.FileTest(path,'e'):
        typeof utils.FileExists==='function'?utils.FileExists(path):true;
    if(!check){fb.ShowPopupMessage(AnnaI18n.t('lyricsNoFiles'),'Anna Lyrics');return false;}
    let launched=false;
    if(typeof utils.Run==='function')launched=utils.Run('explorer.exe','/select,"'+path+'"')!==false;
    else if(typeof ActiveXObject==='function'){
       const shell=new ActiveXObject('WScript.Shell');
       shell.Run('explorer.exe /select,"'+path+'"',1,false);launched=true;
    }
    if(!launched)throw new Error(AnnaI18n.t('lyricsExplorerUnsupported'));
    return true;
  }catch(e){
    console.log('Anna lyrics: reveal failed '+String(e));
    fb.ShowPopupMessage(AnnaI18n.t('lyricsExplorerFailed')+'：'+String(e),'Anna Lyrics');
    return false;
  }
}
function on_mouse_rbtn_up(x,y) {
    const m=window.CreatePopupMenu();
    m.AppendMenuItem(0,1,AnnaI18n.t('lyricReload'));
    m.AppendMenuItem(0,7,AnnaI18n.t('lyricLocate'));
    m.AppendMenuItem(0,2,AnnaI18n.t('lyricSearch'));
    m.AppendMenuItem(0,3,AnnaI18n.t('lyricSearchConfig'));
    m.AppendMenuItem(0,4,AnnaI18n.t('lyricRequest'));
    m.AppendMenuItem(0,5,AnnaI18n.t('lyricRefresh'));
    m.AppendMenuItem(0,6,AnnaI18n.t('lyricRefreshConfig'));
    m.AppendMenuSeparator();
    // Round 18: timing offset for this track (only meaningful for timed lyrics).
    const offsetFlags=state.kind==='synced'&&lastTrack?0:1; // MF_GRAYED
    m.AppendMenuItem(offsetFlags,30,AnnaI18n.t('lyricEarlier'));
    m.AppendMenuItem(offsetFlags,31,AnnaI18n.t('lyricLater'));
    m.AppendMenuItem(offsetFlags,32,AnnaI18n.t('lyricOffsetReset')+' ('+offsetLabel(lyricOffset())+')');
    m.AppendMenuSeparator();
    const selected=lyricLocationMode();
    const labels=[
        AnnaI18n.t('lyricTags'),
        AnnaI18n.t('lyricConfig'),
        AnnaI18n.t('lyricTrack'),
        AnnaI18n.t('lyricBrowse') 
    ];
    for(let i=0;i<labels.length;i++)
        m.AppendMenuItem(0,20+i,(selected===SAVE_LOCATIONS[i]?'✓ ':'   ')+labels[i]);
    const cmd=m.TrackPopupMenu(x,y);
    if(cmd===1){reloadLyrics();return true;}
    if(cmd===7){openCurrentLyricsLocation();return true;}
    if(cmd===2){esLyricSearch();return true;}
    if(cmd===3){configureSearchMenu();return true;}
    if(cmd===4){if(!requestLyricInBackground())fb.ShowPopupMessage(AnnaI18n.t('lyricsNoBackground'),'Anna Lyrics');return true;}
    if(cmd===5){reloadESLyricDisplay(true);reloadLyrics();return true;}
    if(cmd===6){configureReloadMenu();return true;}
    if(cmd>=20&&cmd<=22)return selectLocationMode(SAVE_LOCATIONS[cmd-20]);
    if(cmd>=30&&cmd<=32){
        if(cmd===32)trackOffsets.reset(lastTrack);else trackOffsets.nudge(lastTrack,cmd===30?1:-1);
        syncSmoothFocus(true);lastDrawnCue=-2;window.Repaint();return true;
    }
    if(cmd===23){
        // The JS Panel host does not expose the native Windows folder picker.
        // Browse opens a small folder-path input instead of a broken shell API.
        try{
            const previous=norm(window.GetProperty(EXTRA_FOLDERS_KEY,''));
            const chosen=utils.InputBox(window.ID,
                AnnaI18n.t('lyricsFolderPrompt'),
                AnnaI18n.t('lyricsFolderTitle'),previous,true);
            if(chosen!==null&&chosen!==undefined){
                const value=norm(chosen).trim().slice(0,3000);
                const dirs=value.split(/[;\r\n]+/).map(v=>v.trim()).filter(Boolean);
                if(dirs.length&&dirs.every(d=>/^(?:[A-Za-z]:[\\/]|\\\\)/.test(d))){
                    window.SetProperty(EXTRA_FOLDERS_KEY,value);
                    selectLocationMode('browse');
                }else console.log('Anna lyrics: an absolute lyric save folder is required');
            }
        }catch(e){console.log('Anna lyrics: Browse input '+String(e));}
        return true;
    }
    return true;
}
function on_mouse_wheel(step){
    if(state.kind!=='plain')return;
    const {visible}=lyricViewport(window.Height);
    plainScroll=Math.max(0,Math.min(Math.max(0,state.lines.length-visible),plainScroll-step*2));
    window.Repaint();
}
function on_playback_new_track() { stopSearchPoll();reloadLyrics(); }
function on_playback_stop() { stopSearchPoll();reloadLyrics(); }
function on_playback_edited() { reloadLyrics(); }
function on_metadb_changed() { reloadLyrics(); }
// The JS panel receives time updates roughly once per second; most updates do not
// change the highlighted LRC line. Skip the unnecessary full glass redraw.
function repaintIfCueChanged() {
    if (state.kind !== 'synced') return;
    const cue = currentIndex();
    if (cue !== lastDrawnCue) { lastDrawnCue = cue;window.Repaint(); }
}
function on_playback_seek() {syncSmoothFocus(true);repaintIfCueChanged();window.Repaint();}
function on_playback_time() { repaintIfCueChanged(); }
function on_playback_pause() { window.Repaint(); }
function on_size() { window.Repaint(); }
reloadLyrics();
watchTimer=window.SetInterval(watchSavedLyrics,WATCH_INTERVAL_MS);
karaokeTimer=window.SetInterval(function(){
 if(window.IsVisible===false||state.kind!=='synced'||lyricDrag)return;
 if(syncSmoothFocus(false)){window.Repaint();return;}
 const i=currentIndex(),cue=state.lines[i],now=Date.now();
 if(fb.IsPlaying&&!fb.IsPaused&&cue&&now-lastKaraokePaint>=125){
   lastKaraokePaint=now;window.Repaint();
 }
},KARAOKE_INTERVAL_MS);
function on_script_unload(){
 if(watchTimer)window.ClearInterval(watchTimer);
 if(karaokeTimer)window.ClearInterval(karaokeTimer);
 stopSearchPoll();
}

function on_panelsui_variable_changed(name){
 if(name===AnnaShared.PVAR.language){reloadLyrics();return;}
 if(name===AnnaShared.PVAR.themeHue)window.Repaint();
}

// Lyrics are display-only. Explicitly reject OLE data so dragged playlist
// sources cannot fall through to foobar2000's default file import path.
function on_drag_enter(action){action.Effect=0;}
function on_drag_over(action){action.Effect=0;}
function on_drag_drop(action){action.Effect=0;}
function on_drag_leave(){}
