"""Gera os sprites do impacto da Fúria Pirata (âncora batendo no chão).

  pirate-crater.png  — marca no chão (cratera com borda de terra levantada,
                       rachaduras com luz e sombra, pedras soltas). 200x80, escala 0.5 no jogo.
  pirate-dust.png    — nuvem de poeira rolando para os lados, 7 quadros de 192x96.
  pirate-flash.png   — clarão em estrela do impacto, 5 quadros de 96x96.
  pirate-rocks.png   — 4 pedrinhas de 8x8 para os detritos que voam.

Tudo desenhado em pixel art (sem antisserrilhado), contorno escuro e luz do alto-esquerda,
para combinar com o resto do jogo.

Uso:  python scripts/build_pirate_impact.py [previa.png]
"""
import math
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRS = [os.path.join(ROOT, "assets", "pixel-art", "characters"),
        os.path.join(ROOT, "Projeto atualizado", "assets", "pixel-art", "characters")]
rng = np.random.default_rng(11)

# terra / pedra do jogo (tons quentes, como a trilha da floresta)
DIRT = np.array([[34, 22, 16], [58, 38, 26], [88, 60, 40], [122, 88, 58], [160, 124, 86], [196, 162, 118]], np.float32)
STONE = np.array([[30, 30, 34], [56, 54, 58], [88, 84, 86], [124, 118, 114], [164, 158, 150]], np.float32)
OUT = np.array([16, 10, 8], np.float32)


def save(arr, name):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    for d in DIRS:
        if os.path.isdir(os.path.dirname(d)):
            img.save(os.path.join(d, name))
    print("OK", name, img.size)
    return img


def shade(ramp, t):
    t = np.clip(t, 0, 1) * (len(ramp) - 1)
    i = np.clip(t.astype(int), 0, len(ramp) - 2)
    f = (t - i)[..., None]
    return ramp[i] * (1 - f) + ramp[i + 1] * f


def outline(rgba, color=OUT, alpha=255):
    solid = rgba[..., 3] > 0
    ring = ndi.binary_dilation(solid, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]]) & ~solid
    rgba[ring, :3] = color
    rgba[ring, 3] = alpha
    return rgba


