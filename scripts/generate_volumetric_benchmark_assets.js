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

// -------------------------------------------------------------
// VOLUMETRIC RENDERING ENGINE (Mathematical 3D Volume to 2.5D Sprite)
// -------------------------------------------------------------

class VolumetricBuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.color = Buffer.alloc(width * height * 4); // RGBA
    this.depth = new Float32Array(width * height).fill(-999999); // Z-buffer
    this.material = new Uint8Array(width * height); // Mat ID
  }

  setPixel(x, y, z, r, g, b, a = 255, mat = 0) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = y * this.width + x;
    if (z > this.depth[idx]) {
      this.depth[idx] = z;
      const pIdx = idx * 4;
      this.color[pIdx] = Math.max(0, Math.min(255, Math.round(r)));
      this.color[pIdx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      this.color[pIdx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      this.color[pIdx + 3] = Math.max(0, Math.min(255, Math.round(a)));
      this.material[idx] = mat;
    }
  }

  // Render an oriented 3D ellipsoid with material shading
  renderEllipsoid({ cx, cy, cz, rx, ry, rz, rotY = 0, rotX = 0, rotZ = 0, matType, baseColor, lightDir, lightColor, ambientColor, rimDir, rimColor }) {
    // Bounding box in screen space
    const maxR = Math.max(rx, ry, rz) * 1.5;
    const minX = Math.max(0, Math.floor(cx - maxR));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + maxR));
    const minY = Math.max(0, Math.floor(cy - maxR));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + maxR));

    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = px - cx;
        const dy = py - cy;

        // Invert 2.5D projection: find z that intersects ellipsoid surface (x'/rx)^2 + (y'/ry)^2 + (z'/rz)^2 <= 1
        // For simplicity in rotated space:
        // We test ray from front to back along z
        let bestZ = -9999;
        let normal = null;

        // Analytical solution for ellipsoid intersection along Z:
        // Let rotated coordinates be (xr, yr, zr)
        // Ray: px = cx + dx, py = cy + dy, z ranges from +rz to -rz
        for (let testZ = rz; testZ >= -rz; testZ -= 0.5) {
          // Rotate (dx, dy, testZ)
          let rx0 = dx * cosY + testZ * sinY;
          let rz0 = -dx * sinY + testZ * cosY;
          let ry0 = dy * cosX - rz0 * sinX;
          let rz1 = dy * sinX + rz0 * cosX;

          const eq = (rx0 / rx) * (rx0 / rx) + (ry0 / ry) * (ry0 / ry) + (rz1 / rz) * (rz1 / rz);
          if (eq <= 1.0) {
            bestZ = cz + testZ;
            // Surface normal in object space: (2*rx0/rx^2, 2*ry0/ry^2, 2*rz1/rz^2)
            let nx = rx0 / (rx * rx);
            let ny = ry0 / (ry * ry);
            let nz = rz1 / (rz * rz);
            // Rotate normal back to world space
            // Un-rotate X
            let ny1 = ny * cosX + nz * sinX;
            let nz1 = -ny * sinX + nz * cosX;
            // Un-rotate Y
            let nx1 = nx * cosY - nz1 * sinY;
            let nz2 = nx * sinY + nz1 * cosY;
            
            const nLen = Math.hypot(nx1, ny1, nz2) || 1;
            normal = [nx1 / nLen, ny1 / nLen, nz2 / nLen];
            break;
          }
        }

        if (bestZ > -9999 && normal) {
          // Shading calculation
          const [nx, ny, nz] = normal;
          // Diffuse
          const NdotL = Math.max(0, nx * lightDir[0] + ny * lightDir[1] + nz * lightDir[2]);
          // Specular (Blinn-Phong)
          // View vector is [0, 0, 1] (towards viewer)
          const hx = lightDir[0], hy = lightDir[1], hz = lightDir[2] + 1;
          const hLen = Math.hypot(hx, hy, hz) || 1;
          const NdotH = Math.max(0, nx * (hx / hLen) + ny * (hy / hLen) + nz * (hz / hLen));

          // Rim light (back/side light)
          const rimDot = Math.max(0, nx * rimDir[0] + ny * rimDir[1] + nz * rimDir[2]);
          const rimPow = Math.pow(rimDot, 3) * (1.0 - Math.max(0, nz)); // Stronger at silhouette edges

          let spec = 0;
          let diffMult = 1.0;
          let ambientOcc = Math.max(0.3, (nz + 0.5) / 1.5); // Self occlusion on rear edges

          if (matType === 'STEEL') {
            // Highly reflective, sharp specular band, slight blueish tint
            spec = Math.pow(NdotH, 36) * 1.5;
            diffMult = 0.85;
          } else if (matType === 'LEATHER') {
            // Matte, warm, broad soft specularity
            spec = Math.pow(NdotH, 6) * 0.25;
            diffMult = 1.0;
          } else if (matType === 'CLOTH') {
            // Diffuse only, velvety falloff
            spec = 0;
            diffMult = 1.1;
          } else if (matType === 'STONE') {
            // Rough, micro-texture stipple
            const stipple = ((Math.sin(px * 12.3 + py * 7.7) * 43758.5453) % 1) * 0.15;
            spec = Math.pow(NdotH, 12) * 0.3;
            diffMult = 0.9 + stipple;
          } else if (matType === 'GOLD') {
            spec = Math.pow(NdotH, 28) * 1.8;
            diffMult = 0.9;
          }

          let r = (baseColor[0] * ambientColor[0] / 255 * ambientOcc) + 
                  (baseColor[0] * lightColor[0] / 255 * NdotL * diffMult) + 
                  (255 * spec) + (rimColor[0] * rimPow);
          let g = (baseColor[1] * ambientColor[1] / 255 * ambientOcc) + 
                  (baseColor[1] * lightColor[1] / 255 * NdotL * diffMult) + 
                  (255 * spec) + (rimColor[1] * rimPow);
          let b = (baseColor[2] * ambientColor[2] / 255 * ambientOcc) + 
                  (baseColor[2] * lightColor[2] / 255 * NdotL * diffMult) + 
                  (255 * spec * 1.1) + (rimColor[2] * rimPow);

          this.setPixel(px, py, bestZ, r, g, b, 255, matType === 'STEEL' ? 1 : 2);
        }
      }
    }
  }

  // Render a volumetric beveled sword blade
  renderSword({ cx, cy, cz, angle, length, width, lightDir, lightColor, ambientColor, rimDir, rimColor }) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const perpX = -sin, perpY = cos;

    // Crossguard
    const guardLen = 14;
    for (let g = -guardLen; g <= guardLen; g++) {
      const gx = cx + perpX * g;
      const gy = cy + perpY * g;
      const thick = Math.abs(g) > 10 ? 2 : 3.5;
      for (let t = -thick; t <= thick; t++) {
        const px = gx + cos * t;
        const py = gy + sin * t;
        const norm = Math.abs(g) / guardLen;
        const shade = Math.max(0, 0.4 + 0.6 * (cos * lightDir[0] + sin * lightDir[1]));
        const r = 180 * shade + 30;
        const gr = 150 * shade + 25;
        const b = 90 * shade + 15;
        this.setPixel(px, py, cz + 2, r, gr, b, 255, 3);
      }
    }

    // Pommel
    const pommelX = cx - cos * 14;
    const pommelY = cy - sin * 14;
    this.renderEllipsoid({
      cx: pommelX, cy: pommelY, cz: cz - 1,
      rx: 4, ry: 4, rz: 4,
      matType: 'GOLD',
      baseColor: [180, 150, 80],
      lightDir, lightColor, ambientColor, rimDir, rimColor
    });

    // Grip
    for (let gr = 0; gr < 14; gr++) {
      const gpx = cx - cos * gr;
      const gpy = cy - sin * gr;
      for (let w = -2; w <= 2; w++) {
        const px = gpx + perpX * w;
        const py = gpy + perpY * w;
        const wrap = (gr % 3 === 0) ? 1.2 : 0.85;
        this.setPixel(px, py, cz + 1, 70 * wrap, 45 * wrap, 25 * wrap, 255, 2);
      }
    }

    // Blade (diamond cross-section with ridge)
    for (let l = 0; l <= length; l++) {
      const t = l / length;
      const curW = width * (1.0 - t * 0.7); // Tapering towards point
      const bx = cx + cos * l;
      const by = cy + sin * l;

      for (let w = -curW; w <= curW; w += 0.5) {
        const px = bx + perpX * w;
        const py = by + perpY * w;
        
        // Blade normal: left bevel vs right bevel
        const side = w < 0 ? -1 : (w > 0 ? 1 : 0);
        // Bevel normal: tilted 45 deg away from central ridge
        const bevelN = [perpX * side * 0.707 + cos * 0.1, perpY * side * 0.707 + sin * 0.1, 0.707];
        const nDotL = Math.max(0, bevelN[0] * lightDir[0] + bevelN[1] * lightDir[1] + bevelN[2] * lightDir[2]);
        
        // Specular glint along central spine
        const spineDist = Math.abs(w);
        const spineGlint = spineDist < 0.8 ? 0.45 : 0;
        const spec = Math.pow(Math.max(0, bevelN[0] * lightDir[0] + bevelN[1] * lightDir[1] + (bevelN[2] + 1) * 0.5), 32) * 1.8;

        const baseVal = 180 + spineGlint * 70;
        const r = (baseVal * 0.35) + (baseVal * 0.65 * nDotL) + spec * 220;
        const g = (baseVal * 0.38) + (baseVal * 0.68 * nDotL) + spec * 230;
        const b = (baseVal * 0.45) + (baseVal * 0.75 * nDotL) + spec * 255;

        this.setPixel(px, py, cz + (1.5 - spineDist * 0.3), r, g, b, 255, 1);
      }
    }
  }

  // Controlled pixel-art quantizer and outline enhancer
  applyPixelArtFinish() {
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

        // Check if on silhouette edge (ambient boundary)
        let isEdge = false;
        for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nx = x + ox, ny = y + oy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) { isEdge = true; break; }
          if (this.color[(ny * w + nx) * 4 + 3] === 0) { isEdge = true; break; }
        }

        if (isEdge) {
          // Dark fantasy rim-shadow border (dark charcoal / sepia, NOT plain black!)
          r = Math.round(r * 0.28);
          g = Math.round(g * 0.28);
          b = Math.round(b * 0.32);
        } else {
          // Quantize color palette to 32 discrete volume levels per channel
          r = Math.round(Math.round(r / 8) * 8);
          g = Math.round(Math.round(g / 8) * 8);
          b = Math.round(Math.round(b / 8) * 8);
        }

        out[idx] = r;
        out[idx + 1] = g;
        out[idx + 2] = b;
        out[idx + 3] = a;
      }
    }
    return out;
  }
}

