// Anna Glass: lyric helpers without panel state (Round 18, Phase E1).
//  - fileNames(): the file names ESLyric can be configured to save under.
//  - singSeconds(): how long a line takes to sing, for LRC files with line stamps only.
//  - createOffsets(): per-track timing offsets, kept in a window property of the panel.
'use strict';
var AnnaLyricTools=(function(){
 // f = {artist, albumArtist, album, title, track, stem}, already cleaned for file names.
 // The first nine are the Round 11 list (same order); the rest were added in Round 18.
 function fileNames(f){
  const {artist,album,title,stem}=f;
  const albumArtist=f.albumArtist&&f.albumArtist!==artist?f.albumArtist:'';
  const track=f.track||'';
  return [...new Set([
   artist&&title?artist+' - '+title:'',
   artist&&title?artist+'-'+title:'',
   title&&artist?title+' - '+artist:'',
   title,stem,
   artist&&title?artist+'\\'+title:'',
   artist&&title?artist+'\\'+artist+' - '+title:'',
   album&&title?album+'\\'+title:'',
   artist&&album&&title?artist+'\\'+album+'\\'+title:'',
   // Round 18
   artist&&title?artist+'_'+title:'',
   artist&&album&&title?artist+' - '+album+' - '+title:'',
   albumArtist&&title?albumArtist+' - '+title:'',
   track&&title?track+'. '+title:'',
   track&&title?track+' - '+title:'',
   track&&title?track+' '+title:'',
   track&&artist&&title?track+'. '+artist+' - '+title:'',
   album&&track&&title?album+'\\'+track+'. '+title:'',
   album&&track&&title?album+'\\'+track+' - '+title:''
  ].filter(Boolean))];
 }
 // A track's local file path, or '' for streams and unknown schemes. Portable foobar2000
 // stores "file-relative://..\Music\x.flac", relative to its own folder (fb.FoobarPath).
 function localPath(path,foobarDir){
  let p=String(path||'');
  const rel=/^file-relative:\/\//i.exec(p);
  if(rel){
   const base=String(foobarDir||'');
   if(!/^(?:[A-Za-z]:[\\/]|\\\\)/.test(base))return '';
   const parts=base.replace(/[\\/]+$/,'').split(/[\\/]/);
   const root=parts[0]===''?2:1; // "\\server\share" keeps two leading parts
   for(const seg of p.slice(rel[0].length).split(/[\\/]/)){
    if(!seg||seg==='.')continue;
    if(seg==='..'){if(parts.length<=root+(root===2?1:0))return '';parts.pop();}
    else parts.push(seg);
   }
   return parts.join('\\');
  }
  p=p.replace(/^file:\/\//i,'');
  if(/^\/[A-Za-z]:[\\/]/.test(p))p=p.slice(1); // file:///C:/Music/... on Windows
  if(!p||p.indexOf('://')>=0||/^(?:https?|navidrome):/i.test(p))return '';
  return p;
 }
 // Rough singing time: CJK and kana take a beat each, Latin letters about a third of one,
 // spaces and punctuation almost nothing. At least one second.
 const BEAT=0.32;
 function singSeconds(text){
  let beats=0;
  for(const ch of Array.from(String(text||''))){
   if(/[\s.,!?'"、。，．！？「」『』（）()\-–—~〜・…]/.test(ch))beats+=0.1;
   else if(/[A-Za-z0-9]/.test(ch))beats+=0.35;
   else beats+=1;
  }
  return Math.max(1,beats*BEAT);
 }
 // Offsets in seconds per track key; + shows lyrics earlier. At most LIMIT tracks are
 // remembered (the oldest change is dropped first).
 const LIMIT=500,MAX=30,STEP=0.5;
 function createOffsets(property){
  let map={};
  try{const raw=JSON.parse(String(window.GetProperty(property,'{}')||'{}'));
   if(raw&&typeof raw==='object'&&!Array.isArray(raw))
    for(const k of Object.keys(raw)){const v=Number(raw[k]);if(Number.isFinite(v)&&v)map[k]=clamp(v);}
  }catch(e){map={};}
  function clamp(v){return Math.round(Math.max(-MAX,Math.min(MAX,v))*1000)/1000;}
  function save(){window.SetProperty(property,JSON.stringify(map));}
  function get(key){return key&&map[key]?map[key]:0;}
  function set(key,value){
   if(!key)return 0;
   const v=clamp(Number(value)||0);
   delete map[key];
   if(v)map[key]=v;
   const keys=Object.keys(map);
   for(let i=0;i<keys.length-LIMIT;i++)delete map[keys[i]];
   save();return v;
  }
  function nudge(key,steps){return set(key,get(key)+steps*STEP);}
  function reset(key){return set(key,0);}
  return Object.freeze({get,set,nudge,reset});
 }
 return Object.freeze({fileNames,localPath,singSeconds,createOffsets,OFFSET_STEP:STEP});
})();
