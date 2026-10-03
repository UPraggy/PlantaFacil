# Progresso — Planta fácil

> Para outra IA continuar: leia de cima para baixo (mais novo primeiro), depois `CLAUDE.md`,
> `docs/02-ARQUITETURA.md` e `docs/04-DECISOES.md`. Para usar o app: `docs/01-USO.md`.
> Para publicar: `docs/03-PUBLICACAO.md`. Não use o conector Memória Babita.

## Estado em 03/10/2026

- **No ar:** https://plantafacil.rafaelmr.com.br. O endereço antigo, https://upraggy.github.io/PlantaFacil/, ainda abre direto em vez de redirecionar (veja PENDENTE 3).
- **Repositório:** `UPraggy/PlantaFacil` (público). `main` tem o código; `gh-pages` tem o site gerado pelo deploy.
- **Qualidade:** `npm test` = 114 verificações ok; `npm run e2e` (celular emulado + computador) ok; `npm run amostra` sem erros. No Visual Inspector, o design_radar deu 97 (A) e o audit_accessibility deu 100 (era 79).
- **Commits:** `142bede` (o app), `88953bb` (domínio no deploy) e os de deploy no `gh-pages`. Os primeiros saíram creditados à conta LGD-Ledgermany (PENDENTE 1).

## 03/10/2026 (4) — escolher item por item, cores livres, mais ícones e emojis

Pedidos do Rafael: "quero uma opção, um botão que se eu ativar eu escolho o que vai para a exportação" (perguntei e ele escolheu "os dois": tirar da folha **e** escolher quem leva as cotas detalhadas) e, no meio do trabalho, "aumente a quantidade de cores, deixe um seletor de cores e aumente a quantidade de ícones, deixe emojis para poder marcar o que é cada item".

**Feito:**
- **Escolher item por item** (menu Exportar): ligar a opção põe a planta no modo de escolha, com faixa âmbar no alto, sem menu de modos e sem Adicionar. Cada toque abre "“Nome” no arquivo" com Desenho e medida / Com as medidas detalhadas / Fica de fora. Selos ✓ ↔ ✕ na planta, e o que fica de fora aparece apagado. "Pronto", Esc ou Enter voltam ao menu, já com a prévia. O resumo diz quantos estão fora e quantos têm cotas no andar. A marcação vai no link e no .json.
- **Várias cadeias de cotas sem cruzar:** cada item do mesmo recipiente ganha uma linha 30 px mais para fora, e os totais saem uma vez só (`cotasSVG`, `cadeiaSVG(k, n)`, `respiroDe(..., niveis)`).
- **Cores:** 12 prontas (novas: amarelo, laranja, rosa, água, marrom, grafite) mais a **cor livre** (arco-íris → `<input type=color>`), no painel e no formulário Adicionar. `parCor` faz os tons para o tema claro, o escuro e a folha.
- **Ícones:** 27 (novos: TV, chuveiro, banheira, lavatório, máquina de lavar, mesa redonda, escrivaninha, criado-mudo, planta, tapete, escada, berço), em grade, com nome no toque longo e no leitor de tela.
- **Emojis:** 44 prontos e campo para digitar qualquer um. O emoji vai antes do nome na planta, na folha e na lista do PDF. Conferi que o emoji sai colorido no PNG, que passa por canvas.

**Como conferi:** `npm test` 114 ok (15 novas: escolha fora/cotas/níveis, cadeias sem cruzar, selecionado somado, cores livres nos dois temas, sanitização de cor, emoji e escolha, emoji no desenho e na lista, ícones em sincronia, link com emoji, escolha e cor livre). No preview a 375 px fiz o fluxo inteiro: liguei a escolha, toquei na geladeira, escolhi "Fica de fora" e toquei em Pronto. A prévia saiu sem geladeira e sem mesa e com as cadeias da pia e do cooktop empilhadas. Também testei a cor livre e o emoji pelo painel e vi a grade de 27 ícones. `npm run e2e` ok e `npm run amostra` sem erros.

## 03/10/2026 (3) — folha limpa por padrão, com prévia e opções

Pedido do Rafael (com a captura de uma exportação cheia de linhas cruzadas): "exportei o projeto mas ficou confusa as medidas, deixe eu selecionar o que quero, por padrão deixe só as medidas dos cômodos e móveis escritas em cima deles como estão".