// -------------------------------------------------------------
// WARRIOR ANATOMICAL VOLUME BUILDER (8 DIRECTIONS & ATTACK CYCLES)
// -------------------------------------------------------------

const LIGHT_CONFIG = {
  lightDir: [-0.45, -0.65, 0.6], // Key light from upper-left-front
  lightColor: [255, 235, 195],   // Warm torch / lantern
  ambientColor: [45, 50, 70],    // Cool shadow undertone
  rimDir: [0.6, 0.7, -0.3],      // Subtle rim backlight
  rimColor: [110, 140, 180]      // Steel glint rim
};

function renderWarriorFrame(width, height, { angleY = 0, attackFrame = -1, walkOffset = 0 }) {
  const buf = new VolumetricBuffer(width, height);
  const cfg = LIGHT_CONFIG;

  // Base coordinates for center of character
  const rootX = width / 2;
  const rootY = height / 2 + 10;
  const rootZ = 0;

  // Attack kinetics calculations
  let torsoAngleY = angleY;
  let torsoTiltX = 0;
  let torsoLeanZ = 0;
  let swordAngle = Math.PI / 4;
  let swordX = rootX + 16, swordY = rootY - 14, swordZ = 12;
  let swordLen = 42;

  let leftArmAngle = 0;
  let rightArmAngle = 0;

  if (attackFrame >= 0) {
    // 8-frame heavy slash kinematics
    switch (attackFrame) {
      case 0: // Windup / Anticipation
        torsoAngleY = angleY - 0.45;
        torsoTiltX = 0.1;
        swordAngle = -Math.PI * 0.65;
        swordX = rootX - 14; swordY = rootY - 32; swordZ = 8;
        break;
      case 1: // Apex / Maximum Tension
        torsoAngleY = angleY - 0.6;
        torsoTiltX = 0.15;
        swordAngle = -Math.PI * 0.85;
        swordX = rootX - 16; swordY = rootY - 44; swordZ = 18;
        break;
      case 2: // Drop / Acceleration
        torsoAngleY = angleY - 0.2;
        torsoTiltX = -0.1;
        swordAngle = -Math.PI * 0.25;
        swordX = rootX; swordY = rootY - 36; swordZ = 16;
        break;
      case 3: // Strike / Maximum velocity
        torsoAngleY = angleY + 0.35;
        torsoTiltX = -0.22;
        swordAngle = Math.PI * 0.18;
        swordX = rootX + 22; swordY = rootY - 18; swordZ = 14;
        break;
      case 4: // Clash / Impact
        torsoAngleY = angleY + 0.55;
        torsoTiltX = -0.25;
        swordAngle = Math.PI * 0.32;
        swordX = rootX + 28; swordY = rootY - 10; swordZ = 12;
        break;
      case 5: // Follow-through
        torsoAngleY = angleY + 0.65;
        torsoTiltX = -0.15;
        swordAngle = Math.PI * 0.55;
        swordX = rootX + 22; swordY = rootY + 2; swordZ = 8;
        break;
      case 6: // Rebalance / Recovery
        torsoAngleY = angleY + 0.25;
        torsoTiltX = -0.05;
        swordAngle = Math.PI * 0.4;
        swordX = rootX + 18; swordY = rootY - 6; swordZ = 10;
        break;
      case 7: // Ready / Guard
        torsoAngleY = angleY;
        torsoTiltX = 0;
        swordAngle = Math.PI * 0.25;
        swordX = rootX + 16; swordY = rootY - 14; swordZ = 12;
        break;
    }
  }

  // 1. LEGS & BOOTS (Z=20)
  // Left leg (thigh + shin + sabaton)
  buf.renderEllipsoid({
    cx: rootX - 8, cy: rootY + 16 + walkOffset, cz: rootZ - 2,
    rx: 5.5, ry: 10, rz: 5.5,
    matType: 'STEEL',
    baseColor: [120, 125, 135],
    ...cfg
  });
  buf.renderEllipsoid({
    cx: rootX - 8, cy: rootY + 30 + walkOffset, cz: rootZ - 1,
    rx: 5, ry: 9, rz: 5,
    matType: 'STEEL',
    baseColor: [110, 115, 125],
    ...cfg
  });
  // Right leg
  buf.renderEllipsoid({
    cx: rootX + 8, cy: rootY + 16 - walkOffset, cz: rootZ - 2,
    rx: 5.5, ry: 10, rz: 5.5,
    matType: 'STEEL',
    baseColor: [120, 125, 135],
    ...cfg
  });
  buf.renderEllipsoid({
    cx: rootX + 8, cy: rootY + 30 - walkOffset, cz: rootZ - 1,
    rx: 5, ry: 9, rz: 5,
    matType: 'STEEL',
    baseColor: [110, 115, 125],
    ...cfg
  });

  // Sabatons (Boots resting on floor)
  buf.renderEllipsoid({
    cx: rootX - 9, cy: rootY + 39 + walkOffset, cz: rootZ + 3,
    rx: 5.5, ry: 4, rz: 7,
    matType: 'STEEL',
    baseColor: [90, 95, 105],
    ...cfg
  });
  buf.renderEllipsoid({
    cx: rootX + 9, cy: rootY + 39 - walkOffset, cz: rootZ + 3,
    rx: 5.5, ry: 4, rz: 7,
    matType: 'STEEL',
    baseColor: [90, 95, 105],
    ...cfg
  });

  // 2. TORSO & WAIST (Z=30)
  // Leather gambeson / fauld skirt
  buf.renderEllipsoid({
    cx: rootX, cy: rootY + 8, cz: rootZ,
    rx: 12, ry: 7, rz: 9,
    rotY: torsoAngleY,
    matType: 'LEATHER',
    baseColor: [85, 55, 35],
    ...cfg
  });

  // Steel Cuirass (Breastplate with anatomical chest volume)
  buf.renderEllipsoid({
    cx: rootX, cy: rootY - 6, cz: rootZ + 2,
    rx: 14, ry: 13, rz: 11,
    rotY: torsoAngleY,
    rotX: torsoTiltX,
    matType: 'STEEL',
    baseColor: [145, 150, 165],
    ...cfg
  });

  // Gold trim / filigree band on cuirass
  buf.renderEllipsoid({
    cx: rootX, cy: rootY - 14, cz: rootZ + 7,
    rx: 8, ry: 3, rz: 4,
    rotY: torsoAngleY,
    matType: 'GOLD',
    baseColor: [205, 165, 75],
    ...cfg
  });

  // 3. PAULDRONS & SHOULDERS (Z=40)
  // Left Pauldron
  const cosT = Math.cos(torsoAngleY), sinT = Math.sin(torsoAngleY);
  const leftShoulderX = rootX - 16 * cosT;
  const leftShoulderZ = rootZ + 16 * sinT;
  buf.renderEllipsoid({
    cx: leftShoulderX, cy: rootY - 14, cz: leftShoulderZ,
    rx: 8.5, ry: 9.5, rz: 8.5,
    rotY: torsoAngleY,
    matType: 'STEEL',
    baseColor: [155, 160, 175],
    ...cfg
  });

  // Right Pauldron
  const rightShoulderX = rootX + 16 * cosT;
  const rightShoulderZ = rootZ - 16 * sinT;
  buf.renderEllipsoid({
    cx: rightShoulderX, cy: rootY - 14, cz: rightShoulderZ,
    rx: 8.5, ry: 9.5, rz: 8.5,
    rotY: torsoAngleY,
    matType: 'STEEL',
    baseColor: [155, 160, 175],
    ...cfg
  });

  // Arms and gauntlets
  buf.renderEllipsoid({
    cx: leftShoulderX - 4, cy: rootY - 2, cz: leftShoulderZ + 3,
    rx: 5, ry: 9, rz: 5,
    matType: 'STEEL',
    baseColor: [130, 135, 145],
    ...cfg
  });
  buf.renderEllipsoid({
    cx: rightShoulderX + 4, cy: rootY - 2, cz: rightShoulderZ + 3,
    rx: 5, ry: 9, rz: 5,
    matType: 'STEEL',
    baseColor: [130, 135, 145],
    ...cfg
  });

  // Gauntlets gripping the hilt
  buf.renderEllipsoid({
    cx: swordX - 2, cy: swordY + 4, cz: swordZ + 2,
    rx: 4.5, ry: 4.5, rz: 4.5,
    matType: 'STEEL',
    baseColor: [140, 145, 160],
    ...cfg
  });

  // 4. HEAD & VISOR (Z=70)
  // Armet / Sallet Helmet
  buf.renderEllipsoid({
    cx: rootX, cy: rootY - 26, cz: rootZ + 2,
    rx: 9.5, ry: 10.5, rz: 9.5,
    rotY: torsoAngleY,
    matType: 'STEEL',
    baseColor: [160, 165, 180],
    ...cfg
  });

  // Visor eye-slit
  const visorX = rootX + 6 * sinT;
  const visorZ = rootZ + 2 + 7 * cosT;
  buf.renderEllipsoid({
    cx: visorX, cy: rootY - 26, cz: visorZ + 3,
    rx: 5, ry: 1.5, rz: 3,
    rotY: torsoAngleY,
    matType: 'LEATHER',
    baseColor: [20, 15, 25], // Dark slit shadow
    ...cfg
  });

  // Helmet crest (ridge along top)
  buf.renderEllipsoid({
    cx: rootX, cy: rootY - 33, cz: rootZ + 2,
    rx: 2, ry: 3, rz: 8,
    rotY: torsoAngleY,
    matType: 'GOLD',
    baseColor: [215, 175, 80],
    ...cfg
  });

  // 5. WEAPON (Z=50)
  buf.renderSword({
    cx: swordX, cy: swordY, cz: swordZ,
    angle: swordAngle,
    length: swordLen,
    width: 6.5,
    ...cfg
  });

  return buf.applyPixelArtFinish();
}

