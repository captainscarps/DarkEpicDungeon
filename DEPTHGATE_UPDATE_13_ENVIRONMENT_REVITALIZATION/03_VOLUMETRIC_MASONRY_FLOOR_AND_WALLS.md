# DEPTHGATE UPDATE 13 — RELATÓRIO TÉCNICO 03
## ALVENARIA VOLUMÉTRICA: PISO E PAREDES 2.5D

==================================================
1. ENGENHARIA DO PISO (64x64 PIXELS POR TILE)
==================================================

O novo piso abandona a resolução 32x32 para adotar lajes de 64x64 geradas com iluminação direcional intrínseca e resposta a materiais foscos/ásperos. Foram sintetizadas 6 variantes principais (`assets/revitalization/environment/floor-tiles.png`):

1. **Variante 0 (Lajes Duplas Cinzeladas):**
   - Duas grandes lajes retangulares separadas por junta de argamassa profunda.
   - Chanfro de 2.5D: aresta superior-esquerda iluminada (+24 RGB), aresta inferior-direita escurecida (-20 RGB).
2. **Variante 1 (Laje Rachada por Impacto):**
   - Fissura diagonal ramificada cortando a pedra central, simulando danos de combate ou tempo milenar.
   - Microfissuras com detritos escurecidos no fundo.
3. **Variante 2 (Quad Flagstones / Pavimento Intercalado):**
   - Quatro blocos menores com desvios tonais sutis entre basalto, ardósia e granito antigo.
   - Cantos levemente arredondados por erosão e atrito de passos.
4. **Variante 3 (Laje com Inscrição e Glifos Antigos):**
   - Desenho circular gravado no centro, adicionando lore e quebra de repetição visual ao cenário.
5. **Variante 4 (Laje Úmida com Poça e Especular):**
   - Depressão central escurecida simulando umidade acumulada na pedra, com brilho especular de reflexo no contorno.
6. **Variante 5 (Laje com Escombros e Musgo de Canto):**
   - Acúmulo de fragmentos de pedra e manchas orgânicas escuras na junta inferior.

Distribuição no Cenário:
- O layout utiliza uma distribuição determinística baseada em ruído harmônico que elimina completamente o efeito de "tabuleiro de xadrez" ou repetição em mosaico.

==================================================
2. PAREDES ARQUITETÔNICAS VOLUMÉTRICAS (64x96 PIXELS)
==================================================

As paredes (`assets/revitalization/environment/wall-tiles.png`) foram estruturadas em três zonas verticais:

1. **Cornija Superior (y: 0..20):**
   - Superfície horizontal visível que recebe luz ambiente do teto (+36 RGB).
   - Moldura frontal que projeta sombra suave sobre a cantaria inferior.
2. **Cursos de Cantaria de Pedra (y: 20..88):**
   - Três fiadas horizontais de blocos de pedra aparelhada (Ashlar).
   - Juntas verticais desencontradas (staggered joints).
   - Relevo volumétrico individual: cada bloco possui um deslocamento de profundidade intrínseco (alguns blocos sobressaem 2 a 3 pixels, gerando auto-sombreamento).
3. **Nicho de Tocha Escavado (Variante 2):**
   - Abertura arqueada em baixo-relevo na própria alvenaria, desenhada para acomodar arandelas e tochas de ferro.
4. **Base e Contato com o Chão (y: 88..96):**
   - Oclusão de contato ambiental (AO) gradiente, ancorando a parede firmemente ao piso.

==================================================
3. PILARES E ESTRUTURAS CILÍNDRICAS (64x160 PIXELS)
==================================================

O pilar de masmorra (`assets/revitalization/environment/pillar-volumetric.png`):
- **Capitel:** Ábaco e equino esculpidos com iluminação de topo.
- **Fuste:** Seção cilíndrica/octogonal com curvatura contínua calculada por normais $N_x, N_z$.
  - Lado esquerdo recebe o brilho difuso da tocha.
  - Lado direito decai em sombra profunda de oclusão.
  - Ranhuras de cantaria a cada 20 pixels de altura.
- **Base Escalonada:** Plinto quadrado com transição para base octogonal e sombra de contato elíptica no chão.