**Feito:**
- **Padrão limpo:** a folha leva só nome e medida escritos em cima de cada cômodo e móvel. Cotas do item selecionado (`expCotas`, novo), folgas e total vêm desligados.
- **Menu Exportar → "O que vai nos arquivos":** prévia da folha (o mesmo SVG do PNG, `EX.folhaPNG`) e cinco opções com explicação. "Cotas do item selecionado" fica desabilitada sem seleção.
- **Folha enxuta:** sem o total e sem as cotas, a margem em volta encolhe (`respiroDe`) e a legenda não lista linhas que não estão na folha.
- **Migração:** projeto salvo antes (sem `config.expV` 2) volta **uma vez** para o padrão limpo, porque os de antes vinham com tudo ligado por padrão, não por escolha. Depois disso vale o que o usuário ligar.
- `npm run amostra` continua exportando a cozinha com tudo ligado (é a folha mais cheia, a que testa legibilidade).

**Como conferi:** `npm test` 99 ok (5 novas: padrão, migração, escolha mantida, folha limpa sem legenda de linhas, folha cheia com as três). No preview a 375 px: um projeto com folgas e total ligados abriu limpo, e ligar "Distância entre os itens" mudou a prévia na hora. `npm run e2e` ok (o PNG saiu só com Quarto, Cama e Mesa com as medidas). `npm run amostra` sem erros.

## 03/10/2026 (2) — nada se mexe sem escolher o modo

Pedido do Rafael: "não posso mover nada nem fazer outra edição a menos que ative o modo".

**Feito:**
- O app **abre em Mover planta**: arrastar só mexe a vista e tocar não abre painel. O modo não fica salvo, então é assim a cada abertura.
- **Adicionar é edição:** o botão some fora do Editar, e a tecla N só mostra o aviso. O "Criar cômodo" do projeto vazio é um pedido claro, por isso ele mesmo liga o Editar.
- Tocar num item fora do Editar mostra "Para mexer, escolha “Editar” ou “Mover cômodo” no alto." e o menu pisca em âmbar (`dicaModo`, uma vez a cada 4 s; sem animação com "reduzir movimento").
- A dica da primeira visita agora explica o menu.

**Como conferi:** `npm test` 94 ok. `npm run e2e` ok, com checagens novas: abre em `vista` sem o botão Adicionar; tocar na mesa no Mover planta não abre o painel e mostra a dica. A parte do computador aperta `1` antes de clicar.

## 03/10/2026 — menu de modos: Editar · Mover cômodo · Mover planta

Pedido do Rafael: "quero opção de alternar entre modo de edição do cômodo ou objeto, modo de arrastar o cômodo e modo de arrastar o plano para eu ver, coloque um menu fácil para isso, e publique no git".

**Feito:**
- **Menu `#modos`** logo abaixo das pílulas (Medidas, Folgas…): três botões grandes, ícone em cima e nome embaixo, o ativo em âmbar. Teclas `1`, `2`, `3`; setas andam entre eles (grupo de rádio acessível).
- **Editar:** tudo como era (toque abre o painel, arrasta o objeto, bolinhas redimensionam).
- **Mover cômodo:** arrastar em qualquer ponto do cômodo, mesmo em cima de um móvel, leva o cômodo **com tudo o que está dentro** (`DES.dentroDoComodo`, extraído do `girar` para os dois usarem o mesmo critério). Encaixe e ímã valem, mas o ímã só olha o que fica parado. Cômodo travado (ou planta travada) treme e avisa. Pinça no meio do arrasto desfaz o arrasto, como no Editar.
- **Mover planta:** todo arrasto de um dedo só mexe a vista; tocar não seleciona. Toque duplo e pinça continuam dando zoom.
- Entrar em Mover cômodo/Mover planta fecha o painel; adicionar item volta para Editar.
- **Celular com painel aberto:** o menu vira só ícones no canto direito, na linha do "Travar". A margem de cima do enquadramento agora é medida do menu real (`margens()`); com margem fixa maior, a planta ficava minúscula com o painel aberto (o e2e pegou isso).

