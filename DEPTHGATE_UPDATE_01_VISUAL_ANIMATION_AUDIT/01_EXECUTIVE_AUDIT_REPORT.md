# AUDITORIA TÉCNICA E DIRETRIZ VISUAL: DEPTHGATE
## DOCUMENTO 01: AUDITORIA GERAL DO ESTADO VISUAL ATUAL & VISÃO "PREMIUM REALISTIC DARK FANTASY PIXEL ART"

---

### 1. INTRODUÇÃO E ESCOPO DA AUDITORIA

O DepthGate é um RPG de ação e dungeon crawler 2D em visão top-down / isométrica sutil, construído sobre o ecossistema Phaser 4 (WebGL/Canvas) com bundler Vite.
Esta auditoria avaliou minuciosamente todos os 27 pilares visuais e mecânicos do projeto:
1. Personagens
2. Sprites
3. Resolução dos Sprites
4. Proporções Anatômicas
5. Equipamentos
6. Armas
7. Animações
8. Direção dos Personagens
9. Ataques
10. Movimentação das Armas
11. Hit Reactions (Reações de Impacto)
12. Morte e Decomposição
13. Habilidades
14. Magia e Ocultismo
15. Partículas
16. Iluminação Dinâmica
17. Sombras de Contato e Projeção
18. Inimigos
19. Inimigos Elites e Afixos
20. Chefes (Bosses)
21. Ambientes e Biomas
22. Profundidade Visual e Parallax
23. Texturização de Materiais
24. Paleta de Cores e Gradação
25. Contraste e Chiaroscuro
26. Legibilidade em Combate
27. Desempenho e Orçamento de Renderização

---

### 2. DIAGNÓSTICO DO ESTADO ATUAL (O QUE ERA GENÉRICO)

| Pilar | Estado Anterior | Problema Identificado | Risco Visual |
|---|---|---|---|
| **Ataque Corpo a Corpo** | Gráfico vetorial `arcSlash` estático + sprite `slash` aditivo básico | Sensação de "arma girando em um pivô" sem transferência de inércia | Parecia jogo em Flash antigo |
| **Impacto (Hit Reaction)** | Flash branco básico + shake de câmera + 5 partículas quadradas | Falta de deformação orgânica, corte sem mordida física | Inimigos pareciam blocos de madeira flutuando |
| **Morte de Inimigos** | Sprite de morte toca e dá tween de `alpha: 0` até sumir | Inimigos evaporavam do chão sem deixar sangue, cinzas ou restos | Quebra total de imersão Dark Fantasy |
| **Magia e Feitiços** | Círculos luminosos (sprites `light` aditivos com `setTint`) | Magia parecia "luz de neon" ou laser sci-fi, sem peso ritualístico | Visual infantilizado e genérico |
| **Dash / Evasão** | Deslocamento de velocidade linear puro sem rastro | Parecia teleporte instantâneo ou deslize de patins | Falta de peso atlético e dinamismo |
| **Sombras** | Elipse estática preta com opacidade fixa | Não acompanhava a elevação de pulo, nem a intensidade da tocha | Personagens pareciam descolados do chão |
| **Atmosfera de Masmorra** | Apenas tochas com fumaça pontual | Ar estático sem partículas de poeira cósmica, névoa rasteira ou cinzas | Cenário parecia estático |

---

### 3. A NOVA DIRETRIZ: "PREMIUM REALISTIC DARK FANTASY PIXEL ART"

A nova identidade visual do DepthGate exige o rompimento definitivo com convenções casuais de pixel art arcade. O jogo passa a seguir os cânones da fantasia sombria realista (inspirada em *Dark Souls*, *Blasphemous*, *Diablo II Resurrected*, *Bloodborne* e arte clássica de gravura barroca/renascentista).

#### Princípios Fundamentais:
1. **Gravidade e Inércia Absoluta**:
   - Todo golpe tem massa. O guerreiro não balança a espada; ele lança o peso da lâmina e seu corpo precisa compensar o centro de massa.
   - O impacto desacelera a lâmina bruscamente (Hit-Stop cinético e resistência de impacto).
2. **Chiaroscuro & Iluminação Atmosférica Suja**:
   - A escuridão não é preta lisa; é uma densa penumbra azulada/carvão que engole os cantos da sala.
   - As fontes de luz (tochas, runas, fogo fátuo) projetam calor âmbar sujo e destacam superfícies metálicas e líquidas com especularidade aguda.
3. **Organicidade e Visceralidade dos Materiais**:
   - Aço reflete com brilho cortante e faíscas direcionais de atrito.
   - Sangue tem viscosidade, é projetado no sentido do golpe e deixa poças escuras no chão de pedra que coagulam.
   - Madeira racha e solta lascas opacas, não partículas luminosas.
   - Magia é uma quebra violenta da física: atrai poeira do chão antes de detonar, deforma o espaço e deixa cinzas fumegantes.
4. **Legibilidade Tática sem Poluição Neon**:
   - Efeitos de combate usam cores ricas, porém ancoradas (sangue carmesim escuro, fogo dourado/cobre, magia etérea verde-oliva e roxo abissal), evitando poluição visual de arco-íris saturado.
