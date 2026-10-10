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

function checkFrame0(name, path) {
  const { ihdr, rawPixels } = decodePNG(fs.readFileSync(path));
  const W = ihdr.width, H = ihdr.height;
  let minX = 128, maxX = 0, minY = 128, maxY = 0;
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const a = rawPixels[(y * W + x) * 4 + 3];
      if (a > 30) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log(`${name} frame 0: X=${minX}..${maxX} (w=${maxX-minX+1}, midX=${(minX+maxX)/2}), Y=${minY}..${maxY} (h=${maxY-minY+1}, footY=${maxY})`);
}

checkFrame0('Warrior', 'assets/pixel-art/characters/warrior-pack-body.png');
checkFrame0('Berserker', 'assets/pixel-art/characters/berserker-pack-body.png');
checkFrame0('Rogue', 'assets/pixel-art/characters/rogue-pack-body.png');
checkFrame0('Mage', 'assets/pixel-art/characters/mage-pack-body.png');
