# Arquitetura — Planta fácil

Site estático: `index.html` carrega `style.css` e quatro scripts clássicos, nesta ordem. Cada um se registra em `window.PF`:

```
js/dados.js     → PF.dados     modelo, sanitização, localStorage, arquivo .json
js/desenho.js   → PF.desenho   SVG da planta (puro: recebe dados, devolve string)
js/exportar.js  → PF.exportar  PNG, PDF, link de compartilhar
js/app.js       → (IIFE)       tela: gestos, painel, modais, animação, teclado
```

`dados`, `desenho` e `exportar` não tocam no DOM na hora de carregar, então rodam no Node: é assim que `test/logica.test.js` os testa. O `app.js` é o único que conhece a página.

| Arquivo | Linhas | Papel |
|---|---|---|
| `index.html` | 213 | Estrutura: topo, andares, palco (SVG `#tela` › `#mundo`), painel, sprite de ícones de interface |
| `style.css` | 298 | Tokens de tema e movimento, layout celular e computador (≥ 900 px), animações |
| `js/dados.js` | 195 | Modelo e persistência |
| `js/desenho.js` | 557 | Desenho |
| `js/exportar.js` | 238 | Saídas |
| `js/app.js` | 1264 | Interação |
| `404.html` | 74 | Página de erro (o `__BASE__` é trocado no deploy) |
| `scripts/serve.mjs` | 42 | Servidor local que imita o Pages |
| `scripts/deploy.mjs` | 77 | Publicação no `gh-pages` |
| `test/logica.test.js` | 150 | 75 verificações |

## Modelo de dados (`js/dados.js`)

Tudo em **centímetros**. `x` cresce para a direita e `y` para baixo (o "topo" da planta é o lado de cima da tela).

```js
estado  = { versao: 1, atualId, projetos: [projeto] }            // localStorage['plantafacil:v1']
projeto = { id, nome, criado, atualizado, andarAtual, andares: [andar],
            config: { encaixe: 1|5|10, ima, medidas, folgas, total } }
andar   = { id, nome, itens: [item], vista: { tx, ty, z } | null }  // vista = câmera daquele andar
item    = { id, tipo: 'item'|'comodo'|'parede', nome, x, y, w, h,
            cor: 'azul'|'ambar'|'verde'|'terra'|'roxo'|'cinza',
            textura: 'liso'|'rachura'|'cruzada'|'pontos'|'linhas'|'tijolo',
            simbolo: '' | um de D.SIMBOLOS (só tipo item),
            giro: 0|90|180|270 (para onde o ícone está virado),
            travado: boolean (arrastar não move nem redimensiona),
            parede: espessura em cm (só tipo comodo; 0 = sem paredes),
            lados: subconjunto de 'cdbe' (só comodo; quais lados têm parede: cima, direita, baixo, esquerda),
            aberturas: [{ id, lado: 'c'|'d'|'b'|'e', pos, larg, tipo: 'janela'|'porta'|'vao' }] (só comodo) }
config.travado = boolean (trava a planta inteira)
```

- **Cômodo:** `x/y/w/h` é o **vão livre**. As paredes ocupam `parede` cm do lado de fora, só nos `lados` ligados. `DES.ladosDe(i)` devolve os lados que de fato têm parede (`''` se a espessura é 0), e `DES.limites(i)` o retângulo externo.
- **Abertura:** `pos` é a distância do canto, contada a partir da esquerda nos lados `c`/`b` e de cima nos lados `e`/`d`. O desenho limita a abertura ao tamanho do lado (`aberturasNoLado`). `D.novaAbertura(comodo, tipo)` cria uma centrada no primeiro lado com parede (janela 120, porta 80, vão 90).
- **Outras chaves no `localStorage`:**
  - `plantafacil:tema` guarda `auto|claro|escuro`;
  - `plantafacil:novo` guarda os últimos valores do formulário Adicionar;
  - `plantafacil:dica` marca que a dica inicial já apareceu.
