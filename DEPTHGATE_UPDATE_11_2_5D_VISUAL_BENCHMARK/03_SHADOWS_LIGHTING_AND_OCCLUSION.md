# DepthGate Visual Rebirth: Passo 11 — 2.5D Volumetric Benchmark
## Sombras Projetadas, Iluminação & Oclusão Dinâmica
**Versão**: 2.5.0  
**Motor**: Phaser 4.2.1 / Vite / 2D Canvas & WebGL Runtime  
**Direção Visual**: Cinematic Volumetric 2.5D Dark Fantasy High-Detail Pixel Art

---

## 1. Visão Geral
Em pixel art tradicional, sombras costumam ser limitadas a uma simples elipse preta estática abaixo dos pés. Isso destrói imediatamente qualquer ilusão de tridimensionalidade.
O Passo 11 implementa um modelo duplo de sombras:
1. **Sombra de Contato (Ambient Occlusion)**: Ancorada rigidamente na base do sprite, representando o bloqueio imediato de luz onde o corpo toca o solo.
2. **Sombra Projetada Direcional Dinâmica**: Um polígono de penumbra que se alonga, gira e atenua em tempo real conforme a posição relativa da fonte de luz.

---

## 2. Modelo Físico da Sombra Projetada

Dada uma fonte de luz pontual na coordenada $(L_x, L_y, L_z)$ e um objeto com base no solo em $(P_x, P_y)$ e altura aparente $H$:

### 2.1. Vetor de Projeção no Solo
$$\Delta x = P_x - L_x, \quad \Delta y = P_y - L_y$$
$$d = \sqrt{\Delta x^2 + \Delta y^2}$$
$$\vec{u} = \left(\frac{\Delta x}{d}, \frac{\Delta y}{d}\right)$$

### 2.2. Comprimento e Ponto Extremo (Tip)
O comprimento da sombra varia proporcionalmente com a distância da luz e a altura do objeto:
$$L_{\text{sombra}} = \min\left(65, \frac{d}{140} \times H\right)$$
$$\text{Tip}_x = P_x + u_x \times L_{\text{sombra}}$$
$$\text{Tip}_y = P_y + u_y \times L_{\text{sombra}} \times 0.45$$
*(O fator $0.45$ no eixo Y corrige a distorção da perspectiva isométrica diagonal do chão).*

### 2.3. Geometria Trapezoidal de Penumbra
A sombra projeta um trapézio que se alarga em direção à ponta para simular a dispersão da penumbra:
- Largura na base (Umbra): $w_{\text{base}} = 14\text{ px}$.
- Largura no topo (Penumbra alargada): $w_{\text{ponta}} = 20\text{ px}$.
- Cor de renderização: Preto profundo com transparência suave (`rgba(0, 0, 0, 0.45)`).

Ao mover o mouse na tela ou acionar a órbita automática da luz (`Tecla L`), o jogador observa a sombra projetada do guerreiro e do inimigo girar ao redor dos seus pés de forma fluida a 60 FPS!

---

## 3. Oclusão e Interação com Elementos da Masmorra

### 3.1. Ordenação Estrita Y-Depth com Pilares
O pilar de pedra central é uma coluna de alta resolução (64x160 pixels) com base quadrada em $y = 170$:
- Quando o guerreiro caminha atrás do pilar ($y < 170$):
  - `guerreiro.setDepth(y)` é estritamente menor que `pilar.depth` ($170$).
  - O pilar oclui fisicamente o guerreiro, revelando apenas suas armas e crista do elmo quando passa próximo às laterais.
- Quando o guerreiro caminha à frente ($y > 170$):
  - `guerreiro.setDepth(y)` é maior que $170$.
  - O corpo do guerreiro sobrepõe a base de pedra do pilar, ancorando o personagem à frente da estrutura.

### 3.2. Projétil Mágico com Altura Z Descolada
Quando a magia é disparada (`Tecla Q`):
- O projétil viaja à altura $Z = 25$ pixels acima do piso.
- Uma sombra de solo em `ellipse` segue $(X, Y + 25)$.
- O projétil atravessa a frente do pilar sem colidir com sua base no solo, demonstrando elevação vertical real no espaço da masmorra.
