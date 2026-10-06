# ILUMINAÇÃO CINEMÁTICA E SOMBRAS DINÂMICAS 2D
## DOCUMENTO 04: PIPELINE DE LUZ E SOMBRA, FÍSICA DE FOGO E ATMOSFERA SOTURNA

---

### 1. SISTEMA DE ILUMINAÇÃO DINÂMICA CINEMÁTICA

O DepthGate utiliza um Render Texture de iluminação combinada (`uh.rt`) que aplica uma máscara de escuridão viva sobre a masmorra e recorta fontes de luz dinâmicas:

#### A. A Matemática da Luz Orgânica de Tochas (Triple-Harmonic Noise)
Tochas medievais não tremeluzem em uma senoide suave artificial. O motor do jogo utiliza ruído harmônico de 3 frequências sobrepostas com perturbação estocástica:

$$\text{Flicker}(t) = 1.0 + 0.04 \cdot \sin(0.007 t) + 0.025 \cdot \sin(0.021 t + 1.2) + 0.015 \cdot \sin(0.053 t + 2.8) + \text{random}(-0.008, 0.008)$$

Essa oscilação é aplicada simultaneamente ao **raio da tocha**, à **intensidade luminosa** e à **temperatura de cor**, gerando o efeito inconfundível de uma chama real que consome ar na masmorra.

#### B. Fontes de Luz e Temperaturas de Cor

| Fonte | Raio Base | Temperatura de Cor / Hex | Modo de Tremor | Efeito Ambiental Secundário |
|---|---|---|---|---|
| **Tocha de Parede** | 120px | Âmbar quente (`#ffa03b`) | Orgânico Médio | Emite fagulhas e fumaça escura que sobe verticalmente |
| **Braseiro Real** | 180px | Laranja dourado (`#ff8522`) | Orgânico Forte | Ilumina piso com gradiente amplo e projeta sombras longas |
| **Portal do Abismo** | 160px | Roxo abissal (`#9c42f5`) | Pulso lento hipnótico | Distorção de ar frio e partículas de essência sugadas para o centro |
| **Magma / Lava** | 220px | Carmesim incandescente (`#ff3b14`)| Pulso calmo e denso | Bolhas de vapor, calor ondular e brasas flutuantes |
| **Projétil Mágico** | 60px | Conforme elemento (Gelo/Fogo/Raio)| Sem tremor (constante) | Deixa cauda de cometa e ilumina paredes ao passar raspando |
| **Olhos de Elites** | 35px | Cor do afixo (Vermelho/Dourado/Roxo)| Brilho pulsante | Revela a presença do monstro na escuridão antes do combate |

---

### 2. SISTEMA DE SOMBRAS DINÂMICAS PROJETADAS

Para erradicar sombras estáticas e planos "descolados" do solo:

1. **Sombra de Contato (Ground Contact Shadow)**:
   - Sombra elíptica densa (`alpha: 0.65`, cor `#0a0810`), desenhada imediatamente sob a base dos pés.
   - Fixa o personagem firmemente nas lajotas de pedra da masmorra.
2. **Alongamento Projetado em Relação a Tochas (Light-Relative Shadow Casting)**:
   - O motor calcula a distância e o vetor direcional entre a entidade e a tocha mais próxima:
     $$\vec{V}_{\text{sombra}} = \frac{\text{Pos}_{\text{entidade}} - \text{Pos}_{\text{luz}}}{\|\text{Pos}_{\text{entidade}} - \text{Pos}_{\text{luz}}\|}$$
   - A sombra estica-se longitudinalmente no sentido de $\vec{V}_{\text{sombra}}$, diminuindo de opacidade à medida que a luz se afasta.
3. **Deslocamento Vertical e Saltos (Elevation Detachment)**:
   - Quando um personagem realiza um dash voador, pulo de ataque ou é arremessado, a sombra **permanece no piso Y**, reduz de tamanho e perde opacidade proporcionalmente à elevação, transmitindo altura tridimensional perfeita.

---

### 3. PARTICULADO ATMOSFÉRICO DE PROFUNDEZAS (DUNGEON VOLUMETRICS)

O ar das masmorras do DepthGate agora possui partículas em suspensão:
- **Poeira de Masmorra (Dust Motes)**: Partículas minúsculas de calcário e poeira que flutuam lentamente, visíveis apenas onde os fachos de luz das tochas e candelabros incidem.
- **Cinzas e Brasas Voadoras**: Próximo a lareiras, tochas e forjas, cinzas incandescentes sobem girando em correntes de convecção térmica.
- **Névoa Espiritual Rasteira**: Nos biomas de Catacumbas e Bosque Amazônico, faixas translúcidas de névoa deslizam suavemente pelo piso em profundidade Z = 3.
