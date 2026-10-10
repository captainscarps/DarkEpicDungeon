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

// Find connected components
const visited = new Uint8Array(W * H);
const components = [];

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    if (visited[idx] || rawPixels[idx * 4 + 3] < 30) continue;
    
    // BFS
    let minX = x, maxX = x, minY = y, maxY = y;
    let pixelCount = 0;
    const queue = [idx];
    visited[idx] = 1;

    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      const cy = Math.floor(curr / W);
      const cx = curr % W;
      pixelCount++;
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;

      // check 4 neighbors
      const neighbors = [
        cx > 0 ? curr - 1 : -1,
        cx < W - 1 ? curr + 1 : -1,
        cy > 0 ? curr - W : -1,
        cy < H - 1 ? curr + W : -1
      ];

      for (const n of neighbors) {
        if (n !== -1 && !visited[n] && rawPixels[n * 4 + 3] >= 30) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }

    components.push({ minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1, pixelCount });
  }
}

console.log(`Found ${components.length} components total.`);
// Sort components by Y then X
const large = components.filter(c => c.pixelCount > 150);
console.log(`Found ${large.length} large components (>150 pixels):`);
large.sort((a, b) => {
  if (Math.abs(a.minY - b.minY) > 30) return a.minY - b.minY;
  return a.minX - b.minX;
});

// Group by rows
const rows = [];
for (const c of large) {
  // Check if text label (w < 80 and h < 25)
  const isLabel = c.h <= 20 && c.w <= 90;
  let row = rows.find(r => Math.abs(r.y - c.minY) < 40);
  if (!row) {
    row = { y: c.minY, items: [] };
    rows.push(row);
  }
  row.items.push({ ...c, isLabel });
}

rows.forEach((r, idx) => {
  console.log(`\nRow ${idx+1} (approx Y=${r.y}): ${r.items.length} items`);
  r.items.forEach((it, i) => {
    console.log(`  Item ${i+1}: x=${it.minX}..${it.maxX} (w=${it.w}), y=${it.minY}..${it.maxY} (h=${it.h}), pixels=${it.pixelCount} ${it.isLabel ? '[LABEL]' : ''}`);
  });
});