- **Salvar:** `agendarSalvar` espera 250 ms. `salvarAgora` roda no `pagehide` e no `visibilitychange`. Se o `localStorage` falhar (cota, modo privado), aparece um aviso a cada 30 s no máximo.
- **Sanitização (`limparItem`, `limparAndar`, `limparProjeto`):** números com limites (posição ±1e5, medidas 1..1e5, parede 0..100), nomes com até 60 caracteres (40 no andar), enums validados. Valor inválido cai no padrão.
- **`novoItem(spec, cx, cy, existentes, encaixe)`:** cria um item centrado e encaixado na grade. Sem nome, vira "Item 3", "Cômodo 2" etc.
- **Histórico (em `app.js`):** guarda fotos `JSON.stringify(andares.map(a => [id, nome, itens]))`, sem a `vista`, para desfazer não mexer na câmera. São até 80 passos. O `commit()` só empilha se mudou, e é chamado no fim do gesto e no `change` dos campos.

### Arquivo `.json`
```js
{ formato: 'plantafacil', versao: 1, exportado: ISO, projeto }    // "Arquivo do projeto"
{ formato: 'plantafacil', versao: 1, exportado: ISO, projetos: [] } // "Backup de tudo"
```
`paraImportar` aceita os dois formatos e também um projeto "solto" (`{ andares: [...] }`). **Sempre gera ids novos**, então importar duas vezes não colide. Aceita no máximo 200 projetos por arquivo.

### Link de compartilhar (`js/exportar.js`)
`#p=z.<base64url(deflate-raw(JSON))>`. Sem `CompressionStream`, usa `#p=r.<base64url(JSON)>`. O conteúdo é compacto:
```js
{ v: 1, n: nome, c: config, a: [{ n: nomeDoAndar, i: [[tipo, nome, x, y, w, h, cor, textura, simbolo, parede, lados, giro, aberturas, travado], …] }] }
// aberturas = [[lado, pos, larg, tipo], …]; travado = 0|1. Links antigos (sem os 4 últimos) continuam abrindo.
```
- O hash **nunca vai para servidor**.
- Ao abrir o link, `receberLinkDaUrl` passa o conteúdo por `paraImportar`, cria um projeto novo, avisa e limpa o hash com `history.replaceState`. Também roda no `hashchange`.
- Um projeto pequeno dá cerca de 270 caracteres. Acima de 6000 aparece um aviso de que alguns apps cortam links longos.

## Desenho (`js/desenho.js`)

- **Cores:** `CORES` tem 12 prontas (`[preenchimento, contorno, texto]` por tema). `item.cor` também aceita `#RRGGBB` (cor livre do seletor): `parCor(cor, tema)` clareia ou escurece para o preenchimento e ajusta o contorno pelo brilho. Use sempre `parCor`, nunca `CORES[cor]` direto.
- **Emoji:** `item.emoji` (até 8 caracteres, `D.limparEmoji`) vai antes do nome em tudo que escreve o nome (`rotuloNome`, lista do PDF).
- **Ícones:** 27 em `SIMBOLOS` (mesma lista em `dados.js`, testado), nomes de tela em `NOMES_SIMBOLO`.

Uma única função monta a planta para a **tela e a exportação**:

```js
DES.conteudo(andar, { z, t, medidas, folgasTodos, total, selId, hoverId, fx, fantasmas, pulso, cadeados, forcarRotulos }) → string SVG
```

