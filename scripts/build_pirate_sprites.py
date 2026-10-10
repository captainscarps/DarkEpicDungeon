"""Constrói a spritesheet do Capitão Scarpa (classe PIRATE) no formato "pack" do jogo.

Entrada : scripts/source/capitao-scarpa-folha.png  (folha com fundo marrom esfumaçado)
Saída   : assets/pixel-art/characters/pirate-pack*.png + pirate-pack.json
          (39 quadros de 128x128, mesmo mapa de animações do berserker-pack.json)

Passos: estima o fundo liso e recorta cada figura, reduz para ~68 px de altura
(a altura dos outros heróis), aplica uma paleta única para todos os quadros,
contorno escuro de 1 px e alinha os pés na linha footY.

Uso:  python scripts/build_pirate_sprites.py
"""
import json
import os
import sys

import cv2
import numpy as np
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "scripts", "source", "capitao-scarpa-folha.png")
OUT_DIRS = [os.path.join(ROOT, "assets", "pixel-art", "characters"),
            os.path.join(ROOT, "Projeto atualizado", "assets", "pixel-art", "characters")]
PREVIEW = sys.argv[1] if len(sys.argv) > 1 else None

FW = FH = 128
FOOT = 118
STAND_H = 70          # altura em pé (px) — heróis do jogo têm 66–72
PALETTE_SIZE = 40
OUTLINE = (14, 9, 8)

# ---------------------------------------------------------------- recorte
img = cv2.cvtColor(cv2.imread(SRC, cv2.IMREAD_UNCHANGED)[:, :, :3], cv2.COLOR_BGR2RGB).astype(np.float32)
H, W = img.shape[:2]

fig = np.zeros((H, W), bool)
for _ in range(4):  # fundo = média borrada só dos pixels que não são figura
    w = (~fig).astype(np.float32)
    bg = cv2.GaussianBlur(img * w[..., None], (0, 0), 18) / (cv2.GaussianBlur(w, (0, 0), 18)[..., None] + 1e-4)
    fig = ndi.binary_dilation(ndi.binary_opening(np.sqrt(((img - bg) ** 2).sum(2)) > 22), iterations=2)
diff = np.sqrt(((img - bg) ** 2).sum(2))
for y0, y1 in [(20, 52), (235, 265), (438, 468), (646, 676), (860, 890)]:
    diff[y0:y1, 0:125] = 0  # rótulos de texto ("PARADO", "ANDANDO"...)

mask = ndi.binary_fill_holes(ndi.binary_closing(diff > 27, iterations=3))
# brilho difuso em volta do sabre (cinza-amarronzado, sem saturação) — não faz parte do sprite
r_, g_, b_ = img[..., 0], img[..., 1], img[..., 2]
lum = 0.3 * r_ + 0.59 * g_ + 0.11 * b_
glow = (img.max(2) - img.min(2) < 22) & (lum > 60) & (lum < 118) & (r_ >= b_) & (diff < 75)
glow[:650] = False
mask &= ~glow
mask = ndi.binary_opening(mask, iterations=1)
lab, _ = ndi.label(mask)
objs = ndi.find_objects(lab)
big, small = [], []
for i, sl in enumerate(objs):
    area = int((lab[sl] == i + 1).sum())
    f = dict(id=i + 1, x0=sl[1].start, x1=sl[1].stop, y0=sl[0].start, y1=sl[0].stop, area=area)
    (big if area > 2500 else small).append(f)
for s in small:  # pedaços soltos (barra do casaco, ponta do sabre) voltam para a figura mais próxima
    if s["area"] < 15:
        continue
    cx, cy = (s["x0"] + s["x1"]) / 2, (s["y0"] + s["y1"]) / 2
    best = min(big, key=lambda b: np.hypot(max(b["x0"] - cx, 0, cx - b["x1"]), max(b["y0"] - cy, 0, cy - b["y1"])))
    if np.hypot(max(best["x0"] - cx, 0, cx - best["x1"]), max(best["y0"] - cy, 0, cy - best["y1"])) < 14:
        lab[lab == s["id"]] = best["id"]
        best.update(x0=min(best["x0"], s["x0"]), x1=max(best["x1"], s["x1"]),
                    y0=min(best["y0"], s["y0"]), y1=max(best["y1"], s["y1"]))

ROWS = {"idle": (0, 230), "walk": (230, 440), "run": (440, 650), "atk": (650, 860), "death": (860, 1024)}
figs = {k: sorted([f for f in big if a <= (f["y0"] + f["y1"]) / 2 < b], key=lambda f: f["x0"]) for k, (a, b) in ROWS.items()}

# a linha "parado" foi desenhada maior que as outras na folha
SCALE = {"idle": STAND_H / 182, "walk": STAND_H / 164, "run": STAND_H / 164, "atk": STAND_H / 164, "death": STAND_H / 148}