// -------------------------------------------------------------
// ENEMY (IRON REVENANT / STONE GARGOYLE)
// -------------------------------------------------------------

function renderEnemyFrame(width, height) {
  const buf = new VolumetricBuffer(width, height);
  const cfg = LIGHT_CONFIG;
  const cx = width / 2;
  const cy = height / 2 + 8;

  // Legs & Claws
  buf.renderEllipsoid({ cx: cx - 11, cy: cy + 24, cz: 0, rx: 6, ry: 12, rz: 6, matType: 'STONE', baseColor: [90, 85, 95], ...cfg });
  buf.renderEllipsoid({ cx: cx + 11, cy: cy + 24, cz: 0, rx: 6, ry: 12, rz: 6, matType: 'STONE', baseColor: [90, 85, 95], ...cfg });
  // Claws
  buf.renderEllipsoid({ cx: cx - 12, cy: cy + 36, cz: 4, rx: 7, ry: 4, rz: 8, matType: 'STEEL', baseColor: [50, 45, 55], ...cfg });
  buf.renderEllipsoid({ cx: cx + 12, cy: cy + 36, cz: 4, rx: 7, ry: 4, rz: 8, matType: 'STEEL', baseColor: [50, 45, 55], ...cfg });

  // Weathered Granite Torso
  buf.renderEllipsoid({ cx, cy: cy - 2, cz: 2, rx: 17, ry: 16, rz: 14, matType: 'STONE', baseColor: [110, 105, 115], ...cfg });

  // Corroded iron chest-plate / cage
  buf.renderEllipsoid({ cx, cy: cy - 4, cz: 8, rx: 12, ry: 9, rz: 7, matType: 'STEEL', baseColor: [60, 50, 45], ...cfg });

  // Glowing demonic core inside chest
  buf.renderEllipsoid({ cx, cy: cy - 4, cz: 10, rx: 4, ry: 4, rz: 3, matType: 'GOLD', baseColor: [255, 60, 20], ...cfg });

  // Horned Head
  buf.renderEllipsoid({ cx, cy: cy - 24, cz: 4, rx: 11, ry: 11, rz: 11, matType: 'STONE', baseColor: [115, 110, 120], ...cfg });

  // Horns
  buf.renderEllipsoid({ cx: cx - 13, cy: cy - 34, cz: 2, rx: 4, ry: 11, rz: 4, rotZ: -0.4, matType: 'STONE', baseColor: [75, 70, 80], ...cfg });
  buf.renderEllipsoid({ cx: cx + 13, cy: cy - 34, cz: 2, rx: 4, ry: 11, rz: 4, rotZ: 0.4, matType: 'STONE', baseColor: [75, 70, 80], ...cfg });

  // Glowing red eye slits
  buf.renderEllipsoid({ cx: cx - 4, cy: cy - 24, cz: 12, rx: 2, ry: 1, rz: 1, matType: 'GOLD', baseColor: [255, 80, 40], ...cfg });
  buf.renderEllipsoid({ cx: cx + 4, cy: cy - 24, cz: 12, rx: 2, ry: 1, rz: 1, matType: 'GOLD', baseColor: [255, 80, 40], ...cfg });

  // Heavy stone maul / club
  buf.renderEllipsoid({ cx: cx + 24, cy: cy - 6, cz: 10, rx: 9, ry: 20, rz: 9, matType: 'STONE', baseColor: [80, 75, 85], ...cfg });

  return buf.applyPixelArtFinish();
}

