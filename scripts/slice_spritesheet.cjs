const fs = require('fs');
const zlib = require('zlib');

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

// Find connected bounding boxes or analyze rows
// Let's print row non-transparent pixel count
const rowDensity = [];
for (let y = 0; y < H; y++) {
  let count = 0;
  for (let x = 0; x < W; x++) {
    const a = rawPixels[(y * W + x) * 4 + 3];
    if (a > 30) count++;
  }
  rowDensity.push(count);
}

// Find rows where count > 0
let inRow = false, startY = 0;
for (let y = 0; y < H; y++) {
  if (rowDensity[y] > 10 && !inRow) {
    inRow = true;
    startY = y;
  } else if (rowDensity[y] <= 10 && inRow) {
    inRow = false;
    console.log(`Region Y: ${startY} -> ${y} (h=${y-startY}), maxDensity=${Math.max(...rowDensity.slice(startY, y))}`);
  }
}
if (inRow) console.log(`Region Y: ${startY} -> ${H} (h=${H-startY})`);
