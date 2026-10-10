"""Animação de passos do Capitão Scarpa por recorte (cut-out), a partir da arte enviada.

Problema: na folha v2, as linhas ANDANDO e CORRENDO têm sempre a mesma perna à frente
(a outra metade do passo não existe), então o personagem "desliza" sem dar passos.

Solução: pega um quadro da própria arte, separa as duas pernas (calça e bota, abaixo do
cinto) do resto do corpo e as gira a partir do quadril em sentidos opostos, com a perna
que avança levantando o pé no meio do passo. O corpo desce quando as pernas estão abertas
e sobe na passagem (pêndulo invertido, como uma caminhada de verdade). Só pixels da arte
original são usados (rotação por vizinho mais próximo, sem borrar).

Saída: assets/sprites/characters/pirate/pirate_walk.png e pirate_run.png (substitui as tiras
geradas a partir da folha). Rodar DEPOIS de build_pirate_sprites.py e antes de montar a
folha do jogo — o build_pirate_sprites.py chama este script automaticamente.

Uso direto (prévia):  python scripts/build_pirate_legs.py previa.png
"""
import math
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STRIPS = os.path.join(ROOT, "assets", "sprites", "characters", "pirate")
FW = FH = 128
FOOT = 123


def tile(a, k):
    return a[:, k * FW:(k + 1) * FW].copy()


def leg_masks(t, belt_y, split_top, split_bot):
    """Separa as pernas (calça e bota) abaixo do cinto em traseira/dianteira.

    O casaco (cinza-azulado com bainha dourada), a faixa vermelha e a lâmina ficam no
    corpo; o resto abaixo do cinto vira perna. A máscara é fechada e sem buracos para a
    perna girar inteira, sem esfarelar.
    """
    from scipy import ndimage as ndi
    rgb = t[..., :3].astype(int)
    a = t[..., 3] > 0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    coat = (b >= r - 6) & (rgb.mean(2) < 120)                 # casaco: frio/escuro
    gold = (r > 120) & (g > 80) & (b < 70) & (r - b > 60)     # bainha dourada do casaco
    sash = (r > 105) & (g < 62) & (b < 62) & (r > g * 1.9)
    blade = (np.abs(r - b) < 26) & (rgb.mean(2) > 105)
    yy, xx = np.mgrid[0:FH, 0:FW]
    # recorte geométrico: tudo abaixo do quadril entre as bordas das pernas (sem a lâmina).
    # A ponta do casaco que cobre a perna gira junto, como se balançasse com o passo.
    raw = a & ~blade & ~sash & (yy >= belt_y) & (xx >= 46) & (xx <= 90)
    t_ = np.clip((yy - belt_y) / max(1, FOOT - belt_y), 0, 1)
    split = split_top + (split_bot - split_top) * t_
    out = []
    for side in (xx < split, xx >= split):
        m = raw & side
        m = ndi.binary_closing(m, iterations=1) & a & side & (yy >= belt_y)
        lab, n = ndi.label(m)
        if n:
            sizes = ndi.sum(m, lab, range(1, n + 1))
            m = lab == (1 + int(np.argmax(sizes)))
        m = ndi.binary_fill_holes(m) & a
        out.append(m)
    return out[0], out[1]


