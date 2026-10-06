#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador da Guerreira Indígena Brasileira (Com Folhas Verdes na Saia/Tanga)
Transforma todos os 10 spritesheets da Amazona com estética dos povos originários:
- Pintura facial de Urucum vermelho vivo
- Grafismos corporais de Jenipapo preto nos membros
- Adornos de penas de Arara Canindé (Azul e Dourado)
- Tom de pele bronzeado acobreado quente
- Parte inferior da vestimenta: Folhagem/Folhas verdes tropicais (Tanga de folhas da selva)
"""

import os
import glob
import numpy as np
from PIL import Image

SRC_DIR = r"C:\Users\rafaelscarpille\Downloads\DEPTHGATE-WEB-COMPLETO 04-10-2026\India amazona\Amazon_1"

# Pastas de destino separadas
OUT_DIRS = [
    r"C:\Users\rafaelscarpille\Downloads\Guerreira Indigena Brasileira (Com Folhas Verdes)",
    r"C:\Users\rafaelscarpille\Downloads\DarkEpicDungeon\assets\pixel-art\characters\amazona_indigena_folhas",
    r"C:\Users\rafaelscarpille\Downloads\DEPTHGATE-WEB-COMPLETO 04-10-2026\DEPTHGATE-WEB-COMPLETO\assets\pixel-art\characters\amazona_indigena_folhas"
]

for d in OUT_DIRS:
    os.makedirs(d, exist_ok=True)

# Cores originais
SKIN_MAIN = (171, 81, 48)
SKIN_SHADOW = (125, 56, 51)
FEATHER_1 = (138, 161, 246)
FEATHER_2 = (201, 212, 253)
CLOTH_1 = (44, 59, 57)
CLOTH_2 = (45, 27, 30)
DARK_CLOTH = (20, 18, 29)

# Paleta Indígena Brasileira
NEW_SKIN_MAIN = (195, 115, 68)       # Tom bronzeado/dourado quente
NEW_SKIN_SHADOW = (145, 75, 52)      # Sombra acobreada natural
NEW_FEATHER_BLUE = (28, 125, 235)    # Azul Arara Canindé
NEW_FEATHER_YELLOW = (255, 205, 35)  # Amarelo Ouro Arara
URUCUM_RED = (218, 38, 30, 255)      # Tinta de urucum tradicional
JENIPAPO_BLACK = (25, 22, 32, 255)   # Tinta preta de jenipapo

# Paleta de Folhas Verdes Tropicais
LEAF_LIGHT = (72, 192, 85)           # Luz verde esmeralda na ponta das folhas
LEAF_MID = (38, 142, 52)             # Verde folha tropical de selva
LEAF_DARK = (22, 88, 34)             # Verde musgo / sombra entre as folhas

files = glob.glob(os.path.join(SRC_DIR, "*.png"))
print(f"Processando {len(files)} spritesheets com folhagem verde...")

for file_path in files:
    filename = os.path.basename(file_path)
    im = Image.open(file_path).convert("RGBA")
    w, h = im.size
    num_frames = w // 128
    arr = np.array(im)

    for f in range(num_frames):
        x_start = f * 128
        frame = arr[:, x_start:x_start+128]
        ys, xs = np.where(frame[:, :, 3] > 0)
        if len(ys) == 0:
            continue
        head_top = ys.min()

        # 1. Base: Pele e Penas
        mask_skin = (frame[:, :, 0] == SKIN_MAIN[0]) & (frame[:, :, 1] == SKIN_MAIN[1]) & (frame[:, :, 2] == SKIN_MAIN[2])
        mask_shadow = (frame[:, :, 0] == SKIN_SHADOW[0]) & (frame[:, :, 1] == SKIN_SHADOW[1]) & (frame[:, :, 2] == SKIN_SHADOW[2])
        mask_f1 = (frame[:, :, 0] == FEATHER_1[0]) & (frame[:, :, 1] == FEATHER_1[1]) & (frame[:, :, 2] == FEATHER_1[2])
        mask_f2 = (frame[:, :, 0] == FEATHER_2[0]) & (frame[:, :, 1] == FEATHER_2[1]) & (frame[:, :, 2] == FEATHER_2[2])

        frame[mask_skin, :3] = NEW_SKIN_MAIN
        frame[mask_shadow, :3] = NEW_SKIN_SHADOW
        frame[mask_f1, :3] = NEW_FEATHER_BLUE
        frame[mask_f2, :3] = NEW_FEATHER_YELLOW

        # 2. Topo da vestimenta (peito/ombro): Fibra natural trançada de palha/tucum
        for y in range(head_top, min(h, head_top + 27)):
            for x in range(128):
                c = tuple(frame[y, x, :3])
                if c == CLOTH_1: frame[y, x, :3] = (168, 125, 72)
                elif c == CLOTH_2: frame[y, x, :3] = (112, 58, 38)

        # 3. Parte de baixo da roupa: FOLHAS VERDES TROPICAIS (Saia/Tanga de Folhas)
        for y in range(head_top + 27, h):
            for x in range(128):
                c = tuple(frame[y, x, :3])
                if c == CLOTH_2:
                    # Alterna gradiente de luz e sombra nas folhas
                    if y % 2 == 0 or (x + y) % 3 == 0:
                        frame[y, x, :3] = LEAF_LIGHT
                    else:
                        frame[y, x, :3] = LEAF_MID
                elif c == CLOTH_1:
                    frame[y, x, :3] = LEAF_MID
                elif c == DARK_CLOTH and y >= head_top + 33 and y <= head_top + 48:
                    frame[y, x, :3] = LEAF_DARK

        # 4. Pintura Facial com Urucum nos olhos e bochechas
        face_y1 = head_top + 7
        face_y2 = head_top + 10
        for y in range(face_y1, min(h, face_y2 + 1)):
            for x in range(128):
                r, g, b = frame[y, x, :3]
                if (r, g, b) in [NEW_SKIN_MAIN, NEW_SKIN_SHADOW]:
                    frame[y, x] = URUCUM_RED

        # 5. Grafismos corporais de Jenipapo nos membros
        body_y1 = head_top + 32
        body_y2 = head_top + 34
        if body_y2 < h:
            for y in range(body_y1, body_y2 + 1):
                for x in range(128):
                    if (x + y) % 3 == 0:
                        r, g, b = frame[y, x, :3]
                        if (r, g, b) in [NEW_SKIN_MAIN, NEW_SKIN_SHADOW]:
                            frame[y, x] = JENIPAPO_BLACK

    out_img = Image.fromarray(arr)
    for out_dir in OUT_DIRS:
        dest_path = os.path.join(out_dir, filename)
        out_img.save(dest_path)
    print(f" -> Processado: {filename} ({num_frames} frames)")

print("\nTodos os 10 spritesheets com folhas verdes foram salvos com sucesso!")
