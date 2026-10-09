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
    if (type === 'IHDR') ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4) };
    if (type === 'IDAT') idatParts.push(data);
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatParts));
  const W = ihdr.width, H = ihdr.height;
  const stride = 1 + W * 4;
  const colors = new Map();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * stride + 1 + x * 4;
      const a = decompressed[idx + 3];
      if (a > 30) {
        const hex = '#' + Buffer.from([decompressed[idx], decompressed[idx+1], decompressed[idx+2]]).toString('hex');
        colors.set(hex, (colors.get(hex) || 0) + 1);
      }
    }
  }
  return [...colors.entries()].sort((a,b) => b[1] - a[1]);
}

const classes = ['warrior', 'paladin', 'berserker', 'rogue', 'shadow_assassin', 'archer', 'hunter', 'mage', 'necromancer', 'warlock', 'shaman'];
for (const c of classes) {
  const p = `assets/pixel-art/characters/${c}-pack-body.png`;
  if (!fs.existsSync(p)) continue;
  const colors = decodePNG(fs.readFileSync(p));
  console.log(`\n=== ${c} === (unique colors: ${colors.length})`);
  // Print top 12 non-black colors
  const nonBlack = colors.filter(([hex]) => {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return r > 25 || g > 25 || b > 25;
  });
  console.log(nonBlack.slice(0, 10).map(([h, n]) => `${h}:${n}`).join(' '));
}