# ---------------------------------------------------------------- mapa de quadros
# (linha, índice da figura na linha) na ordem do berserker-pack.json
F = [
    ("idle", 0), ("idle", 1), ("idle", 2), ("idle", 3),                  # 0-3 idle
    ("idle", 4), ("idle", 6),                                            # 4-5 idlevar
    ("walk", 0), ("walk", 1), ("walk", 2), ("walk", 3), ("walk", 4), ("walk", 5),  # 6-11 walk
    ("run", 0), ("run", 1), ("run", 2), ("run", 3), ("run", 4), ("run", 5),        # 12-17 run
    ("atk", 4), ("atk", 1), ("atk", 3), ("atk", 2), ("atk", 10),         # 18 windupA 19 windup 20 hitA 21 hit 22 recovery
    ("atk", 0), ("atk", 0),                                              # 23 guardStart 24 guard
    ("death", 0), ("atk", 9),                                            # 25 hurt 26 hurtB
    ("death", 1), ("death", 2),                                          # 27 stunA 28 stunB
    ("run", 0), ("run", 5),                                              # 29 dashA 30 dash
    ("atk", 1), ("atk", 5), ("atk", 2),                                  # 31 castA 32 cast 33 castC
    ("death", 3), ("death", 5), ("death", 8),                            # 34-36 death
    ("death", 2), ("death", 0),                                          # 37-38 levantando
]


def shrink(f, s):
    """Recorta a figura e reduz com média de área em alfa pré-multiplicado."""
    x0, x1, y0, y1 = f["x0"], f["x1"], f["y0"], f["y1"]
    m = (lab[y0:y1, x0:x1] == f["id"]).astype(np.float32)
    rgb = img[y0:y1, x0:x1] / 255.0
    ow, oh = max(1, round((x1 - x0) * s)), max(1, round((y1 - y0) * s))
    a = cv2.resize(m, (ow, oh), interpolation=cv2.INTER_AREA)
    c = cv2.resize(rgb * m[..., None], (ow, oh), interpolation=cv2.INTER_AREA) / np.maximum(a[..., None], 1e-4)
    return c, a


def grade(c):
    """A folha é escura e lavada; os heróis do jogo têm leitura mais forte."""
    c = np.clip(c, 0, 1)
    lum = (0.3 * c[..., 0] + 0.59 * c[..., 1] + 0.11 * c[..., 2])[..., None]
    c = lum + (c - lum) * 1.18                       # saturação
    c = np.clip((c - 0.5) * 1.12 + 0.5 + 0.05, 0, 1)  # contraste + leve brilho
    blur = cv2.GaussianBlur(c, (0, 0), 0.8)
    return np.clip(c + (c - blur) * 0.9, 0, 1)        # nitidez


frames = []
for row, idx in F:
    f = figs[row][idx]
    c, a = shrink(f, SCALE[row])
    c = grade(c)
    frames.append((c, a > 0.5))

# paleta única (k-means) para todos os quadros — cores consistentes entre animações
px = np.concatenate([c[m] for c, m in frames]).astype(np.float32)
crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 60, 0.2)
_, _, pal = cv2.kmeans(px, PALETTE_SIZE, None, crit, 4, cv2.KMEANS_PP_CENTERS)


def quantize(c):
    d = ((c[..., None, :] - pal[None, None]) ** 2).sum(-1)
    return pal[d.argmin(-1)]


sheet = np.zeros((FH, FW * len(F), 4), np.uint8)
for i, (c, m) in enumerate(frames):
    q = (quantize(c) * 255).round().astype(np.uint8)
    oh, ow = m.shape
    ys, xs = np.nonzero(m)
    # âncora horizontal: centro do tronco (média das colunas na metade de cima da figura)
    top = ys < (ys.min() + ys.max()) / 2
    cx = xs[top].mean() if top.any() else xs.mean()
    offx = int(round(64 - cx))
    offy = FOOT - ys.max()
    tile = np.zeros((FH, FW, 4), np.uint8)
    for y, x in zip(ys, xs):
        tx, ty = x + offx, y + offy
        if 0 <= tx < FW and 0 <= ty < FH:
            tile[ty, tx, :3] = q[y, x]
            tile[ty, tx, 3] = 255
    solid = tile[..., 3] == 255
    ring = ndi.binary_dilation(solid, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]]) & ~solid
    tile[ring] = (*OUTLINE, 255)
    sheet[:, i * FW:(i + 1) * FW] = tile

layout = json.load(open(os.path.join(OUT_DIRS[0], "berserker-pack.json"), encoding="utf-8"))
layout.update(scale=0.7, footY=FOOT, bakedWeapon=True,
              anchors=[[76, 80]] * len(F), torso=[[64, 84]] * len(F), head=[[64, 58]] * len(F))

png = cv2.imencode(".png", cv2.cvtColor(sheet, cv2.COLOR_RGBA2BGRA))[1].tobytes()
for d in OUT_DIRS:
    if not os.path.isdir(os.path.dirname(d)):
        continue
    os.makedirs(d, exist_ok=True)
    for name in ["pirate-pack-body.png"] + [f"pirate-pack-t{t}-body.png" for t in range(5)]:
        open(os.path.join(d, name), "wb").write(png)
    json.dump(layout, open(os.path.join(d, "pirate-pack.json"), "w"), separators=(",", ":"))
print("OK pirate-pack-body.png", sheet.shape, len(png), "bytes")

if PREVIEW:  # prévia ampliada 3x de todos os quadros, em 3 linhas
    per = 13
    rows = [sheet[:, r * per * FW:(r + 1) * per * FW] for r in range(3)]
    pv = np.concatenate(rows, 0)
    bgc = np.zeros_like(pv)
    bgc[..., :3] = (38, 32, 36)
    bgc[..., 3] = 255
    al = pv[..., 3:4] / 255.0
    out = (pv[..., :3] * al + bgc[..., :3] * (1 - al)).astype(np.uint8)
    out = cv2.resize(out, None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST)
    cv2.imwrite(PREVIEW, cv2.cvtColor(out, cv2.COLOR_RGB2BGR))
