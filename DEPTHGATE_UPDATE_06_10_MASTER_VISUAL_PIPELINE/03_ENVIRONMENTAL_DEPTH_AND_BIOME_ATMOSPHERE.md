# DepthGate Visual Pipeline: Passo 08 — Environmental Depth & Biome Atmosphere
**Versão**: 2.0.0  
**Arquitetura**: Phaser 4.2.1 / Vite / 2D Canvas & WebGL  
**Direção Visual**: Premium Realistic Dark Fantasy Pixel Art

---

## 1. Visão Geral
A imersão em DepthGate depende fundamentalmente da profundidade atmosférica de seus biomas. Um calabouço não é apenas uma grade de ladrilhos estáticos com tochas pontuais; é um ecossistema úmido, empoeirado, gelado ou em chamas, onde o ar possui densidade tangível.
O Passo 08 padroniza os sistemas de partículas ambientais e ambientação lumínica conforme o bioma explorado:
- **Floresta de Eldervale (`forest`)**: Esporos fluorescentes, folhas em decomposição flutuando em correntes suaves de vento, névoa verdejante.
- **Castelo de Valdrak / Fortaleza (`castle` / `fortress`)**: Brasas ascendentes oriundas de fogueiras e tochas de ferro, fuligem fina, oscilação de calor.
- **Catacumbas e Criptas (`catacombs`)**: Fagulhas de ectoplasma, névoa espectral azul-esverdeada rastejando no piso, poeira de ossos centenários.
- **Ruínas Glaciais (`glacial`)**: Cristais de gelo horizontais, flocos de nevasca sub-zero, atmosfera azulada e translúcida.

---

## 2. Matriz de Parâmetros Ambientais por Bioma

| Bioma | Paleta de Motes Ambientais | Vetor de Movimento | Escala (px) | Duração de Vida (ms) | Alfa Máximo | Blend Mode |
|---|---|---|---|---|---|---|
| `forest` | `#6e9f54` (verde oliva), `#a4b868` (líquen) | Descendente com oscilação horizontal ($\Delta x \in [-14, 14]$, $\Delta y = +16$) | $1 \times 1$ a $2 \times 2$ | 3200ms | 0.45 | `ADD` |
| `castle` / `fortress` | `#ff7722` (âmbar fogo), `#ffb833` (ouro incandescente) | Ascendente com leve dispersão ($\Delta x \in [-8, 8]$, $\Delta y = -26$) | $1 \times 1$ | 1900ms | 0.60 | `ADD` |
| `catacombs` | `#668877` (musgo úmido), `#7788aa` (névoa espectral) | Flutuação lenta quase estática ($\Delta x \in [-10, 10]$, $\Delta y = -12$) | $1 \times 1$ | 2800ms | 0.35 | `ADD` |
| `glacial` | `#d0e8ff` (gelo brilhante), `#88ccff` (neve fria) | Diagonal rápido tipo nevasca ($\Delta x = +22$, $\Delta y = +12$) | $1 \times 1$ a $2 \times 1$ | 2200ms | 0.50 | `ADD` |

---

## 3. Dinâmica das Partículas de Solo e Piso

### 3.1. Reação a Passos do Jogador e Monstros
Conforme implementado no núcleo `Qe.update`, quando o jogador se desloca:
- A cada 120ms de corrida contínua, uma partícula de poeira ou faísca de solo é expelida atrás dos pés:
  - Nos pisos de pedra: poeira cinzenta escura (`#5a524a`).
  - Em áreas lamacentas/florestais: micro-salpico marrom escuro (`#3b2f20`).
- Isso ancora o sprite do personagem firmemente ao chão, eliminando a sensação de "patinação" comum em top-down 2D.

### 3.2. Iluminação Orgânica de 3 Harmônicas em Tochas (`uh.update`)
O sistema de iluminação de masmorra (`LightingSystem`) não utiliza interpolações lineares artificiais. O raio de luz e a intensidade das tochas oscilam com a combinação de três ondas senoidais não comensuráveis:
$$I(t) = I_0 \times \left(1.0 + 0.045 \sin(2.1 t) + 0.03 \sin(4.7 t + 1.2) + 0.015 \sin(9.3 t + 2.5)\right)$$
Isso simula fielmente a combustão caótica de uma tocha de resina ou fogo de masmorra, projetando sombras dinâmicas que respiram com o cenário.

---

## 4. Oclusão e Profundidade de Camadas (Depth Stacking)
Para assegurar a ilusão de profundidade tridimensional em visão top-down:
- **Camada 0**: Piso renderizado pelo gerador procedural (`Tilemap`).
- **Camada 1**: Sombras ovais de personagens e monstros com transparência multiplicativa.
- **Camada 2**: Decais estáticos de sangue coagulado, fissuras e marcas de magia.
- **Camada $Y$ (dinâmica)**: Sprites de personagens, armas, equipamentos e inimigos ordenados pelo seu pé ($y$-depth sorting estrito).
- **Camada 900**: Motes e partículas de poeira atmosférica.
- **Camada 940 - 960**: Efeitos de vácuo, cortes luminosos e projéteis.
- **Camada 1000+**: Overlay de luz, vinheta e elementos da interface de usuário (HUD).