**Como conferi:** `npm test` 94 ok (2 novas para `dentroDoComodo`). `npm run e2e` ok, com etapa nova: no Mover cômodo o quarto andou e a mesa de dentro foi junto; no Mover planta nada saiu do lugar e o painel ficou fechado; nenhum erro no console. No preview a 375 px: os três nomes cabem inteiros, e o tema claro no computador também ficou certo.

## 02/10/2026 (fim da noite) — folha legível no celular, com todas as medidas de dentro

Pedidos do Rafael: "teste a exportação, está muito pequena as informações de medidas" e "não dá para ver as medidas internas".

**O que estava errado:**
- O tamanho dos números era pensado em pixels da imagem (1,2×). A imagem tem 3600 px e, vista inteira no celular, tudo encolhia para uns 4 px.
- As folgas de todos e a medida total vinham da configuração da **tela**, que fica desligada para não poluir o desenho. A folha saía só com os tamanhos dos itens.
- Nome que não cabia num item pequeno era cortado ("Geladei…") ou sumia. O nome da bancada ficava escondido embaixo da pia e do cooktop.
- A folga do cooktop "atravessava" a bancada e media até a mesa, enchendo a folha de linhas cruzadas. Números de folga caíam em cima de nomes e uns dos outros.
- O PDF escolhia A4 deitado para uma cozinha quase quadrada, e a planta ficava espremida.

**Corrigido:**
- **`FORMATOS`** (`js/exportar.js`): tamanhos pensados para a folha inteira numa tela de 390 px. Medidas com ~27 px no PNG de 1200 e ~20 px no A4 (≈ 15 pt impresso); título, legenda, régua e lista crescem junto (`ui`). A resolução continua alta só para o zoom.
- **A folha tem os próprios interruptores:** `config.expMedidas`, `expFolgas` e `expTotal`, todos ligados por padrão, no menu Exportar → "Mostrar nos arquivos". A tela continua limpa.
- **`forcarRotulos`:** na folha nada some. Nome ou medida que não cabe vai logo abaixo do item, e o nome de quem tem coisas dentro ("Bancada · 200 × 63") vai embaixo dele. Esses rótulos são desenhados por cima das linhas (`o._fora`).
- **Folgas no escopo do recipiente:** o cooktop mede até a borda da bancada e a bancada até a parede, nunca através.
- **`rotuloLivre`:** o número de cada folga procura um lugar livre, desviando dos nomes e dos outros números. Na vertical, gira junto da linha se couber nela (`girarCotas`); folga curta (os 4 cm da pia) fica com o número deitado ao lado.
- **PDF:** testa A4 em pé e deitado e fica com o que deixa a planta maior. A proporção ("proporção **1:25** · impresso em A4 a 100%") foi para o cabeçalho; no rodapé ela passava por cima da legenda. A legenda só ganha entradas enquanto couber antes da régua.
- **Margens:** sem item selecionado, o respiro em volta da planta reserva só o que aparece ali (totais e rótulos das aberturas).
- **Lista do PDF:** linha comprida quebra em duas, e a paginação usa a altura real. Texto das aberturas: "parede **da** direita" (era "parede de direita").

**Como conferi:** `npm run amostra` (novo, `test/amostra-exportacao.js`) exporta a cozinha do desenho do cooktop: bancada com pia e cooktop, geladeira, mesa, janela e porta. Ele gera prévias com 390 px de largura.
- Leem-se sem zoom: pia 10/4/4/15, cooktop 10/10/8, bancada → geladeira 50, bancada → mesa 87, mesa 90/110/30, geladeira 185, totais 350 × 290.
- A página da lista também se lê sem zoom.
- PNG 3600 × 3687, PDF em A4 em pé, nenhum erro. Testes: `npm test` 92 ok e `npm run e2e` ok.

**Armadilha:** heredoc no Bash do Windows come barras invertidas (`\d` vira `d`) em script de patch. Para regex, escreva o script com a ferramenta de arquivo, não por heredoc.

## 02/10/2026 (noite) — revisão no celular: travar de verdade, paredes à vista, exportação legível

