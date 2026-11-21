// Round 22 (4): every colour's pictures are the pink set recoloured by the same rule as the
// vector colours (HariiroTheme.recolor), pixel for pixel - before, dark and pale pink tints were
// skipped, so the other sets kept pink glows, rings and cables. Also the now-playing texts
// (top right, bottom left) follow the colour.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { root, read } from './helpers/js_panel.mjs';
import { createHost, panelContext, run } from './helpers/fake_host.mjs';

// Minimal PNG reader: 8-bit RGBA, not interlaced (what the controls are).
function png(file) {
  const b = fs.readFileSync(file);
  let p = 8, w = 0, h = 0, idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), data = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); assert.equal(data[8], 8); assert.equal(data[9], 6); assert.equal(data[12], 0); }
    if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * 4), stride = w * 4;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? out[y * stride + x - 4] : 0, up = y ? out[(y - 1) * stride + x] : 0, c = x >= 4 && y ? out[(y - 1) * stride + x - 4] : 0;
      const pa = Math.abs(up - c), pb = Math.abs(a - c), pc = Math.abs(a + up - 2 * c);
      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? up : f === 3 ? (a + up) >> 1 : (pa <= pb && pa <= pc ? a : pb <= pc ? up : c);
      out[y * stride + x] = (row[x] + pred) & 255;
    }
  }
  return { w, h, px: out };
}

const PALETTES = Object.entries(JSON.parse('{"violet":278,"blue":211,"teal":174,"amber":36,"mint":150}'));
const names = fs.readdirSync(root + '/images/controls/pink').filter(f => f.endsWith('.png'));
for (const [id, degree] of PALETTES) {
  const host = createHost({ vars: { 'hariiro.theme.hue': id, 'hariiro.theme.degree': String(degree) } });
  const ctx = panelContext(host);
  run(ctx, "include('hariiro_theme.js');");
  const T = ctx.HariiroTheme;
  for (const n of names) {
    const base = png(`${root}/images/controls/pink/${n}`), mine = png(`${root}/images/controls/${id}/${n}`);
    assert.equal(mine.w, base.w); assert.equal(mine.h, base.h);
    let bad = 0, first = '';
    for (let i = 0; i < base.px.length; i += 4) {
      const a = base.px[i + 3];
      assert.equal(mine.px[i + 3], a, `${id}/${n}: alpha kept`);
      if (a < 8) continue;
      const want = T.recolor((0xff000000 | (base.px[i] << 16) | (base.px[i + 1] << 8) | base.px[i + 2]) >>> 0);
      const d = Math.max(Math.abs(((want >>> 16) & 255) - mine.px[i]), Math.abs(((want >>> 8) & 255) - mine.px[i + 1]), Math.abs((want & 255) - mine.px[i + 2]));
      if (d > 2) { bad++; if (!first) first = `pixel ${i / 4}: got ${mine.px[i]},${mine.px[i + 1]},${mine.px[i + 2]} want ${(want >>> 16) & 255},${(want >>> 8) & 255},${want & 255}`; }
    }
    assert.equal(bad, 0, `${id}/${n}: ${bad} pixels differ from the rule (${first})`);
  }
}

// Now-playing texts: the pale pink ones follow the colour.
{
  const host = createHost({ vars: { 'hariiro.theme.hue': 'blue', 'hariiro.theme.degree': '211' } });
  const ctx = panelContext(host);
  run(ctx, "include('hariiro_theme.js');");
  const src = read('js/hariiro_now_details.js');
  for (const name of ['COLOR_TITLE', 'COLOR_ARTIST', 'COLOR_CODEC']) {
    const v = Number(src.match(new RegExp(name + '=(0x[0-9a-fA-F]{8})'))[1]);
    assert.notEqual(ctx.HariiroTheme.recolor(v), v, name + ' follows the colour');
  }
}
console.log('test_round22_icons: ok');
