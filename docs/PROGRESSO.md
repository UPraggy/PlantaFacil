# Progresso — Planta fácil

> Para outra IA continuar: leia de cima para baixo (mais novo primeiro), depois `CLAUDE.md`,
> `docs/02-ARQUITETURA.md` e `docs/04-DECISOES.md`. Para usar o app: `docs/01-USO.md`.
> Para publicar: `docs/03-PUBLICACAO.md`. Não use o conector Memória Babita.

## Estado em 02/10/2026

- **No ar:** https://plantafacil.rafaelmr.com.br. O endereço antigo, https://upraggy.github.io/PlantaFacil/, ainda abre direto em vez de redirecionar (veja PENDENTE 3).
- **Repositório:** `UPraggy/PlantaFacil` (público). `main` tem o código; `gh-pages` tem o site gerado pelo deploy.
- **Qualidade:** `npm test` = 75 verificações ok. No Visual Inspector, o design_radar deu 93 (A) e o audit_accessibility deu 100 (era 79).
- **Commits:** `142bede` (o app), `88953bb` (domínio no deploy) e os de deploy no `gh-pages`. Os primeiros saíram creditados à conta LGD-Ledgermany (PENDENTE 1).

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
- **Travar.**
  - Cadeado no painel do item (`travado`): arrastar só move a vista, as alças somem, as setas não movem e o Delete pede para destravar. Pelo painel ainda dá para mudar as medidas, porque ali é de propósito.
  - Pílula "Travar" na planta (`config.travado`): vale para tudo.

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
