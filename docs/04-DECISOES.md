# Decisões — o que foi pedido e por quê

> Regra: o que está em "Pedidos do Rafael" só muda se ele pedir. As decisões técnicas podem ser revistas, desde que o motivo aqui deixe de valer.

## Origem: o cooktop da bancada (01/10/2026)

O app nasceu de uma pergunta do Rafael sobre o **cooktop Electrolux KE5GR** (5 bocas a gás, mesa de vidro): qual deveria ser a medida da bancada. As exigências eram sobrar 10 cm do cooktop até a parede e 8 cm de bancada na frente.

As medidas do anúncio, confirmadas por ele:
- **Cooktop:** 75 × 45 × 13,1 cm.
- **Nicho (recorte) de montagem:** 66 × 39 cm. As bordas do vidro cobrem 3 cm de cada lado do recorte.

As contas:
- **Profundidade mínima da bancada:** 10 + 45 + 8 = **63 cm**. O recorte fica a 13 cm da parede e a 11 cm da frente. Uma bancada padrão de 60 cm deixaria só 5 cm na frente.
- **Largura:** **95 cm** com parede ou armário alto dos dois lados (10 + 75 + 10). Com as laterais livres, uns 85 cm. O piso técnico é 75 cm, mas eu evitaria.

Para responder, desenhei a planta vista de cima:
- a parede no alto e a bancada de 95 × 63;
- o cooktop com o recorte tracejado e as 5 bocas;
- as cotas 10 · 45 · 8 à esquerda e o total de 63 à direita;
- 10 · 75 · 10 embaixo, com o total de 95.

O Rafael gostou ("gostei demais") e pediu um sistema "no estilo da imagem". **Esse desenho é a referência visual e de medidas do app.** O teste `cadeia mostra 10/45/8/75/63/95` reproduz o caso.

## Pedidos do Rafael

| Data | Pedido (palavras dele, resumidas) | Como ficou |
|---|---|---|
| 01/10 | "sistema rápido e fácil de criar planta, andares, caixas para móveis, escrever medidas, guardar no local storage, subir fácil no GitHub" | Site estático com projetos, andares e itens; `localStorage`; deploy no Pages |
| 01/10 | "pensado em celular" | Celular primeiro: pinça, folha inferior, alvos de 44 px |
| 01/10 | "exportar PDF e PNG, exportar arquivo para importar, vários projetos" | PNG, PDF A4, `.json`, backup, lista de projetos |
| 01/10 | "intuitivo, no estilo da imagem do cooktop; nomear parede e itens, mostrar medidas e folgas" | Paredes e itens com nome; folgas e cotas no estilo do desenho |
| 01/10 | Identidade visual de `ME/PlanejamentoCarreira`, "mas bem clean para desenhar" | Blueprint, periwinkle e âmbar, Space Grotesk + JetBrains Mono, linhas finas |
| 01/10 | "nada instalável, apenas um site no GitHub Pages" | **Sem PWA, sem manifest, sem service worker** (tinha sido planejado e saiu) |
| 01/10 | "não esqueça do 404"; publicar "como fiz o gh pages do escritório virtual" | `404.html` própria; `gh-pages` na raiz + `.nojekyll` + `CNAME` |
| 01/10 | "motion, animações, interatividade, ícones fáceis, texturas com rachura, microinterações, fácil compartilhar" | Animações (tabela em `02-ARQUITETURA.md`), 15 ícones, 6 texturas, link de compartilhar |
| 01/10 | Usar o Visual Inspector para inspiração e análise | Tokens de movimento e auditorias de design e acessibilidade (79 → 100) |
| 01/10 | Acessar o Chrome dele, "certifique que está no certo" | Sempre o navegador `onThisComputer: true` |
| 02/10 | "deixe adicionar itens com tamanho personalizado"; "**não precisa ter uma pré-seleção de itens**" | **Catálogo de móveis removido.** Adicionar é formulário de tamanho livre |
| 02/10 | "mover dentro do cômodo, nomear, ampliar a planta, mudar de cor, mostrar a medida assim" (com a imagem) | Cotas em cadeia até o recipiente, distâncias editáveis, zoom com botões e toque duplo, cores |
| 02/10 | "revise todo o design, o mais usável possível, interativo" | Revisão da rodada 3 (veja `PROGRESSO.md`) |
| 02/10 | Publicar no `UPraggy/PlantaFacil` e ajustar o Pages | Repositório criado público (ele não existia) e publicado |
| 02/10 | Domínio `plantafacil.rafaelmr.com.br` | `CNAME` + `deploy.config.json` |
| 02/10 | "documente tudo" | Esta pasta `docs/` + `CLAUDE.md` |
| 02/10 | "editar quantas paredes o cômodo tem e rotacionar" | Lados com parede liga/desliga + girar o cômodo com tudo dentro (ícones giram junto) |
| 02/10 | "adicionar vazamento nos cômodos como se fosse janelas" | Aberturas nas paredes: janela, porta (com arco) e vão |
| 02/10 | "editar o que está na frente" | Trazer para frente / enviar para trás + tocar de novo pega o de trás |
| 02/10 | "bloquear edição para não mover sem querer" | Cadeado por item + "Travar" na planta inteira |
| 02/10 | "não achei quadrado para editar as paredes"; "o trancar não funciona" | Editor de paredes sempre à vista no cômodo; tocar no miolo seleciona; travado = não move nem edita |
| 02/10 | "teste no celular… pode ser no navegador, basta usar o inspecionar" | `npm run e2e`: Chromium emulando Android com toque de verdade |
| 02/10 | "melhore a exportação… visibilidade das medidas, o PDF também"; "não precisa crescer tanto a imagem, só boa resolução, e legenda de proporção" | Medidas 1,2×, PNG 3× e PDF 2,5× de resolução, régua + proporção 1:N, lista de medidas no PDF |