// -------------------------------------------------------------
// GOTHIC PILLAR & DUNGEON ENVIRONMENT PROPS
// -------------------------------------------------------------

function renderPillar(width, height) {
  const buf = new VolumetricBuffer(width, height);
  const cfg = LIGHT_CONFIG;
  const cx = width / 2;
  const baseCy = height - 24;

  // Square plinth / base
  for (let y = baseCy; y < height; y++) {
    const t = (y - baseCy) / 24;
    const w = 24 + t * 4;
    for (let x = cx - w; x <= cx + w; x++) {
      const shade = Math.max(0.3, 0.5 + 0.5 * ((x - cx) / w * cfg.lightDir[0]));
      buf.setPixel(x, y, 10 - y * 0.1, 75 * shade, 70 * shade, 80 * shade, 255, 4);
    }
  }

  // Cylindrical fluted shaft (Z=120 height)
  for (let y = 18; y < baseCy; y++) {
    const shaftRadius = 18;
    for (let x = cx - shaftRadius; x <= cx + shaftRadius; x++) {
      const dx = (x - cx) / shaftRadius;
      const dz = Math.sqrt(Math.max(0, 1 - dx * dx));
      // Surface normal: (dx, 0, dz)
      const flute = Math.sin(dx * Math.PI * 4) * 0.15;
      const nDotL = Math.max(0, dx * cfg.lightDir[0] + dz * cfg.lightDir[2]) + flute;
      const spec = Math.pow(Math.max(0, dx * cfg.lightDir[0] + (dz + 1) * 0.5), 16) * 0.35;
      
      const r = 85 * 0.35 + 85 * 0.65 * nDotL + spec * 180;
      const g = 80 * 0.35 + 80 * 0.65 * nDotL + spec * 180;
      const b = 92 * 0.35 + 92 * 0.65 * nDotL + spec * 200;
      buf.setPixel(x, y, dz * 10, r, g, b, 255, 4);
    }
  }

  // Carved Capital (Top)
  for (let y = 0; y < 18; y++) {
    const t = (18 - y) / 18;
    const w = 18 + t * 6;
    for (let x = cx - w; x <= cx + w; x++) {
      const shade = Math.max(0.3, 0.5 + 0.5 * ((x - cx) / w * cfg.lightDir[0]));
      buf.setPixel(x, y, 15, 95 * shade, 90 * shade, 105 * shade, 255, 4);
    }
  }

  return buf.applyPixelArtFinish();
}

