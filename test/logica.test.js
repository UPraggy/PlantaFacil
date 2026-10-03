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
ok(svg2.includes(`fill="${DES.TEMAS.escuro.parede}"`), 'paredes do cômodo desenhadas');
ok(svg2.includes('total 430 cm'), 'total inclui as paredes');
ok(svg2.includes('>80 cm<'), 'folga entre vizinhos');

// --- paredes só em alguns lados (ex.: varanda aberta embaixo)
const aberta = it('comodo', 'varanda', 0, 0, 300, 200, { parede: 10, lados: 'cde' });
ok(JSON.stringify(DES.limites(aberta)) === JSON.stringify({ x: -10, y: -10, w: 320, h: 210 }), 'limites só com os lados que têm parede');
ok((DES.conteudo({ itens: [aberta] }, { z: 1, t: DES.TEMAS.claro }).match(/stroke-dasharray/g) || []).length === 1, 'lado aberto fica tracejado');
ok(D.limparLados('xbdc') === 'cdb' && D.limparLados(undefined) === 'cdbe' && D.limparLados('') === '', 'normaliza os lados');
ok(DES.ladosDe(it('comodo', 's', 0, 0, 10, 10, { parede: 0, lados: 'cdbe' })) === '', 'sem espessura = sem paredes');

// --- girar o cômodo leva junto o que está dentro e os lados com parede
const sala2 = it('comodo', 'sala', 0, 0, 400, 300, { parede: 15, lados: 'cde' });
const sofa = it('item', 'sofa', 10, 10, 210, 90, { simbolo: 'sofa' });
const fora = it('item', 'fora', 600, 0, 50, 50);
const lista2 = [sala2, sofa, fora];
ok(DES.girar(sala2, lista2) === 1, 'gira o cômodo com o sofá');
ok(sala2.w === 300 && sala2.h === 400 && sala2.x === 50 && sala2.y === -50, 'cômodo girado no lugar');
ok(sala2.lados === 'cdb', 'lados giram junto (aberto embaixo → aberto à esquerda)');
ok(sofa.x === 250 && sofa.y === -40 && sofa.w === 90 && sofa.h === 210 && sofa.giro === 90, 'sofá gira junto e continua a 10 cm das paredes');
ok(fora.x === 600 && !fora.giro, 'item fora do cômodo não gira');
ok(DES.conteudo({ itens: lista2 }, { z: 1, t: DES.TEMAS.claro }).includes('rotate(90)'), 'ícone desenhado girado');
for (let k = 0; k < 3; k++) DES.girar(sala2, lista2);
ok(sala2.x === 0 && sala2.y === 0 && sala2.w === 400 && sala2.lados === 'cde' && sofa.x === 10 && sofa.y === 10 && sofa.giro === 0, 'quatro giros voltam ao começo');
const solo = it('item', 'mesa', 0, 0, 120, 80);
ok(DES.girar(solo, [solo]) === 0 && solo.w === 80 && solo.h === 120 && solo.x === 20 && solo.y === -20, 'item sozinho gira no próprio centro');

// --- modo "Mover cômodo": vai junto o que está inteiro dentro dele (contando a parede), nada de fora
const cz = it('comodo', 'cozinha', 0, 0, 300, 200, { parede: 15, lados: 'cdbe' });
const bancM = it('item', 'bancada', 0, 0, 200, 60), piaM = it('item', 'pia', 20, 10, 50, 40);
const naParede = it('parede', 'mureta', -15, 50, 15, 80), meio = it('item', 'meio-fora', 280, 100, 60, 40), longe = it('item', 'longe', 500, 0, 50, 50);
const juntos = DES.dentroDoComodo(cz, [cz, bancM, piaM, naParede, meio, longe]).map(i => i.id);
ok(juntos.join() === 'bancada,pia,mureta', 'leva bancada, pia e a parede encostada; deixa o que está meio fora e o de longe');
ok(DES.dentroDoComodo(cz, [cz]).length === 0, 'cômodo vazio não leva nada');

