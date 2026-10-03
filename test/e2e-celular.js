// Teste de ponta a ponta no "celular": Chromium headless emulando um Android (toque de verdade via CDP, 390×844,
// densidade 3) + uma passada no computador. Tira capturas de cada tela e gera o PNG e o PDF exportados.
// Precisa do servidor local no ar (npm run dev) e do Playwright instalado em algum lugar:
//   PLAYWRIGHT=<pasta>/node_modules/playwright  CHROMIUM=<chrome.exe>  SAIDA=<pasta>  node test/e2e-celular.js
const PW = process.env.PLAYWRIGHT || 'E:/projects/ClaudeCode/ClaudCodeCodes/visual-inspectorBackEnd/node_modules/playwright';
const { chromium } = require(PW);
const fs = require('fs');
const path = require('path');
const OUT = process.env.SAIDA || require('path').join(require('os').tmpdir(), 'plantafacil-e2e');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.URL || 'http://localhost:5180/';
const log = [];
const anota = (...a) => { const l = a.join(' '); log.push(l); console.log(l); };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'dark',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
  });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  const cdp = await ctx.newCDPSession(page);
  const espera = ms => page.waitForTimeout(ms);
  const shot = async nome => { await page.screenshot({ path: path.join(OUT, nome + '.png') }); anota('📸', nome); };
  const arrastar = async (x0, y0, x1, y1, passos = 10) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 1 }] });
    for (let k = 1; k <= passos; k++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * k / passos, y: y0 + (y1 - y0) * k / passos, id: 1 }] });
      await espera(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await espera(450);
  };
  const tocarEm = async (x, y) => { await page.touchscreen.tap(x, y); await espera(500); };
  const estado = () => page.evaluate(() => {
    const e = JSON.parse(localStorage.getItem('plantafacil:v1'));
    const p = e.projetos.find(x => x.id === e.atualId);
    return { cfg: p.config, itens: (p.andares.find(x => x.id === p.andarAtual) || p.andares[0]).itens };
  });
  const centroTexto = nome => page.evaluate(n => {
    const t = [...document.querySelectorAll('#mundo text')].find(x => x.textContent === n);
    if (!t) return null;
    const b = t.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, l: b.x, t: b.y };
  }, nome);
  const avisoTxt = () => page.evaluate(() => { const a = document.getElementById('aviso'); return a.hidden ? '' : a.textContent; });
  const formulario = async (tipo, nome, w, h) => {
    await page.locator('#btnAdd').tap();
    await espera(400);
    await page.locator(`.modal .seg.grande [data-tipo=${tipo}]`).tap();
    const ins = page.locator('.modal input[type=text]');
    await ins.nth(0).fill(nome); await ins.nth(1).fill(String(w)); await ins.nth(2).fill(String(h));
  };

  await page.goto(URL);
  await espera(1500);
  await shot('01-vazio');
  // regra: abre em "Mover planta" e o Adicionar só existe no Editar
  const abertura = await page.evaluate(() => ({ modo: document.getElementById('palco').dataset.modo, fab: getComputedStyle(document.getElementById('btnAdd')).display }));
  anota('ao abrir:', JSON.stringify(abertura));

  // cômodo pelo botão do estado vazio, sem a parede de baixo
  await page.locator('#btnPrimeiro').tap();
  await espera(500);
  const ins = page.locator('.modal input[type=text]');
  await ins.nth(0).fill('Quarto'); await ins.nth(1).fill('300'); await ins.nth(2).fill('250');
  await page.locator('.modal .lados [data-lado=b]').tap();
  await espera(300);
  await shot('02-form-comodo');
  await page.locator('.modal button[type=submit]').tap();
  await espera(1000);
  anota('painel do cômodo:', await page.evaluate(() => ({ painel: !document.getElementById('painel').hidden, paredes: getComputedStyle(document.getElementById('pParedes')).display !== 'none', resumo: document.getElementById('pLadosTxt').textContent })).then(JSON.stringify));
  await shot('03-comodo-selecionado');

  // janela e porta (pelo "Ajustes" do painel)
  await page.locator('#pExpandir').tap();
  await espera(400);
  await page.locator('[data-abertura=janela]').scrollIntoViewIfNeeded();
  await page.locator('[data-abertura=janela]').tap(); await espera(250);
  await page.locator('[data-abertura=porta]').tap(); await espera(250);
  await page.locator('#pAbertLista').scrollIntoViewIfNeeded();
  await shot('04-aberturas');
  await page.locator('#pFechar').tap();
  await espera(500);
  await shot('05-quarto');

  // tocar no miolo vazio do cômodo seleciona o cômodo
  const q = await centroTexto('Quarto');
  await tocarEm(q.l + 30, q.t + 90);
  anota('toque no miolo selecionou:', await page.locator('#pNome').inputValue(), '| painel aberto:', await page.evaluate(() => !document.getElementById('painel').hidden));
  await page.locator('#pFechar').tap(); await espera(400);

  // cama dentro do quarto
  await tocarEm(q.l + 30, q.t + 90); // seleciona o quarto: o item novo vai para dentro dele
  await formulario('item', 'Cama', 138, 188);
  await page.locator('.modal button[type=submit]').tap();
  await espera(1000);
  await shot('06-cama');

  // travar a cama e tentar arrastar com o dedo
  await page.locator('#pTravar').tap(); await espera(500);
  const antes = (await estado()).itens.find(i => i.nome === 'Cama');
  const c1 = await centroTexto('Cama');
  await arrastar(c1.x, c1.y, c1.x + 70, c1.y + 50);
  const depoisTrav = (await estado()).itens.find(i => i.nome === 'Cama');
  anota('travado: antes', antes.x, antes.y, '→ depois', depoisTrav.x, depoisTrav.y, '| travado:', depoisTrav.travado, '| aviso:', await avisoTxt());
  anota('painel só leitura:', await page.evaluate(() => ({ classe: document.getElementById('painel').classList.contains('so-leitura'), larguraDesabilitada: document.getElementById('pW').disabled, faixa: !document.getElementById('pAvisoTrava').hidden })).then(JSON.stringify));
  await shot('07-travado-tentou-arrastar');

  // destrava e arrasta de verdade
  await page.locator('#pTravar').tap(); await espera(500);
  const c2 = await centroTexto('Cama');
  await arrastar(c2.x, c2.y, c2.x + 40, c2.y + 30);
  await espera(400);
  const movida = (await estado()).itens.find(i => i.nome === 'Cama');
  anota('destravado: moveu para', movida.x, movida.y, '(antes', antes.x, antes.y + ')');
  await shot('08-destravado-movido');

  // girar o quarto (selecionado tocando no miolo)
  await page.locator('#pFechar').tap(); await espera(400);
  const q2 = await centroTexto('Quarto');
  await tocarEm(q2.l + 20, q2.t + 60);
  anota('selecionado para girar:', await page.locator('#pNome').inputValue());
  await page.locator('#pGirar').tap(); await espera(700);
  anota('girar:', await avisoTxt());
  await shot('09-girado');

  // travar a planta inteira
  await page.locator('[data-ver=travado]').tap(); await espera(600);
  anota('planta travada:', await page.evaluate(() => ({ fab: getComputedStyle(document.getElementById('btnAdd')).display, painelSoLeitura: document.getElementById('painel').classList.contains('so-leitura') })).then(JSON.stringify), '| aviso:', await avisoTxt());
  await shot('10-planta-travada');
  await page.locator('[data-ver=travado]').tap(); await espera(400);

  // exportar
  await page.locator('#pFechar').tap(); await espera(300);
  await page.locator('#btnExportar').tap(); await espera(600);
  await shot('11-exportar');
  await page.locator('.modal .modal-topo .icone').tap(); await espera(300);

  // modos: "Mover cômodo" arrasta o quarto com tudo dentro; "Mover planta" só mexe a vista
  const qx = await centroTexto('Quarto');
  await tocarEm(qx.l + 20, qx.t + 60); // seleciona o quarto: a mesa nova vai para dentro dele
  await formulario('item', 'Mesa', 60, 60);
  await page.locator('.modal button[type=submit]').tap(); await espera(900);
  await page.locator('[data-modo=comodo]').tap(); await espera(400);
  await shot('11b-modo-mover-comodo');
  const antesModo = await estado();
  const dentroIds = await page.evaluate(() => {
    const e = JSON.parse(localStorage.getItem('plantafacil:v1')), p = e.projetos.find(x => x.id === e.atualId), it = p.andares[0].itens;
    return PF.desenho.dentroDoComodo(it.find(i => i.nome === 'Quarto'), it).map(i => i.id);
  });
  const qm = await centroTexto('Quarto');
  await arrastar(qm.x + 10, qm.y + 30, qm.x + 70, qm.y + 60);
  const depoisModo = await estado();
  const delta = nome => { const a = antesModo.itens.find(i => i.nome === nome), b = depoisModo.itens.find(i => i.nome === nome); return [b.x - a.x, b.y - a.y]; };
  const dq = delta('Quarto');
  const juntoOk = dentroIds.every(id => { const a = antesModo.itens.find(i => i.id === id), b = depoisModo.itens.find(i => i.id === id); return b.x - a.x === dq[0] && b.y - a.y === dq[1]; });
  anota('mover cômodo: quarto andou', dq.join(','), '| itens dentro:', dentroIds.length, '| foram junto:', juntoOk);
  await page.locator('[data-modo=vista]').tap(); await espera(400);
  const qv = await centroTexto('Quarto');
  await arrastar(qv.x + 10, qv.y + 30, qv.x - 50, qv.y + 40);
  const depoisVista = await estado();
  const vistaParada = depoisVista.itens.every(i => { const a = depoisModo.itens.find(x => x.id === i.id); return a.x === i.x && a.y === i.y; });
  // tocar num item fora do Editar não abre nada
  const cv = await page.evaluate(() => {
    const e = JSON.parse(localStorage.getItem('plantafacil:v1')), p = e.projetos.find(x => x.id === e.atualId), a = p.andares[0];
    const i = a.itens.find(x => x.nome === 'Mesa'), v = a.vista, r = document.getElementById('tela').getBoundingClientRect();
    return { x: r.left + (i.x + i.w / 2) * v.z + v.tx, y: r.top + (i.y + i.h / 2) * v.z + v.ty };
  });
  await tocarEm(cv.x, cv.y);
  const painelVista = await page.evaluate(() => !document.getElementById('painel').hidden);
  anota('mover planta: nada saiu do lugar:', vistaParada, '| toque no item abriu painel:', painelVista, '| aviso:', await avisoTxt());
  await shot('11c-modo-mover-planta');
  await page.locator('[data-modo=editar]').tap(); await espera(400);

  // arquivos exportados (o mesmo código do botão Baixar)
  const arquivos = await page.evaluate(async () => {
    const e = JSON.parse(localStorage.getItem('plantafacil:v1'));
    const p = e.projetos.find(x => x.id === e.atualId), a = p.andares[0];
    const sel = a.itens.find(i => i.nome === 'Cama').id;
    const b64 = async blob => { const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let k = 0; k < u.length; k += 0x8000) s += String.fromCharCode.apply(null, u.subarray(k, k + 0x8000)); return btoa(s); };
    const png = await PF.exportar.gerar('png', p, a, e, sel);
    const pdf = await PF.exportar.gerar('pdf', p, a, e, null);
    // a página da lista, desenhada como no PDF, para ver
    const svg = PF.exportar.paginaListaSVG(p, a, PF.exportar.linhasMedidas(a), { W: 794, H: 1123, pagina: 2, total: 2 });
    const img = new Image();
    await new Promise((ok, falha) => { img.onload = ok; img.onerror = falha; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const c = document.createElement('canvas'); c.width = 794 * 1.5; c.height = 1123 * 1.5;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    const lista = await new Promise(r => c.toBlob(r, 'image/png'));
    return { png: await b64(png.blob), pngNome: png.nome, pdf: await b64(pdf.blob), pdfNome: pdf.nome, lista: await b64(lista) };
  });
  fs.writeFileSync(path.join(OUT, 'export-' + arquivos.pngNome), Buffer.from(arquivos.png, 'base64'));
  fs.writeFileSync(path.join(OUT, 'export-' + arquivos.pdfNome), Buffer.from(arquivos.pdf, 'base64'));
  fs.writeFileSync(path.join(OUT, 'export-lista.png'), Buffer.from(arquivos.lista, 'base64'));
  anota('exportados:', arquivos.pngNome, Math.round(arquivos.png.length * 0.75 / 1024) + ' KB', '|', arquivos.pdfNome, Math.round(arquivos.pdf.length * 0.75 / 1024) + ' KB');

  // tema claro
  await page.emulateMedia({ colorScheme: 'light' });
  await espera(600);
  await shot('12-claro');

  // computador (tela larga, painel lateral), tema claro
  const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 820 }, colorScheme: 'light' });
  const dadosMobile = await page.evaluate(() => localStorage.getItem('plantafacil:v1'));
  await ctx2.addInitScript(d => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('plantafacil:v1', d); sessionStorage.setItem('semeado', '1'); } }, dadosMobile);
  const pg2 = await ctx2.newPage();
  pg2.on('pageerror', e => erros.push('desktop: ' + e.message));
  await pg2.goto(URL);
  await pg2.waitForFunction(() => [...document.querySelectorAll('#mundo text')].some(x => x.textContent === 'Cama'), null, { timeout: 8000 }); await pg2.waitForTimeout(500);
  const cama = await pg2.evaluate(() => { const t = [...document.querySelectorAll('#mundo text')].find(x => x.textContent === 'Cama'); const b = t.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await pg2.keyboard.press('1'); await pg2.waitForTimeout(300); // abre em Mover planta: liga o Editar
  await pg2.mouse.click(cama.x, cama.y); await pg2.waitForTimeout(900);
  await pg2.screenshot({ path: path.join(OUT, '13-desktop.png') }); anota('📸', '13-desktop');
  anota('erros no console:', erros.length ? erros.join(' || ') : 'nenhum');
  const falhas = [];
  if (erros.length) falhas.push('erros no console');
  if (depoisTrav.x !== antes.x || depoisTrav.y !== antes.y) falhas.push('item travado saiu do lugar');
  if (movida.x === antes.x && movida.y === antes.y) falhas.push('item destravado não moveu');
  if (!dq[0] && !dq[1]) falhas.push('modo Mover cômodo não moveu o cômodo');
  if (!juntoOk) falhas.push('modo Mover cômodo deixou item de dentro para trás');
  if (!vistaParada) falhas.push('modo Mover planta tirou item do lugar');
  if (painelVista) falhas.push('toque no Mover planta abriu o painel');
  if (abertura.modo !== 'vista' || abertura.fab !== 'none') falhas.push('o app não abriu só para ver');
  if (falhas.length) { console.error('✖ ' + falhas.join('; ')); process.exitCode = 1; } else console.log('✓ fluxo do celular ok · capturas em ' + OUT);
  fs.writeFileSync(path.join(OUT, 'log.txt'), log.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
