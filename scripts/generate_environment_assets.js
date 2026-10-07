const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ============================================================================
// DEPTHGATE UPDATE 13 — ENVIRONMENT REVITALIZATION ASSET GENERATOR
// Pure Node.js PNG encoder + Mathematical 2.5D Volumetric Material Synthesizer
// ============================================================================

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

class Surface {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.buf = Buffer.alloc(w * h * 4);
  }
  set(x, y, r, g, b, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const idx = (y * this.w + x) * 4;
    this.buf[idx] = Math.max(0, Math.min(255, Math.round(r)));
    this.buf[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
    this.buf[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
    this.buf[idx + 3] = Math.max(0, Math.min(255, Math.round(a)));
  }
  blend(x, y, r, g, b, a) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const idx = (y * this.w + x) * 4;
    const curA = this.buf[idx + 3] / 255;
    const inA = (a / 255);
    const outA = inA + curA * (1 - inA);
    if (outA <= 0) return;
    this.buf[idx] = Math.round((r * inA + this.buf[idx] * curA * (1 - inA)) / outA);
    this.buf[idx + 1] = Math.round((g * inA + this.buf[idx + 1] * curA * (1 - inA)) / outA);
    this.buf[idx + 2] = Math.round((b * inA + this.buf[idx + 2] * curA * (1 - inA)) / outA);
    this.buf[idx + 3] = Math.round(outA * 255);
  }
  get(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return [0, 0, 0, 0];
    const idx = (y * this.w + x) * 4;
    return [this.buf[idx], this.buf[idx + 1], this.buf[idx + 2], this.buf[idx + 3]];
  }
  toPNG() {
    return createPNG(this.w, this.h, this.buf);
  }
}

