# GUIA DE INTEGRAÇÃO DO MOTOR E ORÇAMENTO DE DESEMPENHO (60 FPS)
## DOCUMENTO 05: ARQUITETURA DE CÓDIGO, POOLING E OTIMIZAÇÃO WEBGL

---

### 1. ARQUITETURA DO `DepthGateVisualDNA` NO CÓDIGO

O DepthGate agora consolida a identidade visual em um objeto central de regras físicas e estilísticas:

```javascript
window.DepthGateVisualDNA = {
  version: "2.0.0",
  theme: "PREMIUM_REALISTIC_DARK_FANTASY",
  
  // Perfil cinético e anatômico por classe
  classes: {
    WARRIOR:         { mass: 1.35, runLean: 3.2, breathHz: 1.2, footDust: true,  recoverDamping: 0.82 },
    BERSERKER:       { mass: 1.20, runLean: 4.8, breathHz: 1.8, footDust: true,  recoverDamping: 0.90 },
    ARCHER:          { mass: 0.95, runLean: 2.5, breathHz: 1.4, footDust: false, recoverDamping: 0.85 },
    MAGE:            { mass: 0.85, runLean: 1.8, breathHz: 1.0, footDust: false, recoverDamping: 0.78 },
    ROGUE:           { mass: 0.90, runLean: 4.2, breathHz: 1.6, footDust: false, recoverDamping: 0.92 },
    SHAMAN:          { mass: 1.05, runLean: 3.8, breathHz: 1.5, footDust: true,  recoverDamping: 0.86 },
    PALADIN:         { mass: 1.40, runLean: 3.0, breathHz: 1.1, footDust: true,  recoverDamping: 0.80 },
    NECROMANCER:     { mass: 0.88, runLean: 2.0, breathHz: 0.9, footDust: false, recoverDamping: 0.75 },
    HUNTER:          { mass: 1.00, runLean: 3.5, breathHz: 1.4, footDust: true,  recoverDamping: 0.88 },
    SHADOW_ASSASSIN: { mass: 0.92, runLean: 4.5, breathHz: 1.7, footDust: false, recoverDamping: 0.95 },
    WARLOCK:         { mass: 0.90, runLean: 2.2, breathHz: 1.1, footDust: false, recoverDamping: 0.80 }
  },

  // Propriedades físicas e visuais dos materiais
  materials: {
    steel:         { sparkColor: [0xffffff, 0xe8f4f8], sparkSpeed: 160, hitSound: "sfx-weapon-sword", decal: null },
    flesh:         { bloodColor: [0x5a0004, 0x820008], bloodSpeed: 130, hitSound: "sfx-hit",          decal: "blood_pool" },
    bone:          { chipColor:  [0xdcd0c0, 0xbaa896], chipSpeed:  110, hitSound: "sfx-hit",          decal: null },
    stone:         { dustColor:  [0x707078, 0x4a4a52], dustSpeed:  90,  hitSound: "sfx-hit",          decal: null },
    occult_energy: { runeColor:  [0x8a3ab8, 0x3d1266], runeSpeed:  140, hitSound: "sfx-magic-hit",    decal: "occult_burn" }
  },

  // Iluminação multi-frequência
  lighting: {
    noiseHarmonics: [
      { freq: 0.007, amp: 0.040 },
      { freq: 0.021, amp: 0.025, phase: 1.2 },
      { freq: 0.053, amp: 0.015, phase: 2.8 }
    ],
    stochasticJitter: 0.008,
    torchColorWarm: 0xffa03b,
    ambientPenumbra: 0x100c18
  }
};
```

---

### 2. ORÇAMENTO DE DESEMPENHO E GARANTIA DE 60 FPS

A fidelidade gráfica elevada não pode comprometer a fluidez de 60 quadros por segundo em navegadores web e dispositivos móveis. As seguintes regras arquiteturais são estritamente observadas:

1. **Pooling de Partículas e Objetos**:
   - As emissões de partículas reutilizam instâncias pré-alocadas (`this.burst` e mapas cacheados em `this.tintedBursts`), evitando invocar o Garbage Collector do JavaScript durante o combate.
2. **Batching de Renderização WebGL**:
   - Todas as entidades da masmorra compartilham texturas compactadas e atlas de pixel art, minimizando trocas de estado na GPU (*draw calls*).
3. **Decals Autolimpantes (Auto-Culling Decals)**:
   - Poças de sangue e marcas de combate utilizam tweens com destruição automática (`onComplete: () => g.destroy()`) e possuem limite de existência de 6 a 8 segundos para evitar acúmulo de nós no grafo de cena do Phaser.
4. **Resolução Nativa com Zoom Inteiro (Pixel-Perfect Scaling)**:
   - Resolução interna travada em 640x360 escalonada por fatores inteiros de zoom (`Pt`), garantindo que os pixels permaneçam nítidos sem borramento de interpolação bilinear.
