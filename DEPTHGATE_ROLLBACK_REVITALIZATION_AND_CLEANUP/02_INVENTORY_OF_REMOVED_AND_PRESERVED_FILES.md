# DEPTHGATE — ROLLBACK & PROJECT CLEANUP
## RELATÓRIO TÉCNICO 02: INVENTÁRIO DE ARQUIVOS REMOVIDOS E PRESERVADOS

==================================================
1. ARQUIVOS DA REVITALIZAÇÃO E BENCHMARK REMOVIDOS
==================================================

Os seguintes arquivos e diretórios pertenciam exclusivamente às linhas de teste e benchmark dos Updates 11, 12 e 13, tendo sua não utilização pela produção comprovada por análise de referências e código:

1. **Laboratórios HTML:**
   - `revitalizacao.html` (Laboratório de testes de revitalização e ambiente 2.5D) — REMOVIDO.
   - `benchmark-2.5d.html` (Laboratório do benchmark 2.5D volumétrico) — REMOVIDO.

2. **Assets Experimentais:**
   - `assets/revitalization/` (Diretório completo contendo `environment/`, `dir_a/`, `dir_b/`, `dir_c/` e `shared/`) — REMOVIDO.
   - `assets/benchmark/` (`dungeon-pillar.png`, `dungeon-tiles.png`, `enemy-revenant.png`, `magic-orb.png`, `warrior-8dir.png`, `warrior-attack.png`) — REMOVIDO.

3. **Scripts Geradores Internos:**
   - `scripts/generate_environment_assets.js` — REMOVIDO.
   - `scripts/patch_visual_prototype.js` — REMOVIDO.
   - `scripts/generate_volumetric_benchmark_assets.js` — REMOVIDO.
   - `scripts/generate_revitalization_assets.js` — REMOVIDO.

4. **Interface e Código:**
   - Botão flutuante `#bm-btn` em `index.html` — REMOVIDO.
   - Estilos CSS relacionados ao `#bm-btn` em `index.html` — REMOVIDOS.
   - Botão `★ REVITALIZAÇÃO` / `★ 2.5D BENCHMARK` no menu principal da engine — REMOVIDO.
   - Código experimental na cena `VisualPrototype` — RESTAURADO ao estado original.

==================================================
2. ARQUIVOS PRESERVADOS (REGRA DE CONSERVADORISMO)
==================================================

Conforme a Regra de Conservadorismo (Seção 12 das instruções do usuário: *"Se houver dúvida: NÃO REMOVER"*), os seguintes arquivos com funções potenciais, utilitários ou histórico do projeto foram cuidadosamente preservados:

1. **Ferramentas e Visualizadores Utilitários:**
   - `visualizador-amazona.html` (Ferramenta de visualização da classe Amazona criada em 05/10/2026).
   - `teste-gamepad.html` (Utilitário para teste de controles/gamepads físicos via Gamepad API).
2. **Scripts e Inicializadores do Sistema:**
   - `server.cjs` (Servidor local HTTP de desenvolvimento sem dependências externas).
   - `INICIAR-JOGO.bat` (Script batch para inicialização rápida do servidor e abertura de navegador pelo usuário).
3. **Documentação e Banco de Dados:**
   - `COMO-ATIVAR-RANKING-ONLINE.txt` (Guia de configuração do Supabase para ranking online).
   - `LEIA-ME.txt` (Documentação do projeto).
   - `supabase-ranking.sql` (Schema SQL da tabela e RPCs de pontuação do ranking online).
4. **Assets e Pacotes:**
   - `lobo_xamã.zip` (Arquivo de pacote de assets do Lobo Xamã).
   - `gerar_sprites_folhas.py` e `gerar_sprites_indigena.py` (Scripts de criação da classe indígena/amazona).
   - `ControlsPanel-BS_vNIt7.js` e `index-BuHMpiU1.js` (Artefatos de build legados no repositório DarkEpicDungeon).
   - Pastas de documentação dos updates anteriores (`DEPTHGATE_UPDATE_01_...` a `DEPTHGATE_UPDATE_13_...`) mantidas exclusivamente para histórico técnico do repositório, sem qualquer carregamento na aplicação.