- **Escala `z` (px por cm).** Na tela, `#mundo` recebe `translate(tx ty) scale(z)`, então as coordenadas internas são cm. Traços e textos usam `/z` (ex.: `12 / z`) para terem sempre o mesmo tamanho em pixels, qualquer que seja o zoom.
- **Ordem:** cômodos, depois paredes, depois itens. Por cima vêm as folgas, o total, o realce de hover e a seleção com as cotas.
- **Cada item** é desenhado em camadas: preenchimento, textura (`<pattern>` com espaçamento fixo em pixels, como hachura de CAD), contorno, ícone e rótulos.
- **Paredes do cômodo (`paredesSVG`):**
  - Cada lado ligado vira um retângulo. Os de cima e de baixo cobrem os cantos quando o lado vizinho também tem parede.
  - O retângulo é cortado nos vãos (`sobras`), e lado sem parede vira linha tracejada.
  - Nas aberturas, a janela desenha 4 linhas ao longo do vão (faces e vidro duplo) e a porta desenha a folha mais o arco de raio = largura, abrindo para dentro (o `sweep` do arco depende do lado). Todas têm batentes.
  - Com Medidas ligado ou o cômodo selecionado, aparece o rótulo "janela 120" por fora.
- **Ícone girado:** desenhado nas medidas originais (`w0`/`h0`) e girado com `translate(…) rotate(giro)`.
- **Rótulos (`cabe()`):** cortam com "…" ou somem quando não cabem. Item que contém outros (bancada com cooktop) leva o nome no canto. Parede vertical tem o texto girado −90°.
- **Temas (`TEMAS.claro`, `TEMAS.escuro`):** a exportação usa `TEMA_EXPORT`, que é o claro com fundo branco e `girarCotas: true` (número de cota vertical gira −90° e corre junto da linha, em vez de ficar deitado ao lado).
- **`forcarRotulos` (só na folha):** nada some por falta de espaço.
  - Nome cortado ("Geladei…") não aparece dentro: vai inteiro logo abaixo do item, e a medida que não coube vai embaixo do nome.
  - Item com outros dentro (bancada com cooktop) leva "Bancada · 200 × 63" logo abaixo dele, em vez do canto.
  - Esses rótulos de fora vão para `o._fora` e são desenhados **depois** das linhas das folgas, para nenhuma linha riscar o texto.
- **`CORES[cor][tema]`** é `[preenchimento, contorno, texto]`.
- **Ícones (`SIMBOLOS`):** 15 desenhos em linha, vistos de cima, gerados na medida real do item. Assim o cooktop sempre tem 5 bocas redondas, nunca ovais.
- **Miniaturas do painel:** `iconeSimbolo` e `iconeTextura` usam `currentColor` e acompanham o tema.
- **Grade blueprint:** linhas a cada 10 cm, 1 m e 10 m, cada uma só aparece quando sobra pelo menos 7 px entre elas, mais os "nós" (cruzinhas) a cada 1 m.

### Girar (`DES.girar(alvo, itens)`)
- Gira 90° no sentido horário em volta do centro do alvo (`(dx, dy) → (−dy, dx)`, com `y` para baixo). Troca `w`/`h`, soma 90 no `giro` e arredonda em 0,1 cm.
- No cômodo, leva junto todo item cujos `limites` estão dentro dos `limites` dele.
- Lados: `c→d→b→e→c`.
- Aberturas: o lado segue a mesma roda. Nas que vão da direita para baixo ou da esquerda para cima a contagem inverte: `pos = novaLargura − pos − larg`.
- Quatro giros voltam exatamente ao começo (há teste).

### Folgas e cotas
- **`folgasDe(S, itens)`:** para cada direção (esquerda, direita, cima, baixo), acha o vizinho mais próximo que se sobrepõe a S no outro eixo e devolve a distância.
  - **Escopo = recipiente de S.** Contam as bordas internas do recipiente (`dentro: true`) e os vizinhos que estão dentro dele; o que está fora não conta. Sem isso o cooktop "media" até a mesa atravessando a bancada. Sem recipiente, conta a borda do cômodo que o contém, como antes.
  - Encostado (0) ou sobreposto não gera linha.
  - A linha passa no meio da faixa de sobreposição.
  - Pares A→B e B→A geram a mesma linha, e `conteudo` remove a duplicada.