Pedidos do Rafael:
- "não achei quadrado para editar as paredes";
- "e o trancar não funciona";
- "quero que teste no celular… pode ser no navegador, basta usar o inspecionar";
- "verifique bem o design, motion, animação, microinteração, usabilidade";
- "melhore a exportação para melhor visibilidade das medidas, assim como a do PDF";
- "não precisa crescer tanto a imagem, só tem que ter boa resolução… e legenda de proporção".

**Como testei.** `test/e2e-celular.js` (`npm run e2e`): Chromium headless do Playwright, o mesmo do Visual Inspector, emulando um Android (390×844, densidade 3, toque de verdade via CDP `Input.dispatchTouchEvent`), mais uma passada no computador (1366×820).
- Percorre: criar cômodo com 3 paredes, janela e porta, tocar no miolo do cômodo, item dentro, travar e tentar arrastar, destravar e arrastar, girar, travar a planta, exportar e tema claro.
- Tira capturas e gera o PNG e o PDF; falha se o item travado mexer, se o destravado não mexer ou se houver erro no console.

**Corrigido** (achados do teste no celular):
- **Editor de paredes escondido.** No celular ficava atrás de "Ajustes". Agora aparece direto no painel do cômodo, destacado.
- **Selecionar o cômodo era difícil.** Só dava pela parede ou pelo nome. Agora tocar no miolo vazio dele também seleciona; arrastar ali continua movendo a vista.
- **"O trancar não funciona".** Arrastar um item travado movia a planta inteira, e no celular isso parece o item saindo do lugar; o painel também seguia editável. Agora:
  - o gesto `travado` não move nada: o item treme (`tremer`), o celular vibra e aparece o aviso;
  - o painel fica só leitura, com uma faixa explicando;
  - aparece um cadeadinho no item (só na tela);
  - o "Travar" da planta vira modo de ver: esconde o Adicionar e bloqueia girar, duplicar, Delete, setas e N.
- **Com cômodo selecionado o Adicionar sumia no celular**, e é aí que se põe item dentro dele. Agora vira um "+" redondo.
- **Aberturas caíam uma em cima da outra.** `novaAbertura` agora procura um trecho livre, com 10 cm de folga das outras e dos cantos, e passa para a próxima parede se não houver. Os rótulos de parede lateral correm ao longo da parede (giro −90°) e não invadem a cota do total.
- **Enquadramento.** Margens em pixels (`MARGENS`: esquerda 96, direita 86, cima 82, baixo 100) para caberem as cotas em cadeia, as pílulas e o zoom.
  - Ao tocar ou abrir o painel, `enquadrarSelecao()` deixa o selecionado e o recipiente dele inteiros na tela. Durante um arrasto isso fica para o fim do gesto.
  - Ao abrir um projeto, a planta sempre se enquadra; a vista salva podia ser de outro aparelho.
- **Celular com painel aberto.** Só a pílula "Travar" fica e o aviso sobe para o alto. O formulário Adicionar ganhou rótulos curtos e a linha "medidas de dentro (vão livre)".
- **Aba em segundo plano.** O `requestAnimationFrame` pausa e a planta ficava em branco. Agora o `agendar()` desenha por temporizador, sem animar, e as animações continuam quando a aba volta.

**Exportação:**
- Medidas 1,2× maiores (`AMPLIA`). A nitidez vem da resolução: PNG a 3× (cerca de 3600 px de largura) e PDF a 2,5×. A imagem não cresce.
- **Legenda de proporção:** régua desenhada (10 cm a 100 m, escolhida pelo zoom). No PDF vai também "proporção 1:N (A4 a 100%)"; no PNG só "escala", porque 1:N depende do zoom de quem abre.
- **Lista de medidas no PDF** (`config.lista`, ligada por padrão), numa página A4 depois de cada andar:
  - cômodos com vão livre, área, paredes e aberturas ("Janela 120 cm — parede de cima, a 90 cm da esquerda");
  - cada item com medida e distâncias até onde está ("Cooktop 75 × 45 cm — ← 10 · → 10 · ↑ 10 · ↓ 8 cm (até Bancada)");
  - o que está fora dos cômodos;
  - quebra em páginas, com numeração "PÁGINA i / n".

