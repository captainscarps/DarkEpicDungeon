const fs = require('fs');
const zlib = require('zlib');

// PNG encoder helper
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function encodePNG(W, H, rawPixels) {
  const bpp = 4;
  const stride = 1 + W * bpp;
  const filtered = Buffer.alloc(H * stride);
  for (let y = 0; y < H; y++) {
    filtered[y * stride] = 0;
    rawPixels.copy(filtered, y * stride + 1, y * W * bpp, (y + 1) * W * bpp);
  }
  const compressed = zlib.deflateSync(filtered, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const ihdrLen = Buffer.alloc(4); ihdrLen.writeUInt32BE(13, 0);
  const ihdrType = Buffer.from('IHDR');
  const ihdrCrc = Buffer.alloc(4); ihdrCrc.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdr])), 0);
  const ihdrChunk = Buffer.concat([ihdrLen, ihdrType, ihdr, ihdrCrc]);

  const idatLen = Buffer.alloc(4); idatLen.writeUInt32BE(compressed.length, 0);
  const idatType = Buffer.from('IDAT');
  const idatCrc = Buffer.alloc(4); idatCrc.writeUInt32BE(crc32(Buffer.concat([idatType, compressed])), 0);
  const idatChunk = Buffer.concat([idatLen, idatType, compressed, idatCrc]);

  const iendLen = Buffer.alloc(4); iendLen.writeUInt32BE(0, 0);
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4); iendCrc.writeUInt32BE(crc32(iendType), 0);
  const iendChunk = Buffer.concat([iendLen, iendType, iendCrc]);

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function decodePNG(buf) {
  let pos = 8;
  let ihdr = null;
  const idatParts = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
      };
    }
    if (type === 'IDAT') idatParts.push(data);
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatParts));
  const W = ihdr.width, H = ihdr.height;
  const bpp = 4;
  const stride = 1 + W * bpp;
  let prevRow = Buffer.alloc(W * bpp);
  const rawPixels = Buffer.alloc(W * H * bpp);

  for (let y = 0; y < H; y++) {
    const filter = decompressed[y * stride];
    const row = decompressed.subarray(y * stride + 1, (y + 1) * stride);
    const outRow = Buffer.alloc(W * bpp);
    for (let x = 0; x < W * bpp; x++) {
      const a = x >= bpp ? outRow[x - bpp] : 0;
      const b = prevRow[x];
      const c = x >= bpp ? prevRow[x - bpp] : 0;
      let val = row[x];
      if (filter === 0) {}
      else if (filter === 1) val = (val + a) & 0xff;
      else if (filter === 2) val = (val + b) & 0xff;
      else if (filter === 3) val = (val + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        val = (val + pr) & 0xff;
      }
      outRow[x] = val;
    }
    outRow.copy(rawPixels, y * W * bpp);
    prevRow = outRow;
  }
  return { ihdr, rawPixels };
}

const { ihdr, rawPixels } = decodePNG(fs.readFileSync('C:/Users/rafaelscarpille/.gemini/antigravity/brain/83cde682-a71f-4e42-872f-0514b053f66e/.user_uploaded/media_1791542478155_230a5af3.png'));
const W = ihdr.width, H = ihdr.height;

if (!fs.existsSync('scratch/frames')) fs.mkdirSync('scratch/frames', { recursive: true });

// Let's inspect foot level and character height across rows:
// Row 1: PARADO (Y: ~24 to 146 -> height ~122). Feet are around y=146.
// Row 2: ANDANDO (Y: ~175 to 287 -> height ~112). Feet are around y=286.
// Row 3: CORRENDO (Y: ~312 to 424 -> height ~112). Feet are around y=424.
// Row 4: ATACANDO (Y: ~445 to 559 -> height ~114). Feet are around y=559.
// Row 5: MORRENDO (Y: ~593 to 669 -> height ~76). Ground is around y=669.

console.log('Original spritesheet loaded:', W, 'x', H);