// Pseudo-random noise with seeded coordinate hashing
function hash2d(x, y, seed = 1337) {
  let n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function noise2d(x, y, scale = 1.0, seed = 1337) {
  const fx = x / scale, fy = y / scale;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const s00 = hash2d(ix, iy, seed);
  const s10 = hash2d(ix + 1, iy, seed);
  const s01 = hash2d(ix, iy + 1, seed);
  const s11 = hash2d(ix + 1, iy + 1, seed);
  const u = tx * tx * (3 - 2 * tx);
  const v = ty * ty * (3 - 2 * ty);
  return (s00 * (1 - u) + s10 * u) * (1 - v) + (s01 * (1 - u) + s11 * u) * v;
}

// ----------------------------------------------------------------------------
// 1. FLOOR TILES GENERATOR: 6 Distinct 64x64 Volumetric Stone Masonry Pavers
// ----------------------------------------------------------------------------
function generateFloorTiles() {
  const tileW = 64, tileH = 64, numTiles = 6;
  const s = new Surface(tileW * numTiles, tileH);

  // Palettes for Dark Fantasy Stone
  // Base Granite / Basalt: #2a272c, #36323a, #433e48, #504b56, highlights #655f6d
  for (let t = 0; t < numTiles; t++) {
    const ox = t * tileW;

    for (let y = 0; y < tileH; y++) {
      for (let x = 0; x < tileW; x++) {
        // Base stone color with high-frequency chisel noise
        let n = noise2d(x, y, 4, 100 + t * 50);
        let nRough = noise2d(x, y, 1.5, 300 + t * 50);
        let baseR = 48 + n * 20 + (nRough - 0.5) * 12;
        let baseG = 45 + n * 18 + (nRough - 0.5) * 12;
        let baseB = 52 + n * 22 + (nRough - 0.5) * 12;

        // Individual tile layout geometries:
        let isMortar = false;
        let mortarDist = 999;
        let isBevel = false;
        let bevelFactor = 0;

        if (t === 0) {
          // Variant 0: Large dual diagonal/offset slabs with central deep joint
          let splitX = 32 + Math.sin(y * 0.25) * 2;
          let dX = Math.abs(x - splitX);
          if (dX <= 1) isMortar = true;
          mortarDist = Math.min(mortarDist, dX);
          if (x <= 1 || x >= 62 || y <= 1 || y >= 62) isMortar = true;
          mortarDist = Math.min(mortarDist, x, 63 - x, y, 63 - y);
        } else if (t === 1) {
          // Variant 1: Large slab with jagged diagonal crack
          let crackY = 24 + (x - 20) * 0.7 + Math.sin(x * 0.4) * 3;
          let dCrack = Math.abs(y - crackY);
          if (x > 14 && x < 54 && dCrack < 1.2) {
            isMortar = true;
            mortarDist = 0;
          }
          let edgeDist = Math.min(x, 63 - x, y, 63 - y);
          if (edgeDist <= 1) isMortar = true;
          mortarDist = Math.min(mortarDist, edgeDist);
        } else if (t === 2) {
          // Variant 2: 4 Sub-blocks (Quad flagstones) with worn rounded corners
          let dX = Math.abs(x - 32);
          let dY = Math.abs(y - 32);
          if (dX <= 1 || dY <= 1) isMortar = true;
          mortarDist = Math.min(dX, dY, x, 63 - x, y, 63 - y);
          // Tint variance between blocks
          if (x < 32 && y < 32) { baseR -= 4; baseG -= 3; baseB -= 2; }
          if (x >= 32 && y < 32) { baseR += 5; baseG += 4; baseB += 6; }
          if (x < 32 && y >= 32) { baseR += 3; baseG += 2; baseB += 4; }
        } else if (t === 3) {
          // Variant 3: Heavy masonry with ancient eroded runes/chisel grooves
          let edgeDist = Math.min(x, 63 - x, y, 63 - y);
          if (edgeDist <= 1) isMortar = true;
          mortarDist = edgeDist;
          // Inscribed circle rune in center
          let dCenter = Math.hypot(x - 32, y - 32);
          if (Math.abs(dCenter - 18) < 1.1 || (Math.abs(x - 32) < 1.0 && Math.abs(y - 32) < 18)) {
            baseR -= 18; baseG -= 18; baseB -= 16; // Chiseled into stone
          }
        } else if (t === 4) {
          // Variant 4: Damp stone slab with center puddle depression
          let edgeDist = Math.min(x, 63 - x, y, 63 - y);
          if (edgeDist <= 1) isMortar = true;
          mortarDist = edgeDist;
          let dPuddle = Math.hypot((x - 32) * 1.2, (y - 32) * 0.9);
          if (dPuddle < 16) {
            // Darker damp stone + slight reflection
            let wetDepth = 1 - (dPuddle / 16);
            baseR = baseR * (1 - wetDepth * 0.45) + 18 * wetDepth;
            baseG = baseG * (1 - wetDepth * 0.4) + 24 * wetDepth;
            baseB = baseB * (1 - wetDepth * 0.35) + 36 * wetDepth;
            if (dPuddle > 10 && dPuddle < 14 && x < 34) {
              baseR += 22 * wetDepth; baseG += 26 * wetDepth; baseB += 38 * wetDepth; // Specular rim
            }
          }
        } else {
          // Variant 5: Flagstone with corner rubble & moss accumulation
          let edgeDist = Math.min(x, 63 - x, y, 63 - y);
          if (edgeDist <= 1) isMortar = true;
          mortarDist = edgeDist;
          // Moss/debris in bottom-left corner
          if (x < 24 && y > 40) {
            let mDist = Math.hypot(x, 63 - y);
            if (mDist < 26) {
              let mAlpha = (1 - mDist / 26) * 0.55;
              baseR = baseR * (1 - mAlpha) + 32 * mAlpha;
              baseG = baseG * (1 - mAlpha) + 48 * mAlpha;
              baseB = baseB * (1 - mAlpha) + 26 * mAlpha;
            }
          }
        }

        // Apply 2.5D Volumetric Bevel and Ambient Occlusion in joints
        if (isMortar) {
          // Deep dark mortar bed with contact shadow
          baseR = 20 + n * 8;
          baseG = 18 + n * 7;
          baseB = 22 + n * 8;
        } else if (mortarDist <= 4) {
          // Stone edge bevel: top/left gets highlight, bottom/right gets shadow
          let isTopLeft = (x <= 3 || y <= 3 || (t === 0 && x <= 33) || (t === 2 && (x <= 33 || y <= 33)));
          let bevelAmt = (4 - mortarDist) / 4;
          if (isTopLeft) {
            // Chamfer highlight (2.5D top-light)
            baseR += 24 * bevelAmt;
            baseG += 22 * bevelAmt;
            baseB += 26 * bevelAmt;
          } else {
            // Chamfer shadow
            baseR -= 20 * bevelAmt;
            baseG -= 20 * bevelAmt;
            baseB -= 20 * bevelAmt;
          }
        }

        s.set(ox + x, y, baseR, baseG, baseB, 255);
      }
    }
  }

  return s.toPNG();
}

// ----------------------------------------------------------------------------
// 2. WALL TILES GENERATOR: 4 Wall Sections of 64x96 (Cornice, Blocks, Niche)
// ----------------------------------------------------------------------------
function generateWallTiles() {
  const wallW = 64, wallH = 96, numWalls = 4;
  const s = new Surface(wallW * numWalls, wallH);

  for (let w = 0; w < numWalls; w++) {
    const ox = w * wallW;

    for (let y = 0; y < wallH; y++) {
      for (let x = 0; x < wallW; x++) {
        let n = noise2d(x, y, 4, 500 + w * 60);
        let nFine = noise2d(x, y, 1.5, 700 + w * 60);

        let r = 50 + n * 18 + (nFine - 0.5) * 10;
        let g = 47 + n * 16 + (nFine - 0.5) * 10;
        let b = 56 + n * 20 + (nFine - 0.5) * 10;

        // Top Coping / Cornice (y: 0..20) — visible top ledge in 2.5D perspective
        if (y < 8) {
          // Top horizontal plane of the wall receiving overhead ambient light
          r += 32; g += 30; b += 36;
          if (y === 7) { r -= 15; g -= 15; b -= 15; } // Cornice edge bevel
        } else if (y < 20) {
          // Cornice front molding with overhang shadow
          let moldY = (y - 8) / 12;
          r = (r + 15) * (1 - moldY * 0.4);
          g = (g + 14) * (1 - moldY * 0.4);
          b = (b + 18) * (1 - moldY * 0.4);
        } else {
          // Main Masonry Courses (Ashlar Stone Blocks)
          // 3 Course bands: Course 1: y 20..44, Course 2: y 45..69, Course 3: y 70..95
          let courseIdx = Math.floor((y - 20) / 25);
          let relY = (y - 20) % 25;

          // Horizontal mortar joint
          if (relY === 0 || relY === 24) {
            r = 18; g = 16; b = 22; // Deep shadow joint
          } else {
            // Vertical mortar joints staggered per course
            let blockOffset = (courseIdx % 2 === 0) ? 32 : 16;
            let relX = (x + blockOffset) % 48;
            let isVertJoint = (relX <= 1);

            if (isVertJoint) {
              r = 18; g = 16; b = 22;
            } else {
              // Individual block depth and protrusion
              let blockHash = hash2d(courseIdx, Math.floor((x + blockOffset) / 48), 999 + w);
              let protrusion = (blockHash - 0.5) * 14;
              r += protrusion; g += protrusion * 0.9; b += protrusion * 1.1;

              // Wall 2 has an arched stone niche in the center
              if (w === 2 && courseIdx <= 1 && x >= 18 && x <= 46) {
                let nicheCx = 32, nicheCy = 42;
                let dx = Math.abs(x - nicheCx);
                let dy = y - nicheCy;
                // Arch formula: if inside arch, recess it deep into wall
                let archH = 22 - (dx * dx) / 18;
                if (dy >= -20 && dy <= archH) {
                  // Inside niche: heavy shadow
                  let shadowDepth = 0.45;
                  r *= shadowDepth; g *= shadowDepth; b *= shadowDepth;
                  // Arch stone rim highlight
                  if (Math.abs(dy - archH) <= 1.5 || dx >= 13) {
                    r += 24; g += 22; b += 26;
                  }
                }
              }

              // Wall 1 has broken / displaced stone
              if (w === 1 && courseIdx === 1 && x >= 24 && x <= 40) {
                r -= 20; g -= 20; b -= 22; // Fracture crater
              }

              // Top edge of each stone course gets a subtle 2.5D bevel highlight
              if (relY <= 2) {
                r += 18; g += 16; b += 20;
              } else if (relY >= 22) {
                r -= 14; g -= 14; b -= 16;
              }
            }
          }

          // Bottom contact with ground: ambient occlusion
          if (y >= 88) {
            let groundAO = (y - 88) / 8;
            r *= (1 - groundAO * 0.5);
            g *= (1 - groundAO * 0.5);
            b *= (1 - groundAO * 0.5);
          }
        }

        s.set(ox + x, y, r, g, b, 255);
      }
    }
  }

  return s.toPNG();
}

// ----------------------------------------------------------------------------
// 3. VOLUMETRIC ARCHITECTURAL PILLAR: 64x160 with Capital, Octagonal Shaft & Base
// ----------------------------------------------------------------------------
function generateVolumetricPillar() {
  const w = 64, h = 160;
  const s = new Surface(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let n = noise2d(x, y, 3, 404);
      let r = 52 + n * 16, g = 49 + n * 14, b = 58 + n * 18;

      let isInPillar = false;
      let alpha = 255;

      // 1. Capital (Top): y 0..30
      if (y < 30) {
        let capW = 28 + (30 - y) * 0.25;
        if (Math.abs(x - 32) <= capW) {
          isInPillar = true;
          // Capital moldings
          if (y < 8) {
            // Top flat abacus (receives overhead light)
            r += 36; g += 34; b += 40;
          } else if (y < 18) {
            // Flared echinus with directional curve
            let curve = (x - 32) / capW;
            let light = -curve * 28; // Light from left side
            r += light + 14; g += light + 12; b += light + 16;
          } else {
            // Necking ring
            r -= 12; g -= 12; b -= 14;
          }
        }
      }
      // 2. Shaft (Fuste): y 30..130
      else if (y < 130) {
        let shaftW = 22; // Column width
        let dx = x - 32;
        if (Math.abs(dx) <= shaftW) {
          isInPillar = true;
          // Octagonal facets & cylindrical volume
          let u = dx / shaftW; // -1 to +1
          // Cylindrical normal nx = u, nz = sqrt(1 - u^2)
          let nz = Math.sqrt(Math.max(0, 1 - u * u));
          // Light vector from upper-left (lx: -0.6, ly: -0.4, lz: 0.7)
          let dot = (-0.6 * u + 0.7 * nz);
          let diffuse = Math.max(0.15, dot);

          // Facet bands (octagonal fluting effect)
          let facet = Math.floor((u + 1) * 3.5);
          let facetShade = (facet % 2 === 0) ? 6 : -6;

          // Horizontal stone block joints every 20px
          let blockJoint = (y % 20 <= 1) ? -24 : 0;

          r = (r * diffuse * 1.5) + facetShade + blockJoint;
          g = (g * diffuse * 1.5) + facetShade + blockJoint;
          b = (b * diffuse * 1.5) + facetShade + blockJoint;

          // Specular catch on front-left bevel
          if (u > -0.65 && u < -0.45) {
            r += 22; g += 20; b += 24;
          }
        }
      }
      // 3. Stepped Plinth Base: y 130..160
      else {
        let baseStep = Math.floor((y - 130) / 10); // 0, 1, 2
        let baseW = 24 + baseStep * 5;
        let dx = x - 32;
        if (Math.abs(dx) <= baseW) {
          isInPillar = true;
          let relY = (y - 130) % 10;
          if (relY <= 1) {
            // Step top bevel
            r += 28; g += 26; b += 30;
          } else {
            let u = dx / baseW;
            let light = -u * 20;
            r += light; g += light; b += light;
          }
          // Floor contact ambient occlusion
          if (y >= 155) {
            let ao = (y - 155) / 5;
            r *= (1 - ao * 0.6);
            g *= (1 - ao * 0.6);
            b *= (1 - ao * 0.6);
          }
        }
      }

      if (isInPillar) {
        s.set(x, y, r, g, b, 255);
      } else {
        s.set(x, y, 0, 0, 0, 0);
      }
    }
  }

  return s.toPNG();
}