**Visual Inspector:** radar 97 (A); cor, tipografia, espaçamento, movimento e acessibilidade em 100, desempenho em 80. Acessibilidade 100, com contraste 44/44. Movimento: transições em 72 elementos (160/80/240 ms, curvas standard e spring) e 6 animações nomeadas.

**Armadilhas novas:**
- O painel interno do Claude e o Chrome minimizado ficam `hidden`. Para teste visual use o `npm run e2e` (headless renderiza e anima).
- O Playwright 1.60 do Visual Inspector procura o `chromium-1223`, mas o instalado é o `chromium-1234`: passe `CHROMIUM=`.
- Para semear dados num teste, use `addInitScript` antes do primeiro load. Gravar e depois recarregar não serve, porque o `pagehide` regrava o estado da memória.

## 02/10/2026 — paredes por lado, girar cômodo, janelas e portas, frente e trás, travar

Pedidos do Rafael:
- "quero poder editar quantas paredes o cômodo tem e rotacionar";
- "dê a opção de adicionar vazamento nos cômodos como se fosse janelas e editar o que está na frente e bloquear edição para não mover sem querer".

**Feito** (`npm test` = 75 verificações; conferido no navegador, no computador e em 375 px):
- **Paredes por lado.** Campo `lados` (`'cdbe'` = cima, direita, baixo, esquerda), com uma espessura só (`parede`).
  - No painel e no formulário Adicionar há um quadradinho com os 4 lados: tocar liga ou desliga. O resumo diz, por exemplo, "3 paredes · aberto embaixo".
  - Lado aberto aparece tracejado.
  - `limites()`, as cotas em cadeia, o ímã e o toque usam só as paredes que existem.
- **Girar cômodo.** O ⟳ (ou a tecla `R`) gira 90° no sentido horário e leva junto tudo o que está dentro: itens, paredes soltas, os lados com parede e as aberturas (`DES.girar`). O aviso diz "Quarto girou com N itens dentro".
  - Todo item tem `giro` (0, 90, 180 ou 270), e o ícone gira de verdade. Antes o encosto do sofá ficava sempre em cima.
- **Aberturas (janela, porta, vão).** Campo `aberturas: [{ lado, pos, larg, tipo }]` do cômodo; `pos` conta a partir da esquerda (lados de cima e de baixo) ou de cima (lados esquerdo e direito).
  - A parede é cortada no vão.
  - A janela tem linhas de vidro, a porta tem folha e arco abrindo para dentro, o vão só batentes.
  - O rótulo ("janela 120") fica por fora da parede.
  - No painel, "Janelas, portas e vãos" lista cada uma, com tipo, parede, distância do canto e largura (com − e +), e tem os botões + Janela, + Porta e + Vão.
- **O que fica na frente.**
  - Em Mais opções: "Trazer para frente" e "Enviar para trás" (ordem em `andar.itens`).
  - Tocar de novo no mesmo lugar passa para o item de trás (espera 330 ms para não brigar com o toque duplo).
  - O item selecionado continua arrastável mesmo com outro por cima.
- **Travar** (cadeado por item e "Travar" geral). *Comportamento revisto na entrada de cima.*

**Armadilha nova:** ao testar lendo o `localStorage`, espere mais de 250 ms depois da ação, porque o app salva com atraso. Duas leituras de teste deram falso negativo por isso.

## 02/10/2026 — domínio próprio `plantafacil.rafaelmr.com.br`

**Feito:**
- **Configuração:** o `deploy.config.json` agora guarda `remote`, `branch` e `cname`, e o `npm run deploy` publica com o `CNAME` sem opções extras. A `404.html` publicada passou a ter `<base href="/">`.
- **GitHub:** pegou o domínio sozinho, pelo arquivo `CNAME` no `gh-pages`. Em *Settings › Pages* aparece "Your site is live at http://plantafacil.rafaelmr.com.br/".
- **DNS:** fica na Cloudflare, com NS `melany`/`miguel`. O registro `plantafacil` já existia, criado pelo Rafael: CNAME para o GitHub com o proxy laranja ligado, igual ao `lnoffice`. Não mexi na Cloudflare.
- **Conferido ao vivo:** `https://…/` responde 200, assim como `/js/app.js` e `/style.css`. O caminho `/a/b/c` dá 404 com a página própria e o botão voltando para `/`. No Chrome do Rafael abriu sem erro no console, e o link de compartilhar já sai com o domínio novo.

