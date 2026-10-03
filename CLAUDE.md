# CLAUDE.md — regras para agentes neste repositório

## Por onde começar
1. `docs/PROGRESSO.md` — mais novo primeiro; o topo tem estado, feito, pendente e armadilhas.
2. `docs/02-ARQUITETURA.md` — arquivos, modelo de dados, desenho, gestos, animações, exportação, testes.
3. `docs/04-DECISOES.md` — o que o Rafael pediu e por quê. **Não desfaça nada daqui sem ele pedir.**
4. `docs/03-PUBLICACAO.md` — GitHub Pages, domínio próprio, Cloudflare, problemas conhecidos.
5. `docs/01-USO.md` — manual de quem usa o app.

## Regras
- **Projeto pessoal do Rafael.** Nada da Babita. **Não usar o conector Memória Babita** (nem `fontes`, nem a
  nota MODO ANÁLISE). Prompt de subagente/workflow deste projeto tem que proibir o conector explicitamente.
- **Stack:** HTML + CSS + JS puro, **sem build, sem dependências, sem TypeScript**. Os quatro `js/*.js` são
  scripts clássicos que se registram em `window.PF` (dá para abrir até sem servidor). Node só para
  `scripts/` e `test/`.
- **Nada instalável:** sem PWA, sem manifest, sem service worker. É só um site no GitHub Pages.
- **Sem catálogo de móveis prontos.** "Adicionar" é um formulário de tamanho livre (item, cômodo ou parede).
- **Medidas em centímetros.** No cômodo, `x/y/w/h` são o **vão livre** e as paredes (`parede` = espessura)
  ficam do lado de fora. `y` cresce para baixo; "cima" na tela = topo da planta.
- **Medidas no estilo do desenho do cooktop** (aprovado pelo Rafael): item selecionado mostra as cotas em
  cadeia, *folga · medida · folga*, e os totais do recipiente. Detalhes em `docs/02-ARQUITETURA.md`.
- **Visual = identidade Rafael MR** (`ME/PlanejamentoCarreira/06-identidade-visual.md`): blueprint,
  periwinkle (estrutura) + âmbar (execução), Space Grotesk + JetBrains Mono, limpo. Cores da planta em
  `TEMAS`/`CORES` (`js/desenho.js`); tokens de tela e de movimento no topo de `style.css`.
- **Celular primeiro:** toda tela nova tem que caber em 375 px, ter alvos de toque ≥ 44 px nos controles
  principais e respeitar `prefers-reduced-motion` (em CSS **e** no JS, variável `reduzir` em `app.js`).
- **Segurança de dados:** tudo que vem de arquivo ou link passa por `D.paraImportar` (sanitiza e troca os
  ids). Texto do usuário vai para o SVG só por `esc()`, e para o DOM por `textContent`/`h()`; nunca
  `innerHTML` com nome de item.
- **Testes:** `npm test` passando antes de commitar. Lógica nova em `dados.js`, `desenho.js` ou `exportar.js`
  ganha verificação em `test/logica.test.js`.
- **Publicar** = `npm run deploy` (vai para o branch `gh-pages`, com o domínio do `deploy.config.json`).
  Publicar só quando o Rafael pedir. Mudou o domínio? Mude o `deploy.config.json`, senão o próximo deploy
  apaga o `CNAME`.
- **Claude in Chrome:** use sempre o navegador com `onThisComputer: true` ("Browser 1"). O `deviceId
  3dd22683…` ("Browser 2") é OUTRO computador.
- Português do Brasil em docs, telas e commits. Doc nova ou mudança relevante: atualizar o topo de
  `docs/PROGRESSO.md`, commitar e dar push na hora.

## Git
- Repositório **público** `UPraggy/PlantaFacil` (push por SSH). `main` = código; `gh-pages` = site publicado
  (gerado pelo `scripts/deploy.mjs`, nunca edite à mão).
- Commits com autor Rafael e **sem** `Co-Authored-By` (diretriz dele, vale para todos os projetos).
- Autoria: os commits feitos com o e-mail gmail aparecem na conta **LGD-Ledgermany**, onde esse e-mail está
  verificado. No Pechincha a solução foi o e-mail noreply da UPraggy (`100146657+UPraggy@users.noreply.github.com`)
  só naquele repositório, mais o hook `.githooks/commit-msg`. Aqui isso ainda está **pendente de OK do
  Rafael**; veja `docs/PROGRESSO.md`.

## Como rodar
```bash
npm run dev       # http://localhost:5180 (imita o GitHub Pages, inclusive o 404)
npm test          # 99 verificações da lógica
npm run e2e       # celular emulado (toque) + computador, com capturas — precisa do npm run dev no ar
npm run amostra   # exporta uma cozinha de exemplo + prévias de 390 px, para conferir a folha a olho
npm run deploy    # publica (use --dry para ensaiar sem enviar)
```
No preview do Claude Code: entrada `planta-facil` no `.claude/launch.json` da raiz do workspace.
