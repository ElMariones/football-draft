// Generates app/favicon.ico: gold background, dark "XI" pixel-art text.
// Requires only Node.js built-ins (zlib).
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ---------- canvas ----------

function makeCanvas(w, h, r, g, b, a) {
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px[i*4]=r; px[i*4+1]=g; px[i*4+2]=b; px[i*4+3]=a;
  }
  return px;
}

function setPixel(px, w, x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  px[i]=r; px[i+1]=g; px[i+2]=b; px[i+3]=255;
}

// ---------- pixel-art glyphs ----------

const X_GLYPH = [
  [1,0,0,0,1],
  [1,0,0,0,1],
  [0,1,0,1,0],
  [0,0,1,0,0],
  [0,1,0,1,0],
  [1,0,0,0,1],
  [1,0,0,0,1],
];

const I_GLYPH = [
  [1,1,1],
  [0,1,0],
  [0,1,0],
  [0,1,0],
  [0,1,0],
  [0,1,0],
  [1,1,1],
];

function drawGlyph(px, w, h, glyph, startX, startY, scale, r, g, b) {
  for (let row = 0; row < glyph.length; row++) {
    for (let col = 0; col < glyph[row].length; col++) {
      if (!glyph[row][col]) continue;
      for (let sy = 0; sy < scale; sy++)
        for (let sx = 0; sx < scale; sx++)
          setPixel(px, w, startX + col*scale + sx, startY + row*scale + sy, r, g, b);
    }
  }
}

// ---------- PNG encoder ----------

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    let b = (c ^ buf[i]) & 0xFF;
    for (let k = 0; k < 8; k++) b = (b & 1) ? (0xEDB88320 ^ (b>>>1)) : (b>>>1);
    c = b ^ (c>>>8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([len, tb, data, crc]);
}

function encodePNG(w, h, pixels) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8]=8; ihdr[9]=6; // 8-bit RGBA

  // raw scanlines: 1 filter byte + RGBA per pixel
  const raw = Buffer.alloc(h * (1 + w*4));
  for (let y = 0; y < h; y++) {
    raw[y*(1+w*4)] = 0; // filter None
    for (let x = 0; x < w; x++) {
      const s = (y*w+x)*4, d = y*(1+w*4)+1+x*4;
      raw[d]=pixels[s]; raw[d+1]=pixels[s+1]; raw[d+2]=pixels[s+2]; raw[d+3]=pixels[s+3];
    }
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- ICO encoder (PNG-in-ICO, modern format) ----------

function encodeICO(pngs) {
  // pngs: array of { png: Buffer, w, h }
  const hdr = Buffer.alloc(6);
  hdr.writeUInt16LE(0,0); hdr.writeUInt16LE(1,2); hdr.writeUInt16LE(pngs.length,4);

  const dirSize = 16 * pngs.length;
  let offset = 6 + dirSize;
  const dirs = [];
  for (const { png, w, h } of pngs) {
    const dir = Buffer.alloc(16);
    dir[0] = w >= 256 ? 0 : w;
    dir[1] = h >= 256 ? 0 : h;
    dir[2] = 0; dir[3] = 0;
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(png.length, 8);
    dir.writeUInt32LE(offset, 12);
    offset += png.length;
    dirs.push(dir);
  }

  return Buffer.concat([hdr, ...dirs, ...pngs.map(p => p.png)]);
}

// ---------- build the two sizes ----------

function buildIcon(size) {
  const GOLD = [0xFF, 0xD7, 0x00];
  const DARK = [0x0a, 0x0a, 0x0f];

  const px = makeCanvas(size, size, ...GOLD, 255);

  // For 16px use scale 1, for 32px use scale 2
  const scale = size <= 16 ? 1 : 2;

  const xW = X_GLYPH[0].length * scale;
  const iW = I_GLYPH[0].length * scale;
  const gap = Math.max(2, scale * 2);
  const totalW = xW + gap + iW;
  const glyphH = X_GLYPH.length * scale;
  const ox = Math.round((size - totalW) / 2);
  const oy = Math.round((size - glyphH) / 2);

  drawGlyph(px, size, size, X_GLYPH, ox, oy, scale, ...DARK);
  drawGlyph(px, size, size, I_GLYPH, ox + xW + gap, oy, scale, ...DARK);

  return encodePNG(size, size, px);
}

const png32 = buildIcon(32);
const png16 = buildIcon(16);

const ico = encodeICO([
  { png: png16, w: 16, h: 16 },
  { png: png32, w: 32, h: 32 },
]);

const out = path.join(__dirname, '..', 'app', 'favicon.ico');
fs.writeFileSync(out, ico);
console.log(`Written ${ico.length} bytes → ${out}`);