- **`recipiente(S, itens)`:** o menor cômodo ou item (nunca parede) que contém S por inteiro. A tolerância é de 0,01 cm, e um item do mesmo tamanho não conta como recipiente.
- **`cadeiaSVG(S, C)`** desenha o "desenho do cooktop":
  - cadeia vertical à esquerda de C (`T→topo de S`, `S.h`, `base de S→B`);
  - cadeia horizontal embaixo (`L→S`, `S.w`, `S→R`);
  - totais `C.h` à direita e `C.w` embaixo;
  - linhas de chamada tracejadas.
  
  Folga sai em vermelho, a medida do item em azul e o total em cinza. As cadeias ficam fora das paredes do cômodo. Trecho curto (< 30 px) afasta o rótulo para não colidir.
- **Número das folgas (`rotuloLivre`):** a linha é desenhada sem texto e o número procura o primeiro lugar livre entre alguns candidatos (acima/abaixo da linha horizontal; dos dois lados da vertical), desviando dos nomes dos itens (`caixasDosNomes`) e dos números já postos.
  - Vertical na folha: girado junto da linha **se couber nela**; folga curta (os 4 cm da pia até a borda da bancada) fica com o número deitado ao lado, que ocupa bem menos altura.
- **Seleção:** com recipiente, mostra a cadeia, e as folgas para as bordas dele são escondidas porque já estão na cadeia. Sem recipiente, mostra largura em cima e profundidade à esquerda, mais as folgas dos vizinhos.

## Interação (`js/app.js`)

- **Renderização:** `agendar()` agenda um `requestAnimationFrame`, que chama `renderizar()`, que monta tudo e faz `mundo.innerHTML = s`. É desenho imediato e sem DOM por item, o que basta para centenas de itens.
- **Câmera:** `andar.vista` guarda `{ tx, ty, z }`. A função `plano(sx, sy)` converte pixel em cm. `vistaPara(caixa, margem, zMax)` enquadra, e `calcularVista()` enquadra o andar com espaço para as cotas.
- **Gestos (`pointerdown`, `pointermove`, `pointerup`):**

  | Gesto | Quando |
  |---|---|
  | `redim` | começou numa alça do selecionado (raio de 22 px) |
  | `moverComodo` | modo Mover cômodo, começou dentro de um cômodo (`comodoEm`: o menor que contém o ponto, contando as paredes). Leva junto `DES.dentroDoComodo` (o mesmo critério do girar), com o ímã olhando só o que fica parado |
  | `mover` | começou num item (passa a mover depois de 4 px) |
  | `pan` | começou no vazio, ou com o botão do meio do mouse |
  | `pinca` | segundo dedo; se havia arrasto em curso, ele é desfeito |
  | `espera` | sobrou um dedo depois da pinça |

  - **Modos** (`modo` em `app.js`, menu `#modos`, `definirModo()`): `editar` é o comportamento abaixo; `comodo` troca a escolha do alvo por `comodoEm` e o gesto `moverComodo` (fora de cômodo = `pan`); `vista` faz todo gesto de um dedo virar `pan`. Trocar para `comodo`/`vista` desseleciona; criar item volta para `editar`. O modo não é salvo e **o app abre em `vista`** (regra do Rafael: nada se mexe nem se edita sem escolher o modo). O `.fab` só aparece com `data-modo='editar'`; `podeAdicionar()` barra a tecla N fora dele; o Criar cômodo do estado vazio liga o Editar sozinho. Toque sem mover fora do Editar chama `dicaModo()` (aviso + `#modos.chamar`, uma vez a cada 4 s), depois de 330 ms para não atrapalhar o toque duplo. `palco.dataset.modo` dá o cursor no CSS.
  - **Margem do alto** (`margens()`): medida do `#modos` real (`offsetTop + offsetHeight`), porque no celular com o painel aberto o menu encolhe para ícones na linha do Travar; com margem fixa a planta ficava minúscula.
  - **Toque sem mover:** no vazio desseleciona, no item seleciona.
  - **Toque de novo no selecionado** com outros itens sob o dedo (`itensEm` lista da frente para trás): depois de 330 ms, se não veio o segundo toque do toque duplo, passa para o próximo da lista (`gesto.ciclo`).
  - **O selecionado é o arrastado** se estiver sob o dedo, mesmo atrás de outro.
  - **Travado** (`travado(i)` = `config.travado` ou `i.travado`):
    - o toque seleciona; arrastar vira o gesto `travado`, que **não move nada**, nem a vista, e só chama `tremer()`, `vibrar()` e `avisoTravado()`;
    - sem alças; o painel ganha a classe `so-leitura`, com todos os campos e botões desabilitados menos cadeado, OK e Ajustes;
    - girar, duplicar, Delete, setas e N (com a planta travada) são bloqueados;
    - o cadeadinho é desenhado por `cadeadoSVG` só com `o.cadeados` (tela).
  - **Miolo do cômodo:** tocar no vazio dentro de um cômodo (`comodoNoToque`) seleciona o menor cômodo sob o dedo.
