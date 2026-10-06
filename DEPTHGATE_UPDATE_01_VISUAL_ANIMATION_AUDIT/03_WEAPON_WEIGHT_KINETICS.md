# CINÉTICA DE ARMAS E TRANSMISSÃO DE PESO
## DOCUMENTO 03: DINÂMICA DE MASSAS, TRAJETÓRIAS E FÍSICA DE CORTE

---

### 1. PRINCÍPIO DA INÉRCIA POR CATEGORIA DE ARMA

Uma arma em combate não é uma figura geométrica que rotaciona em torno de um ponto fixo. Cada classe de arma possui uma distribuição de massa única:

```
[Distribuição de Centro de Massa]
Espada Longa / Montante: ~65% do comprimento (próximo à ponta da lâmina)
Machado de Batalha:      ~85% do comprimento (concentrado na cabeça do machado)
Espada Curta / Xamânica: ~30% do comprimento (balanceada perto da guarda)
Katana:                  ~40% do comprimento (curvatura aerodinâmica focada em corte por tração)
Adagas:                  ~20% do comprimento (agilidade pura de punho)
Arco:                    Tensão elástica acumulada na corda / membros
Cajado Mágico:           Extremidade canalizadora como catalisador de onda de choque
```

---

### 2. ESPECIFICAÇÃO CINÉTICA DETALHADA

#### A. MONTANTE / ESPADA PESADA (GREATSWORD)
- **Comportamento Anatômico**: O guerreiro precisa dar um passo largo à frente. O tronco gira quase 90° e as duas mãos sustentam o punho estendido.
- **Anticipation (Windup)**: 280ms - Lenta e ameaçadora. A lâmina raspa ou ergue-se acima da cabeça.
- **Action (Corte)**: Aceleração não-linear brutal. A espada sai devagar da inércia, corta em velocidade vertiginosa e bate no solo/alvo com estrondo.
- **Hit Reaction**: Inimigos leves são derrubados ou recuam 30px com Hit-Stop de 80ms.
- **Trail**: Rastro largo de ar rasgado (vapor cinzento-prateado com poeira no chão).
- **Impact FX**: Onda de choque em anel no solo, faíscas incandescentes e micro-rachadura de pedra.

#### B. MACHADO DE GUERRA (BATTLE AXE)
- **Comportamento Anatômico**: Todo o peso está na cabeça de ferro. O movimento é pendular descendente ou diagonal descendente.
- **Anticipation (Windup)**: 260ms - Elevação dorsal completa.
- **Action (Queda)**: Queda quase em gravidade livre amplificada pela força muscular do golpe.
- **Impact FX**: Impacto pesado (dull metallic thud). Se atingir carne, abre um rasgo profundo com jorro de sangue concentrado; se atingir armadura/pedra, solta fagulhas e estilhaços.
- **Recovery**: 190ms - O machado crava no chão ou passa reto, exigindo esforço do tronco para desenterrar/recuperar.

#### C. ESPADA CURTA & ESPADA XAMÂNICA (SHAMAN BLADE)
- **Comportamento Anatômico**: Manuseio ágil com uma mão, equilibrando corte e estocada. A outra mão equilibra o corpo ou conjura espíritos.
- **Anticipation (Windup)**: 120ms - Recuo rápido de cotovelo com mira ocular direta no pescoço/tronco inimigo.
- **Action**: Corte em arco nítido e veloz (arco de 90° a 110°).
- **Trail**: Lâmina deixa um fio brilhante afiado (prateado com micro-névoa verde espiritual para a Xamã).
- **Impact FX**: Corte afiado (sharp flesh slice), respingos de sangue com velocidade alta em leque estreito.
- **Recovery**: 130ms - Transição suave de volta à postura defensiva, pronta para novo golpe ou esquiva.

#### D. KATANA (SAMURAI / BERSERKER)
- **Comportamento Anatômico**: Movimento estritamente técnico de saque e corte (Iaijutsu). Ombros baixos, centro de gravidade rebaixado, corte realizado pela rotação do punho e tração da lâmina.
- **Anticipation**: 90ms - Postura estática de tensão extrema.
- **Action**: A lâmina corta tão rápido que o corte é quase instantâneo (smear frame alongado).
- **Impact FX**: Flash linear branco puro com corte transversal preciso. O sangue jorra 50ms depois do corte (timing dramático clássico de samurais).
- **Recovery**: Retorno disciplinado da lâmina para a linha central.

#### E. ADAGAS DUPLAS (ROGUE / ASSASSIN)
- **Comportamento Anatômico**: O assassino avança com passadas rasantes, alternando cortes em tesoura e estocadas em pontos vitais (rins, artérias).
- **Anticipation**: 60ms - Praticamente imperceptível; ataque reflexivo.
- **Action**: Três golpes rápidos e agressivos.
- **Impact FX**: Jatos de sangue pontuais finos, faíscas rápidas de atrito e micro recuo inimigo.

#### F. ARCO E FLECHA (BOW & ARROW)
- **Comportamento Anatômico**:
  - O arqueiro não apenas segura a arma: a mão esquerda estende o arco firmemente como uma coluna estrutural; a mão direita puxa a corda até a altura da mandíbula/orelha.
  - O peito abre, cotovelo direito fica elevado e alinhado com o eixo da flecha.
- **Anticipation (Tensão)**: O arco verga fisicamente (flexão das lâminas de madeira/osso).
- **Action (Disparo)**: A corda estala com som seco (`thwack`). A flecha viaja em linha reta com rastro de ar cortado.
- **Impact FX**: A flecha crava no alvo com som de impacto oco. Se crítico, perfura o alvo e projeta sangue para trás dele.
- **Recoil**: O braço do arco vibra por 40ms e a mão que puxava a corda relaxa com follow-through para trás.

#### G. MAGIA OCULTA E CAJADOS (OCCULT MAGIC & STAVES)
- **Fim dos "círculos de luz estáticos"**:
  - Magia negra/necromântica: O cajado não "atira"; ele canaliza espectros. O chão sob os pés do conjurador escurece e fumaça fria flutua em direção aos inimigos.
  - Piromancia: Fogo tem brasas, fuligem, crepitação e calor visível (ondulação de ar).
  - Raízes Xamânicas: A terra treme, raízes brotam do chão rasgando pedras e prendendo os membros dos inimigos com musgo e seiva escura.