// --- aberturas: janela, porta e vão nas paredes do cômodo
const quarto = it('comodo', 'quarto', 0, 0, 300, 250, { parede: 15, lados: 'cdbe', aberturas: [] });
const jan = D.novaAbertura(quarto, 'janela');
ok(jan.lado === 'c' && jan.larg === 120 && jan.pos === 90 && jan.tipo === 'janela', 'janela nova centrada na parede de cima');
ok(D.novaAbertura(it('comodo', 'x', 0, 0, 100, 100, { parede: 0 }), 'porta') === null, 'sem parede não tem abertura');
ok(D.novaAbertura(it('comodo', 'x', 0, 0, 60, 300, { parede: 15, lados: 'e' }), 'porta').lado === 'e', 'usa o primeiro lado com parede');
// a segunda abertura procura um trecho livre (não cai em cima da janela)
const q2 = it('comodo', 'q2', 0, 0, 300, 250, { parede: 15, lados: 'cdbe', aberturas: [jan] });
const p2 = D.novaAbertura(q2, 'porta');
ok(p2.lado === 'b' && p2.pos === 110, 'sem espaço em cima (70 cm de cada lado), a porta vai para a parede de baixo, centrada');
q2.aberturas.push(p2);
q2.aberturas.push(D.novaAbertura(q2, 'porta'));
const sobrep = (a, b) => a.lado === b.lado && a.pos < b.pos + b.larg && b.pos < a.pos + a.larg;
ok(q2.aberturas.every((a, k) => q2.aberturas.every((b, j) => j === k || !sobrep(a, b))), 'três aberturas sem sobreposição');
quarto.aberturas = [jan, { id: 'p1', lado: 'e', pos: 20, larg: 80, tipo: 'porta' }];
const no = DES.aberturasNoLado(quarto, 'c');
ok(no.length === 1 && no[0].g0 === 90 && no[0].g1 === 210, 'posição absoluta da janela');
const svgQ = DES.conteudo({ itens: [quarto] }, { z: 1, t: DES.TEMAS.claro, medidas: true });
ok(svgQ.includes('M-15 -15h105v15h-105Z') && svgQ.includes('M210 -15h105v15h-105Z'), 'parede de cima cortada no vão da janela');
ok(/A80 80 0 0 1 0 100/.test(svgQ), 'porta com o arco de abrir para dentro');
ok(svgQ.includes('>janela 120<') && svgQ.includes('>porta 80<'), 'rótulos das aberturas');
const limpas = D.limparProjeto({ andares: [{ itens: [{ tipo: 'comodo', aberturas: [{ lado: 'z', pos: -5, larg: 1e9, tipo: 'x' }, null, 3] }, { tipo: 'item', aberturas: [{}] }] }] }, false).andares[0].itens;
ok(limpas[0].aberturas.length === 1 && limpas[0].aberturas[0].lado === 'c' && limpas[0].aberturas[0].pos === 0 && limpas[0].aberturas[0].larg === 1e4 && limpas[0].aberturas[0].tipo === 'janela', 'sanitiza aberturas');
ok(limpas[1].aberturas.length === 0, 'item comum não tem aberturas');
// girar: a janela de cima vai para a direita; a porta da esquerda vai para cima com a contagem invertida
DES.girar(quarto, [quarto]);
ok(jan.lado === 'd' && jan.pos === 90, 'janela gira junto (cima → direita)');
const porta = quarto.aberturas[1];
ok(porta.lado === 'c' && porta.pos === 150 && quarto.w === 250, 'porta gira junto (esquerda → cima, 250 − 20 − 80 = 150)');
for (let k = 0; k < 3; k++) DES.girar(quarto, [quarto]);
ok(jan.lado === 'c' && jan.pos === 90 && porta.lado === 'e' && porta.pos === 20, 'quatro giros voltam as aberturas ao começo');

// --- travar
const tr = D.limparProjeto({ config: { travado: 1 }, andares: [{ itens: [{ tipo: 'item', travado: 'sim' }] }] }, false);
ok(tr.config.travado === true && tr.andares[0].itens[0].travado === true, 'travado da planta e do item');
ok(D.novoProjeto('x').config.travado === false, 'projeto novo começa destravado');

