# Capitão Scarpa (classe PIRATE): sprites animados

Fonte: `scripts/source/capitao-scarpa-folha-v2.png` (todas as poses de lado e o sabre sempre na mesma mão).

Cada animação fica em um PNG próprio. É uma tira horizontal de células de **128×128**, com fundo transparente (alfa real, só 0 ou 255). Os pés ficam na linha **y = 123** de cada célula. Todas as linhas usam a **mesma escala**: o personagem em pé mede cerca de 98 px na textura, e o jogo o desenha com escala **0.5** (`hiRes`), praticamente 1:1 na tela e do mesmo tamanho dos outros heróis.

| Arquivo | Quadros | Tamanho | Velocidade | Repete |
|---|---|---|---|---|
| `pirate_idle.png` | 8 | 1024×128 | 6 fps | sim |
| `pirate_walk.png` | 8 | 1024×128 | 10 fps | sim |
| `pirate_run.png` | 7 | 896×128 | 12 fps | sim |
| `pirate_attack.png` | 9 | 1152×128 | pelo tempo da arma (680 ms) | não |
| `pirate_death.png` | 8 | 1024×128 | 9 fps | não, fica no último |

O `pirate_config.json` traz os mesmos dados em formato de máquina: quadros, fps, de qual quadro da folha veio cada um e o mapa de estados.

## Como o jogo usa

O jogo não cria um sistema novo de animação. Ele usa o mesmo formato "pack" dos outros heróis:

- `scripts/build_pirate_sprites.py` gera as tiras acima e as junta na folha que o jogo carrega, `assets/pixel-art/characters/pirate-hd7-body.png` (40 células) com `pirate-hd7.json`. No JSON ficam o mapa de estados e as velocidades (`fps`).
- **Parado, andando e correndo** viram animações em loop (`mk4b-pirate-idle`, `-walk`, `-run`). Para ele correr, o direcional precisa estar inclinado acima de 62%, a mesma regra do jogo para todos os heróis. No teclado ele sempre corre.
- **Ataque:** a imagem acompanha as fases da arma, e o dano sai no fim da preparação, no tempo do jogo:
  - preparação (320 ms): quadros 0 (postura), 1 (prepara) e 2 (recua o sabre);
  - golpe (120 ms): quadros 3 (avança) e 4 (golpe amplo);
  - recuperação (240 ms): quadros 5 (extensão), 6 (continuação), 7 e 8 (volta à postura).

  O ataque não reinicia a cada atualização e, ao terminar, volta ao estado atual (parado, andando ou correndo).
- **Morte:** tem prioridade sobre tudo. Toca os 8 quadros uma vez e fica no último até o jogo remover o corpo.
- **Habilidades** usam quadros destas tiras. A Fúria Pirata usa a postura do ataque, um quadro de corrida para o salto e o golpe para baixo (ataque 6).
- Virar para a esquerda espelha o sprite, como em todos os heróis do jogo.

## Para corrigir ou trocar um quadro

1. Edite a folha de origem, ou troque a origem na tabela `ANIMS` do script.
2. Rode `python scripts/build_pirate_sprites.py`.
3. Se mudar a folha do jogo, troque o nome (`KEY` no script e o `"hd7"` no `scripts/patch_pirate_class.py`). Sem isso, o cache offline do navegador continua mostrando a versão antiga.

## Andando e correndo

Usam os próprios quadros da folha, na ordem em que foram desenhados (ANDANDO 0–7, CORRENDO 0–6). Os quadros são alinhados pelo quadril e mantêm o sobe-e-desce natural da corrida. A folha v2 tem sempre a mesma perna à frente; para um passo com as pernas alternando, essas duas linhas precisariam ser redesenhadas.
