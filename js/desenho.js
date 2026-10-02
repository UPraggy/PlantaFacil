(function (g) {
  'use strict';
  const PF = g.PF = g.PF || {};

  const FONTE = "'Space Grotesk',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const MONO = "'JetBrains Mono',ui-monospace,Menlo,Consolas,'Courier New',monospace";

  // Identidade Rafael MR: periwinkle = estrutura, âmbar = execução, grade blueprint.
  const TEMAS = {
    claro: {
      nome: 'claro', fundo: '#F6F3EA', texto: '#1B1E2B', suave: '#6B6F80',
      grade: '#E9E4D6', gradeForte: '#DBD5C2', no: '#BDB6A0',
      parede: '#2B3150', paredeBorda: '#2B3150',
      folga: '#C5402A', folgaTxt: '#A5331F', cota: '#4A60B0', cotaTxt: '#3A4E9A',
      total: '#8A8EA0', totalTxt: '#5B5F73', acento: '#C98424',
    },
    escuro: {
      nome: 'escuro', fundo: '#11131C', texto: '#F1EDE2', suave: '#8E93A8',
      grade: '#191C29', gradeForte: '#232738', no: '#3A4059',
      parede: '#8C9BCB', paredeBorda: '#8C9BCB',
      folga: '#F08A72', folgaTxt: '#F5B3A2', cota: '#9DB1EA', cotaTxt: '#B9C8F2',
      total: '#8E93A8', totalTxt: '#B4B8CC', acento: '#EAA94E',
    },
  };
  const TEMA_EXPORT = Object.assign({}, TEMAS.claro, { fundo: '#FFFFFF' });

  // [preenchimento, contorno, texto]
  const CORES = {
    azul:  { claro: ['#E6ECFB', '#4A60B0', '#27356E'], escuro: ['#1F2A4D', '#9DB1EA', '#DCE4FA'] },
    ambar: { claro: ['#FBEFD9', '#B9772E', '#6B4210'], escuro: ['#3A2A12', '#EAA94E', '#F4CD8A'] },
    verde: { claro: ['#E7F3DF', '#4B8A32', '#2B5219'], escuro: ['#1D3220', '#7BBF5E', '#CBE8BC'] },
    terra: { claro: ['#FAE8E3', '#C5402A', '#7A2412'], escuro: ['#3B1D16', '#E0735A', '#F5C4B3'] },
    roxo:  { claro: ['#EEEAFB', '#6652C7', '#3A2C85'], escuro: ['#2C2447', '#B3A4F0', '#E1DAFB'] },
    cinza: { claro: ['#EEEDE8', '#6B6F80', '#3A3D4A'], escuro: ['#262A38', '#8E93A8', '#D4D7E3'] },
  };

  const ORDEM = ['comodo', 'parede', 'item'];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const r3 = n => Math.round(n * 1000) / 1000;
  const r1 = n => Math.round(n * 10) / 10;
  const fmt = n => String(r1(n)).replace('.', ',');

  // ---------- texturas (rachura e outras) ----------
  // Os padrões têm tamanho fixo em pixels da tela (como hachura de CAD), então usam 1/z.
  function padrao(defs, tipo, cor, z, op, prefixo) {
    const id = `${prefixo || 'pt'}-${tipo}-${cor.replace(/[^a-zA-Z0-9]/g, '')}-${Math.round(op * 100)}`;
    if (defs.has(id)) return id;
    const k = 1 / z;
    const tr = n => r3(n * k);
    const traco = `stroke="${cor}" stroke-width="${tr(1.1)}" stroke-opacity="${op}" fill="none"`;
    let corpo;
    if (tipo === 'rachura') {
      corpo = `<pattern id="${id}" width="${tr(8)}" height="${tr(8)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M${tr(4)} 0V${tr(8)}" ${traco}/></pattern>`;
    } else if (tipo === 'cruzada') {
      corpo = `<pattern id="${id}" width="${tr(9)}" height="${tr(9)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M${tr(4.5)} 0V${tr(9)}M0 ${tr(4.5)}H${tr(9)}" ${traco}/></pattern>`;
    } else if (tipo === 'pontos') {
      corpo = `<pattern id="${id}" width="${tr(7)}" height="${tr(7)}" patternUnits="userSpaceOnUse"><circle cx="${tr(3.5)}" cy="${tr(3.5)}" r="${tr(1.1)}" fill="${cor}" fill-opacity="${op}"/></pattern>`;
    } else if (tipo === 'linhas') {
      corpo = `<pattern id="${id}" width="${tr(6)}" height="${tr(6)}" patternUnits="userSpaceOnUse"><path d="M0 ${tr(3)}H${tr(6)}" ${traco}/></pattern>`;
    } else { // tijolo
      const W = 16, Ht = 6;
      corpo = `<pattern id="${id}" width="${tr(W)}" height="${tr(2 * Ht)}" patternUnits="userSpaceOnUse"><path d="M0 ${tr(Ht / 2)}H${tr(W)}M0 ${tr(Ht * 1.5)}H${tr(W)}M${tr(W / 2)} ${tr(Ht / 2)}V${tr(Ht * 1.5)}M0 0V${tr(Ht / 2)}M0 ${tr(Ht * 1.5)}V${tr(2 * Ht)}M${tr(W)} 0V${tr(Ht / 2)}M${tr(W)} ${tr(Ht * 1.5)}V${tr(2 * Ht)}" ${traco}/></pattern>`;
    }
    defs.set(id, corpo);
    return id;
  }

  // ---------- ícones de móveis vistos de cima ----------
  // Cada ícone desenha dentro da caixa (0,0)–(w,h), em cm, usando só linhas.
  const R = (x, y, w, h, rx) => `<rect x="${r3(x)}" y="${r3(y)}" width="${r3(w)}" height="${r3(h)}"${rx ? ` rx="${r3(rx)}"` : ''}/>`;
  const C = (x, y, r) => `<circle cx="${r3(x)}" cy="${r3(y)}" r="${r3(r)}"/>`;
  const P = d => `<path d="${d}"/>`;
  const divisorias = (w, h, n, y0) => { let d = ''; for (let k = 1; k < n; k++) d += `M${r3(w * k / n)} ${r3(y0)}V${r3(h)}`; return P(d); };

  const SIMBOLOS = {
    cooktop: { dim: [75, 45], f: (w, h) => {
      const r = Math.min(w, h) * 0.15;
      return C(.24 * w, .3 * h, r) + C(.24 * w, .7 * h, r) + C(.76 * w, .3 * h, r) + C(.76 * w, .7 * h, r) + C(.5 * w, .5 * h, r * 1.25);
    } },
    geladeira: { dim: [70, 75], f: (w, h) => P(`M0 ${r3(.3 * h)}H${r3(w)}`) + P(`M${r3(.14 * w)} ${r3(.1 * h)}V${r3(.22 * h)}M${r3(.14 * w)} ${r3(.4 * h)}V${r3(.62 * h)}`) },
    pia: { dim: [120, 55], f: (w, h) => {
      const m = Math.min(w, h);
      const bacias = w >= 90 ? R(.07 * w, .2 * h, .41 * w, .62 * h, m * .08) + R(.52 * w, .2 * h, .41 * w, .62 * h, m * .08) : R(.12 * w, .2 * h, .76 * w, .62 * h, m * .08);
      return bacias + C(.5 * w, .1 * h, m * .045);
    } },
    sofa: { dim: [210, 90], f: (w, h) => {
      const n = w >= 170 ? 3 : 2;
      let d = `M0 ${r3(.3 * h)}H${r3(w)}M${r3(.1 * w)} ${r3(.3 * h)}V${r3(h)}M${r3(.9 * w)} ${r3(.3 * h)}V${r3(h)}`;
      for (let k = 1; k < n; k++) d += `M${r3(.1 * w + .8 * w * k / n)} ${r3(.3 * h)}V${r3(h)}`;
      return P(d);
    } },
    poltrona: { dim: [80, 80], f: (w, h) => P(`M0 ${r3(.32 * h)}H${r3(w)}M${r3(.16 * w)} ${r3(.32 * h)}V${r3(h)}M${r3(.84 * w)} ${r3(.32 * h)}V${r3(h)}`) },
    cama: { dim: [138, 188], f: (w, h) => {
      const n = w >= 110 ? 2 : 1, gap = .04 * w, pw = (.84 * w - (n - 1) * gap) / n;
      let s = P(`M0 ${r3(.1 * h)}H${r3(w)}M${r3(.04 * w)} ${r3(.45 * h)}H${r3(.96 * w)}`);
      for (let k = 0; k < n; k++) s += R(.08 * w + k * (pw + gap), .13 * h, pw, .17 * h, Math.min(w, h) * .03);
      return s;
    } },
    mesa: { dim: [120, 80], f: (w, h) => R(.1 * w, .14 * h, .8 * w, .72 * h, Math.min(w, h) * .05) },
    cadeira: { dim: [50, 50], f: (w, h) => R(.15 * w, .32 * h, .7 * w, .56 * h, Math.min(w, h) * .1) + P(`M${r3(.15 * w)} ${r3(.14 * h)}H${r3(.85 * w)}`) },
    vaso: { dim: [40, 70], f: (w, h) => R(.2 * w, .02 * h, .6 * w, .26 * h, 2) + `<ellipse cx="${r3(.5 * w)}" cy="${r3(.64 * h)}" rx="${r3(.38 * w)}" ry="${r3(.3 * h)}"/>` },
    box: { dim: [90, 90], f: (w, h) => P(`M0 0L${r3(w)} ${r3(h)}M${r3(w)} 0L0 ${r3(h)}`) + C(.5 * w, .5 * h, Math.min(w, h) * .06) },
    porta: { dim: [80, 15], vb: [-4, -77, 88, 96], f: (w, h) => P(`M0 ${r3(h / 2)}V${r3(h / 2 - w)}`) + P(`M0 ${r3(h / 2 - w)}A${r3(w)} ${r3(w)} 0 0 1 ${r3(w)} ${r3(h / 2)}`) },
    janela: { dim: [120, 10], vb: [-4, -14, 128, 38], f: (w, h) => P(`M0 ${r3(.35 * h)}H${r3(w)}M0 ${r3(.65 * h)}H${r3(w)}M${r3(.5 * w)} 0V${r3(h)}`) },
    armario: { dim: [200, 60], f: (w, h) => divisorias(w, h, Math.max(2, Math.round(w / 50)), 0) + P(`M0 ${r3(.12 * h)}H${r3(w)}`) },
    estante: { dim: [80, 30], f: (w, h) => divisorias(w, h, Math.max(2, Math.round(w / 40)), 0) },
    rack: { dim: [150, 40], f: (w, h) => R(.25 * w, .22 * h, .5 * w, .16 * h, 1) + P(`M${r3(.1 * w)} ${r3(.72 * h)}H${r3(.9 * w)}`) },
  };

  function simboloSVG(nome, w, h, cor, sw, op) {
    const s = SIMBOLOS[nome];
    if (!s) return '';
    return `<g fill="none" stroke="${cor}" stroke-width="${r3(sw)}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round">${s.f(w, h)}</g>`;
  }

  // Miniaturas para os seletores do painel (usam currentColor, então acompanham o tema).
  function iconeSimbolo(nome) {
    const s = SIMBOLOS[nome];
    const [w, h] = s.dim, vb = s.vb || [-4, -4, w + 8, h + 8];
    const sw = Math.max(vb[2], vb[3]) * 0.045;
    return `<svg viewBox="${vb.join(' ')}" aria-hidden="true">` +
      `<rect x="0" y="0" width="${w}" height="${h}" rx="${r3(Math.min(w, h) * .06)}" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="${r3(sw)}"/>` +
      simboloSVG(nome, w, h, 'currentColor', sw, 1) + '</svg>';
  }
  function iconeTextura(tipo) {
    const defs = new Map();
    let corpo = `<rect x="1.5" y="1.5" width="25" height="25" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>`;
    if (tipo !== 'liso') corpo += `<rect x="1.5" y="1.5" width="25" height="25" rx="5" fill="url(#${padrao(defs, tipo, 'currentColor', 1, 0.85, 'pv')})"/>`;
    return `<svg viewBox="0 0 28 28" aria-hidden="true"><defs>${[...defs.values()].join('')}</defs>${corpo}</svg>`;
  }

  // ---------- geometria ----------
  // Retângulo externo: no cômodo com paredes, inclui a espessura delas (x/y/w/h do cômodo = vão livre).
  function limites(i) {
    const p = i.tipo === 'comodo' ? (i.parede || 0) : 0;
    return p ? { x: i.x - p, y: i.y - p, w: i.w + 2 * p, h: i.h + 2 * p } : { x: i.x, y: i.y, w: i.w, h: i.h };
  }

  function caixa(itens) {
    if (!itens.length) return null;
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const it of itens) {
      const i = limites(it);
      l = Math.min(l, i.x); t = Math.min(t, i.y);
      r = Math.max(r, i.x + i.w); b = Math.max(b, i.y + i.h);
    }
    return { x: l, y: t, w: r - l, h: b - t };
  }

  // O menor cômodo ou item que contém S por inteiro (ex.: o cooktop dentro da bancada, a bancada dentro da cozinha).
  function recipiente(S, itens) {
    if (!S || S.tipo === 'comodo') return null;
    const E = 0.01;
    let melhor = null;
    for (const O of itens) {
      if (O.id === S.id || O.tipo === 'parede') continue;
      const dentro = S.x >= O.x - E && S.y >= O.y - E && S.x + S.w <= O.x + O.w + E && S.y + S.h <= O.y + O.h + E;
      if (!dentro || O.w * O.h <= S.w * S.h + E) continue;
      if (!melhor || O.w * O.h < melhor.w * melhor.h) melhor = O;
    }
    return melhor;
  }

  // Folgas: distância de S até o vizinho mais próximo em cada direção (e = esquerda, d = direita, c = cima, b = baixo).
  // Vizinhos são os outros itens/paredes; para um item, também a borda interna do cômodo que o contém.
  function folgasDe(S, itens) {
    const out = [];
    if (S.tipo === 'comodo') return out;
    const L = S.x, R = S.x + S.w, T = S.y, B = S.y + S.h, E = 0.01;
    for (const dir of ['e', 'd', 'c', 'b']) {
      const horiz = dir === 'e' || dir === 'd';
      let melhor = null;
      for (const O of itens) {
        if (O.id === S.id) continue;
        const dentro = O.tipo === 'comodo';
        if (dentro && S.tipo !== 'item') continue;
        const ol = O.x, or = O.x + O.w, ot = O.y, ob = O.y + O.h;
        const lo = horiz ? Math.max(T, ot) : Math.max(L, ol);
        const hi = horiz ? Math.min(B, ob) : Math.min(R, or);
        if (hi - lo <= E) continue;
        let gap, p1, p2;
        if (dentro) {
          const cabe = horiz ? (L >= ol - E && R <= or + E) : (T >= ot - E && B <= ob + E);
          if (!cabe) continue;
          if (dir === 'd') { gap = or - R; p1 = R; p2 = or; }
          else if (dir === 'e') { gap = L - ol; p1 = ol; p2 = L; }
          else if (dir === 'b') { gap = ob - B; p1 = B; p2 = ob; }
          else { gap = T - ot; p1 = ot; p2 = T; }
        } else if (dir === 'd') { gap = ol - R; p1 = R; p2 = ol; }
        else if (dir === 'e') { gap = L - or; p1 = or; p2 = L; }
        else if (dir === 'b') { gap = ot - B; p1 = B; p2 = ot; }
        else { gap = T - ob; p1 = ob; p2 = T; }
        if (gap < -E) continue;
        if (!melhor || gap < melhor.gap) melhor = { gap, p1, p2, mid: (lo + hi) / 2, dentro };
      }
      if (melhor && melhor.gap >= 0.5) out.push({ h: horiz, p1: melhor.p1, p2: melhor.p2, mid: melhor.mid, valor: melhor.gap, dentro: melhor.dentro });
    }
    return out;
  }

  // ---------- peças do desenho ----------
  function txt(x, y, s, o) {
    const fs = o.fs;
    const halo = o.halo ? ` stroke="${o.halo}" stroke-width="${r3(fs * 0.32)}" stroke-linejoin="round" paint-order="stroke"` : '';
    const rot = o.rot ? ` transform="rotate(${o.rot} ${r3(x)} ${r3(y)})"` : '';
    const op = o.op ? ` fill-opacity="${o.op}"` : '';
    return `<text x="${r3(x)}" y="${r3(y)}" font-size="${r3(fs)}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill}"${op} font-weight="${o.peso || 400}" font-family="${o.mono ? MONO : FONTE}"${halo}${rot}>${esc(s)}</text>`;
  }

  // Corta o texto para caber em `larg` px; devolve '' se nem 3 letras cabem.
  function cabe(s, larg, fs, mono) {
    if (!s) return '';
    const n = Math.floor(larg / (fs * (mono ? 0.6 : 0.55)));
    if (n < 3) return '';
    return s.length <= n ? s : s.slice(0, n - 1) + '…';
  }

  // Linha de cota com tracinhos nas pontas.
  // lado: 'e'/'d' = texto à esquerda/direita de uma cota vertical; 'b' = texto abaixo de uma horizontal (padrão: acima).
  // desloc (px): afasta o texto da linha — usado quando o trecho é curto demais para o rótulo.
  function cota(x1, y1, x2, y2, texto, cor, corTxt, z, t, lado, desloc) {
    const tk = 4.5 / z, fs = 11 / z, dd = (desloc || 0) / z;
    const hor = Math.abs(y2 - y1) < 1e-9;
    const d = hor
      ? `M${r3(x1)} ${r3(y1)}H${r3(x2)}M${r3(x1)} ${r3(y1 - tk)}V${r3(y1 + tk)}M${r3(x2)} ${r3(y2 - tk)}V${r3(y2 + tk)}`
      : `M${r3(x1)} ${r3(y1)}V${r3(y2)}M${r3(x1 - tk)} ${r3(y1)}H${r3(x1 + tk)}M${r3(x2 - tk)} ${r3(y2)}H${r3(x2 + tk)}`;
    let s = `<path d="${d}" stroke="${cor}" stroke-width="${r3(1.4 / z)}" fill="none"/>`;
    const o = { fs, fill: corTxt, halo: t.fundo, mono: true, peso: 500 };
    if (hor && lado === 'b') s += txt((x1 + x2) / 2, y1 + 6 / z + fs * 0.8 + dd, texto, o);
    else if (hor) s += txt((x1 + x2) / 2, y1 - 6 / z - dd, texto, o);
    else if (lado === 'e') s += txt(x1 - 7 / z - dd, (y1 + y2) / 2 + fs * 0.35, texto, Object.assign({ anchor: 'end' }, o));
    else s += txt(x1 + 7 / z + dd, (y1 + y2) / 2 + fs * 0.35, texto, Object.assign({ anchor: 'start' }, o));
    return s;
  }

  const guia = (x1, y1, x2, y2, cor, z) =>
    `<path d="M${r3(x1)} ${r3(y1)}L${r3(x2)} ${r3(y2)}" stroke="${cor}" stroke-width="${r3(0.9 / z)}" stroke-dasharray="${r3(3 / z)} ${r3(3 / z)}" fill="none"/>`;

  // Entrada/saída animada de um item: escala em torno do centro + opacidade.
  function envolver(i, s, f) {
    if (!f) return s;
    const cx = i.x + i.w / 2, cy = i.y + i.h / 2;
    return `<g opacity="${r3(Math.max(0, Math.min(1, f.op)))}" transform="translate(${r3(cx)} ${r3(cy)}) scale(${r3(f.sc)}) translate(${r3(-cx)} ${r3(-cy)})">${s}</g>`;
  }

  function itemSVG(i, o) {
    const { z, t } = o;
    const fs = 12 / z;
    const pw = i.w * z, ph = i.h * z;
    let fill, stroke, tc;
    if (i.tipo === 'parede') { fill = t.parede; stroke = t.paredeBorda; tc = t.texto; }
    else { [fill, stroke, tc] = (CORES[i.cor] || CORES.azul)[t.nome]; }
    const geo = `x="${r3(i.x)}" y="${r3(i.y)}" width="${r3(i.w)}" height="${r3(i.h)}"`;
    const rx = i.tipo === 'parede' ? 0 : r3(2 / z);

    // 1) preenchimento  2) textura  3) contorno
    let s = i.tipo === 'comodo'
      ? `<rect ${geo} fill="${fill}" fill-opacity="${t.nome === 'claro' ? 0.55 : 0.4}"/>`
      : `<rect ${geo} rx="${rx}" fill="${fill}"/>`;
    if (i.textura && i.textura !== 'liso') {
      const id = padrao(o._defs, i.textura, i.tipo === 'parede' ? t.fundo : stroke, z, i.tipo === 'parede' ? 0.55 : 0.6);
      s += `<rect ${geo} rx="${rx}" fill="url(#${id})"/>`;
    }
    const p = i.tipo === 'comodo' ? (i.parede || 0) : 0;
    if (p > 0) {
      // Paredes ao redor do cômodo: anel sólido (o vão livre continua sendo x/y/w/h).
      const X = i.x, Y = i.y, X2 = i.x + i.w, Y2 = i.y + i.h;
      s += `<path d="M${r3(X - p)} ${r3(Y - p)}H${r3(X2 + p)}V${r3(Y2 + p)}H${r3(X - p)}ZM${r3(X)} ${r3(Y)}V${r3(Y2)}H${r3(X2)}V${r3(Y)}Z" fill="${t.parede}" fill-rule="evenodd"/>`;
    } else if (i.tipo === 'comodo') {
      s += `<rect ${geo} fill="none" stroke="${stroke}" stroke-width="${r3(1.4 / z)}" stroke-dasharray="${r3(7 / z)} ${r3(4 / z)}"/>`;
    } else {
      s += `<rect ${geo} rx="${rx}" fill="none" stroke="${stroke}" stroke-width="${r3(1.2 / z)}"/>`;
    }

    const comSimbolo = i.tipo === 'item' && i.simbolo && SIMBOLOS[i.simbolo] && Math.min(pw, ph) >= 24;
    if (comSimbolo) s += `<g transform="translate(${r3(i.x)} ${r3(i.y)})">${simboloSVG(i.simbolo, i.w, i.h, stroke, 1.2 / z, 0.85)}</g>`;

    const nome = i.nome || '';
    if (i.tipo === 'comodo') {
      const l1 = cabe(nome, pw - 14, 12);
      if (l1 && ph >= 24) s += txt(i.x + 9 / z, i.y + 17 / z, l1, { fs, fill: tc, anchor: 'start', peso: 500 });
      if (o.medidas && ph >= 42) {
        const l2 = cabe(`${fmt(i.w)} × ${fmt(i.h)} cm · ${fmt(i.w * i.h / 10000)} m²`, pw - 14, 11, true);
        if (l2) s += txt(i.x + 9 / z, i.y + 32 / z, l2, { fs: 11 / z, fill: t.suave, anchor: 'start', mono: true });
      }
    } else if (i.tipo === 'parede') {
      const comp = Math.max(i.w, i.h), vert = i.h > i.w;
      const base = o.medidas ? (nome ? `${nome} · ${fmt(comp)}` : fmt(comp)) : nome;
      const l = cabe(base, comp * z - 10, 12);
      if (l) s += txt(i.x + i.w / 2, i.y + i.h / 2 + fs * 0.35, l, { fs, fill: t.texto, peso: 500, halo: t.fundo, rot: vert ? -90 : 0 });
    } else if (o._contem && o._contem.has(i.id)) {
      // Item com outros dentro (ex.: bancada com cooktop): o nome vai para o canto, para não sumir embaixo deles.
      const base = o.medidas ? (nome ? `${nome} · ${fmt(i.w)} × ${fmt(i.h)}` : `${fmt(i.w)} × ${fmt(i.h)}`) : nome;
      const l = cabe(base, pw - 12, 11);
      if (l && ph >= 20) s += txt(i.x + 6 / z, i.y + 14 / z, l, { fs: 11 / z, fill: tc, anchor: 'start', peso: 500, halo: fill });
    } else {
      const cx = i.x + i.w / 2, cy = i.y + i.h / 2, halo = comSimbolo || (i.textura && i.textura !== 'liso') ? fill : null;
      const n1 = cabe(nome, pw - 8, 12);
      const med = o.medidas ? cabe(`${fmt(i.w)} × ${fmt(i.h)}`, pw - 8, 11, true) : '';
      if (n1 && med && ph >= 36) {
        s += txt(cx, cy - 2 / z, n1, { fs, fill: tc, peso: 500, halo });
        s += txt(cx, cy + 13 / z, med, { fs: 11 / z, fill: tc, op: 0.8, mono: true, halo });
      } else if (n1 && ph >= 18) {
        s += txt(cx, cy + fs * 0.35, n1, { fs, fill: tc, peso: 500, halo });
      } else if (med && ph >= 18) {
        s += txt(cx, cy + 11 / z * 0.35, med, { fs: 11 / z, fill: tc, op: 0.8, mono: true, halo });
      }
    }
    return envolver(i, s, o.fx ? o.fx(i.id) : null);
  }

  function selecaoSVG(i, o, cont) {
    const { z, t } = o;
    const off = 26 / z, L = i.x, R = i.x + i.w, T = i.y, B = i.y + i.h;
    let s = '';
    if (o.pulso && o.pulso.id === i.id && o.pulso.p < 1) {
      const e = (14 * (1 - Math.pow(1 - o.pulso.p, 3))) / z;
      s += `<rect x="${r3(L - e)}" y="${r3(T - e)}" width="${r3(i.w + 2 * e)}" height="${r3(i.h + 2 * e)}" rx="${r3((2 + e * z) / z)}" fill="none" stroke="${t.acento}" stroke-width="${r3(2 / z)}" stroke-opacity="${r3(0.7 * (1 - o.pulso.p))}"/>`;
    }
    s += `<rect x="${r3(L)}" y="${r3(T)}" width="${r3(i.w)}" height="${r3(i.h)}" rx="${r3(2 / z)}" fill="none" stroke="${t.acento}" stroke-width="${r3(2.2 / z)}"/>`;
    if (cont) return s + cadeiaSVG(i, cont, o);
    const p = i.tipo === 'comodo' ? (i.parede || 0) : 0, fora = off + p;
    s += guia(L, T, L, T - fora, t.cota, z) + guia(R, T, R, T - fora, t.cota, z);
    s += cota(L, T - fora, R, T - fora, fmt(i.w) + ' cm', t.cota, t.cotaTxt, z, t);
    s += guia(L, T, L - fora, T, t.cota, z) + guia(L, B, L - fora, B, t.cota, z);
    s += cota(L - fora, T, L - fora, B, fmt(i.h) + ' cm', t.cota, t.cotaTxt, z, t, 'e');
    return s;
  }

  // Cotas em cadeia do item S dentro do recipiente C (o desenho do cooktop):
  // à esquerda  folga · profundidade · folga, embaixo  folga · largura · folga, e os totais do recipiente.
  function cadeiaSVG(S, C, o) {
    const { z, t } = o;
    const p = C.tipo === 'comodo' ? (C.parede || 0) : 0;
    const L = C.x, R = C.x + C.w, T = C.y, B = C.y + C.h;
    const sl = S.x, sr = S.x + S.w, st = S.y, sb = S.y + S.h;
    const xe = L - p - 26 / z, yb = B + p + 26 / z, xd = R + p + 26 / z, yt = B + p + 56 / z;
    let s = '';
    s += guia(sl, st, xe, st, t.cota, z) + guia(sl, sb, xe, sb, t.cota, z);
    s += guia(sl, sb, sl, yb, t.cota, z) + guia(sr, sb, sr, yb, t.cota, z);
    s += guia(L - p, T, xe, T, t.total, z) + guia(L - p, B, xe, B, t.total, z);
    s += guia(L, B + p, L, yt, t.total, z) + guia(R, B + p, R, yt, t.total, z);
    s += guia(R + p, T, xd, T, t.total, z) + guia(R + p, B, xd, B, t.total, z);
    const trecho = (a, b, cor, corTxt, vertical, k) => {
      if (b - a < 0.5) return '';
      const curto = (b - a) * z < 30 ? 26 * (k % 2 ? 1 : 0.15) : 0;
      return vertical
        ? cota(xe, a, xe, b, fmt(b - a) + ' cm', cor, corTxt, z, t, 'e', curto)
        : cota(a, yb, b, yb, fmt(b - a) + ' cm', cor, corTxt, z, t, 'b', curto ? curto * 0.6 : 0);
    };
    s += trecho(T, st, t.folga, t.folgaTxt, true, 0) + trecho(st, sb, t.cota, t.cotaTxt, true, 1) + trecho(sb, B, t.folga, t.folgaTxt, true, 2);
    s += trecho(L, sl, t.folga, t.folgaTxt, false, 0) + trecho(sl, sr, t.cota, t.cotaTxt, false, 1) + trecho(sr, R, t.folga, t.folgaTxt, false, 2);
    s += cota(xd, T, xd, B, fmt(C.h) + ' cm', t.total, t.totalTxt, z, t, 'd');
    s += cota(L, yt, R, yt, fmt(C.w) + ' cm', t.total, t.totalTxt, z, t, 'b');
    return s;
  }

  function totalSVG(itens, o) {
    const c = caixa(itens);
    if (!c) return '';
    const { z, t } = o;
    const off = 40 / z, L = c.x, R = c.x + c.w, T = c.y, B = c.y + c.h;
    let s = guia(L, B, L, B + off, t.total, z) + guia(R, B, R, B + off, t.total, z);
    s += cota(L, B + off, R, B + off, 'total ' + fmt(c.w) + ' cm', t.total, t.totalTxt, z, t);
    s += guia(R, T, R + off, T, t.total, z) + guia(R, B, R + off, B, t.total, z);
    s += cota(R + off, T, R + off, B, 'total ' + fmt(c.h) + ' cm', t.total, t.totalTxt, z, t, 'd');
    return s;
  }

  // Desenha o andar. o = { z (px por cm), t (tema), medidas, folgasTodos, total, selId,
  //                        hoverId, fx(id) -> {op, sc}, fantasmas: [{item, op, sc}], pulso: {id, p} }
  function conteudo(andar, opcoes) {
    const defs = new Map();
    const contem = new Set();
    for (const i of andar.itens) { const c = i.tipo === 'item' ? recipiente(i, andar.itens) : null; if (c && c.tipo === 'item') contem.add(c.id); }
    const o = Object.assign({}, opcoes, { _defs: defs, _contem: contem });
    const { z, t } = o, itens = andar.itens;
    let s = '';
    for (const tipo of ORDEM) for (const i of itens) if (i.tipo === tipo) s += itemSVG(i, o);
    if (o.fantasmas) for (const f of o.fantasmas) s += envolver(f.item, itemSVG(f.item, Object.assign({}, o, { fx: null })), f);

    const linhas = new Map();
    const juntar = lista => {
      for (const f of lista) linhas.set([f.h ? 1 : 0, r1(f.p1), r1(f.p2), r1(f.mid)].join(), f);
    };
    if (o.folgasTodos) for (const i of itens) juntar(folgasDe(i, itens));
    const sel = o.selId ? itens.find(i => i.id === o.selId) : null;
    const cont = sel ? recipiente(sel, itens) : null;
    // Com recipiente, as folgas até as bordas dele já aparecem na cadeia; aqui ficam só as entre vizinhos.
    if (sel) juntar(folgasDe(sel, itens).filter(f => !(cont && f.dentro)));
    for (const f of linhas.values()) {
      const tx = fmt(f.valor) + ' cm';
      s += f.h
        ? cota(f.p1, f.mid, f.p2, f.mid, tx, t.folga, t.folgaTxt, z, t)
        : cota(f.mid, f.p1, f.mid, f.p2, tx, t.folga, t.folgaTxt, z, t, 'd');
    }
    if (o.total) s += totalSVG(itens, o);
    const sobre = o.hoverId && o.hoverId !== o.selId ? itens.find(i => i.id === o.hoverId) : null;
    if (sobre) s += `<rect x="${r3(sobre.x)}" y="${r3(sobre.y)}" width="${r3(sobre.w)}" height="${r3(sobre.h)}" rx="${r3(2 / z)}" fill="none" stroke="${t.cota}" stroke-width="${r3(1.6 / z)}" stroke-opacity=".85"/>`;
    if (sel) s += selecaoSVG(sel, o, cont);
    return (defs.size ? `<defs>${[...defs.values()].join('')}</defs>` : '') + s;
  }

  // Grade blueprint: 10 cm, 1 m e 10 m (cada uma só aparece se houver espaço) + "nós" nos cruzamentos de 1 m.
  function grade(v, z, t) {
    let s = '';
    const linhas = (passo, cor) => {
      let d = '';
      for (let x = Math.ceil(v.x0 / passo) * passo; x <= v.x1; x += passo) d += `M${x} ${r3(v.y0)}V${r3(v.y1)}`;
      for (let y = Math.ceil(v.y0 / passo) * passo; y <= v.y1; y += passo) d += `M${r3(v.x0)} ${y}H${r3(v.x1)}`;
      return d ? `<path d="${d}" stroke="${cor}" stroke-width="${r3(1 / z)}" fill="none"/>` : '';
    };
    if (z * 10 >= 7) s += linhas(10, t.grade);
    if (z * 100 >= 7) s += linhas(100, t.gradeForte);
    if (z * 1000 >= 7) s += linhas(1000, t.no);
    if (z * 100 >= 28) {
      const c = 3 / z;
      let d = '';
      for (let x = Math.ceil(v.x0 / 100) * 100; x <= v.x1; x += 100) {
        for (let y = Math.ceil(v.y0 / 100) * 100; y <= v.y1; y += 100) d += `M${r3(x - c)} ${y}H${r3(x + c)}M${x} ${r3(y - c)}V${r3(y + c)}`;
      }
      if (d) s += `<path d="${d}" stroke="${t.no}" stroke-width="${r3(1 / z)}" fill="none"/>`;
    }
    return s;
  }

  PF.desenho = {
    TEMAS, TEMA_EXPORT, CORES, FONTE, MONO,
    SIMBOLOS: Object.keys(SIMBOLOS),
    fmt, esc, caixa, limites, recipiente, folgasDe, conteudo, grade, iconeSimbolo, iconeTextura,
  };
})(typeof window !== 'undefined' ? window : globalThis);
