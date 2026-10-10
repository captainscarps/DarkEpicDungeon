"""Gera o papagaio (arara vermelha) do Companheiro Voador do Capitão Scarpa.

Parte da águia do Druida (assets/pixel-art/characters/druid-eagle.png), que já tem
as 4 poses usadas pelo jogo (asas para cima, asas para baixo, mergulho, pousado),
e recolore por região: corpo e cabeça vermelhos, faixa amarela no meio da asa,
pontas azuis, rosto branco e bico claro.

Uso:  python scripts/build_pirate_parrot.py
"""
import colorsys
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "pixel-art", "characters", "druid-eagle.png")
OUTS = [os.path.join(ROOT, "assets", "pixel-art", "characters", "pirate-parrot.png"),
        os.path.join(ROOT, "Projeto atualizado", "assets", "pixel-art", "characters", "pirate-parrot.png")]

RAMPS = {
    "red": [(52, 6, 14), (118, 14, 24), (176, 24, 30), (222, 52, 40), (255, 118, 84)],
    "yellow": [(96, 58, 6), (178, 118, 10), (232, 176, 24), (255, 220, 84), (255, 246, 170)],
    "blue": [(10, 18, 54), (22, 50, 128), (36, 92, 190), (74, 150, 232), (150, 210, 255)],
}


def ramp(name, t):
    pts = RAMPS[name]
    t = min(max(t, 0.0), 1.0) * (len(pts) - 1)
    i = min(int(t), len(pts) - 2)
    f = t - i
    return tuple(int(round(pts[i][k] + (pts[i + 1][k] - pts[i][k]) * f)) for k in range(3))


src = np.array(Image.open(SRC).convert("RGBA"))
out = np.zeros_like(src)
FW = 48
for fi in range(4):
    tile = src[:, fi * FW:(fi + 1) * FW]
    hls = np.zeros(tile.shape[:2] + (3,))
    for y in range(48):
        for x in range(FW):
            r, g, b, a = tile[y, x]
            if a:
                hls[y, x] = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    alpha = tile[..., 3] > 0
    light = alpha & (hls[..., 1] > 0.55)                       # cabeça branca / bico / cauda
    beak = light & (hls[..., 0] * 360 > 25) & (hls[..., 0] * 360 < 60) & (hls[..., 2] > 0.6)
    ys, xs = np.nonzero(light & ~beak)
    hx, hy = (xs.mean(), ys.mean()) if len(xs) else (24, 20)
    bys, bxs = np.nonzero(beak)
    bx, by = (bxs.mean(), bys.mean()) if len(bxs) else (hx, hy)
    for y in range(48):
        for x in range(FW):
            if not alpha[y, x]:
                continue
            r, g, b, a = tile[y, x]
            h, l, s = hls[y, x]
            if l < 0.07:                                       # contorno
                out[y, fi * FW + x] = (16, 6, 10, a)
                continue
            if beak[y, x]:
                c = (236, 226, 204) if y <= by else (54, 44, 44)
            elif s < 0.12 and l > 0.5 and abs(h * 360 - 120) > 40 and fi == 2 and x < hx - 6:
                c = (70, 66, 70)                               # garras
            elif light[y, x]:
                near = np.hypot(x - bx, y - by)
                c = (248, 244, 236) if near < 4.5 else ramp("red", 0.75 + (l - 0.55))
            else:
                t = (l - 0.04) / 0.36
                dx, dy = abs(x - hx), y - hy
                if fi in (0, 1):                               # asas abertas
                    zone = "red" if dx < 8 else ("yellow" if dx < 12 else "blue")
                elif fi == 2:                                  # mergulho: asa para trás/cima
                    zone = "red" if dx < 9 else ("yellow" if dx < 13 else "blue")
                else:                                          # pousado: asa dobrada embaixo
                    zone = "red"  # (quadro não usado pelo jogo)
                c = ramp(zone, t)
            out[y, fi * FW + x] = (*c, a)

img = Image.fromarray(out)
for p in OUTS:
    if os.path.isdir(os.path.dirname(p)):
        img.save(p)
print("OK pirate-parrot.png", img.size)

# ---- ícone 24x24 da habilidade (moldura da Águia Companheira, fundo azul-mar)
import colorsys as _cs
icon_src = Image.open(os.path.join(ROOT, "assets", "pixel-art", "ui", "icons", "EAGLE_COMPANION.png")).convert("RGBA")
ic = np.array(icon_src).astype(float)
bg = np.array(icon_src).copy()
for y in range(24):
    for x in range(24):
        r, g, b, a = ic[y, x]
        if not a:
            continue
        h, l, s = _cs.rgb_to_hls(r / 255, g / 255, b / 255)
        if 0.18 < h < 0.45 and s > 0.2:                      # verde da moldura -> azul-mar
            nr, ng, nb = _cs.hls_to_rgb(0.57, l, s)
            bg[y, x, :3] = (int(nr * 255), int(ng * 255), int(nb * 255))
# fundo interno: preenche a área da águia com a cor de fundo vizinha
inner = Image.fromarray(bg).copy()
px_ = inner.load()
fill = px_[4, 12]
for y in range(3, 21):
    for x in range(3, 21):
        px_[x, y] = fill
bird = Image.fromarray(out[:, 0:48])
bb = bird.getbbox()
bird = bird.crop(bb)
k = min(19 / bird.width, 16 / bird.height)
bird = bird.resize((max(1, round(bird.width * k)), max(1, round(bird.height * k))), Image.NEAREST)
inner.alpha_composite(bird, ((24 - bird.width) // 2, (24 - bird.height) // 2 + 1))
for p in [os.path.join(ROOT, "assets", "pixel-art", "ui", "icons", "COMPANHEIRO_VOADOR.png"),
          os.path.join(ROOT, "Projeto atualizado", "assets", "pixel-art", "ui", "icons", "COMPANHEIRO_VOADOR.png")]:
    if os.path.isdir(os.path.dirname(p)):
        inner.save(p)
print("OK COMPANHEIRO_VOADOR.png")
