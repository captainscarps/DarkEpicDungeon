# PIPELINE DE ASSETS E ESPECIFICAÇÕES DE SPRITES
## DOCUMENTO 05: PADRÕES TÉCNICOS DE ARTE, RESOLUÇÃO E PALETA

---

### 1. RESOLUÇÃO E DENSIDADE DE PIXELS (TEXEL DENSITY)

Para garantir harmonia e evitar a sensação de "resoluções misturadas" (mixed pixel density):
- **Resolução Nativa da Câmera**: 640x360 (formato 16:9 de referência), escalonado com pixel-perfect scaling (`imageRendering: 'pixelated'`).
- **Dimensões de Telas de Personagens**:
  - Grid de frame: **128 x 128 pixels**.
  - Escala em cena: `0.75x` a `0.80x` (resultando em uma altura visual de ~48 a 56 pixels úteis na tela).
  - Ponto de apoio (foot anchor): linha Y = 118 a 120 no frame de 128px.
- **Inimigos**:
  - Pequenos (morcegos, aranhas, ratos): 64x64px ou 96x96px.
  - Médios (esqueletos, cultistas, guerreiros demoníacos): 128x128px.
  - Grandes / Minotauros / Ciclope: 160x160px a 192x192px.
  - Chefes (Anhangá, Dragão, Rei Caído): 256x256px até 384x384px.

---

### 2. ORÇAMENTO DE FRAMES POR AÇÃO (FRAME BUDGET)

| Animação | Qtd Mínima de Frames | Taxa de Quadros (FPS) | Regra de Desenho |
|---|---|---|---|
| **Idle** | 4 a 6 frames | 4 - 6 FPS | Respiração cadenciada, micro-movimento de manto/cabelo. NUNCA mudar a posição dos pés no chão. |
| **Walk** | 6 a 8 frames | 8 - 10 FPS | Contato de calcanhar, passagem pelo centro de massa, impulsão de ponta de pé. |
| **Run** | 6 a 8 frames | 12 - 14 FPS | Passadas amplas com inclinação de tronco, aceleração visível. |
| **Attack Windup** | 2 a 3 frames | 12 - 16 FPS | Tensão acumulada, recuo de arma, pés fincados. |
| **Attack Strike** | 2 frames (1 Smear Frame + 1 Impact Frame) | 20 - 24 FPS | Velocidade máxima, deformação de lâmina para indicar trajetória. |
| **Attack Recovery** | 2 a 3 frames | 10 - 12 FPS | Desaceleração de golpe e retorno à base. |
| **Hit / Hurt** | 2 a 3 frames | 14 FPS | Recuo violento de cabeça/peito, micro-desequilíbrio. |
| **Death** | 5 a 8 frames | 8 - 10 FPS | Queda física realista com impacto no solo e repouso estático final. |
| **Dodge / Dash** | 3 a 4 frames | 16 FPS | Silhueta esticada no eixo de movimento. |

---

### 3. PALETA DE CORES E HARMONIZAÇÃO CROMÁTICA DARK FANTASY

- **Tom de Base da Cena**: Paleta de sombras frias e terrosas (azuis-noite profundos, ardósia, musgo podre, marrom-ferrugem).
- **Proporção 70 / 25 / 5**:
  - **70% do Sprite**: Tons neutros e escuros (aço fosco, couro gasto, panos cinzentos ou crus desbotados).
  - **25% do Sprite**: Tons de identidade da classe (ex.: verde folha e marrom ocre para a Xamã; vermelho carmesim profundo para o Samurai; azul meia-noite para o Mago).
  - **5% do Sprite**: Destaques especulares e pontos focais (olhos brilhantes, runas gravadas na lâmina, ponta de aço afiada).
- **Evitar Absolutamente**:
  - Cores saturadas primárias puras (`#ff0000` brilhante, `#00ff00` neon, `#ffff00` canário).
  - Linhas de contorno pretas puras (`#000000`) em todas as bordas internas — use tons escuros matizados com a cor do próprio material (selective outlining).

---

### 4. CHECKLIST DE VALIDAÇÃO DE NOVOS ASSETS

1. [ ] A proporção anatômica respeita a escala de 1:6 a 1:7 (sem aspecto chibi ou infantil)?
2. [ ] A arma possui peso aparente na mão e não parece levitar?
3. [ ] A animação possui pelo menos um frame de antecipação antes da ação?
4. [ ] O frame de impacto possui um smear ou rastro cinético convincente?
5. [ ] Os pés permanecem no solo durante o ciclo de ataque, mantendo a tração?
6. [ ] A paleta de cores harmoniza com os tons de pedra e tochas dos biomas existentes?
7. [ ] A animação de morte culmina em uma pose de repouso no solo sem sumir repentinamente?