- **Enquadramento:** `MARGENS` em pixels. `vistaPara(caixa, margens, zMax)` aceita margens por lado. `enquadrarSelecao()` roda ao tocar, ao redimensionar (painel abrindo) e no fim de um arrasto, se ficou pendente: se o recipiente do selecionado não cabe, enquadra; se só está para fora, desliza.
- **Aba em segundo plano:** `agendar()` usa `setTimeout` quando `document.hidden`, porque o rAF pausa. Animações só seguem com a aba visível.
  - **Dois toques em menos de 320 ms e 28 px:** `toqueDuplo` aproxima até o item, ou 2× no ponto.
  - **Roda do mouse:** zoom em volta do cursor (com `Ctrl`, mais rápido).
- **O que dá para pegar (`itemEm`):** itens primeiro, depois paredes, depois cômodos.
  - O cômodo só é pego pela borda (8 px), pelas paredes ou pelo nome; o miolo fica livre para os itens e para mover a vista.
  - Item fino tem área de toque de pelo menos 18 px.
- **Alças:** 8 no item, ou só 2 cantos quando ele aparece com menos de 48 px. A parede tem 2, nas pontas do comprimento.
- **Encaixe e ímã:** a posição arredonda para `config.encaixe`. O ímã (`alinhar`) puxa as bordas para as dos outros itens a até 8 px de distância, incluindo a face externa das paredes do cômodo. Uma guia tracejada mostra o alinhamento, e o celular vibra 8 ms ao grudar.
- **Painel (`atualizarPainel`):** não sobrescreve o campo que está em foco.
  - As distâncias usam o recipiente "congelado" (`distCont`) enquanto se digita, para o item não trocar de recipiente no meio.
  - Os botões − e + (`segurar`) repetem a cada 70 ms depois de 380 ms segurando. Pelo teclado, usam `click` com `detail === 0`.
- **Adicionar (`menuAdicionar`):** o destino é decidido por `destinoNovo`: o cômodo selecionado, senão o recipiente do selecionado, senão o cômodo no meio da tela. Depois de criar, `medirPalco()` mede de novo (o painel acabou de abrir e a planta encolheu) e a vista se ajusta se o item ficou fora.
- **Modais:** `abrirModal(título, …corpo)` monta uma folha que sobe no celular e um diálogo centralizado no computador. Fecham com `Esc` ou clique fora. Os elementos são criados com `h(tag, attrs, …filhos)`: `on*` vira listener e `null`/`false` são ignorados.

### Movimento
Os tokens vieram do Visual Inspector (`motion_tokens_generate`): 80, 160, 240 e 400 ms; easings standard, decelerate, emphasized e spring (`cubic-bezier(.34, 1.56, .64, 1)`); stagger de 40 a 70 ms.

| Efeito | Onde | Duração |
|---|---|---|
| Item entra (escala 0,86 → 1 + opacidade) | `entrar()`, ao adicionar, abrir ou trocar de andar | 280 ms, 45 ms de stagger (18 ms ao abrir) |
| Item sai (fantasma que encolhe) | `sair()`, ao excluir | 220 ms |
| Anel ao selecionar + alças "pop" | `pulsar()` | 520 ms / 220 ms (back) |
| Câmera desliza (zoom em escala log) | `irParaVista()`: ajustar, botões de zoom, toque duplo | 320 ms |
| Folhas, avisos, chips, estado vazio, 404 | CSS (`@keyframes` em `style.css` e `404.html`) | 160 a 400 ms |

