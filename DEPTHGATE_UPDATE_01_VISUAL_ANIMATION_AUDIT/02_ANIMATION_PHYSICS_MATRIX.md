# MATRIZ DE FÍSICA E ANIMAÇÃO: REALISMO ANATÔMICO EM PIXEL ART
## DOCUMENTO 02: CICLOS DE ANIMAÇÃO, KINÉTICA CORPÓREA E MECÂNICA DE COMBATE

---

### 1. OS 7 ESTÁGIOS DA ANIMAÇÃO DE AÇÃO REALISTA

Qualquer ação no DepthGate deve obedecer à cadeia física completa:
1. **ANTECIPAÇÃO**:
   - Transferência de peso corporal para a perna traseira.
   - Rebaixamento ligeiro do centro de massa (1 a 2 pixels para baixo).
   - Inspiração / contração da musculatura do tronco e recuo da arma para longe do alvo.
2. **PREPARAÇÃO**:
   - Tensão muscular máxima.
   - Pés cravados no piso. Cabeça e olhar travados na linha de corte do inimigo.
3. **AÇÃO**:
   - Início do giro do quadril (pelve lidera o movimento antes do ombro e dos braços).
4. **ACELERAÇÃO**:
   - O ombro projeta o cotovelo, que projeta o pulso. A arma corta o ar acumulando energia cinética máxima.
   - Deformação do arco de movimento (smear frames em pixel art, com alongamento controlado).
5. **IMPACTO**:
   - Momento de choque físico.
   - Ocorre o **Hit-Stop** (micro congelamento de 50ms a 90ms para registrar a densidade do golpe).
   - O corpo do atacante sofre leve desaceleração contra a carne/armadura do alvo; o alvo sofre deformação (squash direcional).
6. **FOLLOW-THROUGH**:
   - O peso da lâmina puxa o braço e o tronco do atacante além do ponto de impacto.
   - Perna dianteira absorve a frenagem para evitar que o guerreiro perca o equilíbrio.
7. **RECUPERAÇÃO**:
   - Reajuste da postura de combate (guard stance). O guerreiro retorna o centro de massa ao ponto neutro.

---

### 2. MATRIZ DE ESTADOS POR AÇÃO

| Estado | Duração / Ritmo | Dinâmica Anatômica (Pelve, Ombros, Cabeça) | Resposta Cinética / Visual |
|---|---|---|---|
| **IDLE** | 1200ms - 1600ms (respiração lenta e pesada) | Pelve firme, ombros sobem 1px na inalação e descem na exalação. Joelhos semi-flexionados. Arma abaixada ou em guarda neutra sem oscilar como pêndulo. | Sombra de contato sólida. Sem tremedeira de membros. Roupas e capas balançam apenas com inércia de ar rarefeita. |
| **WALK** | 600ms por ciclo completo | Passadas firmes e cadenciadas. O calcanhar toca o chão primeiro, com amortecimento no joelho. O tronco inclina 2° à frente. Braços alternam em contraponto às pernas. | Micro poeira leve no calcanhar a cada 300ms. Sombra deforma sutilmente no eixo X. |
| **RUN** | 420ms por ciclo completo | Centro de massa projetado à frente. Pernas realizam extensão completa para trás. Tronco inclinado ~6°. Cabeça estabilizada no horizonte. | Puffs de poeira e atrito na impulsão de cada pé. Capa/tecidos esticam para trás pela resistência do ar. |
| **TURN** | 80ms - 120ms (micro frame de transição) | Pivot no pé de apoio. Rotação do quadril antes do tórax. A arma acompanha com atraso de inércia. | Evita espelhamento estantâneo frio (`flipX` puro). Aplica leve compressão horizontal de 1 frame. |
| **ATTACK (Windup)** | 100ms - 250ms (conforme peso da arma) | Recuo de ombros e torção da coluna. O cotovelo puxa a arma para trás. O olhar fixa o ponto vital do inimigo. | Pés arrastam no solo. A arma levanta um rastro de sombra ou brilho pré-corte. |
| **ATTACK (Impact)** | 60ms - 90ms | Extensão máxima do braço. Rotação explosiva do tronco. Transferência total de massa para a perna dianteira. | Faíscas direcionais em armadura, jatos viscerais de sangue em alvos de carne. Flash de corte e Hit-Stop. |
| **ATTACK (Recovery)** | 120ms - 200ms | O peso da arma é puxado de volta. O guerreiro expira o esforço e recupera a estabilidade das pernas. | Poeira baixa; a lâmina deixa um leve rastro de fumaça cinzenta no ar. |
| **HIT REACTION** | 100ms - 160ms | A cabeça e o peito sofrem recuo no sentido do vetor de dano. Ombros encolhem. Pernas perdem tração momentânea. | Squash & Stretch direcional: o sprite é comprimido ao longo do vetor de impacto e esticado na perpendicular. |
| **HURT** | 180ms - 240ms | Desequilíbrio temporário. Braços recuam para proteger órgãos vitais. | Sangue espirra em gotas com física parabólica e mancha o chão. |
| **DEATH** | 600ms - 1000ms | O corpo perde o tônus muscular. Se atingido por corte frontal, dobra os joelhos e cai para trás; se por impacto pesado, é arremessado e tomba. | O corpo colide com o chão levantando poeira e deixa uma poça permanente de sangue/cinzas no solo. |
| **DODGE / DASH** | 220ms - 300ms | Projeção rasante em velocidade supersônica. O corpo baixa rente ao chão, pernas flexionam em explosão. | Deixa silhuetas fantasmagóricas sombrias (afterimages) com fade-out gradual e faíscas de atrito nos pés. |
| **CAST (Magia)** | 250ms - 400ms canalização | Os pés fincam no chão. As mãos se erguem em garra ou empunham o cajado/fetiche. O peito contrai. | O ar em volta vibra: poeira e partículas são sugadas em direção ao mago (convergência de energia) antes da detonação. |
| **ABILITY** | Depende da classe (150-500ms) | Postura heróica ou brutal. Ativação de foco espiritual ou furioso. | Efeito luminoso focalizado, ondas de choque de solo rachado e distorção ótica. |
| **INTERACTION** | 150ms | O personagem abaixa levemente ou estende a mão para examinar/pegar. | Som tátil de engrenagem/couro/pedra e brilho sutil de confirmação. |

---

### 3. CONTROLE DE DEFORMAÇÃO E ESCALA (SQUASH & STRETCH)

Para evitar que os sprites pareçam blocos rígidos desenhados em folhas de papel:
- **No Impacto Crítico**:
  - Alvo recebe compressão de 15% na direção do golpe (`scaleX: 0.85`, `scaleY: 1.15` dependendo do ângulo) durante 60ms, retornando com amortecimento elástico (`elastic.easeOut`).
- **No Dash Evasivo**:
  - O jogador ganha esticamento longitudinal (`scaleX: 1.25`, `scaleY: 0.8`) no sentido do vetor de corrida.
- **Na Aterrissagem / Parada Brusca**:
  - Leve compressão vertical (`scaleY: 0.92`, `scaleX: 1.05`) durante 50ms antes de reassumir o Idle.