// -------------------------------------------------------------
// DUNGEON FLAGSTONE TILES & WALLS
// -------------------------------------------------------------

function renderDungeonTiles(width, height) {
  const buf = new VolumetricBuffer(width, height);
  const cfg = LIGHT_CONFIG;

  // 64x64 tiles: Tile 0 = Floor Flagstone, Tile 1 = Wall Top, Tile 2 = Wall Face
  // Tile 0: Floor Flagstone with relief and bevelled cracks
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      // Crack grid at borders
      const isCrack = (x === 0 || x === 63 || y === 0 || y === 63 || (x === 32 && y > 16 && y < 48) || (y === 32 && x < 32));
      const stoneNoise = ((Math.sin(x * 14.3 + y * 9.1) * 43758.54) % 1) * 14;
      if (isCrack) {
        buf.setPixel(x, y, 0, 20, 18, 24, 255, 4);
      } else {
        const bevel = Math.min(x, 63 - x, y, 63 - y) / 8;
        const bShade = Math.min(1.0, bevel + 0.3);
        const r = (55 + stoneNoise) * bShade;
        const g = (50 + stoneNoise) * bShade;
        const b = (62 + stoneNoise) * bShade;
        buf.setPixel(x, y, 0, r, g, b, 255, 4);
      }
    }
  }

  // Tile 1: Wall Top horizontal ledge (width 64..128, y 0..64)
  for (let y = 0; y < 64; y++) {
    for (let x = 64; x < 128; x++) {
      const lx = x - 64;
      const noise = ((Math.sin(lx * 11.2 + y * 8.3) * 43758.54) % 1) * 12;
      const r = 90 + noise;
      const g = 85 + noise;
      const b = 100 + noise;
      buf.setPixel(x, y, 20, r, g, b, 255, 4);
    }
  }

  return buf.applyPixelArtFinish();
}

