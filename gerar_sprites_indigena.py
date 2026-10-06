#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador da Guerreira Indígena Brasileira para DEPTHGATE
Transforma os spritesheets da Amazona com estética dos povos originários brasileiros:
- Urucum vermelho vivo na face (faixa nos olhos/bochechas)
- Grafismos de Jenipapo preto nos braços/pernas
- Adornos de penas de Arara Canindé (Azul celeste e Ouro)
- Tom de pele bronzeado/dourado autêntico
- Fibras naturais e palha trançada nas vestimentas
"""

import os
import glob
import numpy as np
from PIL import Image

SRC_DIR = r"C:\Users\rafaelscarpille\Downloads\DEPTHGATE-WEB-COMPLETO 04-10-2026\India amazona\Amazon_1"
OUT_DIRS = [
    r"C:\Users\rafaelscarpille\Downloads\DarkEpicDungeon\assets\pixel-art\characters\amazona_indigena",
    r"C:\Users\rafaelscarpille\Downloads\DEPTHGATE-WEB-COMPLETO 04-10-2026\DEPTHGATE-WEB-COMPLETO\assets\pixel-art\characters\amazona_indigena"
]

for out_dir in OUT_DIRS:
    os.makedirs(out_dir, exist_ok=True)

# Paleta original
SKIN_MAIN = (171, 81, 48)
SKIN_SHADOW = (125, 56, 51)
FEATHER_1 = (138, 161, 246)
FEATHER_2 = (201, 212, 253)
CLOTH_1 = (44, 59, 57)
CLOTH_2 = (45, 27, 30)

# Paleta Indígena Brasileira
NEW_SKIN_MAIN = (195, 115, 68)       # Tom bronzeado/dourado quente
NEW_SKIN_SHADOW = (145, 75, 52)      # Sombra acobreada natural
NEW_FEATHER_BLUE = (28, 125, 235)    # Azul Arara Canindé
NEW_FEATHER_YELLOW = (255, 205, 35)  # Amarelo Ouro Arara
NEW_CLOTH_FIBER = (168, 125, 72)     # Palha/Fibra de tucum
NEW_CLOTH_LEATHER = (112, 58, 38)    # Couro cru curtido
URUCUM_RED = (218, 38, 30, 255)      # Tinta de urucum tradicional
JENIPAPO_BLACK = (25, 22, 32, 255)   # Tinta preta de jenipapo

files = glob.glob(os.path.join(SRC_DIR, "*.png"))
print(f"Encontrados {len(files)} spritesheets para transformar...")

for file_path in files:
    filename = os.path.basename(file_path)
    im = Image.open(file_path).convert("RGBA")
    w, h = im.size
    num_frames = w // 128
    arr = np.array(im)

    # 1. Substituição da Paleta Global
    mask_skin = (arr[:, :, 0] == SKIN_MAIN[0]) & (arr[:, :, 1] == SKIN_MAIN[1]) & (arr[:, :, 2] == SKIN_MAIN[2])
    mask_shadow = (arr[:, :, 0] == SKIN_SHADOW[0]) & (arr[:, :, 1] == SKIN_SHADOW[1]) & (arr[:, :, 2] == SKIN_SHADOW[2])
    mask_f1 = (arr[:, :, 0] == FEATHER_1[0]) & (arr[:, :, 1] == FEATHER_1[1]) & (arr[:, :, 2] == FEATHER_1[2])
    mask_f2 = (arr[:, :, 0] == FEATHER_2[0]) & (arr[:, :, 1] == FEATHER_2[1]) & (arr[:, :, 2] == FEATHER_2[2])
    mask_c1 = (arr[:, :, 0] == CLOTH_1[0]) & (arr[:, :, 1] == CLOTH_1[1]) & (arr[:, :, 2] == CLOTH_1[2])
    mask_c2 = (arr[:, :, 0] == CLOTH_2[0]) & (arr[:, :, 1] == CLOTH_2[1]) & (arr[:, :, 2] == CLOTH_2[2])

    arr[mask_skin, :3] = NEW_SKIN_MAIN
    arr[mask_shadow, :3] = NEW_SKIN_SHADOW
    arr[mask_f1, :3] = NEW_FEATHER_BLUE
    arr[mask_f2, :3] = NEW_FEATHER_YELLOW
    arr[mask_c1, :3] = NEW_CLOTH_FIBER
    arr[mask_c2, :3] = NEW_CLOTH_LEATHER

    # 2. Pintura Facial com Urucum em cada frame
    for f in range(num_frames):
        x_start = f * 128
        frame = arr[:, x_start:x_start+128]
        ys, xs = np.where(frame[:, :, 3] > 0)
        if len(ys) > 0:
            head_top = ys.min()
            # Faixa de urucum na altura dos olhos e bochechas
            face_y1 = head_top + 7
            face_y2 = head_top + 10
            for y in range(face_y1, min(h, face_y2 + 1)):
                for x in range(128):
                    r, g, b = frame[y, x, :3]
                    if (r, g, b) in [NEW_SKIN_MAIN, NEW_SKIN_SHADOW]:
                        frame[y, x] = URUCUM_RED

            # 3. Grafismos de Jenipapo nos membros inferiores e pulsos (linhas sutis)
            # Torso/pernas: head_top + 28 a + 36
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
    print(f" -> Processado e salvo: {filename} ({num_frames} frames)")

print("\nConcluído com sucesso em todas as pastas!")
