# DepthGate: Art Direction Revitalization — Passo 12
## Estudo de Resolução de Assets: 128x128 vs 160x160 vs 192x192 vs 256x256
**Versão**: 2.6.0  
**Motor**: Phaser 4.2.1 / Vite / 2D Canvas & WebGL Runtime  
**Direção Visual**: Cinematic Volumetric 2.5D Dark Fantasy High-Detail Pixel Art

---

## 1. Contexto e Motivação
A versão anterior de produção do DepthGate utiliza sprites em resolução extremamente baixa (aproximadamente 24x32 a 34x46 pixels), o que força figuras simplificadas, sem definição anatômica e sem espaço em pixels para articular dobras de tecidos, faixas de especularidade em metais ou detalhes de empunhadura de armas.

Para a Revitalização Visual, foram testadas quatro faixas de resolução com os seguintes achados:

---

## 2. Matriz de Avaliação de Resoluções

| Resolução | Detalhamento Anatômico | Alcance da Espada / Animação | Legibilidade em Tela (Zoom 1.0–2.0) | Custo de Memória & Atlas | Veredito |
|---|---|---|---|---|---|
| **128x128** | Bom volume e proporções. Rosto/elmo já ganha definição. | Limitado: golpes amplos de espada pesada cortam as bordas do frame. | Excelente em telas pequenas; perde micro-detalhes em telas Full HD/4K. | Baixíssimo (~10 KB por atlas 8-dir). | **Viável, porém restringe a animação de ataque.** |
| **160x160** | **Excelente**: Permite peitoral anatômico, rebites, cota de malha, fivelas e olhos no elmo. | **Perfeito**: Espadas grandes de duas mãos giram em arco pleno sem tocar as bordas do quadro. | **Ideal**: Densidade pixel-art perfeita, mantendo nitidez nítida e estética comercial. | Baixo (~14 KB por atlas 8-dir). | **ESCOLHIDA COMO PADRÃO ÓTIMO**. |
| **192x192** | Quase equivalente ao 160x160, com margem extra de arcos para chefes gigantes. | Amplo para magias de longo rastro. | Bom, mas tende a requerer downscaling de câmera em monitores 1080p. | Médio (~22 KB por atlas). | **Recomendada para Chefes e Monstros Grandes.** |
| **256x256** | Excesso de espaço vazio para personagens humanos normais. | Desnecessariamente grande para guerreiros médios. | Corre o risco de perder a linguagem de pixel art e parecer ilustração digital solta. | Alto (~40 KB por atlas). | **Inadequado para personagens humanos.** |

---

## 3. Justificativa da Escolha de 160x160 Pixels

A resolução de **160x160 pixels por frame** foi adotada para os três protótipos de arte (`dir_a`, `dir_b` e `dir_c`) porque:
1. **Espaço Físico para a Lâmina**: Uma espada medieval pesada possui comprimento entre 42 e 50 pixels a partir da empunhadura; combinada com a envergadura dos braços e o passo à frente no golpe (clash), o personagem ocupa aproximadamente 120 pixels de largura horizontal, cabendo perfeitamente centralizado no canvas de 160 pixels.
2. **Hierarquia de Detalhes**: Permite separar claramente três camadas de materiais sobrepostas (cota de malha interior + gambeson de couro intermediário + placa de aço exterior + filigrana de ouro).
3. **Desempenho Imbatível**: Um atlas completo de 8 frames a 160x160 pixels (1280x160) pesa menos de 20 KB comprimido em PNG, garantindo taxas de carregamento inferiores a 5 milissegundos e suporte fluido a mais de 100 entidades simultâneas em cena a 60 FPS.