// ----------------------------------------------------------------------------
// 4. FOREGROUND ARCH & PILLAR: 80x240 for Dynamic Foreground Depth Sorting
// ----------------------------------------------------------------------------
function generateForegroundPillar() {
  const w = 80, h = 240;
  const s = new Surface(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let n = noise2d(x, y, 4, 888);
      let r = 46 + n * 16, g = 44 + n * 14, b = 52 + n * 18;
      let inArch = false;

      // Heavy foreground column occupying x: 0..46, with arch springing to right
      let colW = 38;
      if (x < colW) {
        inArch = true;
        // Chiaroscuro shading for foreground element
        let u = (x - 19) / 19;
        let nz = Math.sqrt(Math.max(0, 1 - u * u));
        let dot = (-0.5 * u + 0.8 * nz);
        r = r * Math.max(0.3, dot * 1.4);
        g = g * Math.max(0.3, dot * 1.4);
        b = b * Math.max(0.3, dot * 1.4);

        if (y % 28 <= 1) {
          r -= 20; g -= 20; b -= 22; // Heavy masonry joint
        }
      } else if (y < 70) {
        // Arch springing off to upper right
        let archCurve = 70 - Math.pow((x - colW) / (w - colW), 1.6) * 55;
        if (y < archCurve) {
          inArch = true;
          // Underside of arch in shadow
          if (Math.abs(y - archCurve) < 4) {
            r -= 18; g -= 18; b -= 20;
          } else {
            r += 12; g += 12; b += 14;
          }
        }
      }

      // Base plinth
      if (inArch && y > 210) {
        let baseStep = Math.floor((y - 210) / 10);
        if (x < colW + baseStep * 4) {
          inArch = true;
          if (y >= 234) {
            r *= 0.4; g *= 0.4; b *= 0.4; // Ground AO
          }
        }
      }

      if (inArch) {
        s.set(x, y, r, g, b, 255);
      } else {
        s.set(x, y, 0, 0, 0, 0);
      }
    }
  }

  return s.toPNG();
}

