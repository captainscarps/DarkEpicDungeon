// Constrói a spritesheet do Capitão Scarpa (PIRATE) no formato "pack" do jogo:
// 39 frames de 128x128 (4992x128), mesmo mapa de animações do berserker-pack.json.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const SRC = 'C:/Users/rafaelscarpille/.gemini/antigravity/brain/83cde682-a71f-4e42-872f-0514b053f66e/.user_uploaded/media_1791542478155_230a5af3.png';
const OUT_DIR = 'assets/pixel-art/characters';
const MIRROR_DIR = 'Projeto atualizado/assets/pixel-art/characters';

// ---------- PNG helpers ----------
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); crcTable[n] = c; }
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(W, H, px) {
  const stride = 1 + W * 4, f = Buffer.alloc(H * stride);
  for (let y = 0; y < H; y++) { f[y * stride] = 0; px.copy(f, y * stride + 1, y * W * 4, (y + 1) * W * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(f, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function decodePNG(buf) {
  let pos = 8, ihdr = null; const parts = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), d = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') ihdr = { w: d.readUInt32BE(0), h: d.readUInt32BE(4), ct: d[9] };
    if (type === 'IDAT') parts.push(d);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(parts));
  const bpp = ihdr.ct === 6 ? 4 : 3, W = ihdr.w, H = ihdr.h, stride = 1 + W * bpp;
  const out = Buffer.alloc(W * H * 4); let prev = Buffer.alloc(W * bpp);
  for (let y = 0; y < H; y++) {
    const ft = raw[y * stride], row = raw.subarray(y * stride + 1, (y + 1) * stride), cur = Buffer.alloc(W * bpp);
    for (let x = 0; x < W * bpp; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0; let v = row[x];
      if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
    for (let x = 0; x < W; x++) { const o = (y * W + x) * 4; out[o] = cur[x * bpp]; out[o + 1] = cur[x * bpp + 1]; out[o + 2] = cur[x * bpp + 2]; out[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255; }
    prev = cur;
  }
  return { W, H, px: out };
}
module.exports = { decodePNG, encodePNG };
if (require.main !== module) return;

// ---------- Componentes conectados (cada figura da folha) ----------
const { W, H, px } = decodePNG(fs.readFileSync(SRC));
const label = new Int32Array(W * H).fill(-1);
const comps = [];
for (let i = 0; i < W * H; i++) {
  if (label[i] !== -1 || px[i * 4 + 3] < 30) continue;
  const id = comps.length, q = [i]; label[i] = id;
  let minX = W, maxX = 0, minY = H, maxY = 0;
  for (let h = 0; h < q.length; h++) {
    const cur = q[h], cx = cur % W, cy = (cur / W) | 0;
    if (cx < minX) minX = cx; if (cx > maxX) maxX = cx; if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
    for (const n of [cx > 0 ? cur - 1 : -1, cx < W - 1 ? cur + 1 : -1, cy > 0 ? cur - W : -1, cy < H - 1 ? cur + W : -1])
      if (n >= 0 && label[n] === -1 && px[n * 4 + 3] >= 30) { label[n] = id; q.push(n); }
  }
  comps.push({ id, minX, maxX, minY, maxY, n: q.length });
}
const figures = comps.filter(c => c.maxY - c.minY > 25); // descarta rótulos de texto
function fig(row, x) {
  const bands = { idle: [16, 150], walk: [155, 290], run: [305, 430], atk: [440, 565], death: [590, 675] };
  const [y0, y1] = bands[row];
  const c = figures.filter(f => f.minY >= y0 && f.minY < y1).sort((a, b) => Math.abs(a.minX - x) - Math.abs(b.minX - x))[0];
  if (!c || Math.abs(c.minX - x) > 6) throw new Error(`figure not found ${row} ${x}`);
  return c;
}

// Escala: a linha "parado" foi desenhada maior que as demais na folha original.
// Normalizamos para ~68 px de altura em pé (mesma altura dos heróis do jogo).
const SCALE = { idle: 68 / 122, walk: 68 / 110, run: 68 / 110, atk: 68 / 110, death: 68 / 110 };

// Mapa de frames (mesma ordem do berserker-pack.json)
const F = [
  ['idle', 71], ['idle', 156], ['idle', 244], ['idle', 326],           // 0-3 idle
  ['idle', 407], ['idle', 578],                                         // 4-5 idlevar
  ['walk', 68], ['walk', 152], ['walk', 239], ['walk', 330], ['walk', 417], ['walk', 501], // 6-11 walk
  ['run', 48], ['run', 150], ['run', 244], ['run', 330], ['run', 419], ['run', 501],      // 12-17 run
  ['atk', 116], ['atk', 402], ['atk', 214], ['atk', 304], ['atk', 916], // 18 windupA,19 windup,20 hitA,21 hit,22 recovery
  ['atk', 26], ['atk', 675],                                            // 23 guardStart, 24 guard
  ['atk', 844], ['atk', 26],                                            // 25 hurt, 26 hurtB
  ['death', 143], ['death', 227],                                       // 27 stunA, 28 stunB
  ['run', 501], ['run', 48],                                            // 29 dashA, 30 dash
  ['atk', 586], ['atk', 492], ['atk', 764],                             // 31 castA, 32 cast, 33 castC
  ['death', 227], ['death', 508], ['death', 866],                       // 34-36 death
  ['walk', 757], ['walk', 840],                                         // 37-38 up (costas)
];

const FW = 128, FH = 128, FOOT = 118, OUT_W = FW * F.length;
const sheet = Buffer.alloc(OUT_W * FH * 4);

function renderFrame(fi, [row, x]) {
  const c = fig(row, x), s = SCALE[row];
  const bw = c.maxX - c.minX + 1, bh = c.maxY - c.minY + 1;
  const ow = Math.ceil(bw * s), oh = Math.ceil(bh * s);
  // média de área com alpha pré-multiplicado
  const acc = new Float64Array(ow * oh * 5);
  for (let y = c.minY; y <= c.maxY; y++) for (let xx = c.minX; xx <= c.maxX; xx++) {
    const i = y * W + xx;
    const tx = Math.min(ow - 1, Math.floor((xx - c.minX) * s)), ty = Math.min(oh - 1, Math.floor((y - c.minY) * s));
    const k = (ty * ow + tx) * 5;
    acc[k + 4] += 1; // total de pixels de origem nesta célula
    if (label[i] !== c.id) continue;
    const o = i * 4, a = px[o + 3] / 255;
    acc[k] += px[o] * a; acc[k + 1] += px[o + 1] * a; acc[k + 2] += px[o + 2] * a; acc[k + 3] += a;
  }
  const small = new Uint8ClampedArray(ow * oh * 4);
  let sx = 0, sw = 0;
  for (let i = 0; i < ow * oh; i++) {
    const k = i * 5, cov = acc[k + 4] ? acc[k + 3] / acc[k + 4] : 0;
    if (cov < 0.42 || acc[k + 3] <= 0) continue; // alpha binário (pixel art nítido)
    let r = acc[k] / acc[k + 3], g = acc[k + 1] / acc[k + 3], b = acc[k + 2] / acc[k + 3];
    // leve ganho de contraste/saturação para ler bem em tamanho pequeno
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    r = l + (r - l) * 1.12; g = l + (g - l) * 1.12; b = l + (b - l) * 1.12;
    r = (r - 128) * 1.06 + 128; g = (g - 128) * 1.06 + 128; b = (b - 128) * 1.06 + 128;
    small[i * 4] = r; small[i * 4 + 1] = g; small[i * 4 + 2] = b; small[i * 4 + 3] = 255;
    sx += i % ow; sw++;
  }
  // âncora horizontal: centro de massa (o sabre é fino e quase não pesa)
  const comX = sw ? sx / sw : ow / 2;
  const offX = Math.round(64 - comX), offY = FOOT - oh + 1;
  const put = (x, y, r, g, b, a) => {
    if (x < 0 || y < 0 || x >= FW || y >= FH) return;
    const o = (y * OUT_W + fi * FW + x) * 4; sheet[o] = r; sheet[o + 1] = g; sheet[o + 2] = b; sheet[o + 3] = a;
  };
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    const i = (y * ow + x) * 4; if (!small[i + 3]) continue;
    put(x + offX, y + offY, small[i], small[i + 1], small[i + 2], 255);
  }
  // contorno escuro de 1px (estilo dos heróis do jogo)
  const opaque = (x, y) => x >= 0 && y >= 0 && x < FW && y < FH && sheet[(y * OUT_W + fi * FW + x) * 4 + 3] === 255;
  const ring = [];
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    if (opaque(x, y)) continue;
    if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) ring.push([x, y]);
  }
  for (const [x, y] of ring) put(x, y, 20, 13, 10, 235);
}
F.forEach((f, i) => renderFrame(i, f));

const png = encodePNG(OUT_W, FH, sheet);
const layout = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'berserker-pack.json'), 'utf8'));
layout.scale = 0.7; layout.footY = 118; layout.bakedWeapon = true;
layout.anchors = F.map(() => [76, 80]);
layout.torso = F.map(() => [64, 84]);
layout.head = F.map(() => [64, 58]);

