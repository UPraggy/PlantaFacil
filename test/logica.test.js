// Testes da lógica pura (sem navegador): node test/logica.test.js
const assert = require('assert');
const path = require('path');
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } };
for (const f of ['dados', 'desenho', 'exportar']) require(path.join(__dirname, '..', 'js', f + '.js'));
const { dados: D, desenho: DES, exportar: EX } = globalThis.PF;

let n = 0;
const ok = (c, m) => { assert(c, m); n++; };
const it = (tipo, nome, x, y, w, h, extra) => Object.assign({ id: nome, tipo, nome, x, y, w, h, cor: 'azul', textura: 'liso', simbolo: '', parede: 0 }, extra);

// --- o desenho do cooktop: bancada 95×63, cooktop 75×45 a 10 cm da parede e 8 cm da frente
const bancada = it('item', 'bancada', 0, 0, 95, 63);
const cooktop = it('item', 'cooktop', 10, 10, 75, 45);
const cena = [it('parede', 'parede', 0, -15, 95, 15), bancada, cooktop];
ok(DES.recipiente(cooktop, cena) === bancada, 'o cooktop está dentro da bancada');
ok(DES.recipiente(bancada, cena) === null, 'a bancada não está dentro de nada');
const svg = DES.conteudo({ itens: cena }, { z: 2, t: DES.TEMAS.claro, medidas: true, selId: 'cooktop' });
for (const v of ['10 cm', '45 cm', '8 cm', '75 cm', '63 cm', '95 cm']) ok(svg.includes(`>${v}<`), `cadeia mostra ${v}`);
ok(!/NaN|undefined|Infinity/.test(svg), 'svg sem NaN/undefined');

// --- cômodo com paredes: o vão livre é x/y/w/h; os limites incluem as paredes
const cozinha = it('comodo', 'cozinha', 0, 0, 400, 300, { parede: 15 });
ok(JSON.stringify(DES.limites(cozinha)) === JSON.stringify({ x: -15, y: -15, w: 430, h: 330 }), 'limites incluem a parede');
const sala = [cozinha, it('item', 'geladeira', 300, 10, 70, 75), it('item', 'pia', 100, 10, 120, 55)];
ok(JSON.stringify(DES.caixa(sala)) === JSON.stringify({ x: -15, y: -15, w: 430, h: 330 }), 'caixa usa os limites');
ok(DES.recipiente(sala[2], sala) === cozinha, 'a pia está na cozinha');
const g = DES.folgasDe(sala[2], sala);
const viz = g.filter(f => !f.dentro).map(f => f.valor);
ok(viz.length === 1 && viz[0] === 80, 'pia → geladeira = 80 cm (vizinho)');
ok(g.filter(f => f.dentro).map(f => f.valor).sort((a, b) => a - b).join() === '10,100,235', 'pia → bordas da cozinha: 10, 100, 235');
const svg2 = DES.conteudo({ itens: sala }, { z: 1, t: DES.TEMAS.escuro, medidas: true, selId: 'pia', folgasTodos: true, total: true });
ok(svg2.includes('fill-rule="evenodd"'), 'paredes do cômodo desenhadas');
ok(svg2.includes('total 430 cm'), 'total inclui as paredes');
ok(svg2.includes('>80 cm<'), 'folga entre vizinhos');

// --- folgas básicas
const solto = [it('item', 'a', 0, 0, 50, 50), it('item', 'b', 70, 0, 50, 50)];
const gs = DES.folgasDe(solto[0], solto);
ok(gs.length === 1 && gs[0].valor === 20 && gs[0].h, 'a→b = 20 cm');
ok(DES.folgasDe(it('item', 'a', 0, 0, 50, 50), [it('item', 'a', 0, 0, 50, 50), it('item', 'b', 50, 0, 50, 50)]).length === 0, 'encostados = sem folga');
ok(DES.folgasDe(cozinha, sala).length === 0, 'cômodo não tem folgas');

// --- novoItem: tamanho livre, nome automático, centrado e encaixado
const ni = D.novoItem({ tipo: 'item', nome: '', w: 75, h: 45, cor: 'terra' }, 200, 150, [], 5);
ok(ni.w === 75 && ni.h === 45 && ni.nome === 'Item 1' && ni.cor === 'terra', 'item com tamanho do usuário');
ok(ni.x === 165 && ni.y === 130, 'centrado e encaixado em 5 cm');
const nc = D.novoItem({ tipo: 'comodo', nome: 'Cozinha', w: 300, h: 250, parede: 15 }, 0, 0, [], 5);
ok(nc.parede === 15 && nc.nome === 'Cozinha' && nc.cor === 'cinza', 'cômodo com paredes');
const np = D.novoItem({ tipo: 'parede', nome: 'Parede da pia', w: 15, h: 300 }, 0, 0, [], 5);
ok(np.tipo === 'parede' && np.parede === 0 && np.h === 300, 'parede vertical');
ok(D.novoItem({ tipo: 'item', w: 'abc', h: -2 }, 0, 0, [], 5).w === 100, 'medida inválida cai no padrão');