def dither(t, levels):
    """Pontilhado ordenado 4x4 para as transições de luz parecerem pixel art."""
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16 - .5
    h, w = t.shape
    b = np.tile(bayer, (h // 4 + 1, w // 4 + 1))[:h, :w]
    return np.clip(np.round(t * (levels - 1) + b * .9) / (levels - 1), 0, 1)


# ------------------------------------------------------------------ cratera
def build_crater():
    W, H = 200, 80
    cx, cy = W / 2, H / 2
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ex, ey = (xx - cx) / 58, (yy - cy) / 22                       # elipse no chão (perspectiva)
    r = np.sqrt(ex ** 2 + ey ** 2)
    ang = np.arctan2(ey, ex)
    wob = 1 + 0.08 * np.sin(ang * 7 + 1.3) + 0.05 * np.sin(ang * 13)
    rr = r / wob
    rgba = np.zeros((H, W, 4), np.float32)

    # buraco: fundo escuro, parede iluminada embaixo (luz vem de cima, a parede de baixo vê a luz)
    hole = rr < 0.62
    depth = np.clip(1 - rr / 0.62, 0, 1)
    wall_light = np.clip(0.35 + ey * 0.9, 0, 1)                   # parte de baixo mais clara
    t = dither(np.clip(0.55 * wall_light * (1 - depth * 0.9), 0, 1), 6)
    rgba[hole, :3] = shade(DIRT, t)[hole]
    rgba[hole, 3] = 255
    # borda levantada (anel de terra jogada para fora)
    rim = (rr >= 0.62) & (rr < 0.92 + 0.08 * np.sin(ang * 5))
    rim_t = np.clip(0.55 - ey * 0.55 + (0.92 - rr) * 0.8, 0, 1)   # topo da borda (em cima) mais claro
    t = dither(rim_t, 6)
    rgba[rim, :3] = shade(DIRT, t)[rim]
    rgba[rim, 3] = 255

    # rachaduras irradiando: traço escuro com lábio claro do lado de baixo
    crack = np.zeros((H, W), bool)
    lip = np.zeros((H, W), bool)
    for k in range(11):
        a = k / 11 * 2 * math.pi + rng.uniform(-.2, .2)
        x, y = cx + math.cos(a) * 56 * .6, cy + math.sin(a) * 22 * .6
        L = rng.uniform(26, 46)
        steps = int(L)
        for s in range(steps):
            a += rng.uniform(-.35, .35)
            x += math.cos(a) * 1.0
            y += math.sin(a) * 0.42
            ix, iy = int(round(x)), int(round(y))
            if 0 <= ix < W and 0 <= iy < H:
                crack[iy, ix] = True
                if s < steps * .45 and 0 <= iy + 1 < H:
                    crack[iy + 1, ix] = True                         # mais grossa perto do centro
                if 0 <= iy + 2 < H and not crack[iy + 2, ix]:
                    lip[iy + 2, ix] = True
            if s == steps // 2 and rng.random() < .55:               # galho
                b = a + rng.choice([-1, 1]) * rng.uniform(.5, .9)
                bx, by = x, y
                for _ in range(int(L * .35)):
                    b += rng.uniform(-.3, .3)
                    bx += math.cos(b)
                    by += math.sin(b) * .42
                    jx, jy = int(round(bx)), int(round(by))
                    if 0 <= jx < W and 0 <= jy < H:
                        crack[jy, jx] = True
    crack &= ~hole
    lip &= ~hole & ~crack
    rgba[crack, :3] = DIRT[0]
    rgba[crack, 3] = 255
    rgba[lip, :3] = DIRT[4]
    rgba[lip, 3] = 200
    # placas de chão levantadas ao redor da borda
    for k in range(9):
        a = rng.uniform(0, 2 * math.pi)
        px_, py_ = cx + math.cos(a) * 58 * rng.uniform(.9, 1.15), cy + math.sin(a) * 22 * rng.uniform(.9, 1.15)
        w, h = rng.integers(4, 8), rng.integers(2, 4)
        x0, y0 = int(px_ - w / 2), int(py_ - h / 2)
        if 0 <= x0 and x0 + w < W and 0 <= y0 and y0 + h + 1 < H:
            rgba[y0:y0 + h, x0:x0 + w, :3] = DIRT[3]
            rgba[y0, x0:x0 + w, :3] = DIRT[5]
            rgba[y0 + h, x0:x0 + w, :3] = DIRT[1]
            rgba[y0:y0 + h + 1, x0:x0 + w, 3] = 255
    # pedras soltas
    for k in range(14):
        a = rng.uniform(0, 2 * math.pi)
        d = rng.uniform(.5, 1.25)
        px_, py_ = int(cx + math.cos(a) * 58 * d), int(cy + math.sin(a) * 22 * d)
        s = int(rng.integers(2, 4))
        if 1 <= px_ < W - s - 1 and 1 <= py_ < H - s - 1:
            rgba[py_:py_ + s, px_:px_ + s, :3] = STONE[2]
            rgba[py_, px_:px_ + s, :3] = STONE[4]
            rgba[py_ + s - 1, px_:px_ + s, :3] = STONE[1]
            rgba[py_:py_ + s, px_:px_ + s, 3] = 255
    # sombra suave do buraco para fora, para "assentar" no chão
    soft = np.clip(1 - (rr - .9) / .25, 0, 1) * (rr >= .9) * (rgba[..., 3] == 0)
    rgba[..., :3] = np.where(soft[..., None] > 0, DIRT[0], rgba[..., :3])
    rgba[..., 3] = np.where(soft > 0, np.round(soft * 3) / 3 * 90, rgba[..., 3])
    solid = rgba[..., 3] >= 200
    ring = ndi.binary_dilation(solid & (rr < .95), structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]]) & ~solid & (rr >= .9)
    rgba[ring, :3] = OUT
    rgba[ring, 3] = 160
    return rgba