Os efeitos de JS entram em `renderizar`, que segue pedindo quadros enquanto houver animação. Com `prefers-reduced-motion`, o JS pula tudo (`reduzir`) e o CSS zera durações.

## Exportação (`js/exportar.js`)

- **O que vai na folha** (`config`): `expMedidas` (ligado), `expCotas` (cotas em cadeia do selecionado), `expFolgas`, `expTotal` e `lista` (página do PDF). Desde 03/10 o padrão é limpo: só `expMedidas` e `lista`. `gerar()` zera o `selId` sem `expCotas`; `respiroDe(A, comSel, comTotal)` só reserva espaço para o que vai na folha, e a legenda só lista os tipos de linha presentes. Projeto sem `config.expV >= 2` (de antes) volta uma vez para o padrão limpo em `limparProjeto`.
- **Escolher item por item** (`config.expEscolha` + `item.exp` = `''` | `'cotas'` | `'fora'`): `EX.paraFolha(proj, andar, selId)` devolve o andar sem os "fora", os `cotasIds` (marcados "cotas" + o selecionado se `expCotas`) e `niveis` (maior número de cadeias no mesmo recipiente). `DES.conteudo` desenha `cotasIds` com `cotasSVG(i, o, cont, k, n)`: a k-ésima cadeia do mesmo recipiente vai 30 px mais para fora e os totais do recipiente saem uma vez, depois das n cadeias; `respiroDe` reserva esse espaço. Na tela, `entrarEscolha()` (em `app.js`) troca todo toque por `escolherItem()` (modal com as 3 opções) e `marcasEscolha()` desenha os selos ✓ ↔ ✕.
- **Prévia:** `EX.folhaPNG(proj, andar, selId)` devolve `{ W, H, svg }` da folha do PNG; o menu Exportar mostra esse SVG num `<img>` e refaz a cada opção (`opcoesArquivo` em `app.js`).

A folha é pensada para ser **lida inteira no celular, sem zoom**; a resolução alta é para quem quiser dar zoom.

- **`FORMATOS`** (tamanhos na folha, por formato):

  | Formato | `amplia` (desenho) | `ui` (título, legenda, régua, lista) | `densidade` |
  |---|---|---|---|
  | PNG (1200 px lógicos de largura) | 2,5 → medidas com ~27 px | 1,6 | 3× (≈ 3600 px) |
  | PDF (A4 a 96 dpi) | 1,8 → medidas com ~20 px (≈ 15 pt impresso) | 1,2 | 2,5× |
  | Página da lista | — | 1,35 | 2,5× |

  O desenho é chamado com `z: k / amplia`, então textos, traços e cotas crescem sem mexer na geometria.
- **O que vai na folha** é separado da tela: `config.expMedidas`, `expFolgas` e `expTotal` (todos ligados por padrão, menu Exportar → "Mostrar nos arquivos"), mais `config.lista`. A página chama `conteudo` com `medidas: expMedidas`, `folgasTodos: expFolgas`, `total: expTotal` e `forcarRotulos: true`.
- **`paginaSVG(proj, andar, { W, H, escala, pagina, total, selId, amplia, ui, lista })`:** título, data, planta, legenda e régua.
  - Respiro em volta da planta por lado (`respiroDe(amplia, comSel)`): com item selecionado, sobra espaço para as cadeias; sem seleção, só para os totais (direita e embaixo) e os rótulos das aberturas.
  - Topo e rodapé crescem com `ui` (`topoDe`, `rodapeDe`).
