const fs = require('fs');
const zlib = require('zlib');

// CRC32 table
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

function decodePNG(buf) {
  let pos = 8;
  let ihdr = null;
  const idatParts = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4) };
    if (type === 'IDAT') idatParts.push(data);
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatParts));
  const W = ihdr.width, H = ihdr.height;
  const stride = 1 + W * 4;
  const raw = Buffer.alloc(W * H * 4);
  let prevRow = Buffer.alloc(W * 4);
  for (let y = 0; y < H; y++) {
    const filter = decompressed[y * stride];
    const row = decompressed.subarray(y * stride + 1, (y + 1) * stride);
    const outRow = Buffer.alloc(W * 4);
    for (let x = 0; x < W * 4; x++) {
      const a = x >= 4 ? outRow[x - 4] : 0;
      const b = prevRow[x];
      const c = x >= 4 ? prevRow[x - 4] : 0;
      let val = row[x];
      if (filter === 0) {}
      else if (filter === 1) val = (val + a) & 0xff;
      else if (filter === 2) val = (val + b) & 0xff;
      else if (filter === 3) val = (val + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        val = (val + pr) & 0xff;
      }
      outRow[x] = val;
    }
    outRow.copy(raw, y * W * 4);
    prevRow = outRow;
  }
  return { ihdr, raw };
}

function encodeFrame128(fullRaw, fullW, frameIdx) {
  const fw = 128, fh = 128;
  const framePixels = Buffer.alloc(fw * fh * 4);
  for (let y = 0; y < fh; y++) {
    const srcOffset = (y * fullW + frameIdx * fw) * 4;
    fullRaw.copy(framePixels, y * fw * 4, srcOffset, srcOffset + fw * 4);
  }
  
  const stride = 1 + fw * 4;
  const filtered = Buffer.alloc(fh * stride);
  for (let y = 0; y < fh; y++) {
    filtered[y * stride] = 0;
    framePixels.copy(filtered, y * stride + 1, y * fw * 4, (y + 1) * fw * 4);
  }
  const compressed = zlib.deflateSync(filtered, { level: 9 });
  
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(fw, 0); ihdrData.writeUInt32BE(fh, 4);
  ihdrData[8] = 8; ihdrData[9] = 6;
  const ihdrLen = Buffer.alloc(4); ihdrLen.writeUInt32BE(13, 0);
  const ihdrType = Buffer.from('IHDR');
  const ihdrCrc = Buffer.alloc(4); ihdrCrc.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdrData])), 0);
  const ihdrChunk = Buffer.concat([ihdrLen, ihdrType, ihdrData, ihdrCrc]);

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

// Extract frame 0 for each tier
for (let tier = 0; tier <= 4; tier++) {
  const p = `assets/pixel-art/characters/warrior-pack-t${tier}-body.png`;
  const { ihdr, raw } = decodePNG(fs.readFileSync(p));
  const framePNG = encodeFrame128(raw, ihdr.width, 0);
  const out = `scratch/warrior_t${tier}_preview.png`;
  if (!fs.existsSync('scratch')) fs.mkdirSync('scratch');
  fs.writeFileSync(out, framePNG);
  console.log(`Generated preview: ${out}`);
}
