"""Gera os sprites de efeito das habilidades do Capitão Scarpa.

  pirate-anchor.png    — âncora gigante da Fúria Pirata (1 quadro, 48x76, escala 0.5 no jogo)
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
# Desenhada em alta resolução (48x76, o jogo usa escala 0.5 → ~24x38 na tela do mundo),
# com volume de metal: forma desenhada 4x maior, iluminação pela normal da forma
# (luz do alto-esquerda), ferrugem, corda enrolada na haste e contorno escuro.
def build_anchor():
    SS = 4
    AW, AH = 48, 76
    W4, H4 = AW * SS, AH * SS
    cx = W4 / 2
    m = Image.new("L", (W4, H4), 0)
    d = ImageDraw.Draw(m)
    u = SS
    # argola
    d.ellipse((cx - 7 * u, 1 * u, cx + 7 * u, 15 * u), outline=255, width=int(3.2 * u))
    # cepo (barra transversal) com pontas arredondadas
    d.rounded_rectangle((cx - 20 * u, 15 * u, cx + 20 * u, 20 * u), radius=2 * u, fill=255)
    d.ellipse((cx - 23 * u, 14 * u, cx - 17 * u, 21 * u), fill=255)
    d.ellipse((cx + 17 * u, 14 * u, cx + 23 * u, 21 * u), fill=255)
    # haste (afina para baixo)
    d.polygon([(cx - 4.2 * u, 12 * u), (cx + 4.2 * u, 12 * u), (cx + 3.4 * u, 62 * u), (cx - 3.4 * u, 62 * u)], fill=255)
    # coroa + braços curvos
    d.arc((cx - 21 * u, 30 * u, cx + 21 * u, 70 * u), 15, 165, fill=255, width=int(5.5 * u))
    d.ellipse((cx - 6 * u, 57 * u, cx + 6 * u, 70 * u), fill=255)
    # unhas (pás) nas pontas dos braços
    for sgn in (-1, 1):
        x0 = cx + sgn * 20 * u
        d.polygon([(x0 - sgn * 1 * u, 44 * u), (x0 + sgn * 4.5 * u, 40 * u), (x0 + sgn * 3 * u, 52 * u),
                   (x0 - sgn * 4 * u, 55 * u)], fill=255)
        d.polygon([(x0 + sgn * 4.5 * u, 40 * u), (x0 + sgn * 6.5 * u, 35 * u), (x0 + sgn * 3 * u, 44 * u)], fill=255)
    mask = np.array(m).astype(np.float32) / 255

    # volume: normal aproximada pelo gradiente da forma borrada
    hgt = ndi.gaussian_filter(ndi.distance_transform_edt(mask > .5).astype(np.float32), 2.0)
    gy, gx = np.gradient(hgt)
    nz = np.full_like(gx, 1.6)
    n = np.sqrt(gx ** 2 + gy ** 2 + nz ** 2)
    L = np.array([-0.55, -0.6, 0.58])
    lit = (-gx * L[0] - gy * L[1] + nz * L[2]) / n                 # 0..1
    lit = np.clip(lit, 0, 1)
    spec = np.clip((lit - 0.82) / 0.18, 0, 1) ** 2
    ramp = np.array([[22, 24, 30], [44, 47, 56], [72, 77, 88], [108, 114, 126], [156, 162, 174]], np.float32)
    t = lit * (len(ramp) - 1)
    i0 = np.clip(t.astype(int), 0, len(ramp) - 2)
    f = (t - i0)[..., None]
    col = ramp[i0] * (1 - f) + ramp[i0 + 1] * f
    col = col + spec[..., None] * 60
    # ferrugem em manchas (ruído suave)
    rng = np.random.default_rng(7)
    noise = ndi.gaussian_filter(rng.random((H4, W4)).astype(np.float32), 6)
    noise = (noise - noise.min()) / (noise.max() - noise.min())
    rust = np.clip((noise - 0.56) / 0.2, 0, 1)[..., None] * 0.75
    rust_col = np.array([118, 62, 30], np.float32) * (0.6 + 0.5 * lit[..., None])
    col = col * (1 - rust) + rust_col * rust
    rgba = np.zeros((H4, W4, 4), np.float32)
    rgba[..., :3] = col
    rgba[..., 3] = mask * 255
    img = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA")

    # corda enrolada na haste (por cima do metal)
    dr = ImageDraw.Draw(img)
    for k in range(5):
        y = (24 + k * 6.2) * u
        dr.line([(cx - 5 * u, y + 2.5 * u), (cx + 5 * u, y - 1.5 * u)], fill=(112, 84, 50, 255), width=int(2.2 * u))
        dr.line([(cx - 5 * u, y + 1.6 * u), (cx + 5 * u, y - 2.4 * u)], fill=(156, 122, 78, 255), width=int(0.9 * u))
    dr.line([(cx + 5 * u, 22 * u), (cx + 9 * u, 30 * u), (cx + 7 * u, 36 * u)], fill=(112, 84, 50, 255), width=int(2 * u))

    small = img.resize((AW, AH), Image.LANCZOS)
    a = np.array(small)
    a[..., 3] = np.where(a[..., 3] > 110, 255, 0)
    return outline(Image.fromarray(a), (12, 10, 14, 255))


save(build_anchor(), "pirate-anchor2.png")  # nome novo: o cache offline guardava a âncora antiga

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
