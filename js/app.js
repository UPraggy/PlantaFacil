(function () {
  'use strict';
  const PF = window.PF, D = PF.dados, DES = PF.desenho, EX = PF.exportar;
  const $ = id => document.getElementById(id);
  const tela = $('tela'), mundo = $('mundo'), palco = $('palco');
  const MIN = 5; // menor medida (cm) ao redimensionar

  let estado = D.carregar();
  let proj = null, andar = null, selId = null, hoverId = null, guias = [];
  let W = 360, H = 560;
  let temaPref = 'auto', tema = DES.TEMAS.escuro;
  const hist = { pilha: [], i: -1 };
  const ptrs = new Map();
  let gesto = null, quadro = 0, tAviso = 0, tVista = 0, tFalha = 0, tCiclo = 0, imaAntes = false, andarNovo = null, ultimoToque = null;

  // ---------- movimento ----------
  // Tokens do Visual Inspector (motion_tokens_generate): fast 160, base 240, slow 400 ms; stagger 40–70 ms.
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let reduzir = mq.matches;
  mq.addEventListener('change', () => { reduzir = mq.matches; });
  const agoraMs = () => performance.now();
  const ease = {
    out: t => 1 - Math.pow(1 - t, 3),
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  const efeitos = new Map();   // id -> { t0, dur }: itens entrando
  let fantasmas = [];          // itens saindo: { item, t0, dur }
  let pulso = null;            // anel ao selecionar: { id, t0 }
  let tween = null;            // transição de câmera: { de, para, t0, dur }
  const vibrar = ms => { if (!reduzir && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* sem vibração */ } } };

  function entrar(ids, passo) {
    if (reduzir) return;
    const t = agoraMs();
    ids.forEach((id, k) => efeitos.set(id, { t0: t + k * (passo == null ? 45 : passo), dur: 280 }));
    agendar();
  }
  function sair(item) { if (!reduzir) { fantasmas.push({ item, t0: agoraMs(), dur: 220 }); agendar(); } }
  function tremer(id) { if (!reduzir) { efeitos.set(id, { t0: agoraMs(), dur: 380, tipo: 'tremer' }); agendar(); } }
  function pulsar(id) { if (!reduzir) { pulso = { id, t0: agoraMs() }; agendar(); } }
  function irParaVista(alvo) {
    const v = andar.vista;
    if (reduzir) { Object.assign(v, alvo); agendar(); salvar(); return; }
    tween = { de: { tx: v.tx, ty: v.ty, z: v.z }, para: alvo, t0: agoraMs(), dur: 320 };
    agendar();
    salvar();
  }
  function trocaDeAndar() {
    mundo.classList.remove('troca');
    void mundo.getBoundingClientRect();
    mundo.classList.add('troca');
  }

  // ---------- utilitários ----------
  function h(tag, attrs, ...filhos) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const f of filhos.flat(Infinity)) if (f != null && f !== false) el.append(f.nodeType ? f : document.createTextNode(f));
    return el;
  }
  const icone = nome => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'ic');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = `<use href="#i-${nome}"/>`;
    return s;
  };
  const arred = n => Math.round(n * 10) / 10;
  const num = el => parseFloat(String(el.value).replace(',', '.'));
  const dataBR = ms => new Date(ms).toLocaleDateString('pt-BR');
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const itemPorId = id => andar.itens.find(i => i.id === id);
  const itemSel = () => (selId ? itemPorId(selId) : null);
  const totalItens = p => p.andares.reduce((n, a) => n + a.itens.length, 0);
  const corDe = c => DES.CORES[c][tema.nome][1];
  const nomeDe = i => i.nome || D.ROTULO[i.tipo];

  function aviso(msg, acao) {
    const el = $('aviso');
    el.hidden = true;
    el.replaceChildren(...[h('span', {}, msg), acao && h('button', { type: 'button', onclick: () => { el.hidden = true; acao.fn(); } }, acao.texto)].filter(Boolean));
    void el.offsetWidth;
    el.hidden = false;
    clearTimeout(tAviso);
    tAviso = setTimeout(() => { el.hidden = true; }, acao ? 6500 : 4000);
  }

  // Botão de passo (− / +): um toque = um passo; segurando, repete. aoSoltar roda ao terminar.
  function segurar(btn, passo, aoSoltar) {
    let t1 = 0, t2 = 0, ativo = false;
    const parar = () => { clearTimeout(t1); clearInterval(t2); if (ativo) { ativo = false; if (aoSoltar) aoSoltar(); } };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      ativo = true;
      passo();
      t1 = setTimeout(() => { t2 = setInterval(passo, 70); }, 380);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, parar));
    btn.addEventListener('click', e => { if (e.detail === 0) { passo(); if (aoSoltar) aoSoltar(); } }); // teclado
  }

  // Editor dos lados com parede: quatro botões em volta de um quadradinho. aoTrocar(lado) decide o que fazer.
  const NOME_LADO = { c: 'em cima', d: 'à direita', b: 'embaixo', e: 'à esquerda' };
  function editorLados(aoTrocar) {
    const caixa = h('div', { class: 'lados', role: 'group', 'aria-label': 'Quais lados têm parede' }, h('span', { class: 'lados-miolo', 'aria-hidden': 'true' }));
    const botoes = {};
    for (const k of 'cdbe') {
      botoes[k] = h('button', { type: 'button', 'data-lado': k, 'aria-label': 'Parede ' + NOME_LADO[k], title: 'Parede ' + NOME_LADO[k], onclick: () => aoTrocar(k) });
      caixa.append(botoes[k]);
    }
    return { el: caixa, marcar: lados => { for (const k of 'cdbe') botoes[k].setAttribute('aria-pressed', String(lados.includes(k))); } };
  }
  const alternarLado = (lados, k) => D.limparLados(lados.includes(k) ? lados.replace(k, '') : lados + k);
  function resumoLados(lados) {
    if (!lados) return 'Sem paredes';
    const abertos = [...'cdbe'].filter(k => !lados.includes(k)).map(k => NOME_LADO[k]);
    return `${lados.length} parede${lados.length > 1 ? 's' : ''}${abertos.length ? ' · aberto ' + abertos.join(' e ') : ''}`;
  }

  // ---------- tema ----------
  function definirTema(pref, salvarPref) {
    temaPref = pref;
    if (salvarPref) { try { localStorage.setItem('plantafacil:tema', pref); } catch (e) { /* sem armazenamento */ } }
    const efetivo = pref === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro') : pref;
    document.documentElement.dataset.tema = efetivo;
    tema = DES.TEMAS[efetivo];
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = tema.fundo;
    if (proj) { atualizarPainel(); agendar(); }
  }

  // ---------- salvar e histórico ----------
  const falhaSalvar = () => {
    if (Date.now() - tFalha < 30000) return;
    tFalha = Date.now();
    aviso('Não consegui salvar neste navegador. Exporte o arquivo para não perder o trabalho.');
  };
  const salvar = () => D.agendarSalvar(estado, falhaSalvar);
  function mudou() { proj.atualizado = Date.now(); salvar(); }

  const snap = () => JSON.stringify(proj.andares.map(a => [a.id, a.nome, a.itens]));
  function botoesHist() {
    $('btnDesfazer').disabled = hist.i <= 0;
    $('btnRefazer').disabled = hist.i >= hist.pilha.length - 1;
  }
  function reiniciarHist() { hist.pilha = [snap()]; hist.i = 0; botoesHist(); }
  function commit() {
    const s = snap();
    if (s === hist.pilha[hist.i]) return;
    hist.pilha.length = hist.i + 1;
    hist.pilha.push(s);
    if (hist.pilha.length > 80) hist.pilha.shift();
    hist.i = hist.pilha.length - 1;
    mudou();
    botoesHist();
  }
  function restaurar(s) {
    const antigos = new Map(proj.andares.map(a => [a.id, a]));
    proj.andares = JSON.parse(s).map(([id, nome, itens]) => ({ id, nome, itens, vista: antigos.has(id) ? antigos.get(id).vista : null }));
    andar = proj.andares.find(a => a.id === andar.id) || proj.andares[0];
    proj.andarAtual = andar.id;
    if (!andar.vista) ajustarVista();
    if (selId && !itemPorId(selId)) selId = null;
    renderAndares(); atualizarPainel(); botoesHist(); mudou(); agendar();
  }
  function desfazer() { if (hist.i > 0) { hist.i--; restaurar(hist.pilha[hist.i]); aviso('Desfeito'); } }
  function refazer() { if (hist.i < hist.pilha.length - 1) { hist.i++; restaurar(hist.pilha[hist.i]); aviso('Refeito'); } }

  // ---------- vista (pan e zoom) ----------
  // Margens em pixels em volta do que se enquadra: espaço das cotas em cadeia (esquerda e embaixo), dos totais
  // (direita), das pílulas (alto) e do zoom / botão Adicionar (embaixo).
  const MARGENS = { e: 96, d: 86, c: 82, b: 100 };
  function vistaPara(b, pad, zMax) {
    const m = typeof pad === 'number' ? { e: pad, d: pad, c: pad, b: pad } : pad;
    const lw = Math.max(40, W - m.e - m.d), lh = Math.max(40, H - m.c - m.b);
    const z = Math.min(Math.max(Math.min(lw / b.w, lh / b.h), 0.02), zMax);
    return { z, tx: m.e + (lw - b.w * z) / 2 - b.x * z, ty: m.c + (lh - b.h * z) / 2 - b.y * z };
  }
  function calcularVista() {
    const c = DES.caixa(andar.itens);
    return c ? vistaPara(c, MARGENS, 4) : vistaPara({ x: 0, y: 0, w: 800, h: 560 }, 44, 10);
  }
  // Deixa o selecionado (e as cotas dele, que ficam em volta do recipiente) inteiro na tela:
  // se não cabe, enquadra; se só está para fora, desliza o mínimo. Nunca durante um arrasto.
  let enquadrarDepois = false;
  function enquadrarSelecao() {
    const i = itemSel();
    if (!i) return;
    if (ptrs.size) { enquadrarDepois = true; return; }
    const c = DES.recipiente(i, andar.itens), alvo = DES.limites(c || i), v = andar.vista, m = MARGENS;
    const l = alvo.x * v.z + v.tx, t = alvo.y * v.z + v.ty, r = l + alvo.w * v.z, b = t + alvo.h * v.z;
    if (l >= m.e - 1 && r <= W - m.d + 1 && t >= m.c - 1 && b <= H - m.b + 1) return;
    if (alvo.w * v.z > W - m.e - m.d || alvo.h * v.z > H - m.c - m.b) { irParaVista(vistaPara(alvo, m, Math.max(v.z, 0.05))); return; }
    let dx = 0, dy = 0;
    if (l < m.e) dx = m.e - l; else if (r > W - m.d) dx = W - m.d - r;
    if (t < m.c) dy = m.c - t; else if (b > H - m.b) dy = H - m.b - b;
    irParaVista({ z: v.z, tx: v.tx + dx, ty: v.ty + dy });
  }
  function ajustarVista() { andar.vista = calcularVista(); }
  const plano = (sx, sy) => ({ x: (sx - andar.vista.tx) / andar.vista.z, y: (sy - andar.vista.ty) / andar.vista.z });
  function zoomEm(p, fator) {
    const v = andar.vista, q = plano(p.x, p.y);
    const z = Math.min(40, Math.max(0.01, v.z * fator));
    irParaVista({ z, tx: p.x - q.x * z, ty: p.y - q.y * z });
  }
  function visivel(i) {
    const v = andar.vista, b = DES.limites(i);
    const l = b.x * v.z + v.tx, t = b.y * v.z + v.ty;
    return l >= 0 && t >= 0 && l + b.w * v.z <= W && t + b.h * v.z <= H;
  }
  function trazerParaVista(i) {
    const v = andar.vista, m = 18, mb = 68;
    const l = i.x * v.z + v.tx, t = i.y * v.z + v.ty, r = l + i.w * v.z, b = t + i.h * v.z;
    let dx = 0, dy = 0;
    if (b > H - mb) dy = H - mb - b;
    if (t + dy < m) dy = m - t;
    if (r > W - m) dx = W - m - r;
    if (l + dx < m) dx = m - l;
    if (dx || dy) { v.tx += dx; v.ty += dy; }
  }
  function medirPalco() {
    const r = palco.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return false;
    W = r.width; H = r.height;
    return true;
  }
  function aoRedimensionar() {
    if (!medirPalco() || !andar) return;
    if (!andar.vista) ajustarVista();
    if (itemSel()) enquadrarSelecao();
    agendar();
  }

  // ---------- desenho na tela ----------
  function agendar() {
    if (quadro) return;
    // Aba em segundo plano: o navegador pausa o requestAnimationFrame. Desenha por temporizador (sem animar),
    // para a planta não ficar em branco; as animações continuam quando a aba volta a aparecer.
    if (document.hidden) { quadro = setTimeout(() => { quadro = 0; renderizar(); }, 60); return; }
    quadro = requestAnimationFrame(() => { quadro = 0; renderizar(); });
  }

  function alcasDe(i, z) {
    const pw = i.w * z, ph = i.h * z, L = i.x, R = i.x + i.w, T = i.y, B = i.y + i.h, mx = i.x + i.w / 2, my = i.y + i.h / 2;
    if (i.tipo === 'parede') {
      return pw >= ph
        ? [{ hx: -1, hy: 0, x: L, y: my }, { hx: 1, hy: 0, x: R, y: my }]
        : [{ hx: 0, hy: -1, x: mx, y: T }, { hx: 0, hy: 1, x: mx, y: B }];
    }
    const cantos = [{ hx: -1, hy: -1, x: L, y: T }, { hx: 1, hy: 1, x: R, y: B }];
    if (Math.min(pw, ph) < 48) return cantos;
    return cantos.concat([
      { hx: 1, hy: -1, x: R, y: T }, { hx: -1, hy: 1, x: L, y: B },
      { hx: 0, hy: -1, x: mx, y: T }, { hx: 0, hy: 1, x: mx, y: B },
      { hx: -1, hy: 0, x: L, y: my }, { hx: 1, hy: 0, x: R, y: my },
    ]);
  }
  function alcaProxima(i, p) {
    const v = andar.vista;
    let melhor = null, dm = 22;
    for (const a of alcasDe(i, v.z)) {
      const d = Math.hypot(a.x * v.z + v.tx - p.x, a.y * v.z + v.ty - p.y);
      if (d < dm) { dm = d; melhor = a; }
    }
    return melhor;
  }

  const ESCALAS = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  let escalaAntes = '';
  function atualizarEscala(z) {
    const L = ESCALAS.find(c => c * z >= 56) || ESCALAS[ESCALAS.length - 1];
    const chave = `${L}|${Math.round(L * z)}`;
    if (chave === escalaAntes) return;
    escalaAntes = chave;
    $('escalaBarra').style.width = `${Math.round(L * z)}px`;
    $('escalaTxt').textContent = L >= 100 ? `${DES.fmt(L / 100)} m` : `${L} cm`;
  }

  function renderizar() {
    if (!andar) return;
    if (!andar.vista) ajustarVista();
    const v = andar.vista, agora = agoraMs();
    let animando = false;

    if (tween) {
      const p = Math.min(1, (agora - tween.t0) / tween.dur), e = ease.out(p), { de, para } = tween;
      v.tx = de.tx + (para.tx - de.tx) * e;
      v.ty = de.ty + (para.ty - de.ty) * e;
      v.z = de.z * Math.pow(para.z / de.z, e);
      if (p >= 1) { Object.assign(v, para); tween = null; } else animando = true;
    }
    const z = v.z;
    mundo.setAttribute('transform', `translate(${v.tx} ${v.ty}) scale(${z})`);

    const fx = id => {
      const a = efeitos.get(id);
      if (!a) return null;
      const p = (agora - a.t0) / a.dur;
      if (p >= 1) { efeitos.delete(id); return null; }
      animando = true;
      if (a.tipo === 'tremer') return { op: 1, sc: 1, dx: Math.sin(p * Math.PI * 6) * (1 - p) * 5 / z };
      return p <= 0 ? { op: 0, sc: 0.86 } : { op: ease.out(p), sc: 0.86 + 0.14 * ease.back(p) };
    };
    fantasmas = fantasmas.filter(f => agora - f.t0 < f.dur);
    const fant = fantasmas.map(f => {
      const e = ease.out((agora - f.t0) / f.dur);
      animando = true;
      return { item: f.item, op: 1 - e, sc: 1 - 0.1 * e };
    });
    let pul = null, pop = 1;
    if (pulso) {
      const p = (agora - pulso.t0) / 520;
      if (p >= 1) pulso = null;
      else { animando = true; pul = { id: pulso.id, p }; pop = ease.back(Math.min(1, (agora - pulso.t0) / 220)); }
    }

    const vis = { x0: -v.tx / z, y0: -v.ty / z, x1: (W - v.tx) / z, y1: (H - v.ty) / z };
    const c = proj.config;
    let s = DES.grade(vis, z, tema);
    s += DES.conteudo(andar, { z, t: tema, medidas: c.medidas, folgasTodos: c.folgas, total: c.total, selId, hoverId, fx, fantasmas: fant, pulso: pul, cadeados: true });
    for (const g of guias) {
      s += `<path d="M${g.x1} ${g.y1}L${g.x2} ${g.y2}" stroke="${tema.acento}" stroke-width="${1 / z}" stroke-dasharray="${4 / z} ${3 / z}" fill="none"/>`;
    }
    const sel = itemSel();
    palco.classList.toggle('travado', !!proj.config.travado);
    if (sel && !travado(sel)) {
      for (const a of alcasDe(sel, z)) {
        s += `<circle cx="${a.x}" cy="${a.y}" r="${(6.5 / z) * Math.max(0, pop)}" fill="${tema.fundo}" stroke="${tema.acento}" stroke-width="${2 / z}"/>`;
      }
    }
    mundo.innerHTML = s;
    $('vazio').hidden = andar.itens.length > 0;
    atualizarEscala(z);
    if (animando && !document.hidden) agendar();
  }

  // ---------- seleção e acertos ----------
  function itemEm(px, py) { return itensEm(px, py)[0] || null; }
  // Todos os itens sob o ponto, do que está na frente para o de trás.
  function itensEm(px, py) {
    const achados = [];
    const z = andar.vista.z, tol = 8 / z;
    for (const tipo of ['item', 'parede', 'comodo']) {
      for (let k = andar.itens.length - 1; k >= 0; k--) {
        const i = andar.itens[k];
        if (i.tipo !== tipo) continue;
        if (tipo === 'comodo') {
          // O cômodo é pego pela borda (ou pelas paredes) e pelo nome; o miolo fica livre para mover a vista e os itens.
          const b = DES.limites(i);
          if (px < b.x - tol || px > b.x + b.w + tol || py < b.y - tol || py > b.y + b.h + tol) continue;
          const borda = px < i.x + tol || px > i.x + i.w - tol || py < i.y + tol || py > i.y + i.h - tol;
          const etiqueta = px <= i.x + 160 / z && py <= i.y + 44 / z;
          if (borda || etiqueta) achados.push(i);
        } else {
          const ex = Math.max(3 / z, (18 / z - i.w) / 2), ey = Math.max(3 / z, (18 / z - i.h) / 2);
          if (px >= i.x - ex && px <= i.x + i.w + ex && py >= i.y - ey && py <= i.y + i.h + ey) achados.push(i);
        }
      }
    }
    return achados;
  }
  const travado = i => !!(proj.config.travado || (i && i.travado));
  let tAvisoTrava = 0;
  function avisoTravado(i) {
    if (Date.now() - tAvisoTrava < 2500) return;
    tAvisoTrava = Date.now();
    aviso(proj.config.travado ? 'A planta está travada. Toque em “Travar” para destravar.' : `“${nomeDe(i)}” está travado. Toque no cadeado para mexer.`);
  }

  function selecionar(id) {
    if (selId === id) return;
    selId = id;
    if (id) pulsar(id);
    atualizarPainel();
    agendar();
  }

  // ---------- ímã nas bordas ----------
  const bordasX = o => { const b = DES.limites(o); return b.w !== o.w ? [o.x, o.x + o.w, b.x, b.x + b.w] : [o.x, o.x + o.w]; };
  const bordasY = o => { const b = DES.limites(o); return b.h !== o.h ? [o.y, o.y + o.h, b.y, b.y + b.h] : [o.y, o.y + o.h]; };
  function alinhar(meus, alvos, lim) {
    let melhor = null;
    for (const m of meus) for (const a of alvos) {
      const d = a - m;
      if (Math.abs(d) <= lim && (!melhor || Math.abs(d) < Math.abs(melhor.d))) melhor = { d, alvo: a };
    }
    return melhor;
  }
  function montarGuias(x, y, w, hh, gx, gy, outros) {
    guias = [];
    if (gx != null) {
      const rel = outros.filter(o => bordasX(o).some(a => Math.abs(a - gx) < 0.01));
      guias.push({ x1: gx, x2: gx, y1: Math.min(y, ...rel.map(o => o.y)), y2: Math.max(y + hh, ...rel.map(o => o.y + o.h)) });
    }
    if (gy != null) {
      const rel = outros.filter(o => bordasY(o).some(a => Math.abs(a - gy) < 0.01));
      guias.push({ y1: gy, y2: gy, x1: Math.min(x, ...rel.map(o => o.x)), x2: Math.max(x + w, ...rel.map(o => o.x + o.w)) });
    }
    const tem = guias.length > 0;
    if (tem && !imaAntes) vibrar(8);
    imaAntes = tem;
  }

  // ---------- gestos: arrastar, redimensionar, mover a vista, pinça, toque duplo ----------
  const posTela = e => { const r = tela.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  // Mouse sem botão: realça o item sob o cursor e mostra o cursor certo (mover / redimensionar).
  function passar(e) {
    const p = posTela(e), sel = itemSel();
    let cursor = 'default', alvo = null;
    const al = sel && !travado(sel) && alcaProxima(sel, p);
    if (al) cursor = al.hx && al.hy ? (al.hx * al.hy > 0 ? 'nwse-resize' : 'nesw-resize') : (al.hx ? 'ew-resize' : 'ns-resize');
    else {
      const q = plano(p.x, p.y), i = itemEm(q.x, q.y);
      if (i) { cursor = travado(i) ? 'pointer' : 'move'; alvo = i.id; }
    }
    if (tela.style.cursor !== cursor) tela.style.cursor = cursor;
    if (alvo !== hoverId) { hoverId = alvo; agendar(); }
  }
  tela.addEventListener('pointerleave', () => { if (hoverId) { hoverId = null; agendar(); } });

  // Toque duplo: no item, aproxima até ele; no vazio, aproxima 2× no ponto.
  function toqueDuplo(p, idAlvo) {
    const agora = Date.now();
    const duplo = ultimoToque && agora - ultimoToque.t < 320 && Math.hypot(p.x - ultimoToque.x, p.y - ultimoToque.y) < 28;
    ultimoToque = duplo ? null : { t: agora, x: p.x, y: p.y };
    if (!duplo) return false;
    const i = idAlvo && itemPorId(idAlvo);
    if (i) { const b = DES.limites(i); irParaVista(vistaPara({ x: b.x - 40, y: b.y - 40, w: b.w + 80, h: b.h + 90 }, 30, 8)); }
    else zoomEm(p, 2);
    return true;
  }

  tela.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
    try { tela.setPointerCapture(e.pointerId); } catch (err) { /* ignorado */ }
    tween = null;
    const p = posTela(e);
    ptrs.set(e.pointerId, p);
    if (ptrs.size === 2) return iniciarPinca();
    if (ptrs.size > 2) return;
    const v = andar.vista;
    imaAntes = false;
    if (e.button === 1) { gesto = { tipo: 'pan', ini: p, v0: { tx: v.tx, ty: v.ty }, moveu: false }; return; }
    const sel = itemSel();
    const q = plano(p.x, p.y);
    if (sel && !travado(sel)) {
      const al = alcaProxima(sel, p);
      if (al) {
        gesto = { tipo: 'redim', id: sel.id, al, orig: { x: sel.x, y: sel.y, w: sel.w, h: sel.h }, desl: { x: q.x - al.x, y: q.y - al.y }, moveu: false };
        return;
      }
    }
    const sob = itensEm(q.x, q.y);
    const jaSel = sel && sob.some(i => i.id === sel.id);
    const alvo = jaSel ? sel : sob[0];
    if (alvo) {
      selecionar(alvo.id);
      const ciclo = jaSel && sob.length > 1 ? sob.map(i => i.id) : null; // tocar de novo pega o de trás
      gesto = travado(alvo)
        ? { tipo: 'travado', id: alvo.id, ini: p, moveu: false, ciclo }
        : { tipo: 'mover', id: alvo.id, orig: { x: alvo.x, y: alvo.y, w: alvo.w, h: alvo.h }, ini: p, moveu: false, ciclo };
    } else {
      const dentroDe = andar.itens
        .filter(i => i.tipo === 'comodo' && q.x >= i.x && q.x <= i.x + i.w && q.y >= i.y && q.y <= i.y + i.h)
        .sort((a, b) => a.w * a.h - b.w * b.h)[0];
      gesto = { tipo: 'pan', ini: p, v0: { tx: v.tx, ty: v.ty }, moveu: false, comodoNoToque: dentroDe ? dentroDe.id : null };
    }
  });

  tela.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse' && !ptrs.size) passar(e); return; }
    const p = posTela(e);
    ptrs.set(e.pointerId, p);
    if (!gesto) return;
    if (gesto.tipo === 'pinca') return moverPinca();
    if (ptrs.size > 1 || gesto.tipo === 'espera') return;
    const v = andar.vista, enc = proj.config.encaixe, lim = 8 / v.z;
    if (gesto.tipo === 'travado') {
      if (!gesto.moveu && Math.hypot(p.x - gesto.ini.x, p.y - gesto.ini.y) > 6) {
        gesto.moveu = true;
        tremer(gesto.id); vibrar(25); avisoTravado(itemPorId(gesto.id));
      }
      return;
    }
    if (gesto.tipo === 'pan') {
      const dx = p.x - gesto.ini.x, dy = p.y - gesto.ini.y;
      if (!gesto.moveu && Math.hypot(dx, dy) < 4) return;
      gesto.moveu = true;
      v.tx = gesto.v0.tx + dx; v.ty = gesto.v0.ty + dy;
      agendar();
      return;
    }
    const i = itemPorId(gesto.id);
    if (!i) return;
    const outros = andar.itens.filter(o => o.id !== i.id);
    const sn = n => Math.round(n / enc) * enc;
    if (gesto.tipo === 'mover') {
      if (!gesto.moveu && Math.hypot(p.x - gesto.ini.x, p.y - gesto.ini.y) < 4) return;
      if (!gesto.moveu) palco.classList.add('arrastando-item');
      gesto.moveu = true;
      let nx = sn(gesto.orig.x + (p.x - gesto.ini.x) / v.z), ny = sn(gesto.orig.y + (p.y - gesto.ini.y) / v.z);
      let gx = null, gy = null;
      if (proj.config.ima) {
        const ax = alinhar([nx, nx + i.w], outros.flatMap(bordasX), lim);
        const ay = alinhar([ny, ny + i.h], outros.flatMap(bordasY), lim);
        if (ax) { nx += ax.d; gx = ax.alvo; }
        if (ay) { ny += ay.d; gy = ay.alvo; }
      }
      i.x = nx; i.y = ny;
      montarGuias(nx, ny, i.w, i.h, gx, gy, outros);
    } else if (gesto.tipo === 'redim') {
      gesto.moveu = true;
      const q = plano(p.x, p.y), a = gesto.al, o = gesto.orig;
      let L = o.x, R = o.x + o.w, T = o.y, B = o.y + o.h, gx = null, gy = null;
      if (a.hx) {
        let val = sn(q.x - gesto.desl.x);
        if (proj.config.ima) { const m = alinhar([val], outros.flatMap(bordasX), lim); if (m) { val = m.alvo; gx = m.alvo; } }
        if (a.hx < 0) L = Math.min(val, R - MIN); else R = Math.max(val, L + MIN);
      }
      if (a.hy) {
        let val = sn(q.y - gesto.desl.y);
        if (proj.config.ima) { const m = alinhar([val], outros.flatMap(bordasY), lim); if (m) { val = m.alvo; gy = m.alvo; } }
        if (a.hy < 0) T = Math.min(val, B - MIN); else B = Math.max(val, T + MIN);
      }
      i.x = L; i.y = T; i.w = R - L; i.h = B - T;
      montarGuias(i.x, i.y, i.w, i.h, gx, gy, outros);
    }
    atualizarPainel();
    agendar();
  });

  function fimGesto(e) {
    if (!ptrs.has(e.pointerId)) return;
    const p = posTela(e);
    ptrs.delete(e.pointerId);
    const g = gesto;
    if (ptrs.size > 0) {
      if (g && g.tipo === 'pinca') { gesto = { tipo: 'espera' }; salvar(); }
      return;
    }
    gesto = null; guias = []; imaAntes = false;
    palco.classList.remove('arrastando-item');
    if (enquadrarDepois) { enquadrarDepois = false; setTimeout(enquadrarSelecao, 0); }
    if (!g) return;
    const toque = e.type === 'pointerup' && !g.moveu && (g.tipo === 'pan' || g.tipo === 'mover' || g.tipo === 'travado');
    clearTimeout(tCiclo);
    if (toque && toqueDuplo(p, g.tipo === 'pan' ? null : g.id)) { agendar(); return; }
    if (toque && g.ciclo) {
      // espera um instante: se vier um segundo toque é zoom, senão passa para o item de trás
      tCiclo = setTimeout(() => {
        const k = g.ciclo.indexOf(selId), prox = g.ciclo[(k + 1) % g.ciclo.length];
        if (prox && prox !== selId) selecionar(prox);
      }, 330);
    }
    if (g.tipo === 'pan') {
      if (g.moveu) salvar();
      else if (toque && g.comodoNoToque) { selecionar(g.comodoNoToque); requestAnimationFrame(() => { medirPalco(); enquadrarSelecao(); }); }
      else if (toque && !g.toque && selId) selecionar(null);
    } else if ((g.tipo === 'mover' || g.tipo === 'redim') && g.moveu) {
      commit();
    } else if (g.tipo === 'pinca' || g.tipo === 'espera') {
      salvar();
    }
    atualizarPainel();
    agendar();
  }
  tela.addEventListener('pointerup', fimGesto);
  tela.addEventListener('pointercancel', fimGesto);

  function iniciarPinca() {
    if (gesto && (gesto.tipo === 'mover' || gesto.tipo === 'redim') && gesto.moveu) {
      const i = itemPorId(gesto.id);
      if (i) Object.assign(i, gesto.orig);
      atualizarPainel();
    }
    const [a, b] = [...ptrs.values()], v = andar.vista;
    gesto = { tipo: 'pinca', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v0: { tx: v.tx, ty: v.ty, z: v.z } };
    guias = [];
    agendar();
  }
  function moverPinca() {
    const [a, b] = [...ptrs.values()];
    if (!b) return;
    const g = gesto, v = andar.vista;
    const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const z = Math.min(40, Math.max(0.01, g.v0.z * d / g.d0));
    const px = (g.m0.x - g.v0.tx) / g.v0.z, py = (g.m0.y - g.v0.ty) / g.v0.z;
    v.z = z; v.tx = m.x - px * z; v.ty = m.y - py * z;
    agendar();
  }

  tela.addEventListener('wheel', e => {
    e.preventDefault();
    tween = null;
    const p = posTela(e), v = andar.vista, q = plano(p.x, p.y);
    const z = Math.min(40, Math.max(0.01, v.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016))));
    v.z = z; v.tx = p.x - q.x * z; v.ty = p.y - q.y * z;
    agendar();
    clearTimeout(tVista);
    tVista = setTimeout(salvar, 500);
  }, { passive: false });

  // ---------- painel do item selecionado ----------
  const P = { nome: $('pNome'), w: $('pW'), h: $('pH') };
  const DIST = { c: $('dC'), e: $('dE'), d: $('dD'), b: $('dB') };
  let distCont = null; // recipiente "congelado" enquanto o usuário digita uma distância

  function atualizarPainel() {
    const i = itemSel();
    $('painel').hidden = !i;
    if (!i) return;
    const foco = document.activeElement;
    const set = (el, v) => { if (el !== foco) el.value = v; };
    set(P.nome, i.nome); set(P.w, arred(i.w)); set(P.h, arred(i.h));
    const parede = i.tipo === 'parede', deitada = i.w >= i.h;
    $('pRotW').textContent = parede ? (deitada ? 'Comprimento' : 'Espessura') : 'Largura';
    $('pRotH').textContent = parede ? (deitada ? 'Espessura' : 'Comprimento') : 'Profundidade';
    $('pPonto').style.background = parede ? tema.parede : corDe(i.cor);
    $('pTipoTxt').textContent = D.ROTULO[i.tipo];
    document.querySelectorAll('#pTipo button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tipo === i.tipo)));

    const c = distCont || DES.recipiente(i, andar.itens);
    $('pDist').hidden = !c;
    if (c) {
      $('pDistNome').textContent = nomeDe(c);
      $('pDistItem').textContent = nomeDe(i);
      set(DIST.e, arred(i.x - c.x)); set(DIST.d, arred(c.x + c.w - i.x - i.w));
      set(DIST.c, arred(i.y - c.y)); set(DIST.b, arred(c.y + c.h - i.y - i.h));
    }
    $('pParedes').hidden = i.tipo !== 'comodo';
    const lados = DES.ladosDe(i);
    edLados.marcar(lados);
    $('pLadosTxt').textContent = resumoLados(lados);
    document.querySelectorAll('#pParedesSeg button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.esp) === (lados ? i.parede : 0))));
    const giro = i.tipo === 'comodo' ? 'Girar o cômodo 90° com tudo que está dentro (R)' : 'Girar 90° (R)';
    $('pGirar').title = giro; $('pGirar').setAttribute('aria-label', giro);
    $('pCoresBloco').hidden = parede;
    document.querySelectorAll('#pCores button').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.cor === i.cor));
      b.style.setProperty('--c', corDe(b.dataset.cor));
    });
    document.querySelectorAll('#pTexturas button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.textura === (i.textura || 'liso'))));
    $('pIconesBloco').hidden = i.tipo !== 'item';
    document.querySelectorAll('#pIcones button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.simbolo === (i.simbolo || ''))));
    const trav = !!i.travado, soLeitura = travado(i);
    $('painel').classList.toggle('so-leitura', soLeitura);
    const livres = new Set(['pTravar', 'pFechar', 'pExpandir', 'pPegador']);
    document.querySelectorAll('#painel input, #painel select, #painel button').forEach(el => { if (!livres.has(el.id)) el.disabled = soLeitura; });
    $('pTravar').disabled = !!proj.config.travado; // com a planta travada, o cadeado do item não muda nada
    $('pAvisoTrava').hidden = !soLeitura;
    $('pAvisoTravaTxt').textContent = proj.config.travado ? 'Planta travada: só para ver. Toque em “Travar”, no alto da planta, para editar.' : 'Travado: não dá para mover nem editar. Toque no cadeado para destravar.';
    $('pTravar').setAttribute('aria-pressed', String(trav));
    $('pTravar').querySelector('use').setAttribute('href', trav ? '#i-lock' : '#i-unlock');
    $('pTravar').title = trav ? 'Travado: toque para destravar' : 'Travar: não sai do lugar ao arrastar';
    $('pTravar').setAttribute('aria-label', trav ? 'Destravar este item' : 'Travar este item');
    $('pAberturas').hidden = i.tipo !== 'comodo';
    if (i.tipo === 'comodo') montarAberturas(i);
    $('pDica').textContent = soLeitura ? '' : i.tipo === 'comodo' ? 'Para mover o cômodo, arraste pela parede ou pelo nome. Arrastar no meio dele move só a vista.' : '';
  }

  P.nome.addEventListener('input', () => { const i = itemSel(); if (!i) return; i.nome = P.nome.value; mudou(); agendar(); });
  P.nome.addEventListener('change', commit);
  for (const [el, campo] of [[P.w, 'w'], [P.h, 'h']]) {
    el.addEventListener('input', () => {
      const i = itemSel(), v = num(el);
      if (!i || !(v > 0)) return;
      i[campo] = Math.min(v, 100000); mudou(); agendar();
    });
    el.addEventListener('change', () => { commit(); atualizarPainel(); });
  }
  document.querySelectorAll('#painel [data-campo]').forEach(b => segurar(b, () => {
    const i = itemSel();
    if (!i) return;
    const enc = proj.config.encaixe, campo = b.dataset.campo, dir = b.dataset.passo === '+' ? 1 : -1;
    i[campo] = Math.max(enc, Math.round((i[campo] + dir * enc) / enc) * enc);
    mudou(); atualizarPainel(); agendar();
  }, commit));

  for (const [lado, el] of Object.entries(DIST)) {
    el.addEventListener('focus', () => { const i = itemSel(); distCont = i ? DES.recipiente(i, andar.itens) : null; });
    el.addEventListener('input', () => {
      const i = itemSel(), c = distCont, v = num(el);
      if (!i || !c || !Number.isFinite(v)) return;
      if (lado === 'e') i.x = c.x + v;
      else if (lado === 'd') i.x = c.x + c.w - i.w - v;
      else if (lado === 'c') i.y = c.y + v;
      else i.y = c.y + c.h - i.h - v;
      mudou(); atualizarPainel(); agendar();
    });
    el.addEventListener('change', () => { commit(); atualizarPainel(); });
    el.addEventListener('blur', () => { distCont = null; atualizarPainel(); });
  }
  [P.nome, P.w, P.h, ...Object.values(DIST)].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') el.blur(); }));

  document.querySelectorAll('#pTipo button').forEach(b => b.addEventListener('click', () => {
    const i = itemSel();
    if (!i) return;
    i.tipo = b.dataset.tipo;
    if (i.tipo !== 'item') i.simbolo = '';
    if (i.tipo !== 'comodo') i.parede = 0;
    if (i.tipo !== 'item' && i.cor === 'azul') i.cor = 'cinza';
    commit(); atualizarPainel(); agendar();
  }));
  D.ESPESSURAS.forEach(esp => $('pParedesSeg').append(h('button', {
    type: 'button', 'data-esp': esp, 'aria-label': esp ? `Paredes de ${esp} cm` : 'Sem paredes',
    onclick: () => {
      const i = itemSel(); if (!i) return;
      i.parede = esp;
      if (esp && !i.lados) i.lados = D.LADOS;
      commit(); atualizarPainel(); agendar();
    },
  }, esp ? String(esp) : 'Sem')));
  const edLados = editorLados(k => {
    const i = itemSel();
    if (!i || i.tipo !== 'comodo') return;
    const atual = DES.ladosDe(i);
    i.lados = atual ? alternarLado(atual, k) : k; // sem paredes: o lado tocado vira a primeira parede
    if (!i.parede) i.parede = 15;
    vibrar(6); commit(); atualizarPainel(); agendar();
  });
  $('pLados').append(edLados.el);
  D.CORES.forEach(c => $('pCores').append(h('button', {
    type: 'button', class: 'cor', 'data-cor': c, 'aria-label': 'Cor ' + c,
    onclick: () => { const i = itemSel(); if (!i) return; i.cor = c; commit(); atualizarPainel(); agendar(); },
  })));
  const NOMES_TEXTURA = { liso: 'Liso', rachura: 'Rachura', cruzada: 'Rachura cruzada', pontos: 'Pontilhado', linhas: 'Linhas', tijolo: 'Tijolo' };
  D.TEXTURAS.forEach(t => {
    const b = h('button', {
      type: 'button', class: 'amostra-btn', 'data-textura': t, 'aria-label': 'Textura: ' + NOMES_TEXTURA[t], title: NOMES_TEXTURA[t],
      onclick: () => { const i = itemSel(); if (!i) return; i.textura = t; commit(); atualizarPainel(); agendar(); },
    });
    b.innerHTML = DES.iconeTextura(t);
    $('pTexturas').append(b);
  });
  ['', ...DES.SIMBOLOS].forEach(s => {
    const b = h('button', {
      type: 'button', class: 'amostra-btn', 'data-simbolo': s, 'aria-label': s ? 'Ícone: ' + s : 'Sem ícone', title: s || 'Sem ícone',
      onclick: () => { const i = itemSel(); if (!i) return; i.simbolo = s; commit(); atualizarPainel(); agendar(); },
    });
    if (s) b.innerHTML = DES.iconeSimbolo(s); else b.append(icone('x'));
    $('pIcones').append(b);
  });
  function girarSelecionado() {
    const i = itemSel();
    if (!i) return;
    if (travado(i)) { tremer(i.id); avisoTravado(i); return; }
    const antes = new Set(andar.itens.map(o => o.id + ':' + o.x + ':' + o.y));
    const n = DES.girar(i, andar.itens);
    entrar(andar.itens.filter(o => o.id !== i.id && !antes.has(o.id + ':' + o.x + ':' + o.y)).map(o => o.id), 12);
    pulsar(i.id);
    commit(); atualizarPainel(); agendar();
    if (i.tipo === 'comodo') aviso(n ? `“${nomeDe(i)}” girou com ${plural(n, 'item', 'itens')} dentro` : `“${nomeDe(i)}” girou`);
  }
  $('pGirar').addEventListener('click', girarSelecionado);
  $('pDup').addEventListener('click', () => {
    const i = itemSel();
    if (!i) return;
    const c = Object.assign({}, i, { id: D.uid(), x: i.x + 20, y: i.y + 20 });
    andar.itens.push(c);
    selId = c.id;
    entrar([c.id]); pulsar(c.id);
    commit(); atualizarPainel(); agendar();
  });
  $('pDel').addEventListener('click', () => remover(selId));
  $('pTravar').addEventListener('click', () => {
    const i = itemSel(); if (!i) return;
    i.travado = !i.travado;
    vibrar(10); commit(); atualizarPainel(); agendar();
    aviso(i.travado ? `“${nomeDe(i)}” travado: não dá para mover nem editar` : `“${nomeDe(i)}” destravado`);
  });
  function mudarOrdem(frente) {
    const i = itemSel(); if (!i) return;
    const k = andar.itens.indexOf(i);
    andar.itens.splice(k, 1);
    if (frente) andar.itens.push(i); else andar.itens.unshift(i);
    pulsar(i.id); commit(); agendar();
    aviso(frente ? 'Trazido para a frente' : 'Enviado para trás');
  }
  $('pFrente').addEventListener('click', () => mudarOrdem(true));
  $('pTras').addEventListener('click', () => mudarOrdem(false));

  // ---------- aberturas (janela, porta, vão) do cômodo ----------
  const NOME_ABERTURA = { janela: 'Janela', porta: 'Porta', vao: 'Vão' };
  const NOME_LADO_CURTO = { c: 'Parede de cima', d: 'Parede da direita', b: 'Parede de baixo', e: 'Parede da esquerda' };
  let assinaturaAberturas = '';
  function montarAberturas(i) {
    const lista = $('pAbertLista');
    const assin = i.id + '|' + (i.aberturas || []).map(a => a.id + a.tipo + a.lado).join(',') + '|' + DES.ladosDe(i);
    const foco = document.activeElement;
    if (assin === assinaturaAberturas) {
      // só atualiza os valores (sem recriar os campos, para não perder o foco)
      lista.querySelectorAll('[data-ab]').forEach(el => {
        const a = (i.aberturas || []).find(x => x.id === el.dataset.ab);
        if (!a) return;
        const [pos, larg] = el.querySelectorAll('input');
        if (pos !== foco) pos.value = arred(a.pos);
        if (larg !== foco) larg.value = arred(a.larg);
      });
      return;
    }
    assinaturaAberturas = assin;
    const ladosComParede = DES.ladosDe(i);
    lista.replaceChildren(...(i.aberturas || []).map(a => {
      const tipo = h('select', { 'aria-label': 'Tipo de abertura', onchange: () => { a.tipo = tipo.value; commit(); atualizarPainel(); agendar(); } },
        D.TIPOS_ABERTURA.map(t => h('option', { value: t, selected: t === a.tipo }, NOME_ABERTURA[t])));
      const lado = h('select', { 'aria-label': 'Em qual parede', onchange: () => { a.lado = lado.value; a.pos = 0; commit(); atualizarPainel(); agendar(); } },
        [...'cdbe'].map(k => h('option', { value: k, selected: k === a.lado, disabled: !ladosComParede.includes(k) && k !== a.lado }, NOME_LADO_CURTO[k])));
      const sairBtn = h('button', { type: 'button', class: 'icone perigo', 'aria-label': 'Tirar esta abertura', title: 'Tirar',
        onclick: () => { i.aberturas = i.aberturas.filter(x => x !== a); commit(); atualizarPainel(); agendar(); } }, icone('trash'));
      const campo = (rotulo, chave, minimo) => {
        const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', value: String(arred(a[chave])), 'aria-label': rotulo + ' em centímetros' });
        const aplicar = v => { const comp = a.lado === 'c' || a.lado === 'b' ? i.w : i.h; a[chave] = Math.max(minimo, Math.min(v, chave === 'larg' ? comp : comp - a.larg)); mudou(); agendar(); };
        input.addEventListener('input', () => { const v = num(input); if (Number.isFinite(v)) aplicar(v); });
        input.addEventListener('change', () => { commit(); atualizarPainel(); });
        input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
        const passo = dir => () => { aplicar(Math.round((a[chave] + dir * proj.config.encaixe) / proj.config.encaixe) * proj.config.encaixe); input.value = String(arred(a[chave])); };
        const menos = h('button', { type: 'button', class: 'passo', 'aria-label': 'Diminuir ' + rotulo }, '−');
        const mais = h('button', { type: 'button', class: 'passo', 'aria-label': 'Aumentar ' + rotulo }, '+');
        segurar(menos, passo(-1), commit); segurar(mais, passo(1), commit);
        return { input, el: h('label', { class: 'campo-num' }, h('span', { class: 'rot' }, rotulo), h('span', { class: 'stepper' }, menos, h('span', { class: 'campo' }, input, h('i', {}, 'cm')), mais)) };
      };
      const horiz = a.lado === 'c' || a.lado === 'b';
      const cPos = campo(horiz ? 'Da esquerda' : 'De cima', 'pos', 0), cLarg = campo('Largura', 'larg', 5);
      return h('div', { class: 'abertura', 'data-ab': a.id },
        h('div', { class: 'abertura-topo' }, tipo, lado, sairBtn),
        h('div', { class: 'medidas' }, cPos.el, cLarg.el));
    }));
  }
  document.querySelectorAll('[data-abertura]').forEach(b => b.addEventListener('click', () => {
    const i = itemSel(); if (!i || i.tipo !== 'comodo') return;
    const a = D.novaAbertura(i, b.dataset.abertura);
    if (!a) { aviso('Ligue pelo menos uma parede antes de pôr janela ou porta.'); return; }
    i.aberturas = (i.aberturas || []).concat(a);
    vibrar(6); commit(); atualizarPainel(); agendar();
  }));
  $('pFechar').addEventListener('click', () => selecionar(null));
  function expandirPainel(abrir) {
    $('painel').classList.toggle('compacto', !abrir);
    $('pExpandir').setAttribute('aria-expanded', String(abrir));
    $('pExpandir').querySelector('span').textContent = abrir ? 'Menos' : 'Ajustes';
  }
  $('pExpandir').addEventListener('click', () => expandirPainel($('painel').classList.contains('compacto')));
  $('pPegador').addEventListener('click', () => expandirPainel($('painel').classList.contains('compacto')));

  function remover(id) {
    const k = andar.itens.findIndex(i => i.id === id);
    if (k < 0) return;
    const [r] = andar.itens.splice(k, 1);
    selId = null;
    sair(r);
    commit(); atualizarPainel(); agendar();
    aviso(`“${nomeDe(r)}” excluído`, { texto: 'Desfazer', fn: desfazer });
  }

  // ---------- andares ----------
  function renderAndares() {
    $('andares').replaceChildren(
      ...proj.andares.map(a => {
        const ativo = a.id === andar.id;
        return h('button', {
          type: 'button', class: 'chip' + (a.id === andarNovo ? ' nova' : ''), 'aria-current': ativo ? 'true' : null,
          title: ativo ? 'Renomear, duplicar ou excluir' : null,
          onclick: () => (ativo ? menuAndar() : irParaAndar(a.id)),
        }, a.nome, ativo ? icone('more') : null);
      }),
      h('button', { type: 'button', class: 'chip novo', 'aria-label': 'Novo andar', title: 'Novo andar', onclick: novoAndarUI }, icone('plus')),
    );
    andarNovo = null;
    const ativo = $('andares').querySelector('[aria-current]');
    if (ativo && ativo.scrollIntoView) ativo.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }
  function irParaAndar(id) {
    const a = proj.andares.find(x => x.id === id);
    if (!a) return;
    andar = a; proj.andarAtual = id; selId = null; guias = []; tween = null;
    if (!andar.vista) ajustarVista();
    trocaDeAndar();
    entrar(andar.itens.slice(0, 24).map(i => i.id), 18);
    renderAndares(); atualizarPainel(); agendar(); salvar();
  }
  function novoAndarUI() {
    const a = D.novoAndar(`Andar ${proj.andares.length + 1}`);
    proj.andares.push(a);
    commit();
    andarNovo = a.id;
    irParaAndar(a.id);
    aviso('Andar criado. Toque no nome dele para renomear.');
  }

  // ---------- modais ----------
  function fecharModal() { $('camada').hidden = true; $('camada').replaceChildren(); }
  function abrirModal(titulo, ...corpo) {
    const camada = $('camada');
    camada.replaceChildren(h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
      h('div', { class: 'pegador', 'aria-hidden': 'true' }),
      h('div', { class: 'modal-topo' }, h('h2', {}, titulo), h('button', { class: 'icone', type: 'button', 'aria-label': 'Fechar', onclick: fecharModal }, icone('x'))),
      h('div', { class: 'modal-corpo' }, corpo)));
    camada.hidden = false;
  }
  $('camada').addEventListener('pointerdown', e => { if (e.target === $('camada')) fecharModal(); });

  // ---------- adicionar (tamanho livre) ----------
  const ultimo = { tipo: 'item', item: Object.assign({}, D.NOVO_PADRAO.item), comodo: Object.assign({}, D.NOVO_PADRAO.comodo), parede: Object.assign({ deitada: true }, D.NOVO_PADRAO.parede) };
  try { const s = JSON.parse(localStorage.getItem('plantafacil:novo') || 'null'); if (s) ['item', 'comodo', 'parede'].forEach(k => Object.assign(ultimo[k], s[k])), ultimo.tipo = s.tipo || ultimo.tipo; } catch (e) { /* ignora */ }

  // Para onde vai o item novo: o cômodo selecionado (ou o que contém o selecionado), ou o cômodo no meio da tela.
  function destinoNovo(tipo) {
    if (tipo === 'comodo') return null;
    const sel = itemSel();
    if (sel) {
      if (sel.tipo === 'comodo') return sel;
      const c = DES.recipiente(sel, andar.itens);
      if (c) return c;
    }
    const m = plano(W / 2, H / 2);
    return andar.itens.filter(i => i.tipo === 'comodo' && m.x >= i.x && m.x <= i.x + i.w && m.y >= i.y && m.y <= i.y + i.h)
      .sort((a, b) => a.w * a.h - b.w * b.h)[0] || null;
  }

  function campoMedida(rotulo, valor) {
    const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', value: String(valor), 'aria-label': rotulo + ' em centímetros' });
    const rot = h('span', { class: 'rot' }, rotulo);
    const passo = dir => () => {
      const enc = proj.config.encaixe, v = num(input);
      input.value = String(Math.max(enc, Math.round(((Number.isFinite(v) ? v : 0) + dir * enc) / enc) * enc));
    };
    const menos = h('button', { type: 'button', class: 'passo', 'aria-label': 'Diminuir ' + rotulo }, '−');
    const mais = h('button', { type: 'button', class: 'passo', 'aria-label': 'Aumentar ' + rotulo }, '+');
    segurar(menos, passo(-1)); segurar(mais, passo(1));
    return { el: h('label', { class: 'campo-num' }, rot, h('span', { class: 'stepper' }, menos, h('span', { class: 'campo' }, input, h('i', {}, 'cm')), mais)), input, rot };
  }

  function menuAdicionar(tipoInicial) {
    let tipo = tipoInicial || ultimo.tipo || 'item';
    const segTipo = h('div', { class: 'seg grande', role: 'group', 'aria-label': 'O que adicionar' });
    const nome = h('input', { type: 'text', maxlength: 60, autocomplete: 'off', 'aria-label': 'Nome' });
    const cw = campoMedida('Largura', 0), ch = campoMedida('Profundidade', 0);
    const cores = h('div', { class: 'cores' });
    let cor = 'azul';
    D.CORES.forEach(c => cores.append(h('button', {
      type: 'button', class: 'cor', 'data-cor': c, 'aria-label': 'Cor ' + c, style: `--c:${corDe(c)}`,
      onclick: () => { cor = c; marcarCor(); },
    })));
    const marcarCor = () => cores.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cor === cor)));
    let esp = 15, ladosNovo = D.LADOS;
    const paredes = h('div', { class: 'seg', role: 'group', 'aria-label': 'Espessura das paredes' });
    D.ESPESSURAS.forEach(v => paredes.append(h('button', {
      type: 'button', 'data-esp': v, 'aria-label': v ? `Paredes de ${v} cm` : 'Sem paredes',
      onclick: () => { esp = v; if (v && !ladosNovo) ladosNovo = D.LADOS; marcarEsp(); },
    }, v ? String(v) : 'Sem')));
    const resumoNovo = h('p', { class: 'paredes-resumo' });
    const edNovo = editorLados(k => { ladosNovo = esp ? alternarLado(ladosNovo, k) : k; if (!esp) esp = 15; vibrar(6); marcarEsp(); });
    const marcarEsp = () => {
      paredes.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.esp) === (ladosNovo ? esp : 0))));
      edNovo.marcar(esp ? ladosNovo : '');
      resumoNovo.textContent = resumoLados(esp ? ladosNovo : '');
    };
    let deitada = true;
    const orient = h('div', { class: 'seg', role: 'group', 'aria-label': 'Direção da parede' });
    [[true, 'Horizontal'], [false, 'Vertical']].forEach(([v, r]) => orient.append(h('button', { type: 'button', 'data-v': String(v), onclick: () => { deitada = v; marcarOrient(); } }, r)));
    const marcarOrient = () => orient.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(deitada))));
    const blocoCor = h('div', { class: 'bloco' }, h('p', { class: 'rot' }, 'Cor'), cores);
    const blocoParedes = h('div', { class: 'bloco' },
      h('p', { class: 'rot' }, 'Paredes ', h('span', { class: 'dica-rot' }, 'toque num lado para ligar ou desligar')),
      h('div', { class: 'paredes-editor' }, edNovo.el,
        h('div', { class: 'paredes-lado' }, resumoNovo, h('p', { class: 'rot' }, 'Espessura (cm)'), paredes)));
    const blocoOrient = h('div', { class: 'bloco' }, h('p', { class: 'rot' }, 'Direção'), orient);
    const erro = h('p', { class: 'erro', role: 'alert' });
    const notaMedidas = h('p', { class: 'nota nota-medidas' });
    const destino = h('p', { class: 'nota destino' });

    [['item', 'Item'], ['comodo', 'Cômodo'], ['parede', 'Parede']].forEach(([v, r]) => segTipo.append(h('button', {
      type: 'button', 'data-tipo': v, onclick: () => { guardar(); tipo = v; montar(); },
    }, r)));

    function guardar() {
      const u = ultimo[tipo];
      u.nome = nome.value;
      const a = num(cw.input), b = num(ch.input);
      if (tipo === 'parede') { if (a > 0) u.w = a; if (b > 0) u.h = b; u.deitada = deitada; }
      else { if (a > 0) u.w = a; if (b > 0) u.h = b; }
      if (tipo !== 'parede') u.cor = cor;
      if (tipo === 'comodo') { u.parede = esp; u.lados = ladosNovo; }
    }
    function montar() {
      const u = ultimo[tipo];
      segTipo.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tipo === tipo)));
      nome.value = u.nome || '';
      nome.placeholder = { item: 'Ex.: Cooktop, Sofá, Cama', comodo: 'Ex.: Cozinha, Sala', parede: 'Ex.: Parede da pia' }[tipo];
      cw.input.value = String(u.w); ch.input.value = String(u.h);
      cw.rot.textContent = tipo === 'parede' ? 'Comprimento' : 'Largura';
      ch.rot.textContent = tipo === 'parede' ? 'Espessura' : 'Profundidade';
      notaMedidas.textContent = tipo === 'comodo' ? 'Medidas de dentro (vão livre). As paredes ficam por fora.' : '';
      cor = u.cor || 'azul'; esp = u.parede == null ? 15 : u.parede; ladosNovo = u.lados == null ? D.LADOS : D.limparLados(u.lados); deitada = u.deitada !== false;
      marcarCor(); marcarEsp(); marcarOrient();
      blocoCor.hidden = tipo === 'parede';
      blocoParedes.hidden = tipo !== 'comodo';
      blocoOrient.hidden = tipo !== 'parede';
      const d = destinoNovo(tipo);
      destino.textContent = d ? `Vai para o centro de “${nomeDe(d)}”.` : 'Vai para o centro da tela.';
      erro.textContent = '';
    }
    function criar() {
      const a = num(cw.input), b = num(ch.input);
      if (!(a > 0) || !(b > 0)) {
        erro.textContent = 'Informe as duas medidas em centímetros (números maiores que zero).';
        (a > 0 ? ch.input : cw.input).focus();
        return;
      }
      guardar();
      ultimo.tipo = tipo;
      try { localStorage.setItem('plantafacil:novo', JSON.stringify(ultimo)); } catch (e) { /* ignora */ }
      const vazio = !andar.itens.length;
      const spec = tipo === 'parede'
        ? { tipo, nome: nome.value, w: deitada ? a : b, h: deitada ? b : a }
        : { tipo, nome: nome.value, w: a, h: b, cor, parede: ladosNovo ? esp : 0, lados: ladosNovo };
      const d = destinoNovo(tipo);
      const centro = d ? { x: d.x + d.w / 2, y: d.y + d.h / 2 } : plano(W / 2, H / 2);
      const novo = D.novoItem(spec, centro.x, centro.y, andar.itens, proj.config.encaixe);
      andar.itens.push(novo);
      fecharModal();
      selId = novo.id;
      entrar([novo.id]); pulsar(novo.id);
      commit(); atualizarPainel();
      medirPalco(); // o painel acabou de abrir e a planta encolheu
      if (vazio || !visivel(novo)) irParaVista(calcularVista()); else agendar();
    }

    const form = h('form', { class: 'form-novo', novalidate: true, onsubmit: e => { e.preventDefault(); criar(); } },
      segTipo,
      h('label', { class: 'campo-grande' }, h('span', { class: 'rot' }, 'Nome'), nome),
      h('div', { class: 'medidas' }, cw.el, ch.el), notaMedidas,
      blocoCor, blocoParedes, blocoOrient, erro,
      h('button', { type: 'submit', class: 'btn primario grande' }, icone('plus'), 'Adicionar'),
      destino);
    abrirModal('Adicionar', form);
    montar();
    if (matchMedia('(pointer: fine)').matches) setTimeout(() => nome.focus(), 60);
  }

  function menuAndar() {
    const nome = h('input', {
      type: 'text', value: andar.nome, maxlength: 40, 'aria-label': 'Nome do andar',
      oninput: () => { andar.nome = nome.value.trim() || 'Andar'; mudou(); renderAndares(); },
      onchange: commit,
    });
    const unico = proj.andares.length === 1;
    abrirModal('Andar',
      h('label', { class: 'campo-grande' }, h('span', { class: 'rot' }, 'Nome'), nome),
      h('button', { type: 'button', class: 'btn', onclick: () => {
        const c = D.duplicarAndar(andar);
        proj.andares.splice(proj.andares.indexOf(andar) + 1, 0, c);
        commit(); fecharModal(); andarNovo = c.id; irParaAndar(c.id); aviso('Andar duplicado');
      } }, icone('copy'), 'Duplicar andar'),
      h('button', { type: 'button', class: 'btn perigo', disabled: unico, onclick: () => {
        if (andar.itens.length && !confirm(`Excluir “${andar.nome}” com ${plural(andar.itens.length, 'item', 'itens')}?`)) return;
        const k = proj.andares.indexOf(andar);
        proj.andares.splice(k, 1);
        commit(); fecharModal(); irParaAndar(proj.andares[Math.max(0, k - 1)].id);
      } }, icone('trash'), unico ? 'Excluir andar (precisa ter pelo menos um)' : 'Excluir andar'));
    setTimeout(() => nome.select(), 50);
  }

  function menuProjetos() {
    const lista = h('div', { class: 'lista' }, estado.projetos.map(p => h('div', { class: 'linha' + (p.id === proj.id ? ' atual' : '') },
      h('button', { type: 'button', class: 'linha-main', onclick: () => { fecharModal(); abrirProjeto(p.id); } },
        h('strong', {}, p.nome),
        h('small', {}, `${plural(p.andares.length, 'andar', 'andares')} · ${plural(totalItens(p), 'item', 'itens')} · ${dataBR(p.atualizado)}`)),
      h('button', { type: 'button', class: 'icone', 'aria-label': 'Duplicar ' + p.nome, title: 'Duplicar', onclick: () => {
        estado.projetos.push(D.duplicarProjeto(p)); D.salvarAgora(estado); menuProjetos();
      } }, icone('copy')),
      h('button', { type: 'button', class: 'icone perigo', 'aria-label': 'Excluir ' + p.nome, title: 'Excluir', onclick: () => excluirProjeto(p) }, icone('trash')))));
    const nome = h('input', { type: 'text', placeholder: 'Nome do novo projeto', maxlength: 60, 'aria-label': 'Nome do novo projeto' });
    const criar = () => {
      const np = D.novoProjeto(nome.value.trim() || `Projeto ${estado.projetos.length + 1}`);
      estado.projetos.push(np);
      D.salvarAgora(estado);
      fecharModal();
      abrirProjeto(np.id);
    };
    nome.addEventListener('keydown', e => { if (e.key === 'Enter') criar(); });
    abrirModal('Projetos', lista,
      h('div', { class: 'linha-form' }, nome, h('button', { type: 'button', class: 'btn primario', onclick: criar }, 'Criar')),
      h('button', { type: 'button', class: 'btn', onclick: () => { $('arq').value = ''; $('arq').click(); } }, icone('upload'), 'Importar arquivo (.json)'));
  }
  function excluirProjeto(p) {
    if (!confirm(`Excluir o projeto “${p.nome}” com ${plural(totalItens(p), 'item', 'itens')}? Isso não tem desfazer.`)) return;
    estado.projetos = estado.projetos.filter(x => x.id !== p.id);
    if (!estado.projetos.length) estado.projetos.push(D.novoProjeto('Meu projeto'));
    D.salvarAgora(estado);
    if (p.id === proj.id) { fecharModal(); abrirProjeto(estado.projetos[0].id); } else menuProjetos();
  }

  const ROTULOS_VER = { medidas: 'Medidas nos itens', folgas: 'Folgas de todos', total: 'Medida total', lista: 'Lista de medidas (no PDF)' };
  function alternador(k, rotulo) {
    const b = h('button', { type: 'button', 'aria-pressed': String(!!proj.config[k]), onclick: () => {
      proj.config[k] = !proj.config[k];
      b.setAttribute('aria-pressed', String(proj.config[k]));
      atualizarPills(); mudou(); agendar();
    } }, rotulo);
    return b;
  }

  const baseDoSite = () => location.href.split('#')[0].split('?')[0];
  async function copiarLink(btn) {
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Gerando…';
    try {
      const url = await EX.gerarLink(proj, baseDoSite());
      try {
        await navigator.clipboard.writeText(url);
        aviso(url.length > 6000 ? `Link copiado, mas é longo (${url.length} caracteres). Se algum app cortar, envie o arquivo.` : 'Link copiado. Quem abrir recebe uma cópia do projeto.');
      } catch (e) { window.prompt('Copie o link:', url); }
    } catch (e) { aviso('Não consegui gerar o link: ' + e.message); }
    btn.disabled = false; btn.textContent = orig;
  }
  async function enviarLink() {
    try { await navigator.share({ title: proj.nome, text: `Planta “${proj.nome}”`, url: await EX.gerarLink(proj, baseDoSite()) }); } catch (e) { /* cancelado */ }
  }

  function menuExportar() {
    const podeShare = EX.podeCompartilhar();
    const rodar = async (tipo, compart, btn) => {
      const orig = btn.textContent;
      btn.disabled = true; btn.textContent = 'Gerando…';
      try {
        const { blob, nome } = await EX.gerar(tipo, proj, andar, estado, selId);
        if (compart) { if (!(await EX.compartilhar(blob, nome))) EX.baixar(blob, nome); } else EX.baixar(blob, nome);
        aviso(`${nome} pronto`);
      } catch (e) { aviso('Não consegui gerar: ' + e.message); }
      btn.disabled = false; btn.textContent = orig;
    };
    const linha = (tipo, titulo, desc) => {
      const baixar = h('button', { type: 'button', class: 'btn primario', onclick: () => rodar(tipo, false, baixar) }, 'Baixar');
      const comp = podeShare ? h('button', { type: 'button', class: 'btn', onclick: () => rodar(tipo, true, comp) }, 'Enviar') : null;
      return h('div', { class: 'linha-export' }, h('div', {}, h('strong', {}, titulo), h('small', {}, desc)), h('div', { class: 'par' }, comp, baixar));
    };
    const copiar = h('button', { type: 'button', class: 'btn primario', onclick: () => copiarLink(copiar) }, 'Copiar link');
    const enviar = navigator.share && matchMedia('(pointer: coarse)').matches
      ? h('button', { type: 'button', class: 'btn', onclick: enviarLink }, 'Enviar') : null;
    abrirModal('Compartilhar e exportar',
      h('div', { class: 'linha-export destaque' },
        h('div', {}, h('strong', {}, 'Link para compartilhar'), h('small', {}, 'Quem abrir recebe uma cópia do projeto. Nada vai para servidor.')),
        h('div', { class: 'par' }, enviar, copiar)),
      h('div', {}, h('p', { class: 'rot' }, 'Mostrar nos arquivos'),
        h('div', { class: 'pills' }, Object.entries(ROTULOS_VER).map(([k, r]) => alternador(k, r)))),
      linha('png', 'Imagem (PNG)', itemSel() ? `Andar “${andar.nome}” com as cotas de “${nomeDe(itemSel())}”` : `Só o andar “${andar.nome}”`),
      linha('pdf', 'PDF', proj.config.lista ? `A4: a planta de cada andar e a lista de medidas dele` : `${plural(proj.andares.length, 'página', 'páginas')} · uma por andar, em A4`),
      linha('json', 'Arquivo do projeto', 'Para guardar e importar depois (.json)'),
      linha('backup', 'Backup de tudo', `${plural(estado.projetos.length, 'projeto', 'projetos')} num arquivo só`),
      h('button', { type: 'button', class: 'btn', onclick: () => { $('arq').value = ''; $('arq').click(); } }, icone('upload'), 'Importar arquivo (.json)'));
  }

  function menuAjustes() {
    const nome = h('input', {
      type: 'text', value: proj.nome, maxlength: 60, 'aria-label': 'Nome do projeto',
      oninput: () => { proj.nome = nome.value.trim() || 'Projeto'; $('nomeProjeto').textContent = proj.nome; mudou(); },
    });
    const seg = (itens, atual, aoEscolher) => {
      const g = h('div', { class: 'seg', role: 'group' });
      itens.forEach(([valor, rotulo]) => g.append(h('button', {
        type: 'button', 'aria-pressed': String(valor === atual),
        onclick: () => { aoEscolher(valor); g.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-pressed', String(itens[k][0] === valor))); },
      }, rotulo)));
      return g;
    };
    const ima = h('button', { type: 'button', 'aria-pressed': String(proj.config.ima), class: 'btn alterna', onclick: () => {
      proj.config.ima = !proj.config.ima;
      ima.setAttribute('aria-pressed', String(proj.config.ima));
      mudou();
    } }, 'Grudar nas bordas de outros itens (ímã)');
    abrirModal('Ajustes',
      h('label', { class: 'campo-grande' }, h('span', { class: 'rot' }, 'Nome do projeto'), nome),
      h('div', { class: 'bloco' }, h('p', { class: 'rot' }, 'Passo ao arrastar e nos botões − +'),
        seg(D.ENCAIXES.map(n => [n, `${n} cm`]), proj.config.encaixe, v => { proj.config.encaixe = v; mudou(); })),
      ima,
      h('div', { class: 'bloco' }, h('p', { class: 'rot' }, 'Tema'),
        seg([['auto', 'Automático'], ['claro', 'Claro'], ['escuro', 'Escuro']], temaPref, v => definirTema(v, true))),
      h('p', { class: 'nota' }, 'Tudo fica salvo só neste navegador. Para guardar ou levar para outro aparelho, use Compartilhar e exportar.'));
  }

  // ---------- projeto ----------
  function abrirProjeto(id) {
    proj = estado.projetos.find(p => p.id === id) || estado.projetos[0];
    estado.atualId = proj.id;
    andar = proj.andares.find(a => a.id === proj.andarAtual) || proj.andares[0];
    proj.andarAtual = andar.id;
    selId = null; guias = []; tween = null; efeitos.clear(); fantasmas = [];
    ajustarVista(); // ao abrir, enquadra na tela atual (a vista salva pode ser de outro aparelho)
    $('nomeProjeto').textContent = proj.nome;
    reiniciarHist(); renderAndares(); atualizarPills(); atualizarPainel();
    trocaDeAndar();
    entrar(andar.itens.slice(0, 24).map(i => i.id), 18);
    agendar();
    salvar();
  }
  function atualizarPills() {
    document.querySelectorAll('[data-ver]').forEach(b => b.setAttribute('aria-pressed', String(!!proj.config[b.dataset.ver])));
  }

  // ---------- importar: arquivo, arrastar e soltar, link ----------
  async function importarArquivo(f) {
    try {
      let obj;
      try { obj = JSON.parse(await f.text()); } catch (e) { throw new Error('o arquivo não é um JSON válido'); }
      const novos = D.paraImportar(obj);
      estado.projetos.push(...novos);
      D.salvarAgora(estado);
      fecharModal();
      abrirProjeto(novos[0].id);
      aviso(novos.length === 1 ? `“${novos[0].nome}” importado` : `${novos.length} projetos importados`);
    } catch (e) { aviso('Não consegui importar: ' + e.message); }
  }
  $('arq').addEventListener('change', () => {
    const f = $('arq').files[0];
    $('arq').value = '';
    if (f) importarArquivo(f);
  });

  async function receberLinkDaUrl() {
    if (!location.hash.startsWith('#p=')) return;
    try {
      const dados = await EX.lerLink(location.hash);
      const [novo] = D.paraImportar({ projeto: dados });
      estado.projetos.push(novo);
      D.salvarAgora(estado);
      fecharModal();
      abrirProjeto(novo.id);
      aviso(`Projeto “${novo.nome}” recebido por link. Já está nos seus projetos.`);
    } catch (e) { aviso('Não consegui abrir o link: ' + e.message); }
    history.replaceState(null, '', location.pathname + location.search);
  }
  addEventListener('hashchange', receberLinkDaUrl);

  const temArquivo = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  ['dragenter', 'dragover'].forEach(ev => addEventListener(ev, e => {
    if (!temArquivo(e)) return;
    e.preventDefault();
    document.body.classList.add('arrastando');
  }));
  addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('arrastando'); });
  addEventListener('drop', e => {
    if (!temArquivo(e)) return;
    e.preventDefault();
    document.body.classList.remove('arrastando');
    const f = e.dataTransfer.files[0];
    if (f) importarArquivo(f);
  });

  // ---------- botões e teclado ----------
  $('btnAdd').addEventListener('click', () => menuAdicionar());
  $('btnPrimeiro').addEventListener('click', () => { if (proj.config.travado) avisoTravado(null); else menuAdicionar('comodo'); });
  $('btnAjustar').addEventListener('click', () => irParaVista(calcularVista()));
  $('btnMais').addEventListener('click', () => zoomEm({ x: W / 2, y: H / 2 }, 1.5));
  $('btnMenos').addEventListener('click', () => zoomEm({ x: W / 2, y: H / 2 }, 1 / 1.5));
  $('btnProjetos').addEventListener('click', menuProjetos);
  $('btnExportar').addEventListener('click', menuExportar);
  $('btnAjustes').addEventListener('click', menuAjustes);
  $('btnDesfazer').addEventListener('click', desfazer);
  $('btnRefazer').addEventListener('click', refazer);
  document.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.ver;
    proj.config[k] = !proj.config[k];
    atualizarPills(); mudou(); agendar();
    if (k === 'travado') { vibrar(10); aviso(proj.config.travado ? 'Planta travada: só para ver. Nada sai do lugar nem muda.' : 'Planta destravada: pode editar.'); atualizarPainel(); }
  }));

  document.addEventListener('keydown', e => {
    if (!$('camada').hidden) { if (e.key === 'Escape') fecharModal(); return; }
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) refazer(); else desfazer(); }
    else if (mod && k === 'y') { e.preventDefault(); refazer(); }
    else if (mod && k === 'd') { e.preventDefault(); if (selId && !travado(itemSel())) $('pDup').click(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { if (selId) { e.preventDefault(); if (travado(itemSel())) { tremer(selId); avisoTravado(itemSel()); } else remover(selId); } }
    else if (e.key === 'Escape') selecionar(null);
    else if (e.key === '+' || e.key === '=') zoomEm({ x: W / 2, y: H / 2 }, 1.5);
    else if (e.key === '-') zoomEm({ x: W / 2, y: H / 2 }, 1 / 1.5);
    else if (k === 'n' && !mod) { e.preventDefault(); if (proj.config.travado) avisoTravado(null); else menuAdicionar(); }
    else if (k === 'r' && !mod && selId) { e.preventDefault(); girarSelecionado(); }
    else if (e.key.startsWith('Arrow') && selId) {
      e.preventDefault();
      if (travado(itemSel())) { tremer(selId); avisoTravado(itemSel()); return; }
      const i = itemSel(), passo = proj.config.encaixe * (e.shiftKey ? 10 : 1);
      if (e.key === 'ArrowLeft') i.x -= passo; else if (e.key === 'ArrowRight') i.x += passo;
      else if (e.key === 'ArrowUp') i.y -= passo; else i.y += passo;
      commit(); atualizarPainel(); agendar();
    }
  });

  // ---------- início ----------
  try { temaPref = localStorage.getItem('plantafacil:tema') || 'auto'; } catch (e) { temaPref = 'auto'; }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (temaPref === 'auto') definirTema('auto', false); });
  definirTema(temaPref, false);
  const r0 = palco.getBoundingClientRect();
  if (r0.width > 10 && r0.height > 10) { W = r0.width; H = r0.height; }
  abrirProjeto(estado.atualId);
  if ('ResizeObserver' in window) new ResizeObserver(aoRedimensionar).observe(palco);
  else addEventListener('resize', aoRedimensionar);
  addEventListener('pagehide', () => D.salvarAgora(estado));
  document.addEventListener('visibilitychange', () => { if (document.hidden) D.salvarAgora(estado); else agendar(); });
  receberLinkDaUrl();
  try {
    if (!localStorage.getItem('plantafacil:dica')) {
      localStorage.setItem('plantafacil:dica', '1');
      setTimeout(() => aviso('Dica: toque num cômodo ou item para editar. Arraste para mover, belisque ou use − + para ampliar.'), 900);
    }
  } catch (e) { /* sem armazenamento */ }
})();
