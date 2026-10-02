// Publica no GitHub Pages do mesmo jeito do Escritório Virtual: os arquivos do site vão para a raiz do
// branch gh-pages, com .nojekyll, 404.html e — se houver domínio próprio — CNAME. Sem dependências.
//
// Uso:  npm run deploy
//       node scripts/deploy.mjs --remote git@github.com:UPraggy/PlantaFacil.git [--cname planta.rafaelmr.com.br] [--dry]
// As opções também podem ficar em deploy.config.json: { "remote": "...", "cname": "", "branch": "gh-pages" }
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DIR = join(RAIZ, '.cache', 'gh-pages');
const ARQUIVOS = ['index.html', 'style.css', 'js'];

const args = {};
for (let k = 2; k < process.argv.length; k++) {
  const a = process.argv[k];
  if (a === '--dry') args.dry = true;
  else if (a.startsWith('--')) args[a.slice(2)] = process.argv[++k] ?? '';
}
const cfgArq = join(RAIZ, 'deploy.config.json');
const cfg = existsSync(cfgArq) ? JSON.parse(readFileSync(cfgArq, 'utf8')) : {};

const falhar = msg => { console.error('\n✖ ' + msg); process.exit(1); };
const git = (a, cwd = DIR, captura = false) => execFileSync('git', a, { cwd, stdio: captura ? 'pipe' : 'inherit', encoding: 'utf8' });

function remoteDoRepo() {
  try { return git(['remote', 'get-url', 'origin'], RAIZ, true).trim(); } catch (e) { return ''; }
}

const remote = args.remote || cfg.remote || remoteDoRepo();
const branch = args.branch || cfg.branch || 'gh-pages';
const cname = String(args.cname ?? cfg.cname ?? '').trim();
if (!remote) falhar('Diga para qual repositório publicar: --remote git@github.com:UPraggy/NOME.git (ou crie deploy.config.json).');

const m = remote.match(/[:/]([^/:]+)\/([^/]+?)(\.git)?$/);
if (!m) falhar('Não entendi o endereço do repositório: ' + remote);
const [, dono, repo] = m;
// Site de projeto fica em /<repo>/; site de usuário (dono.github.io) ou domínio próprio ficam na raiz.
const base = (cname || /\.github\.io$/i.test(repo)) ? '/' : `/${repo}/`;
const url = cname ? `https://${cname}/` : `https://${dono.toLowerCase()}.github.io${base}`;

console.log(`→ publicando em ${remote} (${branch}) · caminho-base ${base}`);
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });

let existe = false;
try { existe = git(['ls-remote', '--heads', remote, branch], RAIZ, true).trim().length > 0; } catch (e) { falhar('Não consegui falar com o repositório. Confira o endereço e a chave SSH.'); }
if (existe) {
  git(['clone', '--quiet', '--depth', '1', '--branch', branch, '--single-branch', remote, DIR], RAIZ);
} else {
  git(['init', '--quiet']);
  git(['checkout', '--quiet', '--orphan', branch]);
  git(['remote', 'add', 'origin', remote]);
}

// Limpa o que havia (menos o .git) e copia o site.
for (const nome of readdirSync(DIR)) if (nome !== '.git') rmSync(join(DIR, nome), { recursive: true, force: true });
for (const a of ARQUIVOS) cpSync(join(RAIZ, a), join(DIR, a), { recursive: true });
writeFileSync(join(DIR, '404.html'), readFileSync(join(RAIZ, '404.html'), 'utf8').replaceAll('__BASE__', base));

// Carimbo de versão: style.css e js/*.js ganham ?v=<hash do conteúdo>. O GitHub Pages manda o navegador guardar
// os arquivos por 10 min; sem isso, um index.html antigo poderia rodar com um app.js novo (ou o contrário).
const hash = arq => createHash('sha1').update(readFileSync(join(DIR, arq))).digest('hex').slice(0, 10);
for (const pagina of ['index.html', '404.html']) {
  const caminho = join(DIR, pagina);
  writeFileSync(caminho, readFileSync(caminho, 'utf8').replace(/(src|href)="((?:js\/[\w-]+\.js)|style\.css)"/g, (_, attr, arq) => `${attr}="${arq}?v=${hash(arq)}"`));
}
writeFileSync(join(DIR, '.nojekyll'), '');
if (cname) writeFileSync(join(DIR, 'CNAME'), cname + '\n');

git(['add', '-A']);
if (!git(['status', '--porcelain'], DIR, true).trim()) {
  console.log('✓ Nada mudou desde a última publicação.');
  process.exit(0);
}
git(['commit', '--quiet', '-m', `deploy: Planta fácil ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`]);
if (args.dry) {
  console.log(`✓ Ensaio pronto em ${DIR} (nada foi enviado). Rode sem --dry para publicar.`);
  process.exit(0);
}
git(['push', '--quiet', 'origin', branch]);
console.log(`✓ Publicado. Em 1–2 minutos: ${url}`);
if (!existe) console.log('  Primeira vez: no GitHub, Settings › Pages › Source "Deploy from a branch" › gh-pages / (root).');
