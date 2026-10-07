const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Pure Node.js PNG encoder
function createPNG(width, height, rgbaBuffer) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  
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
  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    buf.writeUInt32BE(crc32(buf.subarray(4, 8 + len)), 8 + len);
    return buf;
  }
  
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    rawData[offset] = 0;
    rgbaBuffer.copy(rawData, offset + 1, y * width * 4, (y + 1) * width * 4);
  }
  
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(rawData, { level: 9 })),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// ---------------------------------------------------------------------------
// MULTI-STYLE VOLUMETRIC & PIXEL ART BUFFER
// ---------------------------------------------------------------------------
class StyleBuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.color = Buffer.alloc(width * height * 4);
    this.depth = new Float32Array(width * height).fill(-999999);
  }

  setPixel(x, y, z, r, g, b, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = y * this.width + x;
    if (z >= this.depth[idx]) {
      this.depth[idx] = z;
      const p = idx * 4;
      this.color[p] = Math.max(0, Math.min(255, Math.round(r)));
      this.color[p + 1] = Math.max(0, Math.min(255, Math.round(g)));
      this.color[p + 2] = Math.max(0, Math.min(255, Math.round(b)));
      this.color[p + 3] = Math.max(0, Math.min(255, Math.round(a)));
    }
  }

  // Draw 3D analytical volumetric ellipsoid with tailored stylistic shading
  drawVolume({ cx, cy, cz, rx, ry, rz, rotY = 0, rotX = 0, baseCol, style, mat = 'STEEL' }) {
    const maxR = Math.max(rx, ry, rz) * 1.5;
    const minX = Math.max(0, Math.floor(cx - maxR));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + maxR));
    const minY = Math.max(0, Math.floor(cy - maxR));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + maxR));

    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

    // Style-specific lighting settings
    let lightDir, lightCol, ambCol, rimCol, rimPower, specPower, specIntensity;
    if (style === 'DIR_A') {
      // 2.5D DARK FANTASY: Gritty, high chiaroscuro, warm amber vs dark blue
      lightDir = [-0.55, -0.65, 0.52];
      lightCol = [255, 215, 160];
      ambCol = [30, 32, 48];
      rimCol = [85, 115, 155];
      rimPower = 2.8;
      specPower = 40;
      specIntensity = 1.4;
    } else if (style === 'DIR_B') {
      // CINEMATIC PIXEL ART: Saturated, handcrafted cel-contrast, dramatic rim
      lightDir = [-0.45, -0.70, 0.55];
      lightCol = [255, 240, 200];
      ambCol = [45, 35, 65];
      rimCol = [215, 175, 95]; // Gold rim accent
      rimPower = 2.0;
      specPower = 24;
      specIntensity = 1.8;
    } else {
      // DIR_C: VOLUMETRIC PIXEL ART: Smooth 3D normals with fine quantization
      lightDir = [-0.50, -0.60, 0.62];
      lightCol = [255, 230, 190];
      ambCol = [40, 45, 60];
      rimCol = [120, 160, 210];
      rimPower = 3.5;
      specPower = 48;
      specIntensity = 1.5;
    }

    const normLight = Math.hypot(...lightDir);
    const L = [lightDir[0] / normLight, lightDir[1] / normLight, lightDir[2] / normLight];

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = px - cx, dy = py - cy;

        for (let tz = rz; tz >= -rz; tz -= 0.6) {
          // Inverse rotations
          const rx0 = dx * cosY + tz * sinY;
          const rz0 = -dx * sinY + tz * cosY;
          const ry0 = dy * cosX - rz0 * sinX;
          const rz1 = dy * sinX + rz0 * cosX;

          if ((rx0 / rx) ** 2 + (ry0 / ry) ** 2 + (rz1 / rz) ** 2 <= 1.0) {
            // Surface normal
            let nx = rx0 / (rx * rx);
            let ny = ry0 / (ry * ry);
            let nz = rz1 / (rz * rz);
            // Unrotate
            const ny1 = ny * cosX + nz * sinX;
            const nz1 = -ny * sinX + nz * cosX;
            const nx1 = nx * cosY - nz1 * sinY;
            const nz2 = nx * sinY + nz1 * cosY;
            const nLen = Math.hypot(nx1, ny1, nz2) || 1;
            const N = [nx1 / nLen, ny1 / nLen, nz2 / nLen];

            // Shading
            const NdotL = Math.max(0, N[0] * L[0] + N[1] * L[1] + N[2] * L[2]);
            const H = [L[0], L[1], L[2] + 1];
            const hLen = Math.hypot(...H) || 1;
            const NdotH = Math.max(0, N[0] * (H[0] / hLen) + N[1] * (H[1] / hLen) + N[2] * (H[2] / hLen));

            // Rim light (tangent edges)
            const rim = Math.pow(Math.max(0, 1.0 - N[2]), rimPower) * Math.max(0, N[0] * -L[0] + N[1] * -L[1]);

            let spec = 0;
            if (mat === 'STEEL') spec = Math.pow(NdotH, specPower) * specIntensity;
            else if (mat === 'GOLD') spec = Math.pow(NdotH, 32) * (specIntensity * 1.2);
            else if (mat === 'LEATHER') spec = Math.pow(NdotH, 8) * 0.3;
            else if (mat === 'STONE') spec = Math.pow(NdotH, 14) * 0.4;

            // Ambient Occlusion
            const ao = Math.max(0.35, (N[2] + 0.6) / 1.6);

            let r = (baseCol[0] * ambCol[0] / 255 * ao) + (baseCol[0] * lightCol[0] / 255 * NdotL) + (255 * spec) + (rimCol[0] * rim);
            let g = (baseCol[1] * ambCol[1] / 255 * ao) + (baseCol[1] * lightCol[1] / 255 * NdotL) + (255 * spec) + (rimCol[1] * rim);
            let b = (baseCol[2] * ambCol[2] / 255 * ao) + (baseCol[2] * lightCol[2] / 255 * NdotL) + (255 * spec * 1.1) + (rimCol[2] * rim);

            this.setPixel(px, py, cz + tz, r, g, b, 255);
            break;
          }
        }
      }
    }
  }

  // Draw styled Greatsword
  drawGreatsword({ cx, cy, cz, angle, length, width, style }) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const perpX = -sin, perpY = cos;

    // Crossguard styling
    const guardLen = style === 'DIR_B' ? 18 : 15;
    for (let g = -guardLen; g <= guardLen; g++) {
      const gx = cx + perpX * g, gy = cy + perpY * g;
      const th = Math.abs(g) > 11 ? 2 : (style === 'DIR_A' ? 4 : 3);
      for (let t = -th; t <= th; t++) {
        const px = gx + cos * t, py = gy + sin * t;
        const col = style === 'DIR_B' ? [215, 175, 80] : (style === 'DIR_A' ? [90, 85, 95] : [140, 140, 150]);
        const shade = Math.max(0.4, 0.6 + 0.4 * (perpX * g > 0 ? 0.3 : -0.2));
        this.setPixel(px, py, cz + 2, col[0] * shade, col[1] * shade, col[2] * shade);
      }
    }

    // Pommel
    const pomX = cx - cos * 15, pomY = cy - sin * 15;
    const pomCol = style === 'DIR_B' ? [235, 195, 95] : [160, 155, 165];
    this.drawVolume({ cx: pomX, cy: pomY, cz: cz - 1, rx: 4.5, ry: 4.5, rz: 4.5, baseCol: pomCol, style, mat: 'STEEL' });

    // Grip
    for (let gr = 0; gr < 14; gr++) {
      const gpx = cx - cos * gr, gpy = cy - sin * gr;
      for (let w = -2; w <= 2; w++) {
        const px = gpx + perpX * w, py = gpy + perpY * w;
        const wrap = (gr % 3 === 0) ? 1.25 : 0.85;
        const gCol = style === 'DIR_A' ? [70, 40, 30] : [95, 55, 40];
        this.setPixel(px, py, cz + 1, gCol[0] * wrap, gCol[1] * wrap, gCol[2] * wrap);
      }
    }

    // Blade
    for (let l = 0; l <= length; l++) {
      const t = l / length;
      const curW = width * (1.0 - t * 0.65);
      const bx = cx + cos * l, by = cy + sin * l;

      for (let w = -curW; w <= curW; w += 0.5) {
        const px = bx + perpX * w, py = by + perpY * w;
        const side = w < 0 ? -1 : 1;
        const distFromCenter = Math.abs(w);
        const fuller = distFromCenter < 1.0 && t < 0.7; // Blood groove / fuller
        
        let r, g, b;
        if (fuller) {
          r = style === 'DIR_B' ? 140 : 80;
          g = style === 'DIR_B' ? 70 : 85;
          b = style === 'DIR_B' ? 200 : 95; // Runic glow in Dir B!
        } else {
          const shade = side > 0 ? 1.15 : 0.75;
          const glint = distFromCenter < 0.8 ? 0.35 : 0;
          const baseV = 185 + glint * 70;
          r = baseV * shade;
          g = (baseV + 5) * shade;
          b = (baseV + 15) * shade;
        }
        this.setPixel(px, py, cz + (1.5 - distFromCenter * 0.3), r, g, b);
      }
    }
  }

  // Artistic finish tailored to each direction
  finish(style) {
    const w = this.width, h = this.height;
    const out = Buffer.alloc(w * h * 4);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const a = this.color[idx + 3];
        if (a === 0) continue;

        let r = this.color[idx];
        let g = this.color[idx + 1];
        let b = this.color[idx + 2];

        // Edge detection
        let isEdge = false;
        for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nx = x + ox, ny = y + oy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h || this.color[(ny * w + nx) * 4 + 3] === 0) {
            isEdge = true;
            break;
          }
        }

        if (style === 'DIR_A') {
          // 2.5D DARK FANTASY: Heavy charcoal silhouette border, high contrast
          if (isEdge) {
            r = Math.round(r * 0.22);
            g = Math.round(g * 0.22);
            b = Math.round(b * 0.26);
          } else {
            // 32 discrete volume levels, deeper darks
            r = Math.round(Math.round(r / 10) * 10);
            g = Math.round(Math.round(g / 10) * 10);
            b = Math.round(Math.round(b / 10) * 10);
          }
        } else if (style === 'DIR_B') {
          // CINEMATIC PIXEL ART: Master handcrafted clusters, vibrant ramps
          if (isEdge) {
            // Deep purple-brown dark fantasy contour
            r = 32; g = 20; b = 38;
          } else {
            // Saturated color steps (16 tonal bands)
            r = Math.round(Math.round(r / 14) * 14 * 1.05);
            g = Math.round(Math.round(g / 14) * 14 * 1.02);
            b = Math.round(Math.round(b / 14) * 14 * 1.08);
          }
        } else {
          // DIR_C: VOLUMETRIC PIXEL ART: Smooth 3D downsampled look
          if (isEdge) {
            r = Math.round(r * 0.28);
            g = Math.round(g * 0.28);
            b = Math.round(b * 0.32);
          } else {
            r = Math.round(Math.round(r / 6) * 6);
            g = Math.round(Math.round(g / 6) * 6);
            b = Math.round(Math.round(b / 6) * 6);
          }
        }

        out[idx] = Math.min(255, r);
        out[idx + 1] = Math.min(255, g);
        out[idx + 2] = Math.min(255, b);
        out[idx + 3] = a;
      }
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// WARRIOR BUILDER PER DIRECTION
// ---------------------------------------------------------------------------
function buildWarrior(width, height, { style, angleY = 0, attackFrame = -1, walkOffset = 0 }) {
  const buf = new StyleBuffer(width, height);
  const rootX = width / 2;
  const rootY = height / 2 + 12;
  const rootZ = 0;

  // Kinetic attack angles
  let torsoAngleY = angleY;
  let torsoTiltX = 0;
  let swordAngle = Math.PI / 4;
  let swordX = rootX + 18, swordY = rootY - 16, swordZ = 14;
  let swordLen = 46;

  if (attackFrame >= 0) {
    switch (attackFrame) {
      case 0: // Windup
        torsoAngleY = angleY - 0.45; torsoTiltX = 0.1;
        swordAngle = -Math.PI * 0.65; swordX = rootX - 16; swordY = rootY - 36; swordZ = 10;
        break;
      case 1: // Apex Tension
        torsoAngleY = angleY - 0.62; torsoTiltX = 0.16;
        swordAngle = -Math.PI * 0.88; swordX = rootX - 18; swordY = rootY - 48; swordZ = 20;
        break;
      case 2: // Acceleration Drop
        torsoAngleY = angleY - 0.22; torsoTiltX = -0.12;
        swordAngle = -Math.PI * 0.28; swordX = rootX; swordY = rootY - 40; swordZ = 18;
        break;
      case 3: // Strike
        torsoAngleY = angleY + 0.36; torsoTiltX = -0.24;
        swordAngle = Math.PI * 0.18; swordX = rootX + 24; swordY = rootY - 20; swordZ = 15;
        break;
      case 4: // Impact Clash
        torsoAngleY = angleY + 0.58; torsoTiltX = -0.28;
        swordAngle = Math.PI * 0.34; swordX = rootX + 32; swordY = rootY - 12; swordZ = 12;
        break;
      case 5: // Follow-through
        torsoAngleY = angleY + 0.68; torsoTiltX = -0.16;
        swordAngle = Math.PI * 0.58; swordX = rootX + 26; swordY = rootY + 4; swordZ = 8;
        break;
      case 6: // Recovery
        torsoAngleY = angleY + 0.28; torsoTiltX = -0.06;
        swordAngle = Math.PI * 0.42; swordX = rootX + 20; swordY = rootY - 6; swordZ = 11;
        break;
      case 7: // Ready Guard
        torsoAngleY = angleY; torsoTiltX = 0;
        swordAngle = Math.PI * 0.25; swordX = rootX + 18; swordY = rootY - 16; swordZ = 14;
        break;
    }
  }

  // Palettes per Direction
  let plateCol, gambesonCol, goldCol, capeCol;
  if (style === 'DIR_A') {
    plateCol = [115, 120, 130];
    gambesonCol = [70, 42, 30];
    goldCol = [190, 145, 65];
    capeCol = [90, 25, 25]; // Blood red cape
  } else if (style === 'DIR_B') {
    plateCol = [140, 145, 165];
    gambesonCol = [95, 50, 45];
    goldCol = [230, 185, 80];
    capeCol = [135, 35, 45]; // Rich crimson cape
  } else {
    plateCol = [130, 135, 145];
    gambesonCol = [80, 55, 38];
    goldCol = [210, 165, 75];
    capeCol = [105, 30, 35];
  }

  // 1. Cape / Back Layer (Z=-5)
  buf.drawVolume({
    cx: rootX, cy: rootY + 10, cz: rootZ - 8,
    rx: 14, ry: 24, rz: 4,
    rotY: torsoAngleY,
    baseCol: capeCol, style, mat: 'LEATHER'
  });

  // 2. Legs & Greaves (Z=20)
  buf.drawVolume({
    cx: rootX - 9, cy: rootY + 18 + walkOffset, cz: rootZ - 2,
    rx: 6, ry: 11, rz: 6,
    baseCol: plateCol, style, mat: 'STEEL'
  });
  buf.drawVolume({
    cx: rootX - 9, cy: rootY + 34 + walkOffset, cz: rootZ - 1,
    rx: 5.5, ry: 10, rz: 5.5,
    baseCol: plateCol, style, mat: 'STEEL'
  });
  buf.drawVolume({
    cx: rootX + 9, cy: rootY + 18 - walkOffset, cz: rootZ - 2,
    rx: 6, ry: 11, rz: 6,
    baseCol: plateCol, style, mat: 'STEEL'
  });
  buf.drawVolume({
    cx: rootX + 9, cy: rootY + 34 - walkOffset, cz: rootZ - 1,
    rx: 5.5, ry: 10, rz: 5.5,
    baseCol: plateCol, style, mat: 'STEEL'
  });

  // Sabatons (Boots)
  buf.drawVolume({
    cx: rootX - 10, cy: rootY + 44 + walkOffset, cz: rootZ + 4,
    rx: 6, ry: 4.5, rz: 8,
    baseCol: [90, 95, 105], style, mat: 'STEEL'
  });
  buf.drawVolume({
    cx: rootX + 10, cy: rootY + 44 - walkOffset, cz: rootZ + 4,
    rx: 6, ry: 4.5, rz: 8,
    baseCol: [90, 95, 105], style, mat: 'STEEL'
  });

  // 3. Torso & Gambeson Faulds (Z=30)
  buf.drawVolume({
    cx: rootX, cy: rootY + 8, cz: rootZ,
    rx: 13, ry: 8, rz: 10,
    rotY: torsoAngleY,
    baseCol: gambesonCol, style, mat: 'LEATHER'
  });

  // Heavy Cuirass (Breastplate)
  buf.drawVolume({
    cx: rootX, cy: rootY - 7, cz: rootZ + 3,
    rx: 15, ry: 15, rz: 12,
    rotY: torsoAngleY, rotX: torsoTiltX,
    baseCol: plateCol, style, mat: 'STEEL'
  });

  // Gold Trim on Cuirass
  buf.drawVolume({
    cx: rootX, cy: rootY - 15, cz: rootZ + 8,
    rx: 9, ry: 3.5, rz: 4,
    rotY: torsoAngleY,
    baseCol: goldCol, style, mat: 'GOLD'
  });

  // 4. Pauldrons & Arms (Z=40)
  const cosT = Math.cos(torsoAngleY), sinT = Math.sin(torsoAngleY);
  const lShoulderX = rootX - 18 * cosT, lShoulderZ = rootZ + 18 * sinT;
  const rShoulderX = rootX + 18 * cosT, rShoulderZ = rootZ - 18 * sinT;

  buf.drawVolume({
    cx: lShoulderX, cy: rootY - 16, cz: lShoulderZ,
    rx: 9.5, ry: 10.5, rz: 9.5,
    rotY: torsoAngleY,
    baseCol: plateCol, style, mat: 'STEEL'
  });
  buf.drawVolume({
    cx: rShoulderX, cy: rootY - 16, cz: rShoulderZ,
    rx: 9.5, ry: 10.5, rz: 9.5,
    rotY: torsoAngleY,
    baseCol: plateCol, style, mat: 'STEEL'
  });

  // Arms and gauntlets
  buf.drawVolume({
    cx: lShoulderX - 4, cy: rootY - 3, cz: lShoulderZ + 4,
    rx: 5.5, ry: 10, rz: 5.5,
    baseCol: plateCol, style, mat: 'STEEL'
  });
  buf.drawVolume({
    cx: rShoulderX + 4, cy: rootY - 3, cz: rShoulderZ + 4,
    rx: 5.5, ry: 10, rz: 5.5,
    baseCol: plateCol, style, mat: 'STEEL'
  });

  // Gauntlets at sword hilt
  buf.drawVolume({
    cx: swordX - 2, cy: swordY + 4, cz: swordZ + 3,
    rx: 5, ry: 5, rz: 5,
    baseCol: plateCol, style, mat: 'STEEL'
  });

  // 5. Head & Sallet Helmet (Z=70)
  buf.drawVolume({
    cx: rootX, cy: rootY - 29, cz: rootZ + 2,
    rx: 10.5, ry: 11.5, rz: 10.5,
    rotY: torsoAngleY,
    baseCol: plateCol, style, mat: 'STEEL'
  });

  // Visor Slit
  const visorX = rootX + 7 * sinT, visorZ = rootZ + 2 + 8 * cosT;
  buf.drawVolume({
    cx: visorX, cy: rootY - 29, cz: visorZ + 3,
    rx: 5.5, ry: 1.8, rz: 3,
    rotY: torsoAngleY,
    baseCol: [20, 15, 25], style, mat: 'LEATHER'
  });

  // Helmet Crest
  buf.drawVolume({
    cx: rootX, cy: rootY - 37, cz: rootZ + 2,
    rx: 2.5, ry: 3.5, rz: 9,
    rotY: torsoAngleY,
    baseCol: goldCol, style, mat: 'GOLD'
  });

  // 6. Greatsword (Z=50)
  buf.drawGreatsword({
    cx: swordX, cy: swordY, cz: swordZ,
    angle: swordAngle, length: swordLen, width: 7,
    style
  });

  return buf.finish(style);
}

