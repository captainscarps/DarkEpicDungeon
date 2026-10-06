# SISTEMA DE PARTÍCULAS, ILUMINAÇÃO, SOMBRAS E MATERIAIS
## DOCUMENTO 04: PIPELINE DE RENDERIZAÇÃO E FIDELIDADE GRÁFICA

---

### 1. SISTEMA DE ILUMINAÇÃO E AMBIENTAÇÃO SOTURNA

O DepthGate opera em um pipeline 2D com render texture de iluminação (`LightingSystem` / `uh`). Para elevar a atmosfera a Dark Fantasy Premium:

#### A. A Escuridão Ativa (Active Penumbra)
- A escuridão não é um preto transparente liso (`#000000` em 50%).
- Deve ser uma máscara atmosférica com tom azul-petróleo / carvão oxidado (`#100c18` ou `#0a0e14`), simulando a umidade e a densidade mineral das profundezas da terra.
- Gradientes de luz usam curvas não-lineares:
  - **Núcleo Incandescente (Core)**: 0% a 25% do raio (luz quente 100% saturada).
  - **Difusão Média (Midtone)**: 25% a 70% (decaimento suave com revelação de textura do piso).
  - **Zona de Penumbra (Falloff)**: 70% a 100% (gradação suja que se mistura com as sombras do teto e das paredes).

#### B. Tremor e Flutuação de Tocha (Organic Torch Flicker)
- Tochas não pulsam em senoide matemática uniforme (`Math.sin(t)` puro).
- Implementação de ruído orgânico pseudo-aleatório com 3 frequências sobrepostas:
  ```javascript
  const flicker = 1.0 
    + Math.sin(t * 0.007) * 0.04 
    + Math.sin(t * 0.021 + 1.2) * 0.025 
    + (Math.random() - 0.5) * 0.015;
  ```
- Isso replica o crepitar irregular do óleo, gordura e madeira queimando em cavernas úmidas.

---

### 2. SOMBRAS DE CONTATO E PROJEÇÃO (DYNAMIC CONTACT SHADOWS)

- **Sombra de Contato (Ambiente Occlusion de Pés)**:
  - Fica imediatamente sob a sola dos pés dos personagens e inimigos.
  - Sombra densa, escura e compacta que ancora o modelo ao chão.
- **Sombra Direcional Projetada**:
  - Em masmorras iluminadas por tochas pontuais, a sombra deve esticar-se sutilmente na direção oposta à tocha mais próxima.
  - Quando um personagem salta ou faz um ataque aéreo, a sombra permanece no solo, reduz de tamanho e perde opacidade, transmitindo altura tridimensional real.

---

### 3. FÍSICA DE MATERIAIS E RESPOSTA A IMPACTOS

| Material | Resposta ao Golpe Cortante | Resposta ao Golpe Esmagador | Partículas e Decals Gerados |
|---|---|---|---|
| **Carne Viva / Inimigo Orgânico** | Corte profundo com som visceral | Ruptura de tecido e estalo ósseo | **Sangue Direcional**: Jatos carmesim na direção do corte. Gotas caem no chão e formam manchas orgânicas de sangue que escurecem e persistem. |
| **Armadura de Placas / Aço** | Desvio de lâmina com faísca de fricção | Amassamento de metal com eco surdo | **Faíscas Direcionais**: Partículas alaranjadas e brancas com alta velocidade inicial, desaceleração e arco balístico. |
| **Ossos / Esqueletos** | Lascas de marfim e poeira de caliça | Fragmentação completa de costelas/crânio | **Estilhaços de Osso**: Fragmentos angulares opacos cinzentos/bege que ricocheteiam no piso. |
| **Pedra / Paredes de Masmorra** | Faíscas pontuais e risco no tijolo | Lascamento de cascalho e nuvem de poeira | **Poeira Mineral**: Pequenas partículas cinza-ardósia com dissipação suave. |
| **Água / Lama / Poças** | Lâmina corta líquido com respingo plano | Impacto pesado com espirro de gotas | **Respingo Líquido**: Círculos de onda concentrica e micro-gotas opacas. |

---

### 4. MAGIA REALISTA: FIM DO "GLOW ARTIFICIAL"

Magia em Dark Fantasy não é luz de discoteca. Cada escola possui assinatura física:

1. **Magia de Sangue / Corrupção**:
   - Não usa círculos roxos estáticos.
   - Usa filamentos de sangue que se condensam em agulhas, rastro de vapor espesso e coagulação violenta.
2. **Magia Espiritual / Xamânica (Tupã, Jurema, Espíritos)**:
   - Partículas orgânicas: folhas verdes secas que se desintegram em cinzas esmeralda, relâmpagos brancos bifurcados rápidos sem pós-brilho exagerado, sopros de névoa medicinal.
3. **Magia de Fogo / Caos**:
   - Fogo real consome oxigênio: ele gera fumaça espessa cinza-escura, fagulhas que sobem girando e distorção de ar quente (heat wave).
4. **Magia de Gelo / Glacial**:
   - Cristais afiados com reflexos frios azul-claro, geada que se alastra no chão e estilhaços que quebram com som de vidro temperado estalando.
