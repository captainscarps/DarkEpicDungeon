# FRAMEWORK DE ANIMAÇÃO E RENDERIZAÇÃO
## DOCUMENTO 02: STACK DE CAMADAS, CINÉTICA DE CORPO INTEIRO E TRANSMISSÃO DE FORÇA

---

### 1. SISTEMA DE CAMADAS DE RENDERIZAÇÃO (11-LAYER STACK)

Para evitar que equipamentos e armas pareçam colagens bidimensionais flutuantes, o DepthGate estrutura a hierarquia de renderização dos personagens em 11 camadas estritas:

```
[LAYER 01] SHADOW          -> Sombra dinâmica projetada e de contato com o piso
[LAYER 02] LEGS_BACK       -> Perna traseira com sombreamento profundo de oclusão
[LAYER 03] BODY_TORSO      -> Tronco básico, musculatura e curvatura de coluna
[LAYER 04] CLOTHING_UNDER  -> Roupas íntimas, túnicas de linho, calças de couro
[LAYER 05] ARMOR_CHEST     -> Peitoral de placas, cota de malha ou gibão de couro reforçado
[LAYER 06] HEAD_BASE       -> Crânio e face com linhas de expressão e olhos
[LAYER 07] HAIR            -> Cabelo dinâmico com física de inércia e vento
[LAYER 08] HELMET_HOOD     -> Elmo de aço, capuz de assassino ou diadema
[LAYER 09] ARM_BACK        -> Braço e mão traseiros (segurando escudo ou empunhando arco)
[LAYER 10] WEAPON_MAIN     -> Arma primária com ancoragem óssea no punho
[LAYER 11] ARM_FRONT / FX  -> Braço dianteiro, ombreira de destaque, brilho de encantamento e faíscas
```

#### Regras de Atualização da Stack:
- **Z-Sorting Dinâmico de Arma**: Ao olhar para cima (`facing.y < 0`), a arma é automaticamente jogada para trás do corpo (`sendToBack(weapon)`). Ao olhar para baixo ou lados, a arma fica sobreposta ao peitoral.
- **Ancoragem Fiel do Punho**: A arma nunca gira sobre o próprio centro; ela gira em torno da junta rádio-cárpica (pulso), que por sua vez é transladada pelo cotovelo e ombro do modelo.

---

### 2. O CICLO DE COMBATE EM 7 PASSOS FÍSICOS

Nenhum ataque no DepthGate pode ser uma simples substituição de frame estático. A animação deve cumprir obrigatoriamente a cadeia de transmissão de força mecânica:

```
[1. ANTECIPAÇÃO]   Recuo de 2 a 3 pixels do centro de massa. Pelve gira no sentido contrário ao corte.
        ↓
[2. PREPARAÇÃO]    Pé de trás crava no piso (gerando poeira de atrito). Lâmina erguida em ângulo agudo.
        ↓
[3. AÇÃO]          O quadril se desenrola com explosão muscular, puxando os ombros.
        ↓
[4. ACELERAÇÃO]    A lâmina corta o ar em velocidade máxima. Ativação do SMEAR FRAME (desenho alongado).
        ↓
[5. IMPACTO]       Choque contra o alvo. HIT-STOP (congelamento de 60ms). Deformação de squash no inimigo.
        ↓
[6. FOLLOW-THROUGH]Inércia leva a lâmina além do alvo. O tronco curva-se e o pé dianteiro absorve o peso.
        ↓
[7. RECUPERAÇÃO]   Retorno controlado à guarda em velocidade suave (curva ease-out quadrática).
```

---

### 3. FÍSICA ESPECÍFICA POR ARMA: A CONEXÃO CORPO-ARMA

#### A. ESPADA (SWORD & SHIELD / LONGSWORD)
- O guerreiro golpeia com passos diagonais firmes. O escudo permanece fechando a linha média do corpo durante o golpe, sem abrir a guarda.
- O corte é horizontal ou diagonal descendente, com a lâmina sempre apontando na direção do olhar do guerreiro.

#### B. MACHADO PESADO (BATTLE AXE)
- Golpe predominantemente vertical e descendente.
- A cabeça do machado puxa o guerreiro para a frente: no impacto contra o solo, há leve levantamento de poeira e pedriscos e um breve atraso de 180ms para desencravar o machado.

#### C. KATANA (SAMURAI)
- Saque relâmpago rente à bainha horizontal.
- O centro de gravidade se desloca em linha reta sem qualquer oscilação vertical da cabeça.
- Corte horizontal limpo seguido de uma pausa estática de meio segundo que valoriza a elegância letal da lâmina.

#### D. ARCO E FLECHA (BOW)
- A mão do arco projeta-se em bloqueio firme à frente.
- O braço da corda puxa a linha até o queixo/orelha com visível vibração de tensão muscular.
- No disparo, a corda estala, o arco sofre micro-vibração e o tronco recua 1px como resposta ao recuo da flecha.

#### E. CAJADOS E FETICHES (STAVES & WANDS)
- Não há "arma atirando projétil": o conjurador crava a base do cajado no chão como âncora mística.
- Ondas de choque em anel reverberam a partir da base no solo e a energia emerge canalizada pelo topo da haste.
