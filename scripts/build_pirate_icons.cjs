// Gera ícones 24x24 das habilidades do Capitão Scarpa e o sprite do papagaio.
const fs = require('fs');
const path = require('path');
const { decodePNG, encodePNG } = require('./build_pirate_sprites.cjs');

const DIRS = ['assets/pixel-art', 'Projeto atualizado/assets/pixel-art'];
const write = (rel, buf) => DIRS.forEach(d => { const p = path.join(d, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); });

function canvas(w, h) {
  const px = Buffer.alloc(w * h * 4);
  const set = (x, y, c, a = 255) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h) return; const o = (y * w + x) * 4; px[o] = c >> 16; px[o + 1] = (c >> 8) & 255; px[o + 2] = c & 255; px[o + 3] = a; };
  const rect = (x, y, rw, rh, c) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) set(x + i, y + j, c); };
  const disc = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * .6) set(cx + x, cy + y, c); };
  const line = (x0, y0, x1, y1, c, t = 1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1; for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; t > 1 ? disc(Math.round(x), Math.round(y), t >> 1, c) : set(Math.round(x), Math.round(y), c); } };
  return { px, set, rect, disc, line, w, h };
}
function frame(cv, bgTop, bgBot, border) {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const t = y / 23, r = ((bgTop >> 16) * (1 - t) + (bgBot >> 16) * t) | 0, g = (((bgTop >> 8) & 255) * (1 - t) + ((bgBot >> 8) & 255) * t) | 0, b = ((bgTop & 255) * (1 - t) + (bgBot & 255) * t) | 0;
    cv.set(x, y, (r << 16) | (g << 8) | b);
  }
  for (let i = 0; i < 24; i++) { cv.set(i, 0, border); cv.set(i, 23, 0x0c0806); cv.set(0, i, border); cv.set(23, i, 0x0c0806); }
}
function outline(cv, col = 0x0c0806, bgTest) {
  // contorna os pixels "desenhados" (marcados em mask) sobre o fundo
  const m = cv.mask, w = 24, out = [];
  for (let y = 1; y < 23; y++) for (let x = 1; x < 23; x++) if (!m[y * w + x] && (m[y * w + x - 1] || m[y * w + x + 1] || m[(y - 1) * w + x] || m[(y + 1) * w + x])) out.push([x, y]);
  out.forEach(([x, y]) => cv.set(x, y, col));
}
function track(cv) { cv.mask = new Uint8Array(576); const s = cv.set; cv.set = (x, y, c, a) => { s(x, y, c, a); if (x >= 0 && y >= 0 && x < 24 && y < 24) cv.mask[(y | 0) * 24 + (x | 0)] = 1; }; return () => { cv.set = s; }; }

