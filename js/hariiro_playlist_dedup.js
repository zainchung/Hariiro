// Hariiro: physical-file identity for ordinary playlist imports.
// One canonical full path = one file, regardless of title tags or SubSong.
// Existing duplicates are grandfathered in; only newly imported extras go.
'use strict';
const HariiroPlaylistDedup = (function () {
    function key(handle) {
        if (!handle || handle.Path === undefined || handle.Path === null) return '';
        const path = String(handle.Path);
        if (!path || /^(?:https?|ftp|rtsp|mms):\/\//i.test(path)) return '';
        // Windows file names are case-insensitive; slash conventions may differ
        // between file-drop paths and media-library handles.
        return path.replace(/\//g, '\\').toLowerCase();
    }
    function paths(handles) { return Array.from(handles, key); }
    function count(keys) {
        const counts = new Map();
        for (const path of keys) if (path) counts.set(path, (counts.get(path) || 0) + 1);
        return counts;
    }
    function redundantAddedIndices(before, after) {
        const previous = count(before), current = count(after);
        const excess = new Map();
        for (const [path, n] of current) {
            // Baseline duplicates belong to the user and must survive.
            const allowed = Math.max(1, previous.get(path) || 0);
            if (n > allowed) excess.set(path, n - allowed);
        }
        if (!excess.size) return [];
        // Match the pre-import sequence first so ordinary append operations
        // remove the newly inserted copies, not the original playlist rows.
        const oldPositions = new Set();
        let j = 0;
        for (let i = 0; i < after.length && j < before.length; i++) {
            if (after[i] === before[j]) { oldPositions.add(i); j++; }
        }
        const remove = [];
        for (const original of [false, true]) {
            // Prefer later copies within one import, preserving its first file.
            for (let i = after.length - 1; i >= 0; i--) {
                if (oldPositions.has(i) !== original) continue;
                const path = after[i], remaining = excess.get(path) || 0;
                if (remaining > 0) { remove.push(i); excess.set(path, remaining - 1); }
            }
        }
        return remove.sort((a, b) => a - b);
    }
    function uniqueHandleList(handles, newList) {
        const out = newList(), seen = new Set();
        const values = typeof handles.Convert === 'function' ? handles.Convert() : handles;
        for (const h of values) {
            const path = key(h);
            if (path && seen.has(path)) continue;
            if (path) seen.add(path);
            out.Add(h);
        }
        return out;
    }
    return { key, paths, redundantAddedIndices, uniqueHandleList };
})();