// ----------------------------------------------------------------------------
// 5. DUNGEON PROPS: Weathered Wood Barrel, Crate, Wall Sconce Torch, Chains
// ----------------------------------------------------------------------------
function generateDungeonProps() {
  const w = 256, h = 64;
  const s = new Surface(w, h);

  // Prop 1: Weathered Wood Barrel (x: 0..36, y: 14..58)
  for (let y = 14; y < 58; y++) {
    for (let x = 4; x < 36; x++) {
      let dx = x - 20;
      let relY = (y - 36) / 22; // -1 to +1
      let bulgeW = 14 * (1 - relY * relY * 0.22); // Barrel curvature bulge
      if (Math.abs(dx) <= bulgeW) {
        let u = dx / bulgeW;
        let nz = Math.sqrt(Math.max(0, 1 - u * u));
        let woodN = noise2d(x, y * 3, 2, 222);

        // Wood staves texture (dark oak): #4a3424, #3b281b
        let r = 68 + woodN * 18;
        let g = 46 + woodN * 14;
        let b = 32 + woodN * 10;

        // Vertical staves joints every 4-5px
        if (Math.floor(x) % 6 === 0) {
          r -= 24; g -= 18; b -= 14;
        }

        // Iron Hoops (two bands at top and bottom): y 20..24 and y 48..52
        if ((y >= 21 && y <= 24) || (y >= 48 && y <= 51)) {
          // Dark wrought iron with rivets
          r = 44; g = 46; b = 52;
          if (y === 21 || y === 48) { r += 26; g += 28; b += 32; } // Metal specular rim
          if (Math.abs(dx) < 2) { r += 32; g += 34; b += 38; } // Iron rivet
        }

        // Cylindrical chiaroscuro
        let light = (-0.5 * u + 0.8 * nz);
        r = r * Math.max(0.3, light * 1.3);
        g = g * Math.max(0.3, light * 1.3);
        b = b * Math.max(0.3, light * 1.3);

        // Ground shadow
        if (y >= 54) {
          let ao = (y - 54) / 4;
          r *= (1 - ao * 0.6); g *= (1 - ao * 0.6); b *= (1 - ao * 0.6);
        }

        s.set(x, y, r, g, b, 255);
      }
    }
  }

  // Prop 2: Weathered Storage Crate (x: 48..84, y: 18..58)
  for (let y = 18; y < 58; y++) {
    for (let x = 48; x < 84; x++) {
      let n = noise2d(x * 2, y, 2, 333);
      let r = 74 + n * 16, g = 52 + n * 12, b = 36 + n * 8;

      let border = (x === 48 || x === 83 || y === 18 || y === 57);
      let innerFrame = (x <= 51 || x >= 80 || y <= 21 || y >= 54);
      let diagCross = Math.abs((x - 48) - (y - 18)) <= 2 || Math.abs((x - 48) - (57 - y)) <= 2;

      if (innerFrame || diagCross) {
        // Reinforced wooden brace
        r += 12; g += 8; b += 4;
      }
      if (border) {
        // Iron corner brackets
        r = 38; g = 40; b = 46;
      }

      s.set(x, y, r, g, b, 255);
    }
  }

  // Prop 3: Wall Torch Bracket & Animated Flame Frames (4 frames at x: 96, 120, 144, 168)
  for (let f = 0; f < 4; f++) {
    let ox = 96 + f * 24;

    // Iron Wall Sconce Bracket (y: 28..56)
    for (let y = 28; y < 56; y++) {
      for (let x = 8; x < 16; x++) {
        let isMount = (y >= 38 && y <= 46 && x <= 11);
        let isArm = (x >= 10 && x <= 13 && y >= 32);
        let isCup = (y >= 30 && y <= 35 && x >= 8 && x <= 15);

        if (isMount || isArm || isCup) {
          let r = 40, g = 42, b = 48;
          if (x === 10 || y === 30) { r += 30; g += 32; b += 36; } // Metal highlight
          s.set(ox + x, y, r, g, b, 255);
        }
      }
    }

    // Flame Core (y: 10..30, x: 7..17)
    let flameNoiseSeed = 100 + f * 77;
    for (let fy = 10; fy < 32; fy++) {
      for (let fx = 6; fx < 18; fx++) {
        let dx = fx - 11.5;
        let dy = 32 - fy; // Height from torch cup (0 to 22)
        let taperW = Math.max(0.5, (4.5 - dy * 0.18) + Math.sin(fy * 0.6 + f * 1.5) * 1.2);

        if (Math.abs(dx) <= taperW && dy > 0) {
          let coreDist = Math.abs(dx) / taperW;
          let heightDist = dy / 22;

          let fr, fg, fb, fa;
          if (coreDist < 0.35 && heightDist < 0.6) {
            // White-hot flame center: #fff8d6
            fr = 255; fg = 248; fb = 210; fa = 255;
          } else if (coreDist < 0.7) {
            // Intense golden flame: #ffaa22
            fr = 255; fg = 170; fb = 34; fa = 240;
          } else {
            // Deep orange/crimson edge & smoke: #e64a19
            fr = 230; fg = 74; fb = 25; fa = 180;
          }

          s.blend(ox + fx, fy, fr, fg, fb, fa);
        }
      }
    }
  }

  // Prop 4: Dungeon Chains (x: 196..212, y: 4..60)
  for (let y = 4; y < 58; y++) {
    for (let x = 200; x < 210; x++) {
      let linkIdx = Math.floor(y / 8);
      let relY = y % 8;
      let isVerticalLink = (linkIdx % 2 === 0);

      let inLink = false;
      if (isVerticalLink) {
        if ((x === 203 || x === 207) && relY >= 1 && relY <= 6) inLink = true;
        if ((relY === 1 || relY === 6) && x >= 203 && x <= 207) inLink = true;
      } else {
        if ((x === 204 || x === 206) && relY >= 0 && relY <= 7) inLink = true;
      }

      if (inLink) {
        let r = 50, g = 54, b = 62;
        if (x === 203 || relY === 1) { r += 40; g += 42; b += 48; } // Specular glint
        s.set(x, y, r, g, b, 255);
      }
    }
  }

  // Prop 5: Scattered Bones & Rubble (x: 220..252, y: 36..58)
  for (let y = 36; y < 58; y++) {
    for (let x = 220; x < 252; x++) {
      // Ancient skull (x: 224..234, y: 42..52)
      let dx = x - 229, dy = y - 47;
      if (dx * dx + dy * dy <= 22) {
        let isEye = (dy === -1 && (dx === -2 || dx === 2));
        if (isEye) {
          s.set(x, y, 20, 18, 16, 255); // Eye socket
        } else {
          let r = 168, g = 156, b = 138; // Aged bone
          if (dy < -2) { r += 25; g += 25; b += 22; }
          s.set(x, y, r, g, b, 255);
        }
      }

      // Fallen masonry stone (x: 238..248, y: 46..56)
      if (x >= 238 && x <= 248 && y >= 46 && y <= 56) {
        let r = 58, g = 54, b = 62;
        if (y === 46 || x === 238) { r += 26; g += 24; b += 28; }
        s.set(x, y, r, g, b, 255);
      }
    }
  }

  return s.toPNG();
}

