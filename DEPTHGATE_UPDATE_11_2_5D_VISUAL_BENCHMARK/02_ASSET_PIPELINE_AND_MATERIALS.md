# DepthGate Visual Rebirth: Passo 11 — 2.5D Volumetric Benchmark
## Pipeline de Assets & Diferenciação de Materiais
**Versão**: 2.5.0  
**Motor**: Phaser 4.2.1 / Vite / 2D Canvas & WebGL Runtime  
**Direção Visual**: Cinematic Volumetric 2.5D Dark Fantasy High-Detail Pixel Art

---

## 1. Visão Geral do Pipeline de Criação de Assets
Os assets do benchmark não foram desenhados como figuras planas pintadas pixel a pixel com cores únicas. Em vez disso, foram gerados através de um pipeline matemático que calcula vetores normais de superfícies 3D e avalia a resposta física de iluminação antes de quantizar a imagem para uma apresentação pixel-art final de 128x128 (e 160x160) pixels:

```
[Primitivas 3D Analíticas]
        ↓
[Cálculo de Normais N(x, y, z)]
        ↓
[Modelo de Iluminação Blinn-Phong]
        ↓
[Propriedades de Materiais (Roughness, Shininess, Diffuse)]
        ↓
[Oclusão de Contato & Rim Light]
        ↓
[Quantização Cromática em 32 Níveis por Canal]
        ↓
[Borda de Contorno Escuro Orgânico (Charcoal Rim)]
        ↓
[Sprite Atlas 2D PNG 128x128 / 160x160]
```

---

## 2. Diferenciação Tátil de Materiais

Mesmo sem nenhum shader em tempo de execução, cada material é imediatamente identificável pelo olho humano graças ao comportamento óptico intrínseco de seus pixels:

| Material | Rugosidade (Roughness) | Resposta Especular | Difusão | Características Cromáticas |
|---|---|---|---|---|
| **Aço Polido (Steel / Iron)** | Baixa ($0.20$) | Brilho especular agudo ($N \cdot H^{36}$), faixa de reflexo brilhante | Baixa ($0.85$) | Tom de ferro escuro (`#707888`), ápice ciano/branco puro (`#ffffff`) no brilho, rim light azulado. |
| **Couro Curtido (Leather)** | Alta ($0.80$) | Brilho suave e difuso ($N \cdot H^6$) sem pico especular | Alta ($1.05$) | Tons terrosos quentes e sépia (`#553723`), atenuação suave nas bordas. |
| **Tecido / Gambeson (Cloth)** | Máxima ($1.00$) | Especularidade nula ($0.0$) | Plena (Lambertiana) | Micro-sombras nas dobras anatômicas, absorção profunda de luz. |
| **Pedra Entalhada (Granite / Stone)** | Média-Alta com micro-relevo | Especularidade moderada com micro-ruído pontual | Média com stippling | Cinza azulado com estrias de poeira e micro-fraturas de argamassa. |
| **Ouro / Filigrana (Gold Trim)** | Baixa ($0.25$) | Especularidade metálica amarelada intensa ($N \cdot H^{28}$) | Média ($0.90$) | Amarelo dourado imperial (`#cda54b`) com reflexo quente incandescente. |

---

## 3. Coerência nas 8 Direções Anatômicas

O Guerreiro suporta 8 direções de visão isométrica em alta resolução (128x128 por frame):

1. **S (Sul / Frontal, 0°)**:
   - Placa peitoral inteiriça em evidência, simetria dos dois ombreiros (pauldrons), fresta do elmo visível, empunhadura da espada com ambas as manoplas direcionadas para a guarda média.
2. **SE / SW (Sudeste / Sudoeste, 45° e 315°)**:
   - Vista isométrica 3/4 clássica. O ombreiro dianteiro ganha escala por perspectiva; o torso apresenta curvatura evidente com torção do quadril; a espada repousa transversalmente sobre o peito.
3. **E / W (Leste / Oeste - Perfil, 90° e 270°)**:
   - Leitura de volume em silhueta lateral: curvatura dorsal, projeção do peitoral para frente, perna de apoio estendida e lâmina da espada apontando no eixo frontal.
4. **NE / NW (Nordeste / Noroeste - Costas 3/4, 135° e 225°)**:
   - Costas blindadas com placa dorsal central, ombreiro traseiro em destaque e lâmina da espada estendida para trás em posição de prontidão.
5. **N (Norte / Costas Direta, 180°)**:
   - Espaldar reforçado, proteção de nuca do elmo sallet e lâmina apontando diretamente para o fundo da câmara.

A iluminação em todas as 8 direções é **globalmente consistente**: a luz primária sempre incide do quadrante superior-esquerdo, garantindo que o personagem nunca pareça uma colagem desconectada ao girar.
