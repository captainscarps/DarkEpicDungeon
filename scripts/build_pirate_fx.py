"""Gera os sprites de efeito das habilidades do Capitão Scarpa.

  pirate-anchor.png    — âncora gigante da Fúria Pirata (1 quadro, 34x44)
  pirate-tentacle.png  — tentáculo fantasmagórico da Ira do Kraken
                         (6 quadros de 40x64: brota, sobe, enrola, golpeia, afunda)

Uso:  python scripts/build_pirate_fx.py
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRS = [os.path.join(ROOT, "assets", "pixel-art", "characters"),
        os.path.join(ROOT, "Projeto atualizado", "assets", "pixel-art", "characters")]
OUTLINE = (14, 9, 10, 255)


def outline(img, color=OUTLINE):
    a = np.array(img)
    solid = a[..., 3] > 0
    ring = ndi.binary_dilation(solid, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]]) & ~solid
    a[ring] = color
    return Image.fromarray(a)


def save(img, name):
    for d in DIRS:
        if os.path.isdir(os.path.dirname(d)):
            img.save(os.path.join(d, name))
    print("OK", name, img.size)


# ------------------------------------------------------------------ âncora
W, H = 34, 44
anc = Image.new("RGBA", (W, H))
d = ImageDraw.Draw(anc)
IRON_D, IRON, IRON_L, IRON_H = (44, 46, 54, 255), (78, 82, 94, 255), (120, 126, 138, 255), (176, 182, 192, 255)
RUST = (122, 62, 30, 255)
cx = W // 2
d.ellipse((cx - 4, 1, cx + 4, 9), outline=IRON, width=2)              # argola
d.point((cx - 2, 3), IRON_H)
d.rectangle((cx - 12, 10, cx + 12, 12), fill=IRON)                    # cepo
d.line((cx - 12, 10, cx + 12, 10), fill=IRON_L)
d.rectangle((cx - 13, 9, cx - 11, 13), fill=IRON_D)
d.rectangle((cx + 11, 9, cx + 13, 13), fill=IRON_D)
d.rectangle((cx - 2, 9, cx + 2, 36), fill=IRON)                       # haste
d.line((cx - 1, 9, cx - 1, 36), fill=IRON_L)
d.line((cx - 2, 14, cx - 2, 34), fill=IRON_H)
d.line((cx + 2, 9, cx + 2, 36), fill=IRON_D)
d.arc((cx - 15, 18, cx + 15, 42), 20, 160, fill=IRON, width=4)        # braços
d.arc((cx - 15, 18, cx + 15, 42), 30, 150, fill=IRON_L, width=1)
d.polygon([(cx - 16, 27), (cx - 11, 33), (cx - 17, 35)], fill=IRON)   # unhas
d.polygon([(cx + 16, 27), (cx + 11, 33), (cx + 17, 35)], fill=IRON)
d.line((cx - 16, 27, cx - 17, 35), fill=IRON_L)
d.line((cx + 16, 27, cx + 17, 35), fill=IRON_D)
for p in [(cx + 1, 20), (cx - 1, 27), (cx + 9, 38), (cx - 7, 39), (cx + 4, 12)]:
    d.point(p, RUST)
save(outline(anc), "pirate-anchor.png")

# ------------------------------------------------------------------ tentáculo
FW, FH, NF = 40, 64, 6
sheet = Image.new("RGBA", (FW * NF, FH))
DARK, MID, LIGHT, GLOW = np.array([16, 58, 72]), np.array([34, 118, 128]), np.array([92, 206, 196]), np.array([196, 255, 240])
SUCK = (210, 255, 246, 255)

# (altura, enrolamento, inclinação para frente) por quadro
POSES = [(10, 0.0, 0.0), (26, 0.4, 0.0), (42, 1.6, 0.1), (48, 2.6, 0.2), (40, 1.2, 1.0), (16, 0.3, 0.3)]

for f, (hgt, curl, lean) in enumerate(POSES):
    tile = Image.new("RGBA", (FW, FH))
    px = tile.load()
    n = 90
    pts = []
    x, y, ang = 14.0, FH - 3.0, -math.pi / 2 + lean * 0.9
    step = hgt / n
    for k in range(n):
        t = k / (n - 1)
        pts.append((x, y, t))
        ang += curl * (t ** 2) * 0.09
        x += math.cos(ang) * step
        y += math.sin(ang) * step
    for (x, y, t) in pts:
        r = 6.2 * (1 - t) ** 0.8 + 0.8
        for yy in range(int(y - r - 1), int(y + r + 2)):
            for xx in range(int(x - r - 1), int(x + r + 2)):
                if not (0 <= xx < FW and 0 <= yy < FH):
                    continue
                dd = math.hypot(xx - x, yy - y)
                if dd > r:
                    continue
                side = (xx - x) / max(r, 1e-3)                        # -1 (sombra) .. 1 (luz)
                shade = np.clip(0.55 + side * 0.45 - t * 0.1, 0, 1)
                col = DARK + (MID - DARK) * min(1, shade * 1.6) + (LIGHT - MID) * max(0, shade - 0.6) * 2.4
                old = px[xx, yy]
                if old[3] and old[0] + old[1] > col[0] + col[1] and dd > r * 0.6:
                    continue
                px[xx, yy] = (*[int(c) for c in col], 255)
    for (x, y, t) in pts[6:-10:9]:                                     # ventosas do lado de dentro
        r = 6.2 * (1 - t) ** 0.8 + 0.8
        sx, sy = int(round(x - r * 0.55)), int(round(y))
        if 0 <= sx < FW and 0 <= sy < FH and px[sx, sy][3]:
            px[sx, sy] = SUCK
    tx, ty, _ = pts[-1]
    if 0 <= int(tx) < FW and 0 <= int(ty) < FH:
        px[int(tx), int(ty)] = (*GLOW, 255)
    sheet.alpha_composite(outline(tile, (8, 26, 34, 255)), (f * FW, 0))
save(sheet, "pirate-tentacle.png")