// ----------------------------------------------------------------------------
// 6. ATMOSPHERIC ASSETS: Quadratic Light Radial Mask & Low Creeping Mist
// ----------------------------------------------------------------------------
function generateRadialLight() {
  const size = 384;
  const s = new Surface(size, size);
  const cx = size / 2, cy = size / 2, rMax = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let d = Math.hypot(x - cx, y - cy);
      if (d < rMax) {
        let norm = d / rMax;
        // Cinematic quadratic light falloff
        let falloff = Math.pow(1 - norm, 2.2);

        // Color temperature: warm gold core (#ffd070) transitioning to deep amber (#d9531e)
        let r = Math.round(255 * falloff);
        let g = Math.round((180 * (1 - norm) + 80 * norm) * falloff);
        let b = Math.round((70 * (1 - norm) + 20 * norm) * falloff);
        let a = Math.round(255 * falloff);

        s.set(x, y, r, g, b, a);
      } else {
        s.set(x, y, 0, 0, 0, 0);
      }
    }
  }

  return s.toPNG();
}

function generateGroundMist() {
  const w = 128, h = 64;
  const s = new Surface(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let n = noise2d(x, y, 16, 9999);
      let n2 = noise2d(x * 2, y * 2, 8, 5555);
      let density = (n * 0.7 + n2 * 0.3);

      // Edge fading
      let edgeX = Math.sin((x / w) * Math.PI);
      let edgeY = Math.sin((y / h) * Math.PI);
      let a = Math.round(density * edgeX * edgeY * 70); // Very subtle fog

      // Cold misty cyan-tinted dungeon vapor (#7a8d9b)
      s.set(x, y, 122, 141, 155, a);
    }
  }

  return s.toPNG();
}

