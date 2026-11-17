// Anna Glass V2 / Stage 3I.2 - repaint synced lyrics only when active line changes.
// For Panels UI (reborn) + JS Panel 1.7.0.
// It intentionally does not draw an opaque cover or fetch lyrics from the internet.
'use strict';

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
const MUTED = 0xff9eafca;
const ACTIVE = 0xffffd3df;
const GOLD = 0xffe4bb82;

let state = { kind: 'empty', lines: [], source: '', message: '歌詞がありません' };
let plainScroll = 0;
let lastTrack = '';
let lastDrawnCue = -2; // sentinel: initial paint not yet synchronized

function norm(s) { return String(s === null || s === undefined ? '' : s); }
function parseLrc(src) {
    const raw = norm(src).replace(/^\ufeff/, '').replace(/\r\n?/g, '\n');
    const input = raw.split('\n').slice(0, 4000);
    const offsetMatch = raw.match(/^\[offset:([+-]?\d+)\]/im);
    const offset = offsetMatch ? Math.max(-30000, Math.min(30000, Number(offsetMatch[1]))) / 1000 : 0;
    const timed = [], plain = [];
    const tagRe = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
    for (const sourceLine of input) {
        const timeTags = [...sourceLine.matchAll(tagRe)];
        const stripped = sourceLine.replace(tagRe, '').replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, '').trim();
        if (!stripped || /^\[(ar|al|ti|by|offset|length|re|ve):/i.test(stripped)) continue;
        if (timeTags.length) {
            for (const m of timeTags) {
                const frac = m[3] ? Number(m[3]) / Math.pow(10, m[3].length) : 0;
                const sec = Number(m[1]) * 60 + Number(m[2]) + frac + offset;
                if (Number.isFinite(sec)) timed.push({ time: Math.max(0, sec), text: stripped });
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
function sidecars(trackPath) {
    let p = norm(trackPath).replace(/^file:\/\//i, '');
    if (/^\/[A-Za-z]:[\\/]/.test(p)) p = p.slice(1); // file:///C:/Music/... on Windows
    if (!p || /^(https?|navidrome):/i.test(p) || p.indexOf('://') >= 0) return [];
    const sep = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
    const dot = p.lastIndexOf('.');
    const stem = dot > sep ? p.slice(0, dot) : p;
    const folder = sep >= 0 ? p.slice(0, sep + 1) : '';
    const out = [stem + '.lrc', p + '.lrc'];
    if (folder) out.push(folder + 'lyrics.lrc');
    return [...new Set(out)];
}
function readLyrics(handle) {
    if (!handle) return { kind: 'empty', lines: [], source: '', message: '再生している曲がありません' };
    const path = norm(handle.Path);
    // Prefer a local synced .lrc over a plain tag.
    for (const candidate of sidecars(path)) {
        try {
            if (!utils.IsFile(candidate)) continue;
            const parsed = parseLrc(utils.ReadTextFile(candidate));
            if (parsed.kind !== 'empty') return { ...parsed, source: 'Local .lrc' };
        } catch (e) { console.log('Anna lyrics: cannot read sidecar: ' + String(e)); }
    }
    const embedded = embeddedLyrics(handle);
    if (embedded) return embedded;
    return { kind: 'empty', lines: [], source: '', message: 'ローカル歌詞が見つかりません' };
}
function reloadLyrics() {
    try {
        const h = fb.GetNowPlaying();
        lastTrack = h ? norm(h.Path) : '';
        state = readLyrics(h);
        plainScroll = 0;
        lastDrawnCue = -2;
    } catch (e) {
        state = { kind: 'empty', lines: [], source: '', message: '歌詞の読み込みに失敗しました' };
        console.log('Anna lyrics load failed: ' + String(e));
    }
    window.Repaint();
}
function currentIndex() {
    const lines = state.lines;
    if (!lines.length) return -1;
    const t = fb.PlaybackTime || 0;
    let lo = 0, hi = lines.length - 1, found = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid].time <= t + 0.025) { found = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    return found;
}
function on_paint(gr) {
    const W = window.Width, H = window.Height;
    if (W < 4 || H < 4) return;
    // The host already draws LYRICS + MODE. No duplicate sub-heading here.
    // Alpha-composited glass: preserve the continuous Anna wallpaper.
    gr.FillSolidRect(1, 1, W - 2, H - 2, 0x8009162f);
    gr.DrawRect(1, 1, Math.max(1, W - 3), Math.max(1, H - 3), 1, 0x56e2ba8c);

    if (state.kind === 'empty') {
        lastDrawnCue = -1;
        gr.GdiDrawText(state.message, F_HINT, LIGHT, 12, Math.max(20, H / 2 - 34), W - 24, 36, DT_CENTER_SINGLE);
        gr.GdiDrawText('同名 .lrc または歌詞タグを使用', F_SMALL, MUTED,
            10, Math.max(52, H / 2 + 5), W - 20, 25, DT_CENTER_SINGLE);
        gr.GdiDrawText('MODE：原生歌詞に切替', F_SMALL, GOLD,
            10, Math.max(82, H / 2 + 38), W - 20, 25, DT_CENTER_SINGLE);
        return;
    }

    const lineH = Math.min(LINE_H, Math.max(32, Math.floor((H - 34) / 4)));
    const top = 9, bottom = Math.max(top + lineH, H - 21);
    const visible = Math.max(1, Math.floor((bottom - top) / lineH));
    const cueIndex = state.kind === 'synced' ? currentIndex() : -1;
    lastDrawnCue = cueIndex;
    const focus = state.kind === 'synced' ? Math.max(0, cueIndex) : 0;
    const start = state.kind === 'synced'
        ? Math.min(Math.max(0, state.lines.length - visible), Math.max(0, focus - Math.floor(visible / 2)))
        : Math.min(Math.max(0, state.lines.length - visible), plainScroll);

    for (let row = 0; row < visible && start + row < state.lines.length; row++) {
        const index = start + row, y = top + row * lineH;
        const highlighted = cueIndex >= 0 && index === cueIndex;
        if (highlighted) {
            gr.FillRoundRect(9, y + 2, Math.max(1, W - 18), lineH - 5, 8, 8, 0x60572b53);
            // A narrow rose-gold active marker increases legibility without a solid rectangle.
            gr.FillRoundRect(11, y + 9, 2, Math.max(7, lineH - 19), 1, 1, 0xbfe7b38d);
        }
        const distance = cueIndex >= 0 ? Math.abs(index - cueIndex) : 0;
        const color = state.kind === 'plain' ? LIGHT
            : highlighted ? ACTIVE
            : distance <= 1 ? LIGHT
            : distance <= 2 ? 0xffc7cadb : MUTED;
        gr.GdiDrawText(state.lines[index].text, highlighted ? F_ACTIVE : F_MAIN,
            color, 12, y + 2, Math.max(1, W - 24), lineH - 5, DT_CENTER_SINGLE);
    }
    gr.FillSolidRect(10, H - 18, Math.max(1, W - 20), 1, 0x5edab890);
    const sub = state.source + (state.kind === 'synced'
        ? '  ·  ' + state.lines.length + ' lines'
        : '  ·  scroll to read');
    gr.GdiDrawText(sub, F_SMALL, MUTED, 12, H - 17, W - 24, 15, DT_CENTER_SINGLE);
}
function on_mouse_wheel(step) {
    if (state.kind !== 'plain') return;
    const lineH = Math.min(LINE_H, Math.max(32, Math.floor((window.Height - 34) / 4)));
    const top = 9, bottom = Math.max(top + lineH, window.Height - 21);
    const visible = Math.max(1, Math.floor((bottom - top) / lineH));
    plainScroll = Math.max(0, Math.min(Math.max(0, state.lines.length - visible), plainScroll - step * 2));
    window.Repaint();
}
function on_playback_new_track() { reloadLyrics(); }
function on_playback_stop() { reloadLyrics(); }
function on_playback_edited() { reloadLyrics(); }
function on_metadb_changed() { reloadLyrics(); }
// The JS panel receives time updates roughly once per second; most updates do not
// change the highlighted LRC line. Skip the unnecessary full glass redraw.
function repaintIfCueChanged() {
    if (state.kind !== 'synced') return;
    const cue = currentIndex();
    if (cue !== lastDrawnCue) { lastDrawnCue = cue; window.Repaint(); }
}
function on_playback_seek() { repaintIfCueChanged(); }
function on_playback_time() { repaintIfCueChanged(); }
function on_playback_pause() { /* lyric content does not depend on pause state */ }
function on_size() { window.Repaint(); }
reloadLyrics();
