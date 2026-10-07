# DEPTHGATE — NOVA ARQUITETURA VISUAL E DE COERÊNCIA ESPACIAL

Esta pasta contém os novos artefatos e referências visuais da entrega:
"GRANDE REVITALIZAÇÃO VISUAL: Cenários, ambientação, coerência espacial, iluminação, efeitos e tecnologia de renderização".

## Conteúdo
- benchmarks/catacombs.png: Validação visual das Catacumbas (iluminação âmbar, oclusão de contato, tochas alinhadas)
- benchmarks/ruins.png: Validação visual das Ruínas (vegetação, oclusão suave em ruínas e colunas, iluminação fria natural)
- benchmarks/fortress.png: Validação visual da Fortaleza dos Dragões (pedra vulcânica, partículas de brasas, iluminação quente de chamas)
- benchmarks/glacial.png: Validação visual da Cidadela Glacial (gelo, cristais refletores, partículas de névoa e geada, iluminação ciano)

## Sistemas Criados no Bundle
1. SPATIAL_ZONES & RoomZoneMap: Zoneamento arquitetônico estrito (WALL, FLOOR, OPENING, DOORWAY, INTERIOR, EXTERIOR, DECORATION, NAVIGATION).
2. Validador de Coerência Ambiental: Prevenção de tochas flutuantes, abertura segura de portas (buffer de 2 tiles), interação livre com baús e santuários.
3. Sombras de Contato & Fake AO: Faixas de oclusão de contato na base das paredes e elipses de sombreamento suave sob todos os sólidos.
4. Iluminação Atmosférica por Bioma: Cores de escuridão personalizadas em WebGL RenderTextures para cada identidade temática.
5. VFX & Partículas de Bioma: Gotas/pó nas Catacumbas, esporos nas Ruínas, brasas na Fortaleza, cristais no Gelo; pulsos auras nos interativos.
