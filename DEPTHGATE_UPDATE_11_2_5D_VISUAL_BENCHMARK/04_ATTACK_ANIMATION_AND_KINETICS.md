# DepthGate Visual Rebirth: Passo 11 — 2.5D Volumetric Benchmark
## Animação de Ataque em 8 Frames & Cinética de Armas
**Versão**: 2.5.0  
**Motor**: Phaser 4.2.1 / Vite / 2D Canvas & WebGL Runtime  
**Direção Visual**: Cinematic Volumetric 2.5D Dark Fantasy High-Detail Pixel Art

---

## 1. Visão Geral
Em combate dark fantasy de alto nível, o ataque com espada pesada não pode consistir em um sprite estático rotacionado por um tween angular. A arma deve demonstrar **massa**, **inércia**, **momento angular**, e o corpo do guerreiro deve **transferir seu peso** para a execução do golpe.

---

## 2. Decomposição dos 8 Frames do Ataque Pesado

A animação `v-attack` (resolução ampliada de **160x160** pixels por frame para acomodar o alcance total do corte e o rastro da lâmina) é construída segundo a seguinte cronologia física:

```
[Frame 0: Antecipação] → [Frame 1: Tensão Máxima] → [Frame 2: Aceleração/Drop] → [Frame 3: Ação/Strike]
                                                                                        ↓
[Frame 7: Retorno Guarda] ← [Frame 6: Recuperação] ← [Frame 5: Follow-Through] ← [Frame 4: Impacto/Clash]
```

### Detalhamento Frame a Frame:

1. **Frame 0 (Preparação / Antecipação)**:
   - Torso rotaciona $-25^\circ$ para trás;
   - Centro de gravidade se desloca para o calcanhar traseiro;
   - Os cotovelos sobem e a espada pesada é puxada para trás em ângulo de $+65^\circ$.
2. **Frame 1 (Ápice / Tensão Máxima)**:
   - Torso atinge torção máxima de $-35^\circ$;
   - Coluna vertebral arqueada em arco de tensão muscular;
   - Lâmina erguida no ponto mais alto ($Z=60$), captando o reflexo da luz superior.
3. **Frame 2 (Início da Aceleração / Drop)**:
   - O quadril inicia o giro para frente;
   - Os ombros despencam em direção ao alvo, transferindo o peso corporal para a espada;
   - Lâmina inicia a descida cortando o plano diagonal.
4. **Frame 3 (Ataque / Strike em Alta Velocidade)**:
   - Braços plenamente estendidos;
   - Lâmina corta transversalmente o plano frontal a velocidade máxima;
   - Abertura do arco volumétrico de vácuo de ar.
5. **Frame 4 (Impacto / Clash)**:
   - Frame de contato crítico;
   - O pé dianteiro ancora firmemente no solo levantando micro-poeira;
   - Emissão de 24 faíscas incandescentes direcionais de metal;
   - Hit-stop de 70ms e leve tremor de câmera (`shake(120, 0.006)`);
   - Deformação elástica de impacto no corpo do inimigo (Squash 0.82 / Stretch 1.18).
6. **Frame 5 (Follow-Through / Inércia)**:
   - A inércia da lâmina pesada ultrapassa a linha média do tronco;
   - O tronco é puxado para frente e para baixo em $+35^\circ$ de rotação;
   - A ponta da espada quase roça o solo na desaceleração.
7. **Frame 6 (Recuperação / Rebalanceamento)**:
   - O guerreiro alivia o peso nos pulsos e recua o pé frontal;
   - A lâmina é erguida de volta em direção ao abdômen.
8. **Frame 7 (Estado Final / Retorno à Guarda)**:
   - Retorno à postura de prontidão (High Guard);
   - Respiração estabilizada e empunhadura centralizada.

---

## 3. Resposta de Impacto no Inimigo (Revenant)
Quando o ataque conecta:
- O inimigo sofre compressão visual vertical instantânea e alargamento horizontal por 60ms através de tween elástico sem perda de taxa de quadros.
- Faíscas pontuais e fragmentos de rocha/aço saltam no vetor oposto ao corte.
- A espada permanece visualmente ancorada nas manoplas do guerreiro, mantendo proporções anatômicas exatas em todos os frames.
