// Amostra da exportação: exporta uma cozinha de exemplo (PNG + PDF) e gera prévias com 390 px de largura,
// o tamanho de um celular, para conferir a olho se todas as medidas se leem sem zoom.
// Precisa do servidor local no ar (npm run dev) e do Playwright instalado em algum lugar:
//   PLAYWRIGHT=<pasta>/node_modules/playwright  CHROMIUM=<chrome.exe>  SAIDA=<pasta>  URL=<site>  node test/amostra-exportacao.js
const PW = process.env.PLAYWRIGHT || 'E:/projects/ClaudeCode/ClaudCodeCodes/visual-inspectorBackEnd/node_modules/playwright';
const { chromium } = require(PW);
const fs = require('fs');
const path = require('path');
const OUT = process.env.SAIDA || path.join(require('os').tmpdir(), 'plantafacil-export');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// A cozinha do desenho do cooktop: bancada com pia e cooktop, geladeira, mesa, janela e porta.
const it = (tipo, nome, x, y, w, h, extra) => Object.assign({ id: nome.toLowerCase().replace(/\W/g, ''), tipo, nome, x, y, w, h, cor: 'azul', textura: 'liso', simbolo: '', parede: 0, lados: '', giro: 0, aberturas: [], travado: false }, extra);
const projeto = {
  id: 'p1', nome: 'Cozinha da casa', criado: Date.now(), atualizado: Date.now(), andarAtual: 'a1',
  config: { encaixe: 5, ima: true, medidas: true, folgas: false, total: false, travado: false, lista: true, expMedidas: true, expFolgas: true, expTotal: true, expCotas: true, expV: 2 },
  andares: [{ id: 'a1', nome: 'Térreo', vista: null, itens: [
    it('comodo', 'Cozinha', 0, 0, 320, 260, { cor: 'cinza', parede: 15, lados: 'cdbe', aberturas: [
      { id: 'j1', lado: 'c', pos: 180, larg: 100, tipo: 'janela' }, { id: 'p1', lado: 'b', pos: 200, larg: 80, tipo: 'porta' }] }),
    it('item', 'Bancada', 0, 0, 200, 63, { cor: 'cinza' }),
    it('item', 'Cooktop', 115, 10, 75, 45, { cor: 'terra', simbolo: 'cooktop' }),
    it('item', 'Pia', 10, 4, 90, 55, { cor: 'azul', simbolo: 'pia' }),
    it('item', 'Geladeira', 250, 0, 70, 75, { cor: 'cinza', simbolo: 'geladeira' }),
    it('item', 'Mesa', 90, 150, 120, 80, { cor: 'ambar', simbolo: 'mesa' }),
  ] }],
};
const estado = { versao: 1, atualId: 'p1', projetos: [projeto] };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  await ctx.addInitScript(d => { localStorage.setItem('plantafacil:v1', d); }, JSON.stringify(estado));
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  await page.goto(process.env.URL || 'http://localhost:5180/');
  await page.waitForTimeout(1200);
  const r = await page.evaluate(async () => {
    const EX = PF.exportar, e = JSON.parse(localStorage.getItem('plantafacil:v1'));
    const p = e.projetos[0], a = p.andares[0];
    const b64 = async blob => { const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let k = 0; k < u.length; k += 0x8000) s += String.fromCharCode.apply(null, u.subarray(k, k + 0x8000)); return btoa(s); };
    const png = await EX.gerar('png', p, a, e, null);
    const pdf = await EX.gerar('pdf', p, a, e, null);
    // prévias com 390 px (desenhadas a 2×): o PNG reduzido e as páginas do PDF montadas como no PDF
    const desenhar = (svg, W, H) => new Promise((ok, falha) => {
      const img = new Image();
      img.onload = () => { const esc = 780 / W, c = document.createElement('canvas'); c.width = 780; c.height = Math.round(H * esc); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height); c.toBlob(ok, 'image/png'); };
      img.onerror = falha;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    const pngImg = await createImageBitmap(png.blob);
    const c = document.createElement('canvas'); c.width = 780; c.height = Math.round(pngImg.height * 780 / pngImg.width);
    c.getContext('2d').drawImage(pngImg, 0, 0, c.width, c.height);
    const F = EX.FORMATOS.pdf, A4 = EX.tamanhoA4(PF.desenho.caixa(a.itens), false);
    const pgPlanta = EX.paginaSVG(p, a, { W: A4.W, H: A4.H, escala: true, pagina: 1, total: 2, amplia: F.amplia, ui: F.ui });
    const pgLista = EX.paginaListaSVG(p, a, EX.linhasMedidas(a), { W: 794, H: 1123, pagina: 2, total: 2 });
    return {
      png: await b64(png.blob), pdf: await b64(pdf.blob), w: pngImg.width, h: pngImg.height, a4: A4.W > A4.H ? 'deitado' : 'em pé',
      previaPng: await b64(await new Promise(ok => c.toBlob(ok, 'image/png'))),
      previaPdf: await b64(await desenhar(pgPlanta, A4.W, A4.H)),
      previaLista: await b64(await desenhar(pgLista, 794, 1123)),
    };
  });
  const grava = (nome, dado) => fs.writeFileSync(path.join(OUT, nome), Buffer.from(dado, 'base64'));
  grava('cozinha.png', r.png);
  grava('cozinha.pdf', r.pdf);
  grava('previa-png-celular.png', r.previaPng);
  grava('previa-pdf-planta-celular.png', r.previaPdf);
  grava('previa-pdf-lista-celular.png', r.previaLista);
  console.log(`PNG ${r.w}×${r.h} · PDF em A4 ${r.a4} · erros: ${erros.length ? erros.join(' | ') : 'nenhum'} · saída: ${OUT}`);
  await browser.close();
  if (erros.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