for (const dir of [OUT_DIR, MIRROR_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'pirate-pack-body.png'), png);
  for (let t = 0; t <= 4; t++) fs.writeFileSync(path.join(dir, `pirate-pack-t${t}-body.png`), png);
  fs.writeFileSync(path.join(dir, 'pirate-pack.json'), JSON.stringify(layout));
}
// prévia: frames-chave ampliados 3x
const keys = [0, 6, 12, 18, 20, 21, 27, 36];
const pv = Buffer.alloc(keys.length * 128 * 3 * 128 * 3 * 4);
const PW = keys.length * 384;
keys.forEach((f, k) => {
  for (let y = 0; y < 384; y++) for (let x = 0; x < 384; x++) {
    const so = (((y / 3) | 0) * OUT_W + f * 128 + ((x / 3) | 0)) * 4, d = (y * PW + k * 384 + x) * 4;
    const a = sheet[so + 3] / 255, bg = ((x >> 4) + (y >> 4)) & 1 ? 52 : 40;
    pv[d] = sheet[so] * a + bg * (1 - a); pv[d + 1] = sheet[so + 1] * a + bg * (1 - a); pv[d + 2] = sheet[so + 2] * a + (bg + 6) * (1 - a); pv[d + 3] = 255;
  }
});
if (!fs.existsSync('scratch')) fs.mkdirSync('scratch');
fs.writeFileSync('scratch/pirate_preview.png', encodePNG(PW, 384, pv));
console.log('OK: pirate-pack-body.png', OUT_W + 'x' + FH, png.length, 'bytes; preview scratch/pirate_preview.png');
