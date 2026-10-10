"""Constrói a spritesheet do Capitão Scarpa (classe PIRATE) no formato "pack" do jogo.

Entrada : scripts/source/capitao-scarpa-folha.png  (folha com fundo marrom esfumaçado)
Saída   : assets/pixel-art/characters/pirate-pack*.png + pirate-pack.json
          (39 quadros de 128x128, mesmo mapa de animações do berserker-pack.json)

Fidelidade à arte enviada:
- o personagem fica com ~98 px de altura no quadro e o jogo o desenha com
  escala 0.5 ("hiRes"), ou seja, praticamente 1 pixel da textura por pixel de tela.
  (os outros heróis têm ~70 px com escala 0.7 — mesmo tamanho final na tela);
- as cores são as da folha original: sem redução de paleta, sem contraste extra
  e sem contorno adicionado (o desenho já tem o próprio contorno);
- o recorte tira 1 px da borda para não carregar o marrom do fundo.

Uso:  python scripts/build_pirate_sprites.py [previa.png]
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
FOOT = 123            # linha dos pés no quadro
STAND_H = 98          # altura em pé na textura (≈ 70 px × 0.7 / 0.5 dos outros heróis)
GAME_SCALE = 0.5

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
    dist = lambda b: np.hypot(max(b["x0"] - cx, 0, cx - b["x1"]), max(b["y0"] - cy, 0, cy - b["y1"]))
    best = min(big, key=dist)
    if dist(best) < 14:
        lab[lab == s["id"]] = best["id"]
        best.update(x0=min(best["x0"], s["x0"]), x1=max(best["x1"], s["x1"]),
                    y0=min(best["y0"], s["y0"]), y1=max(best["y1"], s["y1"]))

ROWS = {"idle": (0, 230), "walk": (230, 440), "run": (440, 650), "atk": (650, 860), "death": (860, 1024)}
figs = {k: sorted([f for f in big if a <= (f["y0"] + f["y1"]) / 2 < b], key=lambda f: f["x0"]) for k, (a, b) in ROWS.items()}

# a folha desenhou a linha "parado" um pouco maior e a linha "morrendo" um pouco menor
SCALE = {"idle": STAND_H / 182, "walk": STAND_H / 164, "run": STAND_H / 164, "atk": STAND_H / 164, "death": STAND_H / 148}

# ---------------------------------------------------------------- mapa de quadros
# (linha, índice da figura na linha) na ordem do berserker-pack.json.
# Linha "parado": 0-4, 6, 7 e 9 de lado; 5 três-quartos de costas; 8 de costas.
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
    ("idle", 8), ("idle", 8),                                            # 37-38 upA/upB: parado olhando para cima (de costas)
]


def shrink(f, s):
    """Recorta a figura (sem 1 px da borda) e reduz com média de área em alfa pré-multiplicado."""
    pad = 2
    x0, x1, y0, y1 = f["x0"] - pad, f["x1"] + pad, f["y0"] - pad, f["y1"] + pad
    m = lab[y0:y1, x0:x1] == f["id"]
    m = ndi.binary_erosion(m, iterations=1, border_value=0)
    m = m.astype(np.float32)
    rgb = img[y0:y1, x0:x1] / 255.0
    ow, oh = max(1, round((x1 - x0) * s)), max(1, round((y1 - y0) * s))
    a = cv2.resize(m, (ow, oh), interpolation=cv2.INTER_AREA)
    c = cv2.resize(rgb * m[..., None], (ow, oh), interpolation=cv2.INTER_AREA) / np.maximum(a[..., None], 1e-4)
    return np.clip(c, 0, 1), a


frames = []
for row, idx in F:
    c, a = shrink(figs[row][idx], SCALE[row])
    # nitidez leve só para compensar o borrão da redução (cores preservadas)
    blur = cv2.GaussianBlur(c, (0, 0), 0.7)
    c = np.clip(c + (c - blur) * 0.45, 0, 1)
    frames.append((c, a > 0.5))

sheet = np.zeros((FH, FW * len(F), 4), np.uint8)
for i, (c, m) in enumerate(frames):
    q = (c * 255).round().astype(np.uint8)
    ys, xs = np.nonzero(m)
    # âncora horizontal: centro do tronco (metade de cima da figura) — o sabre não desloca o corpo
    top = ys < (ys.min() + ys.max()) / 2
    cx = xs[top].mean() if top.any() else xs.mean()
    offx, offy = int(round(64 - cx)), FOOT - ys.max()
    tx, ty = xs + offx, ys + offy
    ok = (tx >= 0) & (tx < FW) & (ty >= 0) & (ty < FH)
    lost = int((~ok).sum())
    if lost:
        print(f"aviso: quadro {i} perdeu {lost} px fora do quadro")
    tile = np.zeros((FH, FW, 4), np.uint8)
    tile[ty[ok], tx[ok], :3] = q[ys[ok], xs[ok]]
    tile[ty[ok], tx[ok], 3] = 255
    sheet[:, i * FW:(i + 1) * FW] = tile

# retrato do HUD: quadrado centrado no rosto do quadro 0
t0 = sheet[:, :FW, 3] > 0
ys, xs = np.nonzero(t0)
top = int(ys.min())
head = ys < top + 22
fx = int(round(xs[head].mean()))
P = 30
portrait = [fx - P // 2 + 1, max(0, top - 1), P, P]

layout = json.load(open(os.path.join(OUT_DIRS[0], "berserker-pack.json"), encoding="utf-8"))
layout.update(scale=GAME_SCALE, hiRes=True, footY=FOOT, bakedWeapon=True, portrait=portrait,
              anchors=[[80, 76]] * len(F), torso=[[64, 80]] * len(F), head=[[64, top + 12]] * len(F))

png = cv2.imencode(".png", cv2.cvtColor(sheet, cv2.COLOR_RGBA2BGRA))[1].tobytes()
for d in OUT_DIRS:
    if not os.path.isdir(os.path.dirname(d)):
        continue
    os.makedirs(d, exist_ok=True)
    # nome "hd" (e não "pack") para o cache offline do jogo não servir a versão antiga
    for name in ["pirate-hd-body.png"] + [f"pirate-hd-t{t}-body.png" for t in range(5)]:
        open(os.path.join(d, name), "wb").write(png)
    json.dump(layout, open(os.path.join(d, "pirate-hd.json"), "w"), separators=(",", ":"))
    for old in ["pirate-pack-body.png", "pirate-pack.json"] + [f"pirate-pack-t{t}-body.png" for t in range(5)]:
        if os.path.exists(os.path.join(d, old)):
            os.remove(os.path.join(d, old))
print("OK pirate-hd-body.png", sheet.shape, len(png), "bytes; retrato", portrait)

if PREVIEW:  # prévia ampliada 2x de todos os quadros, em 3 linhas
    per = 13
    pv = np.concatenate([sheet[:, r * per * FW:(r + 1) * per * FW] for r in range(3)], 0)
    al = pv[..., 3:4] / 255.0
    out = (pv[..., :3] * al + np.array([38, 32, 36]) * (1 - al)).astype(np.uint8)
    out = cv2.resize(out, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST)
    cv2.imwrite(PREVIEW, cv2.cvtColor(out, cv2.COLOR_RGB2BGR))
