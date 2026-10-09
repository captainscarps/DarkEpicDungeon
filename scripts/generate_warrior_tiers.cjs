const fs = require('fs');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
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
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12]
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

function encodePNG(ihdr, rawPixels) {
  const W = ihdr.width, H = ihdr.height;
  const bpp = 4;
  const stride = 1 + W * bpp;
  const filtered = Buffer.alloc(H * stride);

  for (let y = 0; y < H; y++) {
    filtered[y * stride] = 0; // Filter 0 (None)
    rawPixels.copy(filtered, y * stride + 1, y * W * bpp, (y + 1) * W * bpp);
  }

  const compressed = zlib.deflateSync(filtered, { level: 9 });

  // Build PNG chunks
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(W, 0);
  ihdrData.writeUInt32BE(H, 4);
  ihdrData[8] = 8; // bitDepth
  ihdrData[9] = 6; // colorType RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  
  const ihdrLen = Buffer.alloc(4); ihdrLen.writeUInt32BE(13, 0);
  const ihdrType = Buffer.from('IHDR');
  const ihdrCrc = Buffer.alloc(4); ihdrCrc.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdrData])), 0);
  const ihdrChunk = Buffer.concat([ihdrLen, ihdrType, ihdrData, ihdrCrc]);

  // IDAT chunk
  const idatLen = Buffer.alloc(4); idatLen.writeUInt32BE(compressed.length, 0);
  const idatType = Buffer.from('IDAT');
  const idatCrc = Buffer.alloc(4); idatCrc.writeUInt32BE(crc32(Buffer.concat([idatType, compressed])), 0);
  const idatChunk = Buffer.concat([idatLen, idatType, compressed, idatCrc]);

  // IEND chunk
  const iendLen = Buffer.alloc(4); iendLen.writeUInt32BE(0, 0);
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4); iendCrc.writeUInt32BE(crc32(iendType), 0);
  const iendChunk = Buffer.concat([iendLen, iendType, iendCrc]);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Color palettes for Warrior Armor
function parseHex(h) {
  return [parseInt(h.slice(1,3), 16), parseInt(h.slice(3,5), 16), parseInt(h.slice(5,7), 16)];
}

const BASE_WARRIOR_ARMOR = {
  '#dceaee': 0, // highlight
  '#dfe0e8': 1, // highlight 2
  '#b8ccd8': 2, // light
  '#a3a7c2': 3, // mid-tone
  '#5e718e': 4, // mid-shadow
  '#485262': 5, // shadow
  '#282c3c': 6  // deep shadow
};

const PALETTES = {
  // Tier 1: Couro (Leather)
  1: ['#e8b87d', '#d4a36a', '#be854d', '#9c6232', '#73431f', '#4e2a12', '#31190a'].map(parseHex),
  // Tier 2: Aço Cobalto / Guardião Azul (Cobalt Steel Knight - Raro)
  2: ['#e0f2fe', '#bae6fd', '#38bdf8', '#0284c7', '#0369a1', '#075985', '#082f49'].map(parseHex),
  // Tier 3: Arcano (Mystic Purple / Cyan accents)
  3: ['#a6f4ff', '#f0c8ff', '#d48eff', '#a850e6', '#6e28ad', '#451275', '#280a47'].map(parseHex),
  // Tier 4: Dourado (Golden / Divine Champion)
  4: ['#fffbe0', '#ffe680', '#ffd23f', '#e5a812', '#ab7305', '#734c00', '#472e00'].map(parseHex)
};

const srcFile = 'assets/pixel-art/characters/warrior-pack-body.png';
const { ihdr, rawPixels } = decodePNG(fs.readFileSync(srcFile));
console.log('Warrior base loaded:', ihdr.width, 'x', ihdr.height);

// Generate tiers 1 to 4
for (let tier = 1; tier <= 4; tier++) {
  const palette = PALETTES[tier];
  const newPixels = Buffer.from(rawPixels);

  for (let i = 0; i < newPixels.length; i += 4) {
    const a = newPixels[i + 3];
    if (a < 20) continue;
    const hex = '#' + ((newPixels[i] << 16) | (newPixels[i+1] << 8) | newPixels[i+2]).toString(16).padStart(6, '0');
    if (BASE_WARRIOR_ARMOR[hex] !== undefined) {
      const idx = BASE_WARRIOR_ARMOR[hex];
      const [nr, ng, nb] = palette[idx];
      newPixels[i] = nr;
      newPixels[i + 1] = ng;
      newPixels[i + 2] = nb;
    }
  }

  const outPNG = encodePNG(ihdr, newPixels);
  const outPath1 = `assets/pixel-art/characters/warrior-pack-t${tier}-body.png`;
  const outPath2 = `Projeto atualizado/assets/pixel-art/characters/warrior-pack-t${tier}-body.png`;

  fs.writeFileSync(outPath1, outPNG);
  if (fs.existsSync('Projeto atualizado/assets/pixel-art/characters')) {
    fs.writeFileSync(outPath2, outPNG);
  }
  console.log(`✓ Tier ${tier} generated: ${outPath1} (${outPNG.length} bytes)`);
}

console.log('All warrior tiers generated successfully!');