# ------------------------------------------------------------------ poeira
def puff_layer(W, H, puffs, light_dir=(-.6, -.8)):
    """Desenha bolhas de fumaça com sombreamento em 4 tons + contorno."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    field = np.zeros((H, W), np.float32)
    lit = np.zeros((H, W), np.float32)
    for (x, y, r) in puffs:
        d = np.sqrt((xx - x) ** 2 + (yy - y) ** 2) / max(r, 1e-3)
        inside = d < 1
        hgt = np.sqrt(np.clip(1 - d ** 2, 0, 1))
        nx, ny = (xx - x) / max(r, 1e-3), (yy - y) / max(r, 1e-3)
        l = np.clip(hgt * .55 - (nx * light_dir[0] + ny * light_dir[1]) * .5 + .25, 0, 1)
        upd = inside & (hgt >= field)
        field = np.where(upd, hgt, field)
        lit = np.where(upd, l, lit)
    return field > 0, lit


def build_dust():
    FW, FH, N = 192, 96, 7
    sheet = np.zeros((FH, FW * N, 4), np.float32)
    DUST = np.array([[70, 54, 42], [110, 90, 70], [150, 128, 104], [190, 170, 142], [224, 210, 186]], np.float32)
    yy, xx = np.mgrid[0:FH, 0:FW].astype(np.float32)
    # ruído fixo (contorno irregular, "fofo") que se move um pouco a cada quadro
    noise = ndi.gaussian_filter(rng.random((FH * 2, FW * 2)).astype(np.float32), 2.2)
    noise = (noise - noise.min()) / (noise.max() - noise.min())
    clouds = []
    for side in (-1, 1):                                            # rolam rente ao chão para cada lado
        for k in range(4):
            u = (k + rng.uniform(-.2, .2)) / 3.4
            clouds.append(dict(side=side, u=u, s=rng.uniform(.8, 1.35) * (1.25 - u * .45), h=rng.uniform(0, 4)))
    for k in range(3):                                              # bolo central mais alto
        clouds.append(dict(side=0, u=k / 2.5, s=rng.uniform(1.0, 1.3) * (1.2 - k * .2), h=rng.uniform(-3, 3)))
    for f in range(N):
        t = f / (N - 1)
        grow = 1 - (1 - t) ** 2.4
        field = np.zeros((FH, FW), np.float32)
        lit = np.zeros((FH, FW), np.float32)
        for c in clouds:
            if c["side"] == 0:
                x = FW / 2 + c["h"] * grow
                y = FH * .66 - c["u"] * (10 + 20 * grow)
                r = 13 * c["s"] * (.5 + .8 * grow) * (1 - .3 * t)
            else:
                x = FW / 2 + c["side"] * (10 + c["u"] * 70 * (.2 + .8 * grow))
                y = FH * .72 - c["h"] - 7 * grow * (1 - c["u"])
                r = 12 * c["s"] * (.45 + .8 * grow) * (1 - .4 * t)
            if r < 1.5:
                continue
            d = np.sqrt((xx - x) ** 2 + ((yy - y) * 1.15) ** 2) / r
            hgt = np.clip(1 - d ** 2, 0, 1)
            nx, ny = (xx - x) / r, (yy - y) / r
            l = np.clip(.62 + nx * .28 - ny * .48 + hgt * .2, 0, 1)    # luz do alto-esquerda
            upd = hgt > field
            field = np.where(upd, hgt, field)
            lit = np.where(upd, l, lit)
        ox, oy = int(f * 3) % FW, int(f * 2) % FH
        nz = noise[oy:oy + FH, ox:ox + FW]
        mask = (field > .0) & (field + (nz - .5) * .55 > .08 + t * .25)                 # borda irregular e se desfazendo
        rgba = np.zeros((FH, FW, 4), np.float32)
        rgba[mask, :3] = shade(DUST, dither(np.clip(lit - (1 - field) * .25, 0, 1), 5))[mask]
        alpha = 240 if t < .5 else 240 * (1 - (t - .5) / .5 * .8)
        rgba[mask, 3] = alpha
        rgba = outline(rgba, np.array([54, 40, 32], np.float32), int(alpha * .75))
        sheet[:, f * FW:(f + 1) * FW] = rgba
    return sheet


# ------------------------------------------------------------------ clarão
def build_flash():
    FS, N = 96, 5
    sheet = np.zeros((FS, FS * N, 4), np.float32)
    COLS = [(255, 255, 255), (255, 236, 170), (255, 184, 84), (214, 108, 40)]
    angs = np.linspace(0, 2 * math.pi, 7, endpoint=False) + .25
    lens = [1.0, .62, .9, .7, 1.0, .58, .85]
    from PIL import ImageDraw
    for f in range(N):
        t = f / (N - 1)
        img = Image.new("RGBA", (FS, FS))
        d = ImageDraw.Draw(img)
        c = FS / 2
        R = 16 + 30 * t ** .5
        for layer, (col, sc, wd) in enumerate([(COLS[3], 1.0, .30), (COLS[2], .82, .24), (COLS[1], .6, .17)]):
            for a, ln in zip(angs, lens):
                L = R * ln * sc * (1 - .35 * t)
                w = wd * (1 - .5 * t)
                tip = (c + math.cos(a) * L, c + math.sin(a) * L * .62)
                l1 = (c + math.cos(a + w * 2.2) * 6, c + math.sin(a + w * 2.2) * 6 * .62)
                l2 = (c + math.cos(a - w * 2.2) * 6, c + math.sin(a - w * 2.2) * 6 * .62)
                d.polygon([l1, tip, l2], fill=col + (255,))
            core = (11 - 3 * layer) * (1 - .7 * t) + 2
            d.ellipse((c - core, c - core * .62, c + core, c + core * .62), fill=col + (255,))
        d.ellipse((c - 5 * (1 - t) - 1, c - 3 * (1 - t) - 1, c + 5 * (1 - t) + 1, c + 3 * (1 - t) + 1), fill=COLS[0] + (255,))
        a = np.array(img).astype(np.float32)
        a[..., 3] = np.where(a[..., 3] > 0, 255 * (1 - t * .7), 0)
        sheet[:, f * FS:(f + 1) * FS] = a
    return sheet


# ------------------------------------------------------------------ pedrinhas
def build_rocks():
    sheet = np.zeros((8, 32, 4), np.float32)
    shapes = [["..##..", ".####.", "######", "######", ".####."],
              [".###.", "#####", "#####", ".##.."],
              ["..#..", ".###.", "#####", ".###."],
              [".####", "#####", "####.", ".##.."]]
    for k, sh in enumerate(shapes):
        for y, row in enumerate(sh):
            for x, ch in enumerate(row):
                if ch == "#":
                    lv = 4 if y == 0 or (y == 1 and x < 3) else (1 if y == len(sh) - 1 else 2)
                    sheet[y + 1, k * 8 + x + 1, :3] = STONE[lv]
                    sheet[y + 1, k * 8 + x + 1, 3] = 255
        sheet[:, k * 8:(k + 1) * 8] = outline(sheet[:, k * 8:(k + 1) * 8].copy())
    return sheet


imgs = [save(build_crater(), "pirate-crater.png"), save(build_dust(), "pirate-dust.png"),
        save(build_flash(), "pirate-flash.png"), save(build_rocks(), "pirate-rocks.png")]

if len(sys.argv) > 1:
    W = max(i.width for i in imgs)
    H = sum(i.height + 8 for i in imgs)
    pv = Image.new("RGBA", (W, H), (96, 120, 70, 255))
    y = 0
    for im in imgs:
        pv.alpha_composite(im, (0, y))
        y += im.height + 8
    pv.resize((W * 2, H * 2), Image.NEAREST).save(sys.argv[1])