**Observado (não é erro nosso):**
- **"Enforce HTTPS" no GitHub fica indisponível.** Com o proxy da Cloudflare o GitHub não vê o próprio IP. O HTTPS vem da Cloudflare, e o `lnoffice` está igual.
- **`http://` não redireciona para `https://` em nenhum subdomínio da zona.** Isso inclui `lnoffice` e `rafaelmr.com.br`. É o "Always Use HTTPS" desligado na Cloudflare.

## 02/10/2026 — publicação no GitHub Pages

- **Repositório:** o Rafael achou que tinha criado o `UPraggy/PlantaFacil`, mas ele não existia (SSH: "Repository not found"; na conta só havia Pechincha, AutoShortEditor, TrilhaRM etc.). Ele escolheu "crie você, público", e eu criei pelo Chrome dele, logado como UPraggy, vazio e sem README.
- **Envio:** `git init -b main`, commit e push do código. Depois `npm run deploy` criou o `gh-pages`.
- **Pages:** com o `gh-pages`, ficou em "Deploy from a branch › gh-pages / (root)" sozinho, então não precisei mudar nada.
- **Conferido:** todos os arquivos davam 200, o 404 publicado tinha `<base href="/PlantaFacil/">` (antes do domínio) e o `app.js` publicado era idêntico ao local (md5).

## 01–02/10/2026 — construção (três rodadas)

**Origem:** a pergunta do Rafael sobre a bancada para o cooktop Electrolux KE5GR e o desenho da planta que fiz para responder. Ele gostou do desenho e pediu um app "no estilo da imagem". Os números estão em `docs/04-DECISOES.md`.

**Rodada 1, a base:**
- **Estrutura:** projetos, andares e itens em `localStorage`, com desfazer e refazer e tema claro e escuro.
- **Desenho:** SVG com pan, zoom e pinça.
- **Medidas:** folgas entre itens.
- **Saídas:** PNG, PDF escrito à mão sem biblioteca, e arquivo `.json`.
- **Removido nesta rodada:** havia catálogo de móveis prontos e PWA. O PWA saiu porque ele pediu "nada instalável, apenas um site no githubpages".

**Rodada 2, identidade e movimento:**
- **Identidade:** visual da identidade Rafael MR, tirado da pasta `ME/PlanejamentoCarreira`.
- **Aparência:** texturas (rachura, cruzada, pontos, linhas, tijolo) e 15 ícones de móveis vistos de cima.
- **Movimento:**
  - itens entram com animação, a seleção pulsa e a câmera desliza;
  - o celular vibra quando o ímã gruda;
  - tokens do Visual Inspector (`motion_tokens_generate`).
- **Compartilhar:** link com o projeto no `#hash`; arrastar e soltar `.json` para importar.
- **Infraestrutura:** página 404, `scripts/serve.mjs` e `scripts/deploy.mjs` no esquema do Escritório Virtual.

**Rodada 3, revisão de usabilidade.** Pedidos dele:
- "deixe adicionar itens com tamanho personalizado";
- "não precisa ter uma pré-seleção de itens";
- "mover dentro do cômodo, nomear, ampliar a planta, mudar de cor, mostrar a medida deles assim" (a imagem do cooktop);
- "revise todo o design… o mais usável possível, interativo".

O que mudou:
- **Adicionar:** formulário de tamanho livre, com tipo, nome, medidas com − e + de segurar, cor e paredes. Lembra os últimos valores e cai no centro do cômodo selecionado.
- **Cômodo com paredes integradas** (campo `parede`): elas crescem junto ao redimensionar.
- **Cotas em cadeia do item selecionado** em relação ao recipiente (cômodo ou outro item), ao vivo enquanto arrasta. Reproduz o desenho: 10 · 45 · 8, 10 · 75 · 10, 63, 95.
- **Distâncias editáveis** até as quatro bordas, no lugar dos campos X/Y.
- **Zoom:** botões − ⤢ +, régua de escala, toque duplo para aproximar e atalhos `+`/`−`.
- **Painel:** coluna lateral no computador (≥ 900 px). No celular abre compacto, com "Ajustes" para o resto, e esconde o botão Adicionar e a régua enquanto há seleção.
- **Rótulos:** item com outros dentro (bancada com cooktop) mostra o nome no canto.
- **Exportação:** com item selecionado, o PNG e o PDF levam as cotas dele.
- **Acessibilidade:** a auditoria do Visual Inspector subiu de 79 para 100.
  - O cinza de rótulos do tema claro passou de `#737890` para `#5F6378` (de 4,18:1 para cerca de 5,6:1).
  - O campo de arquivo ganhou `aria-label`.
  - Os alvos de toque principais subiram para 44 px.