// -------------------------------------------------------------
// VOLUMETRIC MAGIC ORB (OCCULT FIREBALL)
// -------------------------------------------------------------

function renderMagicOrb(width, height) {
  const buf = new VolumetricBuffer(width, height);
  const cx = width / 2, cy = height / 2;
  const radius = 22;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist <= radius) {
        const t = dist / radius;
        const z = Math.sqrt(radius * radius - dist * dist);
        // Concentric plasma core
        let r, g, b, a;
        if (t < 0.35) {
          // Blazing white/cyan core
          r = 240; g = 255; b = 255; a = 255;
        } else if (t < 0.7) {
          // Intense violet plasma
          r = 170; g = 70; b = 255; a = 240;
        } else {
          // Outer coronal edge
          r = 90; g = 20; b = 180; a = Math.round((1 - t) / 0.3 * 220);
        }
        buf.setPixel(x, y, z, r, g, b, a, 5);
      }
    }
  }

  return buf.applyPixelArtFinish();
}

// -------------------------------------------------------------
// BATCH EXECUTION & SPRITE ATLAS CREATION
// -------------------------------------------------------------

const outDir = path.resolve('assets/benchmark');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log("=== Generating Volumetric 2.5D Benchmark Assets ===");

// 1. Warrior 8 Directions Sheet (128x128 per frame, total 1024x128)
console.log("Generating Warrior 8-Directions Atlas (1024x128)...");
const w8Atlas = Buffer.alloc(1024 * 128 * 4);
const dirAngles = [
  0,                  // S  (South)
  Math.PI * 0.25,     // SE (South-East)
  Math.PI * 0.5,      // E  (East)
  Math.PI * 0.75,     // NE (North-East)
  Math.PI,            // N  (North)
  -Math.PI * 0.75,    // NW (North-West)
  -Math.PI * 0.5,     // W  (West)
  -Math.PI * 0.25     // SW (South-West)
];

