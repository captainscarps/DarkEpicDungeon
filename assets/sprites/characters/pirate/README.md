# Capitão Scarpa (classe PIRATE): sprites animados

Cada animação fica em um PNG próprio. É uma tira horizontal de células de **128×128**, com fundo transparente (alfa real, só 0 ou 255). Os pés ficam na linha **y = 123** de cada célula. O jogo desenha o personagem com escala **0.5** (`hiRes`), então ele aparece praticamente 1:1 na tela, do mesmo tamanho dos outros heróis.

| Arquivo | Quadros | Tamanho | fps | Repete | Origem (folha enviada) |
|---|---|---|---|---|---|
| `pirate_idle.png` | 6 | 768×128 | 5 | sim | PARADO 0, 1, 2, 3, 4, 9 |
| `pirate_walk.png` | 7 | 896×128 | 10 | sim | ANDANDO 0–6 |
| `pirate_run.png` | 6 | 768×128 | 14 | sim | CORRENDO 0–5 |
| `pirate_attack.png` | 4 | 512×128 | pelo tempo da arma | não | ATACANDO 0, 1, 3, 2 |
| `pirate_death.png` | 9 | 1152×128 | 9 | não, fica no último | MORRENDO 0–8 |
| `pirate_extra.png` | 5 | 640×128 | — | — | poses de apoio: PARADO 6, 7 (variação), 8 (de costas), ATACANDO 5 (soco), 9 (postura) |

O `pirate_config.json` traz os mesmos dados em formato de máquina: quadros, fps, de qual quadro da folha veio cada um e o mapa de estados.

## Como o jogo usa

O jogo não cria um sistema novo de animação. Ele usa o mesmo formato "pack" dos outros heróis:

- `scripts/build_pirate_sprites.py` gera as tiras acima e as junta na folha que o jogo carrega, `assets/pixel-art/characters/pirate-hd3-body.png` (37 células) com `pirate-hd3.json`. No JSON ficam o mapa de estados e as velocidades (`fps`).
- **Parado, andando e correndo** viram animações em loop (`mk4b-pirate-idle`, `-walk`, `-run`). Para ele correr, o direcional precisa estar inclinado acima de 62%, a mesma regra do jogo para todos os heróis. No teclado ele sempre corre.
- **Ataque:** a imagem acompanha as fases da arma. A preparação usa os quadros 0 e 1, o golpe usa o 2 e a recuperação usa o 3 e a postura. O dano continua saindo no tempo do jogo, não no quadro. O ataque não reinicia a cada atualização e, ao terminar, volta ao estado atual (parado, andando ou correndo).
- **Morte:** tem prioridade sobre tudo. Toca os 9 quadros uma vez e fica no último até o jogo remover o corpo.
- Virar para a esquerda espelha o sprite, como em todos os heróis do jogo.

## Para corrigir ou trocar um quadro

1. Edite o PNG da animação aqui, mantendo células de 128×128 e os pés em y = 123. Ou troque a origem na tabela `ANIMS` do script.
2. Rode `python scripts/build_pirate_sprites.py`.
3. Se mudar a folha do jogo, troque o nome (`KEY = "pirate-hd3"` no script e `"hd3"` no `scripts/patch_pirate_class.py`). Sem isso, o cache offline do navegador continua mostrando a versão antiga.

## Limitações da arte de origem

- **Ataque:** a folha só tem 3 desenhos do sabre visto de lado (ATACANDO 1, 2 e 3). Os outros estão de costas ou sem o sabre. Por isso o golpe tem 4 imagens próprias, e não 8 a 10.
- **Andando e correndo:** 7 e 6 quadros de lado. O resto da linha está de costas ou em três-quartos.
- **Parado:** a folha não mostra o sabre na mão. Ele só aparece durante o ataque.
- **Quadros novos:** gerar quadros intermediários (por exemplo, um ataque com 10 imagens) exige desenho manual de pixel art. Misturar ou distorcer quadros existentes deforma o personagem. Para animações mais longas, basta acrescentar os desenhos novos na folha de origem e listar os índices em `ANIMS`.
