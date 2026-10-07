# DEPTHGATE UPDATE 13 — RELATÓRIO TÉCNICO 02
## NOVA ESTRATÉGIA: PERSONAGENS CONGELADOS & FOCO TOTAL NO CENÁRIO

==================================================
1. MUDANÇA DE PARADIGMA
==================================================

Nas iterações anteriores, tentou-se elevar a percepção visual do jogo modificando a anatomia, o tamanho e o estilo dos sprites de personagens. No entanto, alterar os personagens gera um descolamento com a identidade estabelecida do DepthGate e com os sistemas de combate já balanceados.

O princípio fundacional do **Update 13** baseia-se na constatação de arte técnica:
> *"Um personagem parece muito melhor simplesmente por estar inserido em um ambiente visualmente superior, coerente, volumétrico e imersivo."*

==================================================
2. PERSONAGENS COMO REFERÊNCIA FIXA
==================================================

O sprite do guerreiro do DepthGate (`assets/benchmark/warrior-8dir.png` e `warrior-attack.png`, bem como os sprites de produção `warrior-mk4-body.png`) foi congelado e serve como benchmark visual fixo:
- Proporções anatômicas: PRESERVADAS.
- Animações de caminhada e ataque: PRESERVADAS.
- Armaduras e equipamentos: PRESERVADOS.
- Inimigos e chefes: PRESERVADOS.

==================================================
3. CONCEITO DE "LOCAL CONSTRUÍDO" VS "GRID DE TILES"
==================================================

A maior falha visual do cenário de masmorra 2D clássico é a repetição mecânica de blocos quadrados de 32x32 pixels, criando a sensação de um tabuleiro ou mosaico sintético.

Para superar isso, o novo ambiente é concebido como uma **estrutura arquitetônica monolítica**:
1. **Lajes e Pavers com Ritmo Natural:** Ladrilhos com proporções variadas, juntas de argamassa cinzeladas e variações tonais que quebram o padrão de grade.
2. **Paredes com Altura e Relevo:** Blocos de cantaria de diferentes profundidades e quinas aparentes, exibindo topo de cornija em ângulo diagonal ($30^\circ$).
3. **Mobiliário e Adereços Integrados:** Barris com veios de carvalho escurecido e aros de ferro, caixotes com reforço metálico, correntes penduradas e detritos de ossadas ancorados no chão com oclusão de contato real.