// ---------------------------------------------------------------------------
// ENEMY BUILDER PER DIRECTION
// ---------------------------------------------------------------------------
function buildEnemy(width, height, style) {
  const buf = new StyleBuffer(width, height);
  const cx = width / 2;
  const cy = height / 2 + 10;

  let bodyCol, ironCol, glowCol;
  if (style === 'DIR_A') {
    // Crypt Revenant: Ancient weathered tomb granite & rusted iron
    bodyCol = [85, 80, 90];
    ironCol = [55, 45, 40];
    glowCol = [255, 60, 20];
  } else if (style === 'DIR_B') {
    // Bloodbound Fiend: Saturated dark violet obsidian & gold spikes
    bodyCol = [95, 65, 110];
    ironCol = [185, 140, 60];
    glowCol = [255, 30, 80];
  } else {
    // Obsidian Gargoyle: Smooth dark volcanic stone
    bodyCol = [70, 75, 85];
    ironCol = [65, 60, 70];
    glowCol = [120, 220, 255];
  }

  // Legs & Claws
  buf.drawVolume({ cx: cx - 13, cy: cy + 26, cz: 0, rx: 7, ry: 13, rz: 7, baseCol: bodyCol, style, mat: 'STONE' });
  buf.drawVolume({ cx: cx + 13, cy: cy + 26, cz: 0, rx: 7, ry: 13, rz: 7, baseCol: bodyCol, style, mat: 'STONE' });
  buf.drawVolume({ cx: cx - 14, cy: cy + 40, cz: 5, rx: 8, ry: 5, rz: 9, baseCol: ironCol, style, mat: 'STEEL' });
  buf.drawVolume({ cx: cx + 14, cy: cy + 40, cz: 5, rx: 8, ry: 5, rz: 9, baseCol: ironCol, style, mat: 'STEEL' });

  // Torso
  buf.drawVolume({ cx, cy: cy - 2, cz: 2, rx: 19, ry: 18, rz: 15, baseCol: bodyCol, style, mat: 'STONE' });
  // Iron Ribcage / Armor
  buf.drawVolume({ cx, cy: cy - 5, cz: 9, rx: 14, ry: 10, rz: 8, baseCol: ironCol, style, mat: 'STEEL' });
  // Glowing Core
  buf.drawVolume({ cx, cy: cy - 5, cz: 11, rx: 5, ry: 5, rz: 4, baseCol: glowCol, style, mat: 'GOLD' });

  // Head & Horns
  buf.drawVolume({ cx, cy: cy - 28, cz: 4, rx: 12, ry: 12, rz: 12, baseCol: bodyCol, style, mat: 'STONE' });
  buf.drawVolume({ cx: cx - 15, cy: cy - 40, cz: 2, rx: 4.5, ry: 13, rz: 4.5, baseCol: ironCol, style, mat: 'STONE' });
  buf.drawVolume({ cx: cx + 15, cy: cy - 40, cz: 2, rx: 4.5, ry: 13, rz: 4.5, baseCol: ironCol, style, mat: 'STONE' });

  // Glowing Eyes
  buf.drawVolume({ cx: cx - 5, cy: cy - 28, cz: 13, rx: 2.5, ry: 1.5, rz: 1.5, baseCol: glowCol, style, mat: 'GOLD' });
  buf.drawVolume({ cx: cx + 5, cy: cy - 28, cz: 13, rx: 2.5, ry: 1.5, rz: 1.5, baseCol: glowCol, style, mat: 'GOLD' });

  // Heavy weapon
  buf.drawVolume({ cx: cx + 28, cy: cy - 6, cz: 11, rx: 10, ry: 22, rz: 10, baseCol: ironCol, style, mat: 'STEEL' });

  return buf.finish(style);
}