// --- FÚRIA PIRATA: âncora gigante cravando no chão com impacto ---
{
  const cv = canvas(24, 24); frame(cv, 0x3a1a10, 0x170a06, 0x8a5a2a);
  // impacto
  [[3, 21, 8, 17], [21, 21, 16, 17], [12, 22, 12, 18]].forEach(([a, b, c, d]) => cv.line(a, b, c, d, 0xffa040));
  cv.rect(4, 20, 16, 2, 0x6a3a1a);
  const end = track(cv);
  cv.disc(12, 4, 2, 0x8d97a8); cv.set(12, 4, 0x2a2f3a);          // argola
  cv.rect(11, 6, 3, 12, 0x6d7788); cv.rect(12, 6, 1, 12, 0xc8d2e0); // haste
  cv.rect(7, 8, 11, 2, 0x5a6476); cv.rect(7, 8, 11, 1, 0xa8b4c4);   // cepo
  for (let a = 0.12; a <= 0.88; a += 0.02) { const x = 12 + Math.cos(a * Math.PI) * 7, y = 13 + Math.sin(a * Math.PI) * 6; cv.disc(Math.round(x), Math.round(y), 1, 0x6d7788); }
  cv.line(4, 14, 6, 11, 0xa8b4c4, 2); cv.line(20, 14, 18, 11, 0xa8b4c4, 2); // pontas (unhas)
  end(); outline(cv);
  write('ui/icons/FURIA_PIRATA.png', encodePNG(24, 24, cv.px));
}
// --- IRA DO KRAKEN: tentáculo fantasmagórico em água escura ---
{
  const cv = canvas(24, 24); frame(cv, 0x0a2a3a, 0x04121c, 0x2f8fb0);
  for (let i = 0; i < 6; i++) cv.set(3 + i * 3, 20 - (i % 2), 0x3fd0ff);
  const end = track(cv);
  for (let k = 0; k <= 40; k++) {
    const s = k / 40, y = 21 - s * 17, x = 9 + Math.sin(s * 3.6) * 5 * s + s * 5, r = Math.max(0, Math.round((1 - s) * 3));
    cv.disc(Math.round(x), Math.round(y), r, k % 7 < 3 ? 0x2a8a9a : 0x1f6f7a);
  }
  [[11, 17], [13, 13], [15, 10]].forEach(([x, y]) => cv.set(x, y, 0xbff8ff));
  end(); outline(cv, 0x02080c);
  cv.set(6, 5, 0x7ff5ff); cv.set(19, 8, 0x7ff5ff); cv.set(5, 12, 0x3fd0ff);
  write('ui/icons/IRA_KRAKEN.png', encodePNG(24, 24, cv.px));
}
// --- Recolor helper (HSL) ---
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hsl2rgb(h, s, l) { const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; if (!s) return [l * 255, l * 255, l * 255]; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255]; }
function macaw(px, w, h, isIcon) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4; if (px[o + 3] < 20) continue;
    const [hh, s, l] = rgb2hsl(px[o], px[o + 1], px[o + 2]);
    if (isIcon && (x === 0 || y === 0 || x === w - 1 || y === h - 1)) continue;
    if (isIcon && s < .25 && l < .3) continue; // fundo do ícone
    let nh, ns, nl = l;
    if (l < .14) { nh = .98; ns = .5; nl = l * .8; }          // contorno
    else if (l > .74) { nh = .14; ns = .95; nl = Math.min(.82, l); } // rosto/peito -> amarelo
    else if (l < .21) { nh = .6; ns = .8; nl = l * 1.2 + .05; }   // penas escuras -> azul
    else { nh = .995; ns = .88; nl = l * .92; }                   // corpo -> vermelho arara
    const [r, g, b] = hsl2rgb(nh, ns, nl); px[o] = r; px[o + 1] = g; px[o + 2] = b;
  }
}
// --- Papagaio (spritesheet 48x48 derivado da águia) ---
{
  const e = decodePNG(fs.readFileSync('assets/pixel-art/characters/druid-eagle.png'));
  macaw(e.px, e.W, e.H, false);
  write('characters/pirate-parrot.png', encodePNG(e.W, e.H, e.px));
}
// --- Ícone COMPANHEIRO_VOADOR ---
{
  const e = decodePNG(fs.readFileSync('assets/pixel-art/ui/icons/EAGLE_COMPANION.png'));
  macaw(e.px, e.W, e.H, true);
  write('ui/icons/COMPANHEIRO_VOADOR.png', encodePNG(e.W, e.H, e.px));
}
// --- Clones das habilidades de Berserker reaproveitadas (tom quente/pirata) ---
for (const [src, dst] of [['KIAI', 'GRITO_ABORDAGEM'], ['TSUMUJI', 'REDEMOINHO_SABRE'], ['KAISHAKU', 'GOLPE_MISERICORDIA']]) {
  const e = decodePNG(fs.readFileSync(`assets/pixel-art/ui/icons/${src}.png`));
  for (let i = 0; i < e.px.length; i += 4) { if (e.px[i + 3] < 20) continue; const [h, s, l] = rgb2hsl(e.px[i], e.px[i + 1], e.px[i + 2]); if (s < .2) continue; const [r, g, b] = hsl2rgb(.035, Math.min(1, s * 1.1), l); e.px[i] = r; e.px[i + 1] = g; e.px[i + 2] = b; }
  write(`ui/icons/${dst}.png`, encodePNG(e.W, e.H, e.px));
}
// prévia
const names = ['FURIA_PIRATA', 'IRA_KRAKEN', 'COMPANHEIRO_VOADOR', 'GRITO_ABORDAGEM', 'REDEMOINHO_SABRE', 'GOLPE_MISERICORDIA'];
const S = 6, PW = names.length * 24 * S + 48 * S, pv = Buffer.alloc(PW * 48 * S * 4);
names.forEach((n, k) => { const e = decodePNG(fs.readFileSync(`assets/pixel-art/ui/icons/${n}.png`)); for (let y = 0; y < 24 * S; y++) for (let x = 0; x < 24 * S; x++) { const so = (((y / S) | 0) * 24 + ((x / S) | 0)) * 4, d = (y * PW + k * 24 * S + x) * 4; e.px.copy(pv, d, so, so + 4); } });
{ const e = decodePNG(fs.readFileSync('assets/pixel-art/characters/pirate-parrot.png')); for (let y = 0; y < 48 * S; y++) for (let x = 0; x < 48 * S; x++) { const so = (((y / S) | 0) * e.W + ((x / S) | 0)) * 4, d = (y * PW + names.length * 24 * S + x) * 4; if (e.px[so + 3] > 20) e.px.copy(pv, d, so, so + 4); else { pv[d] = 40; pv[d + 1] = 40; pv[d + 2] = 48; pv[d + 3] = 255; } } }
fs.writeFileSync('scratch/pirate_icons_preview.png', encodePNG(PW, 48 * S, pv));
console.log('icons + parrot OK');