dirAngles.forEach((ang, i) => {
  const frameBuf = renderWarriorFrame(128, 128, { angleY: ang });
  for (let y = 0; y < 128; y++) {
    const srcOff = y * 128 * 4;
    const dstOff = (y * 1024 + i * 128) * 4;
    frameBuf.copy(w8Atlas, dstOff, srcOff, srcOff + 128 * 4);
  }
});
fs.writeFileSync(path.join(outDir, 'warrior-8dir.png'), createPNG(1024, 128, w8Atlas));
console.log("  -> warrior-8dir.png saved!");

// 2. Warrior 8-Frame Heavy Slash Attack Sheet (160x160 per frame, total 1280x160)
console.log("Generating Warrior 8-Frame Attack Atlas (1280x160)...");
const attackAtlas = Buffer.alloc(1280 * 160 * 4);
for (let f = 0; f < 8; f++) {
  const frameBuf = renderWarriorFrame(160, 160, { angleY: 0.2, attackFrame: f });
  for (let y = 0; y < 160; y++) {
    const srcOff = y * 160 * 4;
    const dstOff = (y * 1280 + f * 160) * 4;
    frameBuf.copy(attackAtlas, dstOff, srcOff, srcOff + 160 * 4);
  }
}
fs.writeFileSync(path.join(outDir, 'warrior-attack.png'), createPNG(1280, 160, attackAtlas));
console.log("  -> warrior-attack.png saved!");

