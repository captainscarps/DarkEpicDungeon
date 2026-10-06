# DepthGate Visual Pipeline: Passo 06 — Combat & Weapon Kinetic FX
**Versão**: 2.0.0  
**Arquitetura**: Phaser 4.2.1 / Vite / 2D Canvas & WebGL  
**Direção Visual**: Premium Realistic Dark Fantasy Pixel Art

---

## 1. Visão Geral e Filosofia de Design
O combate em RPGs dark fantasy de alto padrão não pode parecer um mero acionamento de caixas de colisão com círculos de luz sobrepostos. Cada arma deve carregar:
- **Inércia e Peso Físico**: A aceleração do golpe, o momento do impacto e a desaceleração pós-contato.
- **Micro-Penetração e Interação de Materiais**: Aço contra cota de malha emite fagulhas direcionais; golpes cortantes em carne produzem micro-vacos de ar seguidos de borrifos arteriais; armas de concussão deformam o corpo do alvo e projetam ondas de choque radiais.
- **Cinética de Câmera e Hit-Stop**: Pausas sutis de 40ms a 70ms no frame de impacto para conferir sensação tátil ("crunch") ao jogador, acompanhadas de micro-impulsos de tremor angular.
- **Rastro Persistente no Cenário**: O impacto físico deixa marcas — manchas de sangue coagulado e marcas de impacto na camada de profundidade do piso (`depth: 2`).

---

## 2. Matriz Cinética por Família de Armas

| Tipo de Arma | Arco de Ataque | Efeito Visual Primário | Micro-VFX Secundário | Reação do Alvo (Hit React) | Câmera |
|---|---|---|---|---|---|
| **Espadas Pesadas / Greatswords** | 120° amplo, velocidade variável | `arcSlash` em 3 camadas (núcleo incandescente, arco de vácuo, resíduo cinzento) | Fragmentos de pedra/faíscas pesadas + rastro de ar cortado | Deformação elástica vertical/horizontal (18% squash) + recuo direcional | Shake 0.005, 70ms hit-stop |
| **Katanas / Lâminas Rápidas** | 90° afiado, aceleração relâmpago | Fita fina prateada de alta densidade (`#ffffff` e `#c0c0e0`) | Feixe direcional de faíscas metálicas em cone fechado (15°) | Parada estática instantânea de 50ms antes do corte se manifestar | Micro-shake 0.003, 50ms |
| **Machados / Maças (Concussão)** | 100° descendente pesado | Onda de choque semicircular no piso + fissura de impacto | Poeira de impacto radial (`tint: 0x908069`) + fagulhas brutas | Deformação radial com achatamento acentuado no eixo do golpe | Shake 0.007, 80ms hit-stop |
| **Lanças / Armas de Haste** | Eixo linear perfurante (thrust) | Feixe longitudinal afiado com ponta em diamante | Jato perfurante de micro-gotículas na direção do vetor | Projeção linear para trás no vetor do golpe | Shake direcional, 50ms |
| **Arcos / Zarabatanas** | Projétil pontual veloz | Rastro de tração cônica de vento (`alpha: 0.4`) | Fagulha de penetração no impacto + sangue em cone 30° | Micro-empurrão proporcional à velocidade do projétil | Sem shake na saída, leve pulso no acerto crítico |
| **Armas Místicas / Xamânicas** | Arcos rituais com partículas espirituais | Anel runico de vácuo com distorção espectral | Motes etéreos (`#8ae0b0` e `#c9a0ff`) convergindo ao centro | Flutuação espectral momentânea + status tick luminoso | Micro-pulso cromático |

---

## 3. Dinâmica de Fluidos e Partículas Direcionais

### 3.1. Vetorização do Sangue e Fragmentos
Ao registrar dano em `Uh.apply()`, o vetor normalizado $\vec{u} = \frac{\vec{x}_{alvo} - \vec{x}_{atacante}}{\|\vec{x}_{alvo} - \vec{x}_{atacante}\|}$ define o cone de dispersão:
$$\theta = \text{atan2}(u_y, u_x) + \mathcal{N}(0, \sigma^2)$$
- Gotas primárias de sangue viajam na direção $\vec{u}$ com velocidade inicial $v \in [60, 140]\text{ px/s}$.
- A cor do sangue respeita a paleta dark fantasy:
  - Sangue vivo recém-derramado: `#720896` / `#800808`
  - Sangue venoso / coagulado: `#262144` / `#1a0505`
  - Fagulhas de armadura / aço: `#ffe28a` e `#ffffff`

### 3.2. Decais de Piso Persistentes com Auto-Culling
Para evitar o consumo irrestrito de texturas ou draw calls WebGL, os decais de sangue no solo obedecem a uma fila circular FIFO estrita de 40 elementos:
```javascript
registerFloorDecal(scene, x, y, radiusX, radiusY, color, alpha) {
  scene.__decals = scene.__decals || [];
  if (scene.__decals.length >= 40) {
    const oldest = scene.__decals.shift();
    if (oldest && oldest.destroy) oldest.destroy();
  }
  const g = scene.add.graphics().setDepth(2);
  g.fillStyle(color, alpha).fillEllipse(x, y, radiusX, radiusY);
  scene.tweens.add({
    targets: g,
    alpha: 0,
    delay: 5000,
    duration: 3000,
    onComplete: () => {
      const idx = scene.__decals.indexOf(g);
      if (idx !== -1) scene.__decals.splice(idx, 1);
      g.destroy();
    }
  });
  scene.__decals.push(g);
}
```

---

## 4. Deformação Anatômica no Impacto (Squash & Stretch)
Quando o inimigo recebe um golpe:
1. **Fase de Compressão (0 - 25ms)**:
   - Golpes frontais achatam a escala no eixo do ataque para $0.85 \times \text{scaleX}$ e esticam o eixo ortogonal para $1.15 \times \text{scaleY}$.
   - Golpes críticos aumentam a deformação para $0.80 / 1.22$.
2. **Fase Elástica (25 - 50ms)**:
   - Yoyo suave retornando à escala original sem dessincronizar a animação de sprite em andamento.
   - Proteção de concorrência com flag `__squashing` para evitar acumulação de tweens multiplicativos.

---

## 5. Implementação no Motor
- `Effects.meleeImpact(x, y, dirX, dirY, isCrit)`: Projeção de flare em blend mode `ADD`, jatos de faíscas em alta velocidade e decais ovais no solo.
- `Effects.arcSlash(x, y, angle, range, arcAngle, tint)`: Geometria de três lâminas gráficas com preenchimento alfa de corte e borda externa em traço duplo.
- `DamageSystem.apply()`: Gatilho de deformação física e cálculo de knockback direcional com multiplicador de status.