## Armadilhas (para quem testar ou mexer)

- **Chrome minimizado** (`document.visibilityState === 'hidden'`):
  - o `requestAnimationFrame` para, então a tela não redesenha e `#vazio` não atualiza;
  - o `screenshot` dá timeout;
  - o `computer type` não chega no campo; use `form_input` ou JS.
  - O painel interno do Claude escondido faz a mesma coisa. Ali o `resize_window` com `preset: mobile` funciona para conferir celular.
- **Clique logo depois do `navigate`** às vezes se perde, porque a página ainda carrega. Espere cerca de 1 s.
- **`localStorage.clear()` seguido de reload em teste:** o `pagehide` regrava o estado que estava na memória. Para zerar de verdade, limpe e feche a aba, ou limpe depois do load.
- **O `localStorage` é por origem:** `localhost:5180`, `upraggy.github.io` e `plantafacil.rafaelmr.com.br` têm dados separados. Para levar um projeto de um para outro, use o link ou o `.json`.
- **SVG desenhado como imagem não carrega web fonts.** Por isso o PNG e o PDF usam a fonte do sistema (Segoe UI/Consolas no Windows). É esperado.
- **No código:**
  - `h()` precisa de `flat(Infinity)` (corpo de modal é lista de listas);
  - `replaceChildren(null)` vira o texto "null";
  - botão com `display: grid` herda o `justify-content: center` do estilo base;
  - `<a class="btn">` não pega o estilo de `button`.
- **Heredoc do Bash** (`<<'EOF'`) quebrou num arquivo com aspas e `%%EOF`. Para arquivo grande, use o Write.
- **Avisos `LF will be replaced by CRLF`** no deploy são inofensivos (`core.autocrlf` do Windows).
- **O `gh` CLI não está instalado** no Git Bash desta máquina; tudo vai por git + SSH.

## PENDENTE

1. **Autoria dos commits (decisão do Rafael).** Os commits saem com o gmail e caem na conta LGD-Ledgermany. Proposta, igual ao Pechincha:
   - `git config user.email 100146657+UPraggy@users.noreply.github.com` só neste repositório;
   - `.githooks/commit-msg` anti-coautor e `git config core.hooksPath .githooks`;
   - o `scripts/deploy.mjs` passar a mesma identidade para o commit do `gh-pages`, que hoje usa a configuração global, porque o deploy commita num clone separado em `.cache/gh-pages`.

   Opcional: reescrever os commits antigos para a identidade nova, o que exige push forçado no `main` e no `gh-pages`. Código e configuração dependem de OK.
2. **Cloudflare "Always Use HTTPS"** (SSL/TLS › Edge Certificates) resolveria o `http://` sem redirecionamento na zona toda. Decisão dele, não mexi.
3. **Conferir se `upraggy.github.io/PlantaFacil/` passou a redirecionar** para o domínio próprio quando o GitHub terminar a checagem de DNS. Se passar, quem usou o endereço `github.io` antes perde o acesso aos dados de lá (outra origem): exportar antes.
4. **Dados de teste** no Chrome do Rafael, em `localhost:5180` ("Meu projeto" e duas "Cozinha"). Podem ser apagados pela lista de projetos.
5. **Ideias não feitas,** só se ele pedir:
   - itens em ângulo livre (hoje giram de 90° em 90°);
   - arrastar a janela ou a porta direto na planta (hoje se ajustam pelo painel);
   - espessura diferente por parede;
   - seleção múltipla;
   - editar uma cota tocando no número;
   - copiar item para outro andar;
   - régua de medir livre;
   - PDF vetorial (hoje é imagem JPEG por página).