// 3. Enemy (Iron Revenant / Stone Gargoyle) (128x128)
console.log("Generating Enemy Revenant (128x128)...");
const enemyBuf = renderEnemyFrame(128, 128);
fs.writeFileSync(path.join(outDir, 'enemy-revenant.png'), createPNG(128, 128, enemyBuf));
console.log("  -> enemy-revenant.png saved!");

// 4. Gothic Pillar (64x160)
console.log("Generating Gothic Pillar (64x160)...");
const pillarBuf = renderPillar(64, 160);
fs.writeFileSync(path.join(outDir, 'dungeon-pillar.png'), createPNG(64, 160, pillarBuf));
console.log("  -> dungeon-pillar.png saved!");

// 5. Dungeon Tiles (128x64)
console.log("Generating Dungeon Tiles (128x64)...");
const tilesBuf = renderDungeonTiles(128, 64);
fs.writeFileSync(path.join(outDir, 'dungeon-tiles.png'), createPNG(128, 64, tilesBuf));
console.log("  -> dungeon-tiles.png saved!");

// 6. Magic Orb (64x64)
console.log("Generating Magic Orb (64x64)...");
const orbBuf = renderMagicOrb(64, 64);
fs.writeFileSync(path.join(outDir, 'magic-orb.png'), createPNG(64, 64, orbBuf));
console.log("  -> magic-orb.png saved!");

console.log("\nAll Volumetric 2.5D benchmark assets successfully baked into assets/benchmark/!");