- **Proporção:**
  - `reguaSVG` desenha a régua (10 cm a 100 m, pelo menos 70 px × ui) e devolve `{ s, esq }`; a legenda só ganha entradas enquanto couber antes de `esq`, então nada fica por cima de nada.
  - PNG: a régua leva o rótulo "escala" (1:N não faz sentido numa imagem, depende do zoom de quem abre).
  - PDF: "proporção **1:N** · impresso em A4 a 100%" vai no **cabeçalho**, à direita (encurta se o nome do andar for comprido). `proporcao(k)` = 37,795 / k (96 dpi), arredondado de 5 em 5 ou de 10 em 10.
- **Lista de medidas:**
  - `linhasMedidas(andar)` monta as linhas: cômodos ordenados (área, paredes, aberturas: "parede de cima, a 90 cm da esquerda"), os itens dentro de cada recipiente (recursivo, com ← → ↑ ↓ até ele) e os que estão fora.
  - `listaSVG` desenha; linha comprida quebra em duas (nome e medida em cima, distâncias embaixo). `alturaLinhas` mede, e o PDF pagina a lista pela altura real.
  - `paginaListaSVG` é a página A4 em pé só com a lista. Vai só no PDF, quando `config.lista` está ligado.
- **PNG (`tamanhoPNG`):** 1200 px de largura; a altura acompanha a planta, entre 700 e 2000.
- **PDF:**
  - uma página A4 por andar; `tamanhoA4(caixa, comSel)` testa em pé e deitada e fica com a que deixa a planta maior (k maior). Uma cozinha quase quadrada sai em pé;
  - a ordem das páginas: a planta de cada andar e, em seguida, as páginas da lista dele;
  - cada página vira JPEG (qualidade 0,9) e entra no PDF;
  - o `montarPDF` escreve o arquivo à mão: catálogo, páginas, `XObject` `DCTDecode` e `xref` com linhas de 20 bytes. O teste confere os offsets.
- **Fontes:** SVG desenhado como imagem **não carrega web fonts**, então PNG e PDF saem com a fonte do sistema.
- **Item selecionado:** se houver, o PNG e a página do andar atual no PDF levam as cotas em cadeia dele (`selId`).
- **Baixar e enviar:** `baixar()` usa um `<a download>`. `compartilhar()` usa a Web Share API com arquivo, que só aparece em aparelho de toque que suporta.
- **Como conferir a folha:** gere a cozinha de exemplo e olhe as prévias com 390 px de largura (o tamanho de um celular). Com o `npm run dev` no ar, `npm run amostra` gera o PNG, o PDF e as prévias em `%TEMP%/plantafacil-export` (`URL=` testa outro endereço, como o site no ar).

## Página 404, servidor local e testes

- **`404.html`:** é autônoma. Usa `style.css` através de `<base href="__BASE__">`. O deploy troca por `/` (domínio próprio) ou por `/<repo>/`, e o `serve.mjs` troca por `/`. Por isso estilo e link funcionam em qualquer caminho errado, por mais fundo que seja.
- **`scripts/serve.mjs`:** serve só a lista pública (`index.html`, `404.html`, `style.css`, `js/`). Qualquer outra coisa, ou arquivo que não existe, responde 404 com a página. Usa `Cache-Control: no-store`.
- **`test/logica.test.js`** cobre:
  - recipiente, cadeia (o caso 10 · 45 · 8 · 75 · 63 · 95), limites e caixa com paredes;
  - folgas (vizinho, bordas do cômodo, encostado);
  - paredes por lado (limites, lado aberto tracejado, normalização de `lados`);
  - aberturas (criação, posição, corte da parede, arco da porta, rótulos, sanitização);
  - giro (cômodo com o conteúdo, lados, aberturas, ícone girado, quatro giros voltam ao começo, item sozinho);
  - travado da planta e do item;
  - `novoItem` (tamanho, nome, encaixe, parede vertical, valor inválido);
  - importação e sanitização, e o escape de `<script>` no SVG;
  - um `<pattern>` por textura e miniatura de todos os ícones;
  - estrutura e `xref` do PDF;
  - link de ida e volta, hash estranho e versão desconhecida.
