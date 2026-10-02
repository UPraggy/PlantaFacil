# Planta fácil

**No ar:** https://plantafacil.rafaelmr.com.br (também em https://upraggy.github.io/PlantaFacil/, que redireciona)

Site para desenhar plantas no celular ou no computador. Você cria andares, cômodos, paredes e itens com as medidas que quiser, e vê na hora quanto sobra entre tudo, no estilo das cotas de projeto.

É só HTML, CSS e JS, sem build nem dependências. Os dados ficam no `localStorage` do navegador.

## O que dá para fazer

- **Andares e projetos.** Vários projetos, cada um com vários andares. Dá para renomear, duplicar e excluir.
- **Adicionar com tamanho livre.** Escolha item, cômodo ou parede, digite nome, largura e profundidade (com − e +) e a cor.
  - Um cômodo pode ter paredes ao redor (10, 15, 20 ou 25 cm). Elas crescem junto quando você redimensiona.
  - O item novo cai no centro do cômodo selecionado.
- **Paredes por lado, janelas e portas.** Ligue ou desligue cada parede do cômodo e ponha janela, porta (com o arco de abrir) ou vão em qualquer parede.
- **Girar.** O cômodo gira 90° com tudo o que está dentro, e os ícones dos móveis giram junto.
- **Quem fica na frente e travar.** Trazer para frente e enviar para trás, e tocar de novo para pegar o item de trás. Cadeado por item e "Travar" para a planta inteira, para não mover sem querer.
- **Mover e redimensionar.** Arraste o item. As alças nos cantos mudam o tamanho. O ímã gruda nas bordas dos outros itens.
- **Medidas como no desenho do cooktop.** Com um item selecionado aparecem duas cadeias de cotas:
  - à esquerda, *folga · profundidade · folga*; embaixo, *folga · largura · folga*;
  - os totais de onde o item está, que pode ser o cômodo ou outro item (ex.: o cooktop dentro da bancada).
- **Distâncias editáveis.** No painel, digite "10 cm até a parede de cima" e o item vai para lá.
- **Aparência.** Seis cores, texturas (rachura, cruzada, pontos, linhas, tijolo) e ícones de móveis vistos de cima.
- **Ampliar.** Belisque, use a roda do mouse, os botões − ⤢ + ou toque duas vezes num item para aproximar até ele. Uma régua de escala acompanha o zoom.
- **Compartilhar.**
  - Link com o projeto dentro do endereço: quem abre recebe uma cópia, e nada vai para servidor.
  - PNG do andar e PDF em A4, uma página por andar, com escala.
  - Arquivo `.json` para guardar e importar, e backup de tudo.
  - Para importar, também dá para arrastar o arquivo para a página.
- **Desfazer e refazer**, tema claro e escuro, e atalhos de teclado: `N` novo, `Del` excluir, `Ctrl+Z`/`Ctrl+Y`, `Ctrl+D` duplicar, setas para mover, `+`/`−` para zoom.

## Documentação

| Doc | Para quem |
|---|---|
| [`docs/01-USO.md`](docs/01-USO.md) | Quem usa o app: passo a passo, gestos, medidas, compartilhar |
| [`docs/02-ARQUITETURA.md`](docs/02-ARQUITETURA.md) | Quem mexe no código: modelo de dados, desenho, folgas e cotas, gestos, animação, exportação |
| [`docs/03-PUBLICACAO.md`](docs/03-PUBLICACAO.md) | Publicar: `gh-pages`, domínio, Cloudflare, problemas conhecidos |
| [`docs/04-DECISOES.md`](docs/04-DECISOES.md) | O que foi pedido e por quê, incluindo o cooktop que deu origem ao app |
| [`docs/PROGRESSO.md`](docs/PROGRESSO.md) | Estado atual, histórico, armadilhas e pendências |
| [`CLAUDE.md`](CLAUDE.md) | Regras para agentes de IA neste repositório |

## Rodar no computador

```bash
npm run dev
```

Abre em `http://localhost:5180`. O servidor imita o GitHub Pages: um caminho que não existe recebe a página `404.html`.

## Testes

```bash
npm test
```

São 89 verificações: folgas, cadeia de cotas, paredes por lado, aberturas, giro do cômodo com o conteúdo, travar, importação e sanitização, o PDF gerado e o link de compartilhar.

Para ver no celular sem celular: com o `npm run dev` no ar, `npm run e2e` abre um Chromium emulando um Android (toque de verdade), percorre o app inteiro e salva capturas e os arquivos exportados.

## Publicar no GitHub Pages

O esquema é o mesmo do Escritório Virtual: o site vai para a raiz do branch `gh-pages`, com `.nojekyll`, `404.html` e, se houver domínio próprio, `CNAME`.

```bash
node scripts/deploy.mjs --remote git@github.com:UPraggy/PlantaFacil.git
```

Com domínio próprio (no escritório: `lnoffice.rafaelmr.com.br`):

```bash
node scripts/deploy.mjs --remote git@github.com:UPraggy/PlantaFacil.git --cname planta.rafaelmr.com.br
```

- **Sem repetir opções:** guarde-as em `deploy.config.json` (`{ "remote": "...", "cname": "" }`) e rode só `npm run deploy`. Se a pasta já for um repositório git, ele usa o `origin`.
- **Ensaio:** `--dry` monta tudo em `.cache/gh-pages` sem enviar.
- **Primeira vez:** no GitHub, *Settings › Pages › Deploy from a branch › gh-pages / (root)*.
- **Domínio próprio:** crie um registro DNS `CNAME` apontando para `upraggy.github.io`. Hoje o `deploy.config.json` já publica com `plantafacil.rafaelmr.com.br`, e o DNS fica na Cloudflare (proxy ligado, igual ao `lnoffice`).
- **404:** o script troca o `__BASE__` do `404.html` pelo caminho certo, `/PlantaFacil/` ou `/` com domínio.

## Organização

| Arquivo | Papel |
|---|---|
| `index.html`, `style.css` | Tela e visual: identidade Rafael MR, blueprint, periwinkle e âmbar |
| `js/dados.js` | Modelo, sanitização, `localStorage`, importar e exportar `.json` |
| `js/desenho.js` | Desenho em SVG: itens, paredes, texturas, ícones, folgas e cotas em cadeia |
| `js/exportar.js` | PNG, PDF (escrito à mão, sem biblioteca) e link de compartilhar |
| `js/app.js` | Gestos, painel, formulário de adicionar, andares, projetos, animações |
| `404.html` | Página de endereço inexistente |
| `scripts/serve.mjs`, `scripts/deploy.mjs` | Servidor local e publicação no `gh-pages` |

As medidas são sempre em centímetros. No cômodo, `x/y/largura/profundidade` são o vão livre e as paredes ficam do lado de fora.
