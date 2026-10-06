# DEPTHGATE VISUAL DNA: DIRETRIZ MASTER DE ARTE E DESIGN VISUAL
## DOCUMENTO 01: VISUAL DNA, ANATOMIA DE CLASSES E PADRÕES VISUAIS

---

### 1. MANIFESTO ESTÉTICO: PREMIUM REALISTIC DARK FANTASY PIXEL ART

O DepthGate rejeita qualquer convenção de pixel art cartunizada, infantil, chibi ou de traço casual. A identidade visual do projeto é fundamentada na tradição da gravura renascentista, no chiaroscuro barroco e na literatura clássica de fantasia sombria e horror cósmico.

#### Leis Inegociáveis do Visual DNA:
1. **Gravidade e Rigor Anatômico**:
   - Proporção heroica realista: relação cabeça-corpo de **1:6.5 a 1:7.2**.
   - Toda postura é ancorada na física newtoniana: o peso do equipamento afeta a coluna, os joelhos e o equilíbrio.
2. **Chiaroscuro & Iluminação Dramática**:
   - As sombras são ricas, profundas e ativas (tons de carvão mineral, azul-ardósia e betume).
   - A luz não é meramente decorativa: ela expõe volumes, destaca ranhuras no aço e gera contrastes cortantes.
3. **Desgaste e Verossimilhança dos Materiais**:
   - Todo objeto tem história: armaduras possuem marcas de corte e amassados; mantos possuem barras desfiadas e manchas de lama; couro apresenta rachaduras pelo tempo.
4. **Paleta Contida e Harmônica (Regra 70 / 25 / 5)**:
   - 70% Tons Primários Soturnos (aço fosco, cinza rochoso, couro cru, linho desbotado).
   - 25% Cores de Identidade da Classe/Bioma (tons terrosos, carmesim oxidado, esmeralda musgo).
   - 5% Destaques Especulares Críticos (fio da lâmina, brasas incandescentes, runas ativas).

---

### 2. ANATOMIA E LINGUAGEM CORPORAL POR CLASSE

Cada uma das classes possui uma assinatura corporal única que reflete seu treinamento, sua classe social e o peso do seu armamento:

```
[GUERREIRO (Draven)]
• Postura: Base aberta e sólida (largura dos ombros). Joelhos levemente destravados.
• Centro de Massa: Rebaixado e centralizado.
• Movimento: Passadas pesadas, sem salto vertical supérfluo. Tronco rígido protegendo o peito com o escudo.
• Idle: Respiração funda e cadenciada. A espada descansa apontada diagonalmente para baixo.

[SAMURAI / BERSERKER (Akihiro)]
• Postura: Tensão concentrada. Pés em linha dinâmica de avanço (Iaijutsu stance).
• Centro de Massa: Ligeiramente inclinado sobre a perna dianteira.
• Movimento: Deslocamento rente ao solo (sem oscilação de cabeça). Movimentos econômicos e letais.
• Ataque: O saque da katana é explosivo; o corte é seguido de uma pausa estática de contenção antes do embainhar.

[ARQUEIRO (Vaelen)]
• Postura: Lateralizada e esguia. Coluna ereta, ombros nivelados.
• Centro de Massa: Flexível e ágil, pronto para pivô imediato em 360°.
• Movimento: Passadas leves de ponta de pé. Quase nenhum atrito sonoro com o piso.
• Ataque: Tensão visível na musculatura dorsal e no braço de corda. O peito expande na mira.

[MAGO (Arthelia)]
• Postura: Elevada e altiva. Mãos suspensas em canalização perpétua.
• Centro de Massa: Elevado. Movimentação fluida, com o manto absorvendo as passadas.
• Ataque: Canalização ritual. Não atira "lasers": o cajado serve como para-raios de forças caóticas que sacodem o corpo.

[LADINA / ASSASSINA (Seris)]
• Postura: Agachada e compacta. Silhueta pontiaguda e furtiva.
• Centro de Massa: Muito próximo ao solo.
• Movimento: Avanços súbitos em zigue-zague. As adagas são empunhadas em pegada invertida, rentes aos antebraços.

[XAMÃ (Araí)]
• Postura: Feral e conectada à terra. Pés descalços com tração direta no solo.
• Centro de Massa: Dinâmico e telúrico.
• Movimento: Movimenta-se com a agilidade de uma felina da floresta.
• Arma: A Espada Xamânica golpeia em arcos ancestrais e o arco dispara flechas de curare com precisão mortal.

[DRUIDA / PALADINO (Tharion)]
• Postura: Robusta e colossal. Ombros largos de guardião da floresta.
• Movimento: Marcha vigorosa como o caminhar de um urso antigo.

[NECROMANTE (Valthor)]
• Postura: Curvada e cadavérica. Ombros projetados à frente, cabeça inclinada.
• Movimento: Passadas arrastadas e silenciosas. As mãos movem-se como se manipulassem marionetes invisíveis.

[CAÇADOR (Kael)]
• Postura: Vigilante e predatória.
• Movimento: Sincronizado com seu lobo de caça, sempre procurando terreno elevado e linhas de visão limpas.
```

---

### 3. SILHUETAS, CONTRASTES E VALUE TESTS

1. **Teste da Silhueta Preta (Silhouette Readability)**:
   - Se o sprite for preenchido com 100% de preto, a classe, a arma empunhada e a postura devem ser instantaneamente reconhecíveis a 3 metros de distância.
2. **Teste de Valor (Grayscale Value Separation)**:
   - Em escala de cinza, o contraste entre a cabeça, a arma e o torso deve ser de no mínimo 30% de diferença de valor tonal para garantir leitura perfeita em salas escuras.
3. **Eliminação do Outline Preto Puro**:
   - Substituição de contornos pretos (`#000000`) por contornos de oclusão de cor (*colored ambient occlusion outlines*), integrando o personagem à iluminação da cena.
