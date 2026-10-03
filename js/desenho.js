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
  // Na folha exportada, o texto das cotas verticais corre ao longo da linha (convenção de planta técnica).
  const TEMA_EXPORT = Object.assign({}, TEMAS.claro, { fundo: '#FFFFFF', girarCotas: true });

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
  // Lados do cômodo que têm parede ('' = nenhum). c = cima, d = direita, b = baixo, e = esquerda.
  function ladosDe(i) {
    if (i.tipo !== 'comodo' || !(i.parede > 0)) return '';
    return i.lados == null ? 'cdbe' : i.lados;
  }

  // Retângulo externo: no cômodo, inclui a espessura das paredes que existem (x/y/w/h do cômodo = vão livre).
  function limites(i) {
    const l = ladosDe(i), p = i.parede || 0;
    if (!l) return { x: i.x, y: i.y, w: i.w, h: i.h };
    const e = l.includes('e') ? p : 0, d = l.includes('d') ? p : 0, c = l.includes('c') ? p : 0, b = l.includes('b') ? p : 0;
    return { x: i.x - e, y: i.y - c, w: i.w + e + d, h: i.h + c + b };
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
  // O escopo é o recipiente de S (o cômodo, ou o item em que ele está — o cooktop dentro da bancada):
  // contam as bordas internas do recipiente e os vizinhos que estão dentro dele. O que está fora não conta,
  // senão o cooktop "mediria" até a mesa atravessando a bancada.
  function folgasDe(S, itens) {
    const out = [];
    if (S.tipo === 'comodo') return out;
    const L = S.x, R = S.x + S.w, T = S.y, B = S.y + S.h, E = 0.01;
    const rec = recipiente(S, itens);
    const dentroDoRec = O => !rec || (O.x >= rec.x - E && O.y >= rec.y - E && O.x + O.w <= rec.x + rec.w + E && O.y + O.h <= rec.y + rec.h + E);
    for (const dir of ['e', 'd', 'c', 'b']) {
      const horiz = dir === 'e' || dir === 'd';
      let melhor = null;
      for (const O of itens) {
        if (O.id === S.id) continue;
        const dentro = rec ? O.id === rec.id : O.tipo === 'comodo';
        if (!dentro && (O.tipo === 'comodo' || !dentroDoRec(O))) continue;
        if (dentro && S.tipo !== 'item' && O.tipo === 'comodo') continue;
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

  // ---------- girar 90° (sentido horário; y cresce para baixo) ----------
  const PROX_LADO = { c: 'd', d: 'b', b: 'e', e: 'c' };
  const girarLados = l => { const n = [...l].map(k => PROX_LADO[k]); return [...'cdbe'].filter(k => n.includes(k)).join(''); };
  function girar90(i, cx, cy) {
    const dx = i.x + i.w / 2 - cx, dy = i.y + i.h / 2 - cy;
    [i.w, i.h] = [i.h, i.w];
    i.x = r1(cx - dy - i.w / 2);
    i.y = r1(cy + dx - i.h / 2);
    i.giro = ((i.giro || 0) + 90) % 360;
    if (i.tipo === 'comodo') {
      i.lados = girarLados(i.lados == null ? 'cdbe' : i.lados);
      // direita→baixo e esquerda→cima invertem o sentido da contagem; o novo lado mede i.w (largura já trocada)
      for (const a of i.aberturas || []) {
        const inverte = a.lado === 'd' || a.lado === 'e';
        a.lado = PROX_LADO[a.lado];
        if (inverte) a.pos = r1(Math.max(0, i.w - a.pos - a.larg));
      }
    }
  }
  // Tudo o que está inteiro dentro do cômodo, contando as paredes dele (itens, paredes soltas, outros cômodos).
  // É o que vai junto quando o cômodo gira ou é arrastado no modo "Mover cômodo".
  function dentroDoComodo(alvo, itens) {
    const L = limites(alvo), E = 0.01, junto = [];
    for (const o of itens) {
      if (o.id === alvo.id) continue;
      const b = limites(o);
      if (b.x >= L.x - E && b.y >= L.y - E && b.x + b.w <= L.x + L.w + E && b.y + b.h <= L.y + L.h + E) junto.push(o);
    }
    return junto;
  }
  // Gira o item no lugar. Num cômodo, gira junto tudo o que está dentro dele (itens, paredes soltas) e os lados
  // com parede. Devolve quantos itens foram junto.
  function girar(alvo, itens) {
    const cx = alvo.x + alvo.w / 2, cy = alvo.y + alvo.h / 2;
    const junto = alvo.tipo === 'comodo' ? dentroDoComodo(alvo, itens) : [];
    for (const i of [alvo, ...junto]) girar90(i, cx, cy);
    return junto.length;
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
    if (texto === '') return s;
    const o = { fs, fill: corTxt, halo: t.fundo, mono: true, peso: 500 };
    if (hor && lado === 'b') s += txt((x1 + x2) / 2, y1 + 6 / z + fs * 0.8 + dd, texto, o);
    else if (hor) s += txt((x1 + x2) / 2, y1 - 6 / z - dd, texto, o);
    else if (t.girarCotas) {
      // vertical girada: lê de baixo para cima, colada na linha (o lado de fora fica para as letras)
      const mid = (y1 + y2) / 2;
      s += lado === 'e'
        ? txt(x1 - 6 / z - dd, mid, texto, Object.assign({ rot: -90 }, o))
        : txt(x1 + 6 / z + fs * 0.8 + dd, mid, texto, Object.assign({ rot: -90 }, o));
    }
    else if (lado === 'e') s += txt(x1 - 7 / z - dd, (y1 + y2) / 2 + fs * 0.35, texto, Object.assign({ anchor: 'end' }, o));
    else s += txt(x1 + 7 / z + dd, (y1 + y2) / 2 + fs * 0.35, texto, Object.assign({ anchor: 'start' }, o));
    return s;
  }

  const guia = (x1, y1, x2, y2, cor, z) =>
    `<path d="M${r3(x1)} ${r3(y1)}L${r3(x2)} ${r3(y2)}" stroke="${cor}" stroke-width="${r3(0.9 / z)}" stroke-dasharray="${r3(3 / z)} ${r3(3 / z)}" fill="none"/>`;

  // Entrada/saída animada de um item: escala em torno do centro + opacidade.
  function envolver(i, s, f) {
    if (!f) return s;
    const cx = i.x + i.w / 2, cy = i.y + i.h / 2, dx = f.dx || 0;
    return `<g opacity="${r3(Math.max(0, Math.min(1, f.op)))}" transform="translate(${r3(cx + dx)} ${r3(cy)}) scale(${r3(f.sc)}) translate(${r3(-cx)} ${r3(-cy)})">${s}</g>`;
  }

  // Cadeadinho no canto do item travado (só na tela; a exportação não leva).
  function cadeadoSVG(cx, cy, z, t) {
    const k = 1 / z, n = v => r3(v * k);
    return `<circle cx="${r3(cx)}" cy="${r3(cy)}" r="${n(8.5)}" fill="${t.fundo}" stroke="${t.acento}" stroke-width="${n(1.2)}"/>` +
      `<rect x="${r3(cx - 3.6 * k)}" y="${r3(cy - 0.6 * k)}" width="${n(7.2)}" height="${n(5.4)}" rx="${n(1.2)}" fill="${t.acento}"/>` +
      `<path d="M${r3(cx - 2.3 * k)} ${r3(cy - 0.6 * k)}V${r3(cy - 2.6 * k)}a${n(2.3)} ${n(2.3)} 0 0 1 ${n(4.6)} 0V${r3(cy - 0.6 * k)}" fill="none" stroke="${t.acento}" stroke-width="${n(1.4)}"/>`;
  }

  // Trechos que sobram de [a0, a1] depois de tirar os cortes (vãos de janela/porta).
  function sobras(a0, a1, cortes) {
    const out = [];
    let ini = a0;
    for (const [c0, c1] of cortes.slice().sort((p, q) => p[0] - q[0])) {
      if (c0 > ini + 0.01) out.push([ini, c0]);
      ini = Math.max(ini, c1);
    }
    if (a1 > ini + 0.01) out.push([ini, a1]);
    return out;
  }

  // Abertura já limitada ao lado: { lado, tipo, larg, g0, g1 } (g0/g1 = início e fim ao longo do lado, em cm absolutos).
  function aberturasNoLado(i, lado) {
    const horiz = lado === 'c' || lado === 'b', comp = horiz ? i.w : i.h, base = horiz ? i.x : i.y;
    return (i.aberturas || []).filter(a => a.lado === lado).map(a => {
      const larg = Math.min(a.larg, comp), pos = Math.min(Math.max(0, a.pos), comp - larg);
      return { lado, tipo: a.tipo, larg, g0: base + pos, g1: base + pos + larg };
    });
  }

  // Paredes do cômodo: só nos lados ligados, cortadas nas aberturas; lados sem parede ficam tracejados.
  function paredesSVG(i, o, stroke) {
    const { z, t } = o;
    const l = ladosDe(i), p = i.parede || 0, X = i.x, Y = i.y, X2 = i.x + i.w, Y2 = i.y + i.h;
    const pe = l.includes('e') ? p : 0, pd = l.includes('d') ? p : 0;
    const ret = (x, y, w, h) => `M${r3(x)} ${r3(y)}h${r3(w)}v${r3(h)}h${r3(-w)}Z`;
    let paredes = '', abertos = '', detalhe = '', rotulos = '';
    const fino = r3(1.1 / z), linha = (x1, y1, x2, y2) => `M${r3(x1)} ${r3(y1)}L${r3(x2)} ${r3(y2)}`;
    const mostrarRotulo = o.medidas || o.selId === i.id;
    for (const lado of 'cdbe') {
      const horiz = lado === 'c' || lado === 'b';
      if (!l.includes(lado)) {
        abertos += horiz ? `M${r3(X)} ${r3(lado === 'c' ? Y : Y2)}H${r3(X2)}` : `M${r3(lado === 'e' ? X : X2)} ${r3(Y)}V${r3(Y2)}`;
        continue;
      }
      const vaos = aberturasNoLado(i, lado);
      // faixa da parede (b0..b1 na espessura) e face de dentro
      const b0 = lado === 'c' ? Y - p : lado === 'b' ? Y2 : lado === 'e' ? X - p : X2;
      const b1 = b0 + p, dentro = lado === 'c' ? Y : lado === 'b' ? Y2 : lado === 'e' ? X : X2;
      const sentido = lado === 'c' || lado === 'e' ? 1 : -1; // para dentro do cômodo
      const [a0, a1] = horiz ? [X - pe, X2 + pd] : [Y, Y2];
      for (const [q0, q1] of sobras(a0, a1, vaos.map(v => [v.g0, v.g1]))) {
        paredes += horiz ? ret(q0, b0, q1 - q0, p) : ret(b0, q0, p, q1 - q0);
      }
      for (const v of vaos) {
        // batentes
        detalhe += horiz ? linha(v.g0, b0, v.g0, b1) + linha(v.g1, b0, v.g1, b1) : linha(b0, v.g0, b1, v.g0) + linha(b0, v.g1, b1, v.g1);
        if (v.tipo === 'janela') {
          for (const f of [0, 0.42, 0.58, 1]) {
            const k = b0 + p * f;
            detalhe += horiz ? linha(v.g0, k, v.g1, k) : linha(k, v.g0, k, v.g1);
          }
        } else if (v.tipo === 'porta') {
          const L = v.g1 - v.g0;
          if (horiz) {
            const fim = dentro + sentido * L, varre = sentido > 0 ? 0 : 1;
            detalhe += linha(v.g0, dentro, v.g0, fim) + `M${r3(v.g0)} ${r3(fim)}A${r3(L)} ${r3(L)} 0 0 ${varre} ${r3(v.g1)} ${r3(dentro)}`;
          } else {
            const fim = dentro + sentido * L, varre = sentido > 0 ? 1 : 0;
            detalhe += linha(dentro, v.g0, fim, v.g0) + `M${r3(fim)} ${r3(v.g0)}A${r3(L)} ${r3(L)} 0 0 ${varre} ${r3(dentro)} ${r3(v.g1)}`;
          }
        }
        if (mostrarRotulo) {
          const fs = 10 / z, txtA = `${v.tipo === 'vao' ? 'vão' : v.tipo} ${fmt(v.larg)}`;
          const mid = (v.g0 + v.g1) / 2, fora = sentido > 0 ? b0 - 5 / z : b1 + 5 / z;
          rotulos += horiz
            ? txt(mid, sentido > 0 ? fora : fora + fs * 0.8, txtA, { fs, fill: t.suave, mono: true, halo: t.fundo })
            : txt(sentido > 0 ? fora : fora + fs * 0.8, mid, txtA, { fs, fill: t.suave, mono: true, halo: t.fundo, rot: -90 });
        }
      }
    }
    let out = '';
    if (paredes) out += `<path d="${paredes}" fill="${t.parede}"/>`;
    if (detalhe) out += `<path d="${detalhe}" fill="none" stroke="${t.parede}" stroke-width="${fino}"/>`;
    if (abertos) out += `<path d="${abertos}" fill="none" stroke="${stroke}" stroke-width="${r3(1.4 / z)}" stroke-dasharray="${r3(7 / z)} ${r3(4 / z)}"/>`;
    return out + rotulos;
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
    if (i.tipo === 'comodo') {
      s += paredesSVG(i, o, stroke);
    } else {
      s += `<rect ${geo} rx="${rx}" fill="none" stroke="${stroke}" stroke-width="${r3(1.2 / z)}"/>`;
    }

    const comSimbolo = i.tipo === 'item' && i.simbolo && SIMBOLOS[i.simbolo] && Math.min(pw, ph) >= 24;
    if (comSimbolo) {
      // O ícone é desenhado na posição original e girado junto com o item (giro de 90° em 90°).
      const g = i.giro || 0, w0 = g % 180 ? i.h : i.w, h0 = g % 180 ? i.w : i.h;
      const X2 = r3(i.x + i.w), Y2 = r3(i.y + i.h);
      const tr = g === 90 ? `translate(${X2} ${r3(i.y)}) rotate(90)` : g === 180 ? `translate(${X2} ${Y2}) rotate(180)`
        : g === 270 ? `translate(${r3(i.x)} ${Y2}) rotate(270)` : `translate(${r3(i.x)} ${r3(i.y)})`;
      s += `<g transform="${tr}">${simboloSVG(i.simbolo, w0, h0, stroke, 1.2 / z, 0.85)}</g>`;
    }

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
      // Item com outros dentro (ex.: bancada com cooktop): o nome vai para o canto, para não sumir embaixo deles;
      // na folha exportada, vai inteiro logo abaixo do item.
      const base = o.medidas ? (nome ? `${nome} · ${fmt(i.w)} × ${fmt(i.h)}` : `${fmt(i.w)} × ${fmt(i.h)}`) : nome;
      if (o.forcarRotulos) {
        if (base) o._fora.push(txt(i.x + i.w / 2, i.y + i.h + 4 / z + 11 / z * 0.9, base, { fs: 11 / z, fill: t.texto, peso: 500, halo: t.fundo }));
      } else {
        const l = cabe(base, pw - 12, 11);
        if (l && ph >= 20) s += txt(i.x + 6 / z, i.y + 14 / z, l, { fs: 11 / z, fill: tc, anchor: 'start', peso: 500, halo: fill });
      }
    } else {
      const cx = i.x + i.w / 2, cy = i.y + i.h / 2, halo = comSimbolo || (i.textura && i.textura !== 'liso') ? fill : null;
      const n1 = cabe(nome, pw - 8, 12);
      const med = o.medidas ? cabe(`${fmt(i.w)} × ${fmt(i.h)}`, pw - 8, 11, true) : '';
      let nomeDentro = false, medDentro = false;
      const nIn = o.forcarRotulos && n1 !== nome ? '' : n1; // na folha, nome cortado ("Geladei…") vai inteiro por fora
      if (nIn && med && ph >= 36) {
        s += txt(cx, cy - 2 / z, nIn, { fs, fill: tc, peso: 500, halo });
        s += txt(cx, cy + 13 / z, med, { fs: 11 / z, fill: tc, op: 0.8, mono: true, halo });
        nomeDentro = nIn === nome; medDentro = true;
      } else if (nIn && ph >= 18) {
        s += txt(cx, cy + fs * 0.35, nIn, { fs, fill: tc, peso: 500, halo });
        nomeDentro = nIn === nome;
      } else if (med && ph >= 18) {
        s += txt(cx, cy + 11 / z * 0.35, med, { fs: 11 / z, fill: tc, op: 0.8, mono: true, halo });
        medDentro = true;
      }
      if (o.forcarRotulos) {
        // Na folha nada some: o que não coube dentro do item vai escrito logo abaixo dele (numa camada por cima das linhas).
        let y0 = i.y + i.h + 4 / z;
        if (nome && !nomeDentro) { y0 += fs * 0.85; o._fora.push(txt(cx, y0, nome, { fs, fill: t.texto, peso: 500, halo: t.fundo })); y0 += 3 / z; }
        if (o.medidas && !medDentro) { y0 += 11 / z * 0.85; o._fora.push(txt(cx, y0, `${fmt(i.w)} × ${fmt(i.h)}`, { fs: 11 / z, fill: t.cotaTxt, mono: true, peso: 500, halo: t.fundo })); }
      }
    }
    if (o.cadeados && i.travado && Math.min(pw, ph) >= 22) {
      const b = limites(i);
      s += cadeadoSVG(b.x + b.w - 10 / z, b.y + 10 / z, z, t);
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
    const lim = limites(i), yc = lim.y - off, xc = lim.x - off; // cotas por fora das paredes, se houver
    s += guia(L, T, L, yc, t.cota, z) + guia(R, T, R, yc, t.cota, z);
    s += cota(L, yc, R, yc, fmt(i.w) + ' cm', t.cota, t.cotaTxt, z, t);
    s += guia(L, T, xc, T, t.cota, z) + guia(L, B, xc, B, t.cota, z);
    s += cota(xc, T, xc, B, fmt(i.h) + ' cm', t.cota, t.cotaTxt, z, t, 'e');
    return s;
  }

  // Cotas em cadeia do item S dentro do recipiente C (o desenho do cooktop):
  // à esquerda  folga · profundidade · folga, embaixo  folga · largura · folga, e os totais do recipiente.
  function cadeiaSVG(S, C, o) {
    const { z, t } = o;
    const L = C.x, R = C.x + C.w, T = C.y, B = C.y + C.h;
    const lim = limites(C), Lx = lim.x, Rx = lim.x + lim.w, By = lim.y + lim.h; // faces de fora das paredes
    const sl = S.x, sr = S.x + S.w, st = S.y, sb = S.y + S.h;
    const xe = Lx - 26 / z, yb = By + 26 / z, xd = Rx + 26 / z, yt = By + 56 / z;
    let s = '';
    s += guia(sl, st, xe, st, t.cota, z) + guia(sl, sb, xe, sb, t.cota, z);
    s += guia(sl, sb, sl, yb, t.cota, z) + guia(sr, sb, sr, yb, t.cota, z);
    s += guia(Lx, T, xe, T, t.total, z) + guia(Lx, B, xe, B, t.total, z);
    s += guia(L, By, L, yt, t.total, z) + guia(R, By, R, yt, t.total, z);
    s += guia(Rx, T, xd, T, t.total, z) + guia(Rx, B, xd, B, t.total, z);
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

  // Caixas (em cm) ocupadas pelos nomes dos itens, para os números das folgas desviarem delas.
  function caixasDosNomes(itens, o) {
    const { z } = o, fs = 12 / z, caixas = [];
    for (const i of itens) {
      if (i.tipo !== 'item' || i.w * z < 30) continue;
      const cx = i.x + i.w / 2, cy = i.y + i.h / 2;
      const w = Math.min(i.w, Math.max((i.nome || '').length * fs * 0.56, 9 * 11 / z * 0.6)), h = Math.min(i.h, fs * 2.7);
      caixas.push({ x: cx - w / 2, y: cy - h / 2 - fs * 0.3, w, h });
      if (o.forcarRotulos) caixas.push({ x: cx - Math.max(w, i.w) / 2, y: i.y + i.h, w: Math.max(w, i.w), h: fs * 1.4 }); // nome/medida que foram para baixo
    }
    return caixas;
  }
  function rotuloLivre(f, texto, ocupadas, o) {
    const { z, t } = o, fs = 11 / z, w = texto.length * fs * 0.62 + 4 / z, h = fs * 1.15, e = 6 / z;
    const bate = b => ocupadas.some(c => b.x < c.x + c.w && c.x < b.x + b.w && b.y < c.y + c.h && c.y < b.y + b.h);
    const cand = [];
    if (f.h) {
      const mx = (f.p1 + f.p2) / 2, y = f.mid;
      for (const dy of [-e - h, e, -e - 2.1 * h, e + 1.1 * h]) cand.push({ x: mx - w / 2, y: y + dy, w, h, tx: mx, ty: y + dy + fs * 0.9, rot: 0 });
    } else {
      // Vertical: na folha o número gira junto da linha, mas só se couber nela; numa folga curta (os 4 cm
      // entre a pia e a borda da bancada) o número deitado, ao lado, ocupa bem menos altura.
      const my = (f.p1 + f.p2) / 2, x = f.mid;
      const girados = [e, -e - h, e + 1.1 * h, -e - 2.1 * h].map(dx => ({ x: x + dx, y: my - w / 2, w: h, h: w, tx: x + dx + fs * 0.9, ty: my, rot: -90 }));
      const deitados = [];
      for (const dy of [0, 1.1 * h, -1.1 * h]) for (const dx of [e, -e - w]) deitados.push({ x: x + dx, y: my - h / 2 + dy, w, h, tx: x + dx, ty: my + fs * 0.35 + dy, rot: 0, anchor: 'start' });
      const cabe = Math.abs(f.p2 - f.p1) >= w + 4 / z;
      cand.push(...(t.girarCotas && cabe ? girados.concat(deitados) : deitados.concat(t.girarCotas ? girados : [])));
    }
    const c = cand.find(b => !bate(b)) || cand[0];
    ocupadas.push(c);
    return txt(c.tx, c.ty, texto, { fs, fill: t.folgaTxt, halo: t.fundo, mono: true, peso: 500, rot: c.rot, anchor: c.anchor || 'middle' });
  }

  // Desenha o andar. o = { z (px por cm), t (tema), medidas, folgasTodos, total, selId,
  //                        hoverId, fx(id) -> {op, sc}, fantasmas: [{item, op, sc}], pulso: {id, p} }
  function conteudo(andar, opcoes) {
    const defs = new Map();
    const contem = new Set();
    for (const i of andar.itens) { const c = i.tipo === 'item' ? recipiente(i, andar.itens) : null; if (c && c.tipo === 'item') contem.add(c.id); }
    const o = Object.assign({}, opcoes, { _defs: defs, _contem: contem, _fora: [] });
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
    const ocupadas = caixasDosNomes(itens, o);
    for (const f of linhas.values()) {
      s += f.h
        ? cota(f.p1, f.mid, f.p2, f.mid, '', t.folga, t.folgaTxt, z, t)
        : cota(f.mid, f.p1, f.mid, f.p2, '', t.folga, t.folgaTxt, z, t, 'd');
      s += rotuloLivre(f, fmt(f.valor) + ' cm', ocupadas, o);
    }
    s += o._fora.join(''); // rótulos escritos por fora dos itens (folha): por cima das linhas das folgas
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
    fmt, esc, caixa, limites, ladosDe, aberturasNoLado, recipiente, dentroDoComodo, girar, folgasDe, conteudo, grade, iconeSimbolo, iconeTextura,
  };
})(typeof window !== 'undefined' ? window : globalThis);
