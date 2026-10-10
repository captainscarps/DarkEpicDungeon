"""Constrói a spritesheet do Capitão Scarpa (classe PIRATE) no formato "pack" do jogo.

Entrada : scripts/source/capitao-scarpa-folha.png  (folha com fundo marrom esfumaçado)
Saída   : assets/sprites/characters/pirate/pirate_{idle,walk,run,attack,death,extra}.png
          (uma tira horizontal por animação, células 128x128, fundo transparente)
          + pirate_config.json (quadros, fps, origem de cada quadro)
          assets/pixel-art/characters/pirate-hd3*.png + pirate-hd3.json
          (folha "pack" que o jogo carrega = as tiras acima em sequência + mapa)

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

# ---------------------------------------------------------------- animações
# Cada animação usa só quadros de lado da folha enviada (os de costas e três-quartos
# ficam de fora). Linha "parado": 0-4, 6, 7, 9 de lado; 5 três-quartos; 8 costas.
# Linha "andando": 0-6 de lado. Linha "correndo": 0-5 de lado. Linha "atacando":
# com o sabre visto de lado só 1, 2 e 3 (0 = guarda, 5 = soco sem sabre, 9 = postura).
# vertical: "row" mantém a altura relativa ao chão da própria linha (a corrida sobe e
# desce de verdade); "feet" encosta cada quadro no chão (a queda e o corpo deitado).
ANIMS = {
    "idle":   dict(src=[("idle", i) for i in (0, 1, 2, 3, 4, 9)], v="row", h="torso", fps=5, loop=True),
    "walk":   dict(src=[("walk", i) for i in range(7)], v="row", h="torso", fps=10, loop=True),
    "run":    dict(src=[("run", i) for i in range(6)], v="row", h="torso", fps=14, loop=True),
    "attack": dict(src=[("atk", 0), ("atk", 1), ("atk", 3), ("atk", 2)], v="row", h="torso", fps=12, loop=False),
    "death":  dict(src=[("death", i) for i in range(9)], v="feet", h="bbox", fps=9, loop=False),
    # poses de apoio usadas por habilidades e estados (não é uma animação própria)
    "extra":  dict(src=[("idle", 6), ("idle", 7), ("idle", 8), ("atk", 5), ("atk", 9)], v="feet", h="torso", fps=0, loop=False),
}
ORDER = ["idle", "walk", "run", "attack", "death", "extra"]
STRIP_DIR = os.path.join(ROOT, "assets", "sprites", "characters", "pirate")


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


def _feat(t):
    a = t[..., 3] / 255.0
    g = (t[..., :3].mean(2) / 255.0 * a).astype(np.float32)
    ys = np.nonzero(a.sum(1))[0]
    m = np.zeros_like(g)
    m[ys.min():int(ys.min() + (ys.max() - ys.min()) * 0.5)] = 1
    return g * m


_win = cv2.createHanningWindow((FW, FW), cv2.CV_32F)


def build_strip(name, spec):
    figs_ = [figs[r][i] for r, i in spec["src"]]
    ground = {}
    for (r, _), f in zip(spec["src"], figs_):
        ground[r] = max(ground.get(r, 0), f["y1"])
    strip = np.zeros((FH, FW * len(figs_), 4), np.uint8)
    for k, ((row, _), f) in enumerate(zip(spec["src"], figs_)):
        sc = SCALE[row]
        c, a = shrink(f, sc)
        blur = cv2.GaussianBlur(c, (0, 0), 0.7)                     # nitidez leve (cores preservadas)
        c = np.clip(c + (c - blur) * 0.45, 0, 1)
        m = a > 0.5
        q = (c * 255).round().astype(np.uint8)
        ys, xs = np.nonzero(m)
        if spec["h"] == "torso":                                    # centro do tronco: o sabre não desloca o corpo
            top = ys < (ys.min() + ys.max()) / 2
            cx = xs[top].mean() if top.any() else xs.mean()
        else:                                                       # centro da figura (corpo deitado cabe inteiro)
            cx = (xs.min() + xs.max()) / 2
        lift = round((ground[row] - f["y1"]) * sc) if spec["v"] == "row" else 0
        offx, offy = int(round(64 - cx)), FOOT - lift - ys.max()
        tx, ty = xs + offx, ys + offy
        ok = (tx >= 0) & (tx < FW) & (ty >= 0) & (ty < FH)
        if (~ok).any():
            raise SystemExit(f"{name} quadro {k}: {int((~ok).sum())} px fora da célula")
        tile = np.zeros((FH, FW, 4), np.uint8)
        tile[ty, tx, :3] = q[ys, xs]
        tile[ty, tx, 3] = 255
        strip[:, k * FW:(k + 1) * FW] = tile
    if spec["loop"]:                                                # alinhamento fino do tronco (sem tremer)
        base = _feat(strip[:, :FW].astype(np.float32))
        for k in range(1, len(figs_)):
            tile = strip[:, k * FW:(k + 1) * FW]
            (dx, _), _ = cv2.phaseCorrelate(base, _feat(tile.astype(np.float32)), _win)
            sx = -int(round(dx))
            if sx and abs(sx) <= 4 and not tile[:, :abs(sx)].any() and not tile[:, -abs(sx):].any():
                strip[:, k * FW:(k + 1) * FW] = np.roll(tile, sx, axis=1)
    return strip


def write_png(path, arr):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "wb").write(cv2.imencode(".png", cv2.cvtColor(arr, cv2.COLOR_RGBA2BGRA))[1].tobytes())


strips, start = {}, {}
n = 0
for name in ORDER:
    strips[name] = build_strip(name, ANIMS[name])
    start[name] = n
    n += strips[name].shape[1] // FW
    write_png(os.path.join(STRIP_DIR, f"pirate_{name}.png"), strips[name])
    print(f"pirate_{name}.png", strips[name].shape[1] // FW, "quadros", f"{strips[name].shape[1]}x{FH}")

# folha do jogo = as animações em sequência (o formato "pack" que o jogo já usa)
sheet = np.concatenate([strips[k] for k in ORDER], axis=1)
I = lambda name, k=0: start[name] + k
cnt = lambda name: strips[name].shape[1] // FW
E = {"idlevarA": I("extra", 0), "idlevarB": I("extra", 1), "back": I("extra", 2), "punch": I("extra", 3), "stance": I("extra", 4)}
amap = {
    "idle": [I("idle", k) for k in range(cnt("idle"))],
    "idlevar": [E["idlevarA"], E["idlevarB"], E["idlevarA"]],
    "walk": [I("walk", k) for k in range(cnt("walk"))],
    "run": [I("run", k) for k in range(cnt("run"))],
    # ataque em 3 fases controladas pelo tempo da arma (o dano sai no fim da preparação)
    "attackW": [I("attack", 0), I("attack", 1)], "attackH": [I("attack", 2)], "attackR": [I("attack", 3), E["stance"]],
    "windupA": I("attack", 0), "windup": I("attack", 1), "hitA": I("attack", 2), "hit": I("attack", 2), "recovery": I("attack", 3),
    "guardStart": I("attack", 0), "guard": I("attack", 0),
    "hurt": I("death", 0), "hurtB": I("death", 1), "stunA": I("death", 1), "stunB": I("death", 2),
    "dashA": I("run", 0), "dash": I("run", 5),
    "castA": I("attack", 1), "cast": E["punch"], "castC": I("attack", 3),
    "deathSeq": [I("death", k) for k in range(cnt("death"))],
    "deathA": I("death", 0), "deathB": I("death", 4), "deathC": I("death", cnt("death") - 1),
    "upA": E["back"], "upB": E["back"],
}

# retrato do HUD: quadrado centrado no rosto do primeiro quadro parado
ys, xs = np.nonzero(sheet[:, :FW, 3] > 0)
top = int(ys.min())
fx = int(round(xs[ys < top + 22].mean()))
P = 30
portrait = [fx - P // 2 + 1, max(0, top - 1), P, P]

layout = {"frameW": FW, "frameH": FH, "scale": GAME_SCALE, "hiRes": True, "footY": FOOT, "bakedWeapon": True,
          "portrait": portrait, "fps": {k: ANIMS[k]["fps"] for k in ANIMS if ANIMS[k]["fps"]} | {"idlevar": 3},
          "anchors": [[80, 76]] * n, "torso": [[64, 80]] * n, "head": [[64, top + 12]] * n, "map": amap}

KEY = "pirate-hd3"           # nome novo a cada mudança grande: o cache offline do jogo não serve a versão velha
png = cv2.imencode(".png", cv2.cvtColor(sheet, cv2.COLOR_RGBA2BGRA))[1].tobytes()
for d in OUT_DIRS:
    if not os.path.isdir(os.path.dirname(d)):
        continue
    os.makedirs(d, exist_ok=True)
    for name in [f"{KEY}-body.png"] + [f"{KEY}-t{t}-body.png" for t in range(5)]:
        open(os.path.join(d, name), "wb").write(png)
    json.dump(layout, open(os.path.join(d, f"{KEY}.json"), "w"), separators=(",", ":"))
    for old in [f"pirate-{k}{e}" for k in ("pack", "hd", "hd2") for e in ("-body.png", ".json")] + \
               [f"pirate-{k}-t{t}-body.png" for k in ("pack", "hd", "hd2") for t in range(5)]:
        if os.path.exists(os.path.join(d, old)):
            os.remove(os.path.join(d, old))
json.dump({"cell": [FW, FH], "scale": GAME_SCALE, "footY": FOOT,
           "animations": {k: {"frames": cnt(k), "file": f"pirate_{k}.png", "size": [cnt(k) * FW, FH],
                              "fps": ANIMS[k]["fps"], "loop": ANIMS[k]["loop"],
                              "source": [f"{r}#{i}" for r, i in ANIMS[k]["src"]]} for k in ORDER},
           "gameSheet": f"assets/pixel-art/characters/{KEY}-body.png", "map": amap},
          open(os.path.join(STRIP_DIR, "pirate_config.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"OK {KEY}-body.png", sheet.shape, len(png), "bytes;", n, "quadros; retrato", portrait)

if PREVIEW:  # prévia: uma linha por animação, ampliada 2x
    rows = []
    wmax = max(v.shape[1] for v in strips.values())
    for k in ORDER:
        r = np.zeros((FH, wmax, 4), np.uint8)
        r[:, :strips[k].shape[1]] = strips[k]
        rows.append(r)
    pv = np.concatenate(rows, 0)
    al = pv[..., 3:4] / 255.0
    out = (pv[..., :3] * al + np.array([38, 32, 36]) * (1 - al)).astype(np.uint8)
    for k in range(len(ORDER) + 1):
        out[k * FH - 1 if k else 0, :] = (90, 80, 70)
    out[np.arange(len(ORDER) * FH), :][..., 0]
    out = cv2.resize(out, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST)
    for k in range(len(ORDER)):                                     # linha do chão (footY)
        out[(k * FH + FOOT) * 2 + 1, :, :] = (70, 110, 70)
    cv2.imwrite(PREVIEW, cv2.cvtColor(out, cv2.COLOR_RGB2BGR))
