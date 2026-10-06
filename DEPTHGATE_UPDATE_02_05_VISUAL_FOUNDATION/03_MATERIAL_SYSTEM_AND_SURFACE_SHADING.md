# SISTEMA DE MATERIAIS E TEXTURIZAÇÃO DE SUPERFÍCIES
## DOCUMENTO 03: TABELA DE MATERIAIS, RESPOSTA FÍSICA E SOMBREADO ESPECULAR

---

### 1. DEFINIÇÃO E COMPORTAMENTO DOS 15 MATERIAIS DARK FANTASY

Para que os sprites não pareçam blocos homogêneos de cor, cada material no DepthGate possui propriedades físicas, óticas e de resposta ao impacto:

| Material | Brilho / Especularidade | Textura & Desgaste | Cor das Faíscas / Resíduos | Resposta de Áudio e Impacto |
|---|---|---|---|---|
| **Aço Forjado (Steel)** | Alta especularidade (fio prateado 100%) | Lâmina polida com pequenos riscos de combate | Faíscas branco-azuladas (`#e8f4f8`) com alta velocidade balística | Som cortante metálico afiado (`sfx-weapon-sword`) |
| **Ferro Fundido (Cast Iron)** | Baixa especularidade, acabamento mate | Superfície áspera, porosa e oxidada em bordas | Faíscas âmbar-avermelhadas (`#d86c28`) com menor alcance | Som oco e pesado de sino ou bigorna |
| **Couro Curtido (Leather)** | Brilho suave e difuso em bordas arredondadas | Marcas de atrito, manchas de graxa e dobras escuras | Fibras secas minúsculas e poeira | Som surdo de couro estalando sob impacto |
| **Tecido & Linho (Cloth)** | Sem especularidade (fosco absoluto) | Tramas visíveis em escala de pixel, bainha desfiada | Fiapos soltos sem luminosidade | Som abafado de pano rasgando |
| **Carne Viva / Músculo** | Brilho úmido nas áreas expostas | Gradiente denso carmesim com tons pretos de necrose | Gotas viscosas de sangue carmesim profundo (`#5a0004`) | Som úmido e visceral de laceração |
| **Cabelo & Peles (Hair/Fur)** | Brilho sedoso ao longo da curvatura | Mechas agrupadas em volumes definidos | Pelos e fios soltos que flutuam brevemente | Sem som metálico; som de ar e atrito leve |
| **Osso & Marfim (Bone)** | Brilho ceroso suave e seco | Rachaduras marrons/negras nas junções | Lascas e estilhaços pontiagudos de marfim seco | Som estalado e seco de galho quebrando |
| **Madeira Ancestral (Wood)** | Fosco com reflexos terrosos nas fibras | Anéis de crescimento e nós escuros nas tábuas | Lascas angulares castanhas que caem no piso | Som oco e seco de madeira batendo |
| **Pedra / Ardósia (Stone)** | Áspero, opaco com micro-grânulos | Limo nos cantos, fendas com sombras densas | Grânulos minerais cinzentos e poeira de caliça | Som seco e estalado de pedrisco |
| **Cristal Arcano (Crystal)** | Refração translúcida com brilho prismático | Facetas geométricas cortadas com precisão | Estilhaços luminosos translúcidos de vidro | Som cristalino agudo de sino mágico |
| **Vidro Mágico (Alchemical Glass)**| Alta reflexão transparente | Frascos com líquido borbulhante e reflexos brancos | Cacos translúcidos brilhantes que se dissolvem | Som agudo de vidro fino quebrando |
| **Água Pantanosa (Water/Mud)** | Reflexão espelhada escura em poças | Ondas concêntricas e lodo subaquático | Respingos escuros com gotículas redondas | Som líquido denso de chapinhada |
| **Gelo Glacial (Ice)** | Superfície vitrificada fria | Fissuras internas azuis-claras e geada fosca | Cristais de gelo estilhaçados com névoa branca | Som cortante de geleira partindo |
| **Lava / Magma (Molten Lava)** | Emissivo incandescente (auto-iluminado) | Crosta de pedra negra flutuando sobre ouro derretido | Fagulhas e brasas que sobem rodopiando no ar | Som grave de borbulha quente e crepitação |
| **Energia Oculta / Sangue Ritual** | Especularidade fluida e pulsante | Anéis de condensação e névoa gravitacional | Filamentos e runas etéreas que implodem | Som espectral de vácuo puxando ar e choque |

---

### 2. SISTEMA DE DECALS E MARCAS DE MUNDO (ENVIRONMENTAL DECALS)

O realismo visual exige que o mundo responda ao combate através de marcas que persistem no cenário:
1. **Poças de Sangue (Blood Pools)**:
   - Formadas pela expansão de um círculo irregular (`fillEllipse`) sob corpos mortos e golpes críticos.
   - Cor: `#280204` com transparência suave (65% alpha).
   - Duração: 6.5 segundos antes de coagular e secar no piso.
2. **Marcas de Queimadura (Scorch Decals)**:
   - Quando magias de fogo ou explosões ocorrem no chão, geram uma mancha preta de carvão que protege o piso e simula cinzas quentes.
3. **Escarcha de Gelo (Frost Decals)**:
   - Quando inimigos de gelo morrem ou magias glaciais detonam, criam cristais temporários no piso que evaporam em 4 segundos.