def rotate_layer(layer, mask, pivot, ang, lift):
    """Gira os pixels de `mask` em torno de `pivot` (vizinho mais próximo) e sobe `lift` px."""
    out = np.zeros_like(layer)
    px, py = pivot
    ys, xs = np.nonzero(mask)
    if not len(xs):
        return out
    # mapeamento inverso numa caixa folgada para não deixar buracos
    pad = 14
    y0, y1 = max(0, ys.min() - pad), min(FH, ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(FW, xs.max() + pad)
    gy, gx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    gy = gy + lift
    c, s = math.cos(-ang), math.sin(-ang)
    sx = c * (gx - px) - s * (gy - py) + px
    sy = s * (gx - px) + c * (gy - py) + py
    ix, iy = np.round(sx).astype(int), np.round(sy).astype(int)
    ok = (ix >= 0) & (ix < FW) & (iy >= 0) & (iy < FH)
    ok[ok] = mask[iy[ok], ix[ok]]
    oy, ox = np.nonzero(ok)
    out[oy + y0, ox + x0] = layer[iy[ok], ix[ok]]
    return out


def compose(t, back, front, piv_b, piv_f, ang_b, ang_f, lift_b, lift_f, lean=0.0):
    body = t.copy()
    hole = back | front
    body[hole] = 0
    # o que estava atrás das pernas (entre elas e sob o casaco) vira sombra escura da calça
    from scipy import ndimage as ndi
    near = ndi.binary_dilation(hole, iterations=1) & (t[..., 3] > 0) & ~hole
    gap = hole & ndi.binary_dilation(near, iterations=3)
    body[gap, :3] = (34, 22, 18)
    body[gap, 3] = 255
    # junto do quadril a perna quase não sai do lugar: mantém a arte original (sem costura escura)
    yy = np.mgrid[0:FH, 0:FW][0]
    seam = hole & (yy < min(piv_b[1], piv_f[1]) + 7)
    body[seam] = t[seam]
    lb = rotate_layer(t, back, piv_b, ang_b, lift_b)
    lf = rotate_layer(t, front, piv_f, ang_f, lift_f)
    out = np.zeros_like(t)
    for layer in (lb, lf, body):                              # pernas atrás do casaco
        m = layer[..., 3] > 0
        out[m] = layer[m]
    # encosta o pé mais baixo no chão (o corpo sobe e desce sozinho com o passo)
    # limpa pontinhos soltos que a rotação deixa
    m = out[..., 3] > 0
    lab, n = ndi.label(m)
    if n > 1:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        for k, sz in enumerate(sizes, 1):
            if sz < 12:
                out[lab == k] = 0
    ys = np.nonzero(out[..., 3].any(1))[0]
    dy = FOOT - ys.max()
    out = np.roll(out, dy, axis=0)
    if dy > 0:
        out[:dy] = 0
    return out


def cycle(t, belt_y, split_top, split_bot, piv_b, piv_f, n, amp, lift, phase_lift=1.0):
    back, front = leg_masks(t, belt_y, split_top, split_bot)
    frames = []
    for k in range(n):
        p = 2 * math.pi * k / n
        # ângulo positivo = pé vai para a frente (direita); pernas em oposição
        af = amp * math.sin(p)
        ab = -af
        # a perna que está avançando (derivada > 0) levanta o pé no meio do passo
        lf = lift * max(0.0, math.cos(p)) ** phase_lift
        lb = lift * max(0.0, -math.cos(p)) ** phase_lift
        frames.append(compose(t, back, front, piv_b, piv_f, math.radians(-af), math.radians(-ab), lb, lf))
    return np.concatenate(frames, axis=1), back, front


def main(preview=None):
    idle = np.array(Image.open(os.path.join(STRIPS, "pirate_idle.png")).convert("RGBA"))
    base = tile(idle, 0)                                       # postura em pé, sabre na mão
    walk, back, front = cycle(base, belt_y=92, split_top=64, split_bot=64,
                              piv_b=(57, 90), piv_f=(72, 90), n=8, amp=13, lift=3)
    run, _, _ = cycle(base, belt_y=92, split_top=64, split_bot=64,
                      piv_b=(57, 90), piv_f=(72, 90), n=6, amp=24, lift=6)
    # corrida: tronco inclinado para a frente (casaco e faixa "ficam para trás")
    run = lean_strip(run, 6)
    Image.fromarray(walk).save(os.path.join(STRIPS, "pirate_walk.png"))
    Image.fromarray(run).save(os.path.join(STRIPS, "pirate_run.png"))
    print("OK pirate_walk.png", walk.shape[1] // FW, "quadros; pirate_run.png", run.shape[1] // FW, "quadros")
    if preview:
        m = np.zeros((FH, FW, 4), np.uint8)
        m[back] = (80, 160, 255, 255)
        m[front] = (255, 120, 60, 255)
        rows = [walk, np.concatenate([run, base, m], axis=1)]
        wmax = max(r.shape[1] for r in rows)
        pv = np.zeros((FH * 2, wmax, 4), np.uint8)
        for i, r in enumerate(rows):
            pv[i * FH:(i + 1) * FH, :r.shape[1]] = r
        al = pv[..., 3:4] / 255.0
        img = (pv[..., :3] * al + np.array([60, 90, 60]) * (1 - al)).astype(np.uint8)
        img[[FOOT, FH + FOOT], :] = (30, 40, 30)
        Image.fromarray(img).resize((img.shape[1] * 3, img.shape[0] * 3), Image.NEAREST).save(preview)


def lean_strip(strip, deg):
    """Inclina cada quadro para a frente girando em torno dos pés (vizinho mais próximo)."""
    out = np.zeros_like(strip)
    n = strip.shape[1] // FW
    for k in range(n):
        t = tile(strip, k)
        m = t[..., 3] > 0
        ys, xs = np.nonzero(m)
        cx = (xs.min() + xs.max()) / 2
        r = rotate_layer(t, m, (cx, FOOT), math.radians(deg), 0)
        ys2 = np.nonzero(r[..., 3].any(1))[0]
        dy = FOOT - ys2.max()
        r = np.roll(r, dy, axis=0)
        out[:, k * FW:(k + 1) * FW] = r
    return out


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
