// Servidor estático local, sem dependências. Imita o GitHub Pages: arquivo que não existe
// responde com o 404.html (status 404). Uso: node scripts/serve.mjs [porta]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PORTA = Number(process.argv[2] || process.env.PORT || 5180);
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};
const PUBLICO = new Set(['index.html', '404.html', 'style.css', '.nojekyll']);
const PASTAS = ['js/'];

async function enviar(res, status, arquivo, extra) {
  let corpo = await readFile(arquivo);
  // No deploy o 404.html recebe o caminho-base do site; aqui o site está na raiz.
  if (arquivo.endsWith('404.html')) corpo = Buffer.from(corpo.toString('utf8').replaceAll('__BASE__', '/'));
  res.writeHead(status, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-store', ...extra });
  res.end(corpo);
}

createServer(async (req, res) => {
  try {
    let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (caminho.endsWith('/')) caminho += 'index.html';
    const rel = normalize(caminho).replace(/^[\\/]+/, '').split(sep).join('/');
    const permitido = !rel.includes('..') && (PUBLICO.has(rel) || PASTAS.some(p => rel.startsWith(p)));
    if (permitido) {
      const arquivo = join(RAIZ, rel);
      const info = await stat(arquivo).catch(() => null);
      if (info && info.isFile()) return await enviar(res, 200, arquivo);
    }
    await enviar(res, 404, join(RAIZ, '404.html'));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('erro: ' + e.message);
  }
}).listen(PORTA, () => console.log(`Planta fácil em http://localhost:${PORTA}`));