// ---------------------------------------------------------------------------
// GOTHIC PILLAR & ENVIRONMENT PROPS PER STYLE
// ---------------------------------------------------------------------------
function buildPillar(width, height, style) {
  const buf = new StyleBuffer(width, height);
  const cx = width / 2;
  const baseCy = height - 26;

  let stoneCol, trimCol;
  if (style === 'DIR_A') {
    stoneCol = [75, 70, 80];
    trimCol = [100, 95, 110];
  } else if (style === 'DIR_B') {
    stoneCol = [85, 75, 105];
    trimCol = [180, 140, 70];
  } else {
    stoneCol = [80, 80, 90];
    trimCol = [110, 110, 125];
  }

  // Plinth
  for (let y = baseCy; y < height; y++) {
    const t = (y - baseCy) / 26;
    const w = 26 + t * 4;
    for (let x = cx - w; x <= cx + w; x++) {
      const shade = Math.max(0.3, 0.5 + 0.5 * ((x - cx) / w * -0.5));
      buf.setPixel(x, y, 10, stoneCol[0] * shade, stoneCol[1] * shade, stoneCol[2] * shade);
    }
  }

  // Fluted Shaft
  for (let y = 20; y < baseCy; y++) {
    const r = 20;
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = (x - cx) / r;
      const dz = Math.sqrt(Math.max(0, 1 - dx * dx));
      const flute = Math.sin(dx * Math.PI * 4) * 0.18;
      const nDotL = Math.max(0, dx * -0.5 + dz * 0.6) + flute;
      buf.setPixel(x, y, dz * 10, stoneCol[0] * nDotL + 25, stoneCol[1] * nDotL + 25, stoneCol[2] * nDotL + 30);
    }
  }

  // Capital (Top)
  for (let y = 0; y < 20; y++) {
    const t = (20 - y) / 20;
    const w = 20 + t * 8;
    for (let x = cx - w; x <= cx + w; x++) {
      const shade = Math.max(0.35, 0.5 + 0.5 * ((x - cx) / w * -0.5));
      buf.setPixel(x, y, 15, trimCol[0] * shade, trimCol[1] * shade, trimCol[2] * shade);
    }
  }

  return buf.finish(style);
}

