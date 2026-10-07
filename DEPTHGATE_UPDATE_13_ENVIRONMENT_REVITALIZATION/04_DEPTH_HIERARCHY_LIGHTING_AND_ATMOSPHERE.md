# DEPTHGATE UPDATE 13 — RELATÓRIO TÉCNICO 04
## HIERARQUIA DE PROFUNDIDADE, ILUMINAÇÃO DINÂMICA E ATMOSFERA

==================================================
1. HIERARQUIA DE PROFUNDIDADE 2.5D (4 PLANOS)
==================================================

Para garantir que o DepthGate transmita a sensação de um espaço tridimensional habitável e não uma imagem plana, implementou-se uma hierarquia rigorosa de planos renderizados em 2D nativo via Phaser:

```
[ FOREGROUND ]       Arcada e Pilar Frontal (Depth: 595 - 600)
       ▲
[ CHARACTER PLANE ]  Personagem Original (Depth dinâmico = hero.y)
       ▲
[ MIDGROUND ]        Pilares Centrais (Base y=280), Barris (y=210), Caixotes (y=215)
       ▲
[ BACKGROUND ]       Paredes de Fundo (Depth: 50), Tochas de Parede (Depth: 65)
       ▲
[ FLOOR SUBSTRATE ]  Piso de Alvenaria e Sombras Projetadas (Depth: 1 - 4)
```

### Prova Prática de Oclusão (Y-Sort):
1. **Passagem Atrás do Pilar Central:**
   - Ao caminhar para $y < 280$ na coluna de $x \approx 280$ ou $x \approx 680$, o personagem passa imediatamente **atrás** do fuste do pilar, demonstrando oclusão espacial genuína.
2. **Passagem na Frente do Pilar:**
   - Ao caminhar para $y > 280$, o personagem sobrepõe perfeitamente a base e a sombra do pilar.
3. **Passagem Atrás do Foreground:**
   - No canto inferior esquerdo ($x < 90, y > 520$), o personagem passa **atrás da coluna de primeiro plano**, que emoldura a cena e cria profundidade de campo sem necessidade de engine 3D.

==================================================
2. ILUMINAÇÃO DINÂMICA E SOMBRAS
==================================================

No modo **CINEMÁTICO**, a cena adota um pipeline de iluminação em tempo real:

1. **Oscilação Harmônica das Tochas (Flicker):**
   - Combinação de ondas senoidais e cossenoidais assíncronas:
     $$\text{flicker} = 1.0 + 0.05 \sin(7t) + 0.035 \cos(13t)$$
   - Simula o tremor irregular de chamas reais sem saltos artificiais de brilho.
2. **Atenuação Volumétrica Radial:**
   - Sprite de luz com decaimento quadrático suave ($384 \times 384$), com núcleo quente amarelo-ouro (`#ffd070`) decaindo para âmbar profundo (`#d9531e`), misturado via `BlendModes.ADD`.
3. **Sombras Projetadas Direcionais:**
   - A sombra elíptica sob o guerreiro estica e rotaciona continuamente em oposição à tocha mais próxima:
     $$\theta_{\text{sombra}} = \text{atan2}(y_{\text{herói}} - y_{\text{tocha}}, x_{\text{herói}} - x_{\text{tocha}}) - \frac{\pi}{2}$$
   - Elimina as sombras circulares genéricas estáticas da versão anterior.

==================================================
3. ATMOSFERA E PARTÍCULAS
==================================================

1. **Poeira Suspensa na Luz (Dust Motes):**
   - 25 a 30 micropartículas que flutuam lentamente com movimento browniano e cintilação de transparência nas áreas iluminadas.
2. **Fagulhas/Brasas das Tochas (Embers):**
   - Partículas douradas incandescentes que ascendem das arandelas de ferro, desacelerando e desaparecendo suavemente.
3. **Névoa Baixa de Masmorra (Creeping Mist):**
   - Camadas de vapor azulado e frio rastejando a baixa velocidade sobre as lajes de pedra no piso, misturadas com `BlendModes.SCREEN`.