// --- importação / sanitização
const proj = D.novoProjeto('Casa');
proj.andares[0].itens.push(Object.assign(it('item', 'x', 1, 2, 210, 90), { nome: '<b>Sofá</b>', cor: 'roxo', textura: 'rachura', simbolo: 'sofa' }), nc);
const lista = D.paraImportar(JSON.parse(JSON.stringify(D.paraArquivo(proj))));
ok(lista.length === 1 && lista[0].id !== proj.id, 'import gera ids novos');
ok(lista[0].andares[0].itens[0].textura === 'rachura' && lista[0].andares[0].itens[0].simbolo === 'sofa', 'textura e ícone preservados');
ok(lista[0].andares[0].itens[1].parede === 15, 'paredes do cômodo preservadas');
const sujo = D.paraImportar({ projeto: { andares: [{ itens: [{ tipo: 'zzz', x: 'a', w: -5, h: 1e9, cor: 'rosa', textura: 'x', simbolo: 'y', parede: 999 }, null, 5] }] } });
const i0 = sujo[0].andares[0].itens;
ok(i0.length === 1 && i0[0].tipo === 'item' && i0[0].w === 1 && i0[0].h === 1e5 && i0[0].cor === 'azul' && i0[0].textura === 'liso' && i0[0].simbolo === '' && i0[0].parede === 0, 'sanitiza lixo');
assert.throws(() => D.paraImportar({}), /não encontrei/); n++;
const evil = DES.conteudo({ itens: [it('item', 'e', 0, 0, 300, 100, { nome: '<script>alert(1)</script>' })] }, { z: 1, t: DES.TEMAS.claro, medidas: true });
ok(!evil.includes('<script>'), 'nome é escapado no SVG');

// --- texturas e ícones geram SVG válido
const tex = DES.conteudo({ itens: D.TEXTURAS.map((t, k) => it('item', 't' + k, k * 120, 0, 100, 60, { textura: t })) }, { z: 1, t: DES.TEMAS.claro });
ok((tex.match(/<pattern /g) || []).length === D.TEXTURAS.length - 1, 'um <pattern> por textura (menos liso)');
ok(DES.SIMBOLOS.every(s => /<svg viewBox="[-\d. ]+"/.test(DES.iconeSimbolo(s))), 'todos os ícones têm miniatura');

// --- PDF e link
(async () => {
  const jpg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
  const blob = EX.montarPDF([{ jpg: new Uint8Array(jpg), w: 10, h: 10, pw: 595.5, ph: 842.25 }, { jpg: new Uint8Array(jpg), w: 10, h: 10, pw: 842.25, ph: 595.5 }]);
  const s = Buffer.from(await blob.arrayBuffer()).toString('latin1');
  ok(s.startsWith('%PDF-1.4') && s.trimEnd().endsWith('%%EOF'), 'PDF: cabeçalho e fim');
  const sx = +s.match(/startxref\n(\d+)/)[1];
  const linhas = s.slice(sx).split('\n').slice(2, 11);
  ok(s.slice(sx, sx + 4) === 'xref' && linhas.every(l => l.length === 19), 'PDF: xref com linhas de 20 bytes');
  for (let k = 1; k <= 8; k++) ok(s.slice(+linhas[k].slice(0, 10)).startsWith(`${k} 0 obj`), `PDF: offset do objeto ${k}`);

  const url = await EX.gerarLink(proj, 'https://exemplo.github.io/planta/');
  ok(/^https:\/\/exemplo\.github\.io\/planta\/#p=z\.[A-Za-z0-9_-]+$/.test(url), 'link comprimido');
  const volta = D.paraImportar({ projeto: await EX.lerLink(url.slice(url.indexOf('#'))) })[0];
  const a = volta.andares[0].itens;
  ok(volta.nome === 'Casa' && a.length === 2 && a[0].nome === '<b>Sofá</b>' && a[0].textura === 'rachura' && a[1].parede === 15, 'link ida e volta');
  ok(await EX.lerLink('#outra-coisa') === null, 'hash sem projeto é ignorado');
  await assert.rejects(() => EX.lerLink('#p=r.' + Buffer.from('{"v":2}').toString('base64url')), /link inválido/); n++;
  console.log(`${n} verificações ok`);
})().catch(e => { console.error(e); process.exit(1); });