// ---------------------------------------------------------------------------
// BAKE AND SAVE TO ASSETS/REVITALIZATION/
// ---------------------------------------------------------------------------
const baseOut = path.resolve('assets/revitalization');
['dir_a', 'dir_b', 'dir_c', 'shared'].forEach(d => {
  const p = path.join(baseOut, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

console.log("=== Baking Revitalization Art Direction Assets (160x160) ===");

const dirAngles = [
  0,                  // S
  Math.PI * 0.25,     // SE
  Math.PI * 0.5,      // E
  Math.PI * 0.75,     // NE
  Math.PI,            // N
  -Math.PI * 0.75,    // NW
  -Math.PI * 0.5,     // W
  -Math.PI * 0.25     // SW
];

for (const [sKey, sName] of [['DIR_A', 'dir_a'], ['DIR_B', 'dir_b'], ['DIR_C', 'dir_c']]) {
  console.log(`\nBaking ${sKey} (${sName})...`);
  const sPath = path.join(baseOut, sName);

  // 1. Warrior 8 Directions (160x160 per frame -> 1280x160)
  const w8Buf = Buffer.alloc(1280 * 160 * 4);
  dirAngles.forEach((ang, i) => {
    const fBuf = buildWarrior(160, 160, { style: sKey, angleY: ang });
    for (let y = 0; y < 160; y++) {
      const srcOff = y * 160 * 4;
      const dstOff = (y * 1280 + i * 160) * 4;
      fBuf.copy(w8Buf, dstOff, srcOff, srcOff + 160 * 4);
    }
  });
  fs.writeFileSync(path.join(sPath, 'warrior-8dir.png'), createPNG(1280, 160, w8Buf));
  console.log(`  -> ${sName}/warrior-8dir.png saved!`);

  // 2. Warrior 8-Frame Attack (160x160 per frame -> 1280x160)
  const atkBuf = Buffer.alloc(1280 * 160 * 4);
  for (let f = 0; f < 8; f++) {
    const fBuf = buildWarrior(160, 160, { style: sKey, angleY: 0.25, attackFrame: f });
    for (let y = 0; y < 160; y++) {
      const srcOff = y * 160 * 4;
      const dstOff = (y * 1280 + f * 160) * 4;
      fBuf.copy(atkBuf, dstOff, srcOff, srcOff + 160 * 4);
    }
  }
  fs.writeFileSync(path.join(sPath, 'warrior-attack.png'), createPNG(1280, 160, atkBuf));
  console.log(`  -> ${sName}/warrior-attack.png saved!`);

  // 3. Enemy (160x160)
  const enemyBuf = buildEnemy(160, 160, sKey);
  fs.writeFileSync(path.join(sPath, 'enemy.png'), createPNG(160, 160, enemyBuf));
  console.log(`  -> ${sName}/enemy.png saved!`);

  // 4. Pillar (64x180)
  const pillarBuf = buildPillar(64, 180, sKey);
  fs.writeFileSync(path.join(sPath, 'pillar.png'), createPNG(64, 180, pillarBuf));
  console.log(`  -> ${sName}/pillar.png saved!`);
}

// Copy shared props (magic orb, tiles)
fs.copyFileSync('assets/benchmark/dungeon-tiles.png', path.join(baseOut, 'shared/dungeon-tiles.png'));
fs.copyFileSync('assets/benchmark/magic-orb.png', path.join(baseOut, 'shared/magic-orb.png'));
console.log("\nAll 3 Art Directions baked successfully into assets/revitalization/!");