// ============================================================================
// MAIN PIPELINE EXECUTION
// ============================================================================
function main() {
  const outDir = path.join(__dirname, '../assets/revitalization/environment');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Generating Update 13 2.5D Volumetric Environment Assets...');

  const floorPNG = generateFloorTiles();
  fs.writeFileSync(path.join(outDir, 'floor-tiles.png'), floorPNG);
  console.log('✓ floor-tiles.png (384x64, 6 volumetric masonry variants)');

  const wallPNG = generateWallTiles();
  fs.writeFileSync(path.join(outDir, 'wall-tiles.png'), wallPNG);
  console.log('✓ wall-tiles.png (256x96, 4 ashlar masonry wall sections with niche)');

  const pillarPNG = generateVolumetricPillar();
  fs.writeFileSync(path.join(outDir, 'pillar-volumetric.png'), pillarPNG);
  console.log('✓ pillar-volumetric.png (64x160, octagonal shaft, capital & base)');

  const fgPillarPNG = generateForegroundPillar();
  fs.writeFileSync(path.join(outDir, 'foreground-pillar.png'), fgPillarPNG);
  console.log('✓ foreground-pillar.png (80x240, foreground framing column & arch)');

  const propsPNG = generateDungeonProps();
  fs.writeFileSync(path.join(outDir, 'dungeon-props.png'), propsPNG);
  console.log('✓ dungeon-props.png (256x64, barrel, crate, 4 torch frames, chain, bones)');

  const lightPNG = generateRadialLight();
  fs.writeFileSync(path.join(outDir, 'light-radial.png'), lightPNG);
  console.log('✓ light-radial.png (384x384, cinematic quadratic falloff)');

  const mistPNG = generateGroundMist();
  fs.writeFileSync(path.join(outDir, 'ground-mist.png'), mistPNG);
  console.log('✓ ground-mist.png (128x64, ambient ground fog cloud)');

  console.log('\nAll Environment Assets successfully synthesized in assets/revitalization/environment/!');
}

main();
