# DEPTHGATE — REESTRUTURAÇÃO DO MODO INFINITO (ENDLESS OVERHAUL)

Esta pasta contém os novos artefatos e referências visuais da entrega:
"DEPTHGATE — REESTRUTURAÇÃO DO MODO INFINITO: WFC + Dungeon Procedural + Estratégia + Coop Local + Mouse/Teclado + Controle + Dupla de Bosses + Ranking".

## Conteúdo Visual e Benchmarks
- `benchmarks/screenshot_coop_gameplay.png`: Validação do Modo Coop Local no Modo Infinito (Jogador 1 com mouse/teclado + Jogador 2 com Gamepad, indicador P2, câmera dinâmica compartilhada).
- `benchmarks/screenshot_hof_coop.png`: Validação do Hall da Fama com abas separadas de ranking (SOLO vs CO-OP LOCAL).
- `benchmarks/screenshot_mainmenu_endless.png`: Menu de seleção de Modo Infinito com opções explícitas `★ INICIAR SOLO` e `★ INICIAR CO-OP LOCAL (2P)`.
- `benchmarks/catacombs.png`, `ruins.png`, `fortress.png`, `glacial.png`: Benchmarks visuais de coerência espacial e iluminação nos biomas.

## Pilares Implementados no Bundle
1. **Adventure Graph & WFC Procedural Generation**:
   - Geração não linear ramificada com balanceamento estrito de salas Estratégicas/Seguras (`PUZZLE`, `MECHANISM`, `REST`, `MERCHANT`, `TREASURE`) e de Perigo/Combate (`COMBAT`, `ELITE`, `CHALLENGE`, `EVENT`, `BOSS`).
   - Gerador de Puzzles Procedurais: enigmas de alavancas com código de runas, placas de pressão balanceadas e pilares arcanos.
   - Dungeon Validator: zero softlocks, garantia de conectividade e caminho livre entre início e saída.

2. **Coop Local para 2 Jogadores (Exclusivo do Modo Infinito)**:
   - Jogador 1: Mouse + Teclado (WASD/Setas + Mira livre do cursor do mouse + Clique esquerdo de ataque).
   - Jogador 2: Gamepad/Controle (Analógico/D-Pad + Botões de Ataque/Habilidade + Mira com analógico direito).
   - Separação completa de HP, XP, status e cooldowns entre jogadores.
   - Câmera dinâmica compartilhada: interpolação suave (lerp 0.08) entre os dois personagens com zoom responsivo dinâmico (0.78x a 1.20x) baseado na separação espacial.
   - Sistema de Downed & Revive: quando um jogador chega a 0 HP, entra em estado caído; o companheiro pode ressuscitá-lo permanecendo próximo por 2.2s com 40% de HP restaurado.

3. **Dupla de Bosses Simultâneos no Modo Coop**:
   - Arenas de Boss ampliadas para coop (mínimo 24x18 até 28x22 tiles).
   - Gerador de encontros pareia dois bosses com arquétipos complementares (Tank Melee + Ranged Burst, Controle de Área + Chamas/Gelo).
   - Vida balanceada individualmente em 65% de cada boss para combate tático equilibrado.
   - Efeito de fúria/enrage ao derrotar o primeiro boss (+25% velocidade/ataque) e drop duplo de recompensas.

4. **Separação Estrita de Rankings (Solo vs Coop)**:
   - Chave Solo: `dungeon-crawler:endless-ranking` (e ranking online).
   - Chave Coop: `dungeon-crawler:endless-coop-ranking` (registrando Nomes dos Jogadores, Classes, Profundidade, Score e Seed).
   - Interface do Hall da Fama com abas dedicadas e alternância instantânea.

5. **Scroll & Navegação nos Modais de Detalhes**:
   - Container com máscara geométrica vertical de recorte.
   - Suporte a arraste touch com momentum/inércia, navegação por D-pad/analógico do Gamepad, setas do teclado e roda do mouse.

6. **Preservação Absoluta dos Demais Modos**:
   - Modo Campanha (Solo) e Modo Travessia permanecem 100% preservados, sem interferência, mantendo saves, regras, história e balanceamento originais intactos.
