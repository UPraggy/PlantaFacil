# Publicação — GitHub Pages + domínio próprio

**Hoje:** https://plantafacil.rafaelmr.com.br, servido pelo GitHub Pages a partir do branch `gh-pages` do repositório público `UPraggy/PlantaFacil`.

## Como está montado

Segue o mesmo esquema do Escritório Virtual (`UPraggy/LEDVLearningOffice`, em `lnoffice.rafaelmr.com.br`):

```
main       → o código (index.html, style.css, js/, docs/, scripts/, test/)
gh-pages   → o site pronto, na raiz:
             index.html · style.css · js/ · 404.html · .nojekyll · CNAME
```

- **`.nojekyll`:** diz para o GitHub não passar o Jekyll.
- **`404.html`:** é a página de erro. O deploy troca o `__BASE__` por `/`.
- **`CNAME`:** contém `plantafacil.rafaelmr.com.br`. É ele que liga o domínio no Pages.
- **Configuração do Pages** (*Settings › Pages*): "Deploy from a branch", `gh-pages`, `/ (root)`. Ficou assim sozinho no primeiro push do `gh-pages`. O domínio também entrou sozinho, lido do `CNAME`.

## Publicar uma versão nova

```bash
npm test            # tem que passar
npm run deploy      # monta .cache/gh-pages, commita e dá push no gh-pages
```

O `scripts/deploy.mjs` lê o `deploy.config.json`:

```json
{ "remote": "git@github.com:UPraggy/PlantaFacil.git", "branch": "gh-pages", "cname": "plantafacil.rafaelmr.com.br" }
```

O que ele faz:
1. Clona o `gh-pages` existente, ou cria um órfão se for a primeira vez.
2. Apaga tudo menos o `.git` e copia `index.html`, `style.css` e `js/`.
3. Grava o `404.html` com o caminho-base certo, o `.nojekyll` e o `CNAME`.
4. Só commita se algo mudou ("Nada mudou desde a última publicação"), e então dá push. A mensagem é `deploy: Planta fácil AAAA-MM-DD HH:MM`, sem coautor.

O GitHub leva de 1 a 2 minutos para atualizar. A Cloudflare pode guardar a versão anterior por alguns minutos.

Opções da linha de comando, que valem por cima do arquivo:
- `--remote`, `--branch` e `--cname`;
- `--dry` monta tudo em `.cache/gh-pages` sem enviar.

**Caminho-base:** com `cname`, ou num repositório `*.github.io`, é `/`. Caso contrário, é `/<repo>/`.

> ⚠️ Para mudar ou tirar o domínio, mude o `deploy.config.json`. Se rodar o deploy sem `cname`, o `CNAME` some do `gh-pages` e o GitHub desliga o domínio próprio.

## DNS (Cloudflare)

- O domínio `rafaelmr.com.br` usa os nameservers da Cloudflare (`melany` e `miguel`).
- O registro `plantafacil` foi criado pelo Rafael. É um CNAME para `upraggy.github.io` com o **proxy ligado** (nuvem laranja), igual ao `lnoffice`.
- Por causa do proxy, quem consulta vê IPs da Cloudflare (`104.21.53.59` e `172.67.209.96`), não os do GitHub. A resposta traz `x-github-request-id`, o que prova que chega no GitHub.

Consequências do proxy, que são esperadas e iguais no `lnoffice`:
- **"Enforce HTTPS" no GitHub fica indisponível** ("domain is not properly configured to support HTTPS"). Não é preciso: o certificado que o navegador vê é o da Cloudflare.
- **A checagem de DNS do GitHub pode ficar em "in progress" ou reclamar.** O site funciona do mesmo jeito.

## Checagens rápidas

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://plantafacil.rafaelmr.com.br/        # 200
curl -s -o /dev/null -w "%{http_code}\n" https://plantafacil.rafaelmr.com.br/a/b/c   # 404 (página própria)
curl -s https://plantafacil.rafaelmr.com.br/a/b/c | grep -o '<base href="[^"]*">'   # <base href="/">
curl -sI https://plantafacil.rafaelmr.com.br/ | grep -i x-github-request-id           # chega no GitHub
```

## Problemas conhecidos e decisões pendentes

| O quê | Por quê | O que fazer |
|---|---|---|
| `http://` não vai para `https://` | O "Always Use HTTPS" da Cloudflare está desligado, e isso vale para a zona toda (`lnoffice` e `rafaelmr.com.br` também) | Na Cloudflare: SSL/TLS › Edge Certificates › Always Use HTTPS. Decisão do Rafael. |
| `upraggy.github.io/PlantaFacil/` ainda abre o site em vez de redirecionar | O GitHub só redireciona para o domínio próprio depois que a checagem de DNS termina | Conferir mais tarde. Lembre que cada endereço guarda os dados à parte no navegador. |
| Commits creditados à conta **LGD-Ledgermany** | O e-mail gmail do git global está verificado naquela conta | Ver a seção abaixo. |

### Autoria dos commits

Os commits deste repositório (`142bede`, `88953bb` e os de deploy) foram feitos com `rafaelmoreira2001ofc@gmail.com`, e o GitHub os mostra na conta LGD-Ledgermany.

O Pechincha já resolveu isso assim:
- `git config user.email 100146657+UPraggy@users.noreply.github.com` e `user.name "Rafael Moreira Ramos de Rezende"`, só no repositório;
- `.githooks/commit-msg` recusando `Co-Authored-By: Claude/Anthropic`, ativado com `git config core.hooksPath .githooks`.

Para valer aqui também falta:
1. aplicar as duas configurações acima neste repositório;
2. o `scripts/deploy.mjs` usar a mesma identidade no commit do `gh-pages`, que hoje sai num clone separado com a configuração global;
3. opcional: reescrever os commits antigos e dar push forçado no `main` e no `gh-pages`.

Ainda espera o OK do Rafael, porque é configuração e código.

## Histórico

- **02/10/2026:** o repositório não existia ("Repository not found" no SSH). Foi criado público pelo Chrome do Rafael, a pedido dele. Depois vieram o push do `main`, o primeiro deploy (Pages ligado sozinho em `upraggy.github.io/PlantaFacil/`) e o domínio próprio com o `CNAME`.