## Decisões técnicas (e o motivo)

- **HTML/CSS/JS puro, sem build:** "subir fácil" e "só um site no Pages". Sem `npm install`, sem Vite, sem `dist/`: o que está no repositório é o que vai para o ar. Foge do padrão React do Rafael de propósito, para não ter build nem dependência para um app pequeno.
- **Scripts clássicos em `window.PF`, não módulos ES:** abre até com dois cliques no `index.html`, e o Node testa a lógica sem bundler.
- **SVG e não `<canvas>`:**
  - nitidez em qualquer zoom e texto bom;
  - a mesma função desenha a tela e a exportação (`DES.conteudo`);
  - o redesenho completo por quadro dá conta com folga.
- **Medidas em cm, retângulos alinhados aos eixos (giro de 90°):** cobre planta de móveis com contas simples e exatas de folga, que são o ponto do app.
- **Cômodo com paredes integradas** (rodada 3): na rodada 2, o "cômodo com paredes" criava 4 paredes soltas que não acompanhavam o redimensionamento. Agora `parede` é a espessura em volta do vão livre. Paredes soltas continuam existindo para divisórias e para dar nome a uma parede específica.
- **Cotas relativas ao recipiente:** o desenho do cooktop mede da bancada, não do mundo. `recipiente()` acha o menor cômodo ou item que contém o selecionado. Por isso o cooktop mede até a bancada, e a bancada até a cozinha.
- **Distâncias no lugar de X/Y:** ninguém pensa "x = 115"; pensa "10 cm da parede".
- **Travado bloqueia tudo (revisto em 02/10):**
  - Na primeira versão, travado só impedia arrastar o item e o dedo movia a vista. No celular isso parece o item saindo do lugar ("o trancar não funciona"), e o painel seguia editável, contra o "bloquear edição" que ele pediu.
  - Agora o item travado não muda: arrastar só faz tremer e avisar, e o painel fica só leitura.
  - Para andar pela planta: arrastar no vazio, ou dois dedos.
- **PNG em alta resolução, sem lista; lista só no PDF:** ele pediu para a imagem não crescer. O PNG a 3× deixa dar zoom nas medidas, e a lista, que deixaria a imagem comprida, ganhou página própria no PDF.
- **Proporção 1:N só no PDF:** a folha A4 impressa a 100% tem tamanho fixo, e o PNG não. No PNG a régua é a legenda de proporção.
- **Girar o cômodo leva o conteúdo:** girar só a caixa do cômodo deixaria os móveis do lado de fora. Quem quer girar um móvel sozinho seleciona o móvel.
- **Uma espessura para todas as paredes do cômodo:** cobre o caso comum com uma escolha só. Uma parede diferente pode ser uma parede solta.
- **PDF escrito à mão (JPEG por página):** sem biblioteca externa (jsPDF via CDN quebraria offline e é mais uma dependência). O custo é o PDF ser imagem, não vetor.
- **Link com o projeto no `#hash` (deflate + base64url):** compartilhar sem servidor e sem conta. O hash não é enviado ao servidor, então o projeto não passa por ninguém.
- **`localStorage` + backup em arquivo:** guardar sem servidor, sem login e de graça. A limitação (dados por navegador e por endereço) está avisada na tela de Ajustes e em `01-USO.md`.
- **Fontes pelo Google Fonts:** são as fontes da identidade. Sem internet, o app usa a fonte do sistema. PNG e PDF sempre saem com a fonte do sistema.
- **Painel lateral no computador e folha compacta no celular:** a primeira versão da folha cobria metade da tela do celular. O compacto deixa a planta visível, e o botão "Ajustes" abre o resto.
- **Repositório público:** o Pages grátis não serve repositório privado. O Rafael escolheu público em 02/10.