// --- exportação: lista de medidas, legenda de proporção, cadeado só na tela
const coz = it('comodo', 'Cozinha', 0, 0, 300, 250, { parede: 15, lados: 'cdb', aberturas: [{ id: 'j', lado: 'c', pos: 90, larg: 120, tipo: 'janela' }] });
const banc = it('item', 'Bancada', 105, 95, 95, 63);
const cook = it('item', 'Cooktop', 115, 105, 75, 45, { travado: true });
const fora2 = it('item', 'Vaso', 400, 0, 40, 70);
const andarX = { nome: 'Térreo', itens: [coz, banc, cook, fora2] };
const L = EX.linhasMedidas(andarX);
ok(L[0].nome === 'Cozinha' && L[0].nivel === 0 && L[0].medida === '300 × 250 cm · 7,5 m²' && L[0].detalhe === 'paredes de 15 cm — cima, direita, baixo', 'lista: cômodo com área e paredes');
ok(L[1].nome === 'Janela' && L[1].detalhe === 'parede de cima, a 90 cm da esquerda', 'lista: abertura');
ok(L[2].nome === 'Bancada' && L[2].nivel === 1 && L[2].detalhe.startsWith('← 105 · → 100 · ↑ 95 · ↓ 92 cm (até Cozinha)'), 'lista: bancada com distâncias até a cozinha');
ok(L[3].nome === 'Cooktop' && L[3].nivel === 2 && L[3].detalhe === '← 10 · → 10 · ↑ 10 · ↓ 8 cm (até Bancada)', 'lista: cooktop dentro da bancada (o caso do desenho)');
ok(L[4].nome === 'Fora dos cômodos' && L[5].nome === 'Vaso', 'lista: o que está fora dos cômodos');
const projX = Object.assign(D.novoProjeto('Casa'), {});
projX.andares[0] = Object.assign(projX.andares[0], andarX);
const pgPdf = EX.paginaSVG(projX, andarX, { W: 1123, H: 794, escala: true, pagina: 1, total: 2 });
ok(/proporção <tspan[^>]*>1:\d+<\/tspan> · impresso em A4 a 100%/.test(pgPdf) && pgPdf.includes('PÁGINA 1 / 2'), 'PDF: proporção 1:N no cabeçalho e número da página');
const pgPng = EX.paginaSVG(projX, andarX, { W: 1200, H: 900, escala: false, pagina: 1, total: 1 });
ok(pgPng.includes('>escala<') && !pgPng.includes('proporção'), 'PNG: régua de escala, sem 1:N');
// rodapé: nenhuma entrada da legenda passa por cima da régua (A4 em pé, tamanhos do PDF)
const pgEmPe = EX.paginaSVG(projX, andarX, { W: 794, H: 1123, escala: true, pagina: 1, total: 1, amplia: 1.8, ui: 1.2 });
const fimLeg = Math.max(...[...pgEmPe.matchAll(/<text x="([\d.]+)" y="[\d.]+" font-size="([\d.]+)"[^>]*>(parede|cômodo|item|medida|folga|total)<\/text>/g)].map(m => +m[1] + m[3].length * m[2] * 0.62));
const iniRegua = +pgEmPe.match(/<path d="M([\d.]+) [\d.]+V[\d.]+H754V/)[1];
ok(fimLeg < iniRegua, 'PDF em pé: legenda termina antes da régua');
// folga curta (4 cm) na folha: número deitado ao lado da linha; folga comprida: número girado junto dela
const curto = DES.conteudo({ itens: [it('item', 'Bancada', 0, 0, 200, 63), it('item', 'Pia', 10, 4, 90, 55)] }, { z: 0.8, t: DES.TEMA_EXPORT, folgasTodos: true, forcarRotulos: true });
ok(/<text [^>]*>4 cm<\/text>/.test(curto) && !/rotate\(-90[^)]*\)"[^>]*>4 cm</.test(curto), 'folha: folga de 4 cm com número deitado');
const longo = DES.conteudo({ itens: [it('comodo', 'Sala', 0, 0, 400, 400), it('item', 'Mesa', 100, 100, 100, 80)] }, { z: 0.8, t: DES.TEMA_EXPORT, folgasTodos: true, forcarRotulos: true });
ok(/rotate\(-90[^)]*\)"[^>]*>100 cm</.test(longo), 'folha: folga comprida com número girado');
ok(!pgPdf.includes('#C98424'), 'exportação não leva o cadeado da tela');
ok(DES.conteudo(andarX, { z: 1, t: DES.TEMAS.claro, cadeados: true }).includes('stroke="#C98424"'), 'tela mostra o cadeado do item travado');
const pgLista = EX.paginaListaSVG(projX, andarX, L, { W: 794, H: 1123, pagina: 2, total: 2 });
ok(pgLista.includes('MEDIDAS') && pgLista.includes('>Cooktop<') && pgLista.includes('Térreo · medidas'), 'PDF: página com a lista de medidas');
ok(!/NaN|undefined/.test(pgPdf + pgPng + pgLista), 'páginas sem NaN/undefined');
ok(D.limparProjeto({}, false).config.lista === true, 'lista de medidas ligada por padrão');

// --- folha limpa por padrão: só as medidas escritas nos itens; o resto o usuário liga
const cfgNovo = D.novoProjeto('x').config;
ok(cfgNovo.expMedidas && !cfgNovo.expFolgas && !cfgNovo.expTotal && !cfgNovo.expCotas, 'padrão: só medidas nos itens');
const cfgVelho = D.limparProjeto({ config: { expMedidas: true, expFolgas: true, expTotal: true } }, false).config;
ok(cfgVelho.expMedidas && !cfgVelho.expFolgas && !cfgVelho.expTotal && cfgVelho.expV === 2, 'projeto de antes de 03/10 volta uma vez para o padrão limpo');
const cfgEscolha = D.limparProjeto({ config: { expV: 2, expFolgas: true, expTotal: true, expCotas: true } }, false).config;
ok(cfgEscolha.expFolgas && cfgEscolha.expTotal && cfgEscolha.expCotas, 'o que o usuário ligou depois fica ligado');
const legDe = svg => [...svg.matchAll(/>(medida|folga|total)<\/text>/g)].map(m => m[1]).join();
projX.config = Object.assign({}, cfgNovo);
const limpa = EX.folhaPNG(projX, andarX, 'Cooktop');
ok(legDe(limpa.svg) === '' && !limpa.svg.includes('>total '), 'folha limpa: sem cotas, folgas nem total, e sem eles na legenda');
projX.config = Object.assign({}, cfgNovo, { expTotal: true, expCotas: true });
const cheia = EX.folhaPNG(projX, andarX, 'Cooktop');
ok(legDe(cheia.svg) === 'medida,folga,total' && cheia.H >= limpa.H, 'ligando cotas e total, eles entram na folha e na legenda');
projX.config = Object.assign({}, cfgNovo);

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

  proj.andares[0].itens[0].giro = 270;
  proj.andares[0].itens[1].lados = 'cb';
  proj.andares[0].itens[1].aberturas = [{ id: 'a', lado: 'b', pos: 30, larg: 90, tipo: 'porta' }];
  proj.andares[0].itens[0].travado = true;
  const url = await EX.gerarLink(proj, 'https://exemplo.github.io/planta/');
  ok(/^https:\/\/exemplo\.github\.io\/planta\/#p=z\.[A-Za-z0-9_-]+$/.test(url), 'link comprimido');
  const volta = D.paraImportar({ projeto: await EX.lerLink(url.slice(url.indexOf('#'))) })[0];
  const a = volta.andares[0].itens;
  ok(volta.nome === 'Casa' && a.length === 2 && a[0].nome === '<b>Sofá</b>' && a[0].textura === 'rachura' && a[1].parede === 15, 'link ida e volta');
  ok(a[0].giro === 270 && a[1].lados === 'cb', 'link leva o giro e os lados com parede');
  ok(a[0].travado === true && a[1].aberturas.length === 1 && a[1].aberturas[0].tipo === 'porta' && a[1].aberturas[0].pos === 30, 'link leva as aberturas e o travado');
  ok(await EX.lerLink('#outra-coisa') === null, 'hash sem projeto é ignorado');
  await assert.rejects(() => EX.lerLink('#p=r.' + Buffer.from('{"v":2}').toString('base64url')), /link inválido/); n++;
  console.log(`${n} verificações ok`);
})().catch(e => { console.error(e); process.exit(1); });
