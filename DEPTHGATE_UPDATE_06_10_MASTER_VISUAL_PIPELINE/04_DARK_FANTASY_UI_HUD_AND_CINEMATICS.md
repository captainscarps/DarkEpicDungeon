# DepthGate Visual Pipeline: Passo 09 — Dark Fantasy UI, HUD & Cinematic Feedback
**Versão**: 2.0.0  
**Arquitetura**: Phaser 4.2.1 / Vite / 2D Canvas & WebGL  
**Direção Visual**: Premium Realistic Dark Fantasy Pixel Art

---

## 1. Visão Geral
A interface e a comunicação diegética do DepthGate foram desenhadas para imergir o jogador no tom solene e implacável da fantasia sombria clássica. Elementos de UI não devem parecer gráficos vetoriais de aplicativos modernos ou jogos mobile; eles devem transmitir materiais de ferro forjado antigo, pergaminho envelhecido, ouro desbotado e pedras preciosas lapidadas.

---

## 2. Anatomia da Barra de Vida do Boss (`class Pd`)

### 2.1. Estrutura Visual Chiaroscuro
A barra de chefe centralizada no topo da tela é construída em camadas gráficas detalhadas:
1. **Moldura e Filigrana de Ouro Escuro**:
   - Triângulos e cantoneiras forjadas (`xt.UI_GOLD` `#c9a24a` e `#f2d87e`) nas extremidades esquerda e direita, sustentando a barra.
   - Rebites góticos de 1x2 pixels nas junções.
2. **Canaleta de Fundo e Dano Fantasma (Ghost Bar)**:
   - Fundo em preto profundo de ferro (`#0a0705`).
   - Quando o boss sofre dano, a vida real encolhe instantaneamente, enquanto a "ghost bar" (barra de dano residual) em carmesim claro (`#e8db50` / `#e05050`) decai lentamente com uma curva de atenuação `Sine.easeOut` após 120ms de atraso. Isso dá clareza tátil à quantidade exata de dano desferida por cada golpe.
3. **Indicadores de Fases (Phase Ticks / Diamonds)**:
   - Três losangos de fase no canto superior direito da barra.
   - Fases ativas brilham em âmbar/carmesim; fases futuras permanecem apagadas em ferro fosco (`#2c2013`).
4. **Flash de Transição de Fase**:
   - Ao mudar de fase, uma onda de luz branca pura de 500ms percorre toda a barra, celebrando visualmente o novo estágio de dificuldade.

---

## 3. Tipografia e Banners Cinematográficos

### 3.1. Hierarquia de Fontes
- **Títulos Maiores / Apresentação de Chefes**:
  - `Georgia, 'Times New Roman', serif`, tamanho 12px a 16px, caixa alta, com contorno escuro e espaçamento de letras imponente.
- **Informações Técnicas e Números de Dano**:
  - `'Courier New', monospace`, negrito com traço de 3px (`stroke: #1a120c`), garantindo legibilidade absoluta sobre qualquer tonalidade de fundo de masmorra.
- **Subtítulos e Afixos**:
  - Estilo itálico clássico em ouro pálido (`#c9a24a`).

### 3.2. Banners de Vitória, Derrota e Conquista de Bioma
Ao derrotar um chefe ou concluir um bioma:
- A tela projeta um banner com animação elástica suave (`Back.easeOut`).
- Em vitória: Ouro imperial (`#ffd24a`) e texto gravado em relevo.
- Em transição de fase perigosa: Carmesim ameaçador (`#ff6a1e`).
- Em conclusão de andar: Esmeralda rúnica (`#8ae0b0`).

---

## 4. Orbes de Recursos e Molduras de Equipamento
- **Vida e Recursos (Fúria, Mana, Vigor)**:
  - Círculos de vidro espesso protegidos por anéis de ferro escuro.
  - O líquido interno oscila com leve distorção quando o jogador corre ou sofre dano.
- **Inventário e Grade de Equipamentos**:
  - O fundo utiliza textura de pergaminho antigo com ruído de granulação (`ui-grain-parchment`).
  - As molduras de raridade de itens seguem a escala dark fantasy:
    - Comum: Ferro cinzento (`#777777`)
    - Incomum: Aço polido / Verde musgo (`#44aa66`)
    - Raro: Safira profunda (`#3377dd`)
    - Épico: Ametista sombria (`#8833cc`)
    - Lendário: Ouro forjado em sangue (`#ff8800`)
