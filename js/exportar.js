(function (g) {
  'use strict';
  const PF = g.PF = g.PF || {};

  const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'planta';
  const dataBR = ms => new Date(ms).toLocaleDateString('pt-BR');

  // Margem (px da página) reservada em volta do desenho para as cotas e totais.
  const RESPIRO = 135;
  const TOPO = 86, RODAPE = 72, LATERAL = 40;
  // Na exportação, textos, traços e cotas saem um pouco maiores que na tela; a nitidez vem da resolução
  // (PNG a 3×, PDF a 2,5×), que deixa dar zoom e ler as medidas sem a imagem crescer.
  const AMPLIA = 1.2;
  const DENSIDADE_PNG = 3, DENSIDADE_PDF = 2.5;
  const LINHA = 26;          // altura de uma linha da lista de medidas (px da página)
  const LADO = { c: 'cima', d: 'direita', b: 'baixo', e: 'esquerda' };
  const PAREDE_DE = { c: 'parede de cima', d: 'parede da direita', b: 'parede de baixo', e: 'parede da esquerda' };
  const nomeDe = i => i.nome || PF.dados.ROTULO[i.tipo];

  // Lista legível de medidas do andar: cada cômodo (vão livre, área, paredes, aberturas), o que está dentro dele
  // (com as distâncias até as bordas de onde está) e, por último, o que está fora dos cômodos.
  function linhasMedidas(andar) {
    const D = PF.desenho, f = D.fmt, itens = andar.itens, linhas = [];
    const medida = i => `${f(i.w)} × ${f(i.h)} cm`;
    const distancias = (i, c) => `← ${f(i.x - c.x)} · → ${f(c.x + c.w - i.x - i.w)} · ↑ ${f(i.y - c.y)} · ↓ ${f(c.y + c.h - i.y - i.h)} cm (até ${nomeDe(c)})`;
    const ordem = (a, b) => a.y - b.y || a.x - b.x;
    const filhos = new Map(), soltos = [];
    for (const i of itens) {
      if (i.tipo === 'comodo') continue;
      const c = D.recipiente(i, itens);
      if (!c) { soltos.push(i); continue; }
      if (!filhos.has(c.id)) filhos.set(c.id, []);
      filhos.get(c.id).push(i);
    }
    const desce = (c, nivel) => {
      for (const i of (filhos.get(c.id) || []).sort(ordem)) {
        linhas.push({ nivel, nome: nomeDe(i), medida: medida(i), detalhe: distancias(i, c), cor: i.cor, tipo: i.tipo });
        desce(i, nivel + 1);
      }
    };
    const comodos = itens.filter(i => i.tipo === 'comodo').sort(ordem);
    for (const c of comodos) {
      const l = D.ladosDe(c);
      const paredes = !l ? 'sem paredes' : `paredes de ${f(c.parede)} cm${l.length < 4 ? ' — ' + [...l].map(k => LADO[k]).join(', ') : ''}`;
      linhas.push({ nivel: 0, nome: nomeDe(c), medida: `${medida(c)} · ${f(c.w * c.h / 10000)} m²`, detalhe: paredes, cor: c.cor, tipo: 'comodo' });
      for (const a of c.aberturas || []) {
        const desde = a.lado === 'c' || a.lado === 'b' ? 'da esquerda' : 'de cima';
        linhas.push({ nivel: 1, nome: { janela: 'Janela', porta: 'Porta', vao: 'Vão' }[a.tipo], medida: `${f(a.larg)} cm`, detalhe: `${PAREDE_DE[a.lado]}, a ${f(a.pos)} cm ${desde}`, tipo: 'abertura' });
      }
      desce(c, 1);
    }
    if (soltos.length) {
      if (comodos.length) linhas.push({ nivel: 0, nome: 'Fora dos cômodos', medida: '', detalhe: '', tipo: 'secao' });
      for (const i of soltos.sort(ordem)) {
        linhas.push({ nivel: comodos.length ? 1 : 0, nome: nomeDe(i), medida: medida(i), detalhe: '', cor: i.cor, tipo: i.tipo });
        desce(i, comodos.length ? 2 : 1);
      }
    }
    return linhas;
  }
  const alturaLista = linhas => (linhas && linhas.length ? 34 + linhas.length * LINHA : 0);

  function listaSVG(linhas, x, y, larg, t) {
    const D = PF.desenho, f = D.FONTE, m = D.MONO, corta = (txt, n) => (txt.length > n ? txt.slice(0, Math.max(1, n - 1)) + '…' : txt);
    let s = `<text x="${x}" y="${y + 12}" font-size="12" font-weight="500" letter-spacing="1.8" fill="${t.suave}" font-family="${m}">MEDIDAS</text>`;
    let yy = y + 34 + 14;
    linhas.forEach((l, k) => {
      if (l.nivel === 0 && k > 0) s += `<path d="M${x} ${yy - 19}H${x + larg}" stroke="${t.gradeForte}" stroke-width="1"/>`;
      const ind = x + l.nivel * 24;
      if (l.tipo === 'abertura') s += `<path d="M${ind} ${yy - 5}H${ind + 12}M${ind} ${yy - 9}V${yy - 1}M${ind + 12} ${yy - 9}V${yy - 1}" stroke="${t.parede}" stroke-width="1.6" fill="none"/>`;
      else if (l.tipo !== 'secao') {
        const c = l.tipo === 'parede' ? [t.parede, t.parede] : (D.CORES[l.cor] || D.CORES.azul).claro;
        s += `<rect x="${ind}" y="${yy - 11}" width="12" height="12" rx="2.5" fill="${c[0]}" stroke="${c[1]}" stroke-width="1.3"/>`;
      }
      const tx = ind + 20, cabe = Math.floor((x + larg - tx) / 7.4);
      const nome = corta(l.nome, 38), sobra = cabe - nome.length - l.medida.length - 3;
      s += `<text x="${tx}" y="${yy}" font-size="15" fill="${t.texto}" font-family="${f}"><tspan font-weight="${l.nivel === 0 ? 700 : 500}">${D.esc(nome)}</tspan>` +
        (l.medida ? `<tspan dx="12" font-size="14" font-weight="500" fill="${t.cotaTxt}" font-family="${m}">${D.esc(l.medida)}</tspan>` : '') +
        (l.detalhe && sobra > 8 ? `<tspan dx="14" font-size="13" fill="${l.tipo === 'comodo' ? t.suave : t.folgaTxt}" font-family="${m}">${D.esc(corta(l.detalhe, sobra))}</tspan>` : '') + '</text>';
      yy += LINHA;
    });
    return s;
  }

  // Legenda de proporção: régua desenhada + "proporção 1:N" (no PDF, vale impresso em A4 a 100%).
  function reguaSVG(k, xDir, y, t, noPdf) {
    const D = PF.desenho, m = D.MONO;
    const L = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000].find(c => c * k >= 60) || 10000;
    const w = L * k, x0 = xDir - w;
    let s = `<path d="M${x0} ${y - 6}V${y}H${xDir}V${y - 6}M${x0 + w / 2} ${y - 3}V${y}" stroke="${t.texto}" stroke-width="1.6" fill="none"/>` +
      `<text x="${x0 + w / 2}" y="${y - 10}" text-anchor="middle" font-size="12" font-weight="500" fill="${t.texto}" font-family="${m}">${L >= 100 ? D.fmt(L / 100) + ' m' : L + ' cm'}</text>`;
    const n = 37.795 / k, r = n > 100 ? Math.round(n / 10) * 10 : Math.round(n / 5) * 5; // 1 cm real = k px a 96 dpi
    s += `<text x="${x0 - 12}" y="${y}" text-anchor="end" font-size="12" fill="${t.suave}" font-family="${m}">${noPdf ? `proporção 1:${Math.max(1, r)} (A4 a 100%)` : 'escala'}</text>`;
    return s;
  }

  function cabecalho(proj, sub, o, W, t) {
    const D = PF.desenho;
    return `<rect width="${W}" height="${o.H}" fill="${t.fundo}"/>` +
      `<text x="${LATERAL}" y="40" font-size="26" font-weight="700" fill="${t.texto}" font-family="${D.FONTE}">${D.esc(proj.nome)}</text>` +
      `<text x="${LATERAL}" y="63" font-size="13" fill="${t.suave}" font-family="${D.MONO}">${D.esc(sub)} · ${dataBR(Date.now())}</text>` +
      (o.total > 1 ? `<text x="${W - LATERAL}" y="38" text-anchor="end" font-size="12" fill="${t.suave}" font-family="${D.MONO}">PÁGINA ${o.pagina} / ${o.total}</text>` : '') +
      `<path d="M${LATERAL} 74H${W - LATERAL}" stroke="${t.gradeForte}" stroke-width="1"/>`;
  }

  // Uma página com a planta em escala (título, desenho, lista opcional, legenda e régua) como SVG autônomo.
  function paginaSVG(proj, andar, o) {
    const D = PF.desenho, t = D.TEMA_EXPORT, cfg = proj.config;
    const { W, H } = o;
    const cp = D.caixa(andar.itens);
    const hLista = alturaLista(o.lista);
    const area = { x: LATERAL, y: TOPO, w: W - 2 * LATERAL, h: H - TOPO - RODAPE - (hLista ? hLista + 20 : 0) };
    let k = 1, plano = '';
    if (cp) {
      k = Math.max(0.05, Math.min(8, (area.w - 2 * RESPIRO) / cp.w, (area.h - 2 * RESPIRO) / cp.h));
      const tx = area.x + area.w / 2 - (cp.x + cp.w / 2) * k;
      const ty = area.y + area.h / 2 - (cp.y + cp.h / 2) * k;
      plano = `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(5)})">` +
        D.conteudo(andar, { z: k / AMPLIA, t, medidas: cfg.medidas, folgasTodos: cfg.folgas, total: cfg.total, selId: o.selId || null }) + '</g>';
    } else {
      plano = `<text x="${W / 2}" y="${area.y + area.h / 2}" text-anchor="middle" font-size="16" fill="${t.suave}" font-family="${D.FONTE}">Andar vazio</text>`;
    }
    const lista = hLista ? `<path d="M${LATERAL} ${area.y + area.h + 6}H${W - LATERAL}" stroke="${t.gradeForte}" stroke-width="1"/>` + listaSVG(o.lista, LATERAL, area.y + area.h + 20, W - 2 * LATERAL, t) : '';

    const m = D.MONO, ey = H - 30;
    let leg = '', cx = LATERAL;
    const entrada = (larg, desenho, rotulo) => {
      leg += desenho(cx) + `<text x="${cx + 26}" y="${ey + 4}" font-size="12" fill="${t.suave}" font-family="${m}">${rotulo}</text>`;
      cx += larg;
    };
    const caixaLeg = (c, fill, stroke, extra) => `<rect x="${c}" y="${ey - 7}" width="19" height="13" fill="${fill}" stroke="${stroke}" stroke-width="1" ${extra || ''}/>`;
    const linhaLeg = (c, cor) => `<path d="M${c} ${ey}H${c + 19}M${c} ${ey - 5}V${ey + 5}M${c + 19} ${ey - 5}V${ey + 5}" stroke="${cor}" stroke-width="1.8" fill="none"/>`;
    const az = D.CORES.azul.claro, ci = D.CORES.cinza.claro;
    entrada(92, c => caixaLeg(c, t.parede, t.paredeBorda), 'parede');
    entrada(96, c => caixaLeg(c, ci[0], ci[1], 'stroke-dasharray="3 2"'), 'cômodo');
    entrada(78, c => caixaLeg(c, az[0], az[1]), 'item');
    entrada(88, c => linhaLeg(c, t.cota), 'medida');
    entrada(80, c => linhaLeg(c, t.folga), 'folga');
    entrada(80, c => linhaLeg(c, t.total), 'total');
    const regua = cp ? reguaSVG(k, W - LATERAL, ey + 4, t, o.escala) : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      cabecalho(proj, andar.nome, o, W, t) + plano + lista +
      `<path d="M${LATERAL} ${H - 58}H${W - LATERAL}" stroke="${t.gradeForte}" stroke-width="1"/>` +
      leg + regua + '</svg>';
  }

  // Página só com a lista de medidas (o PDF põe uma ou mais depois de cada andar).
  function paginaListaSVG(proj, andar, linhas, o) {
    const t = PF.desenho.TEMA_EXPORT, { W, H } = o;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      cabecalho(proj, `${andar.nome} · medidas`, o, W, t) + listaSVG(linhas, LATERAL, TOPO + 8, W - 2 * LATERAL, t) + '</svg>';
  }

  function tamanhoPNG(cp, linhas) {
    const W = 1200, extra = alturaLista(linhas) ? alturaLista(linhas) + 20 : 0;
    if (!cp) return { W, H: 640 + extra };
    const k = Math.min(8, (W - 2 * LATERAL - 2 * RESPIRO) / cp.w);
    const hPlano = Math.min(1800, Math.max(560, cp.h * k + 2 * RESPIRO + TOPO + RODAPE));
    return { W, H: Math.round(Math.min(6000, hPlano + extra)) };
  }

  function tamanhoA4(cp) {
    const paisagem = !cp || cp.w >= cp.h;
    return paisagem ? { W: 1123, H: 794 } : { W: 794, H: 1123 };
  }

  function svgParaCanvas(svg, W, H, escala) {
    return new Promise((ok, falha) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = Math.round(W * escala);
        c.height = Math.round(H * escala);
        const x = c.getContext('2d');
        x.fillStyle = '#fff';
        x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        ok(c);
      };
      img.onerror = () => falha(new Error('não consegui desenhar a imagem'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  const canvasParaBlob = (c, tipo, q) => new Promise((ok, falha) => c.toBlob(b => (b ? ok(b) : falha(new Error('falha ao gerar o arquivo'))), tipo, q));

  // PDF mínimo: uma imagem JPEG por página (sem dependências).
  function montarPDF(paginas) {
    const enc = new TextEncoder();
    const partes = [], offs = [];
    let pos = 0;
    const put = d => { const b = typeof d === 'string' ? enc.encode(d) : d; partes.push(b); pos += b.length; };
    const obj = (n, corpo) => { offs[n] = pos; put(`${n} 0 obj\n${corpo}\nendobj\n`); };

    put(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10])); // %PDF-1.4 + marca binária
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Kids [${paginas.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${paginas.length} >>`);
    paginas.forEach((p, i) => {
      const pg = 3 + i * 3, ct = pg + 1, im = pg + 2;
      obj(pg, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.pw} ${p.ph}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`);
      const cont = `q ${p.pw} 0 0 ${p.ph} 0 0 cm /Im0 Do Q`;
      obj(ct, `<< /Length ${cont.length} >>\nstream\n${cont}\nendstream`);
      offs[im] = pos;
      put(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>\nstream\n`);
      put(p.jpg);
      put('\nendstream\nendobj\n');
    });
    const n = 2 + paginas.length * 3, xref = pos;
    let t = `xref\n0 ${n + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= n; i++) t += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    t += `trailer\n<< /Size ${n + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    put(t);
    return new Blob(partes, { type: 'application/pdf' });
  }

  // tipo: 'png' | 'pdf' | 'json' | 'backup'. Devolve { blob, nome }.
  // selId: item selecionado no andar atual — a imagem leva as cotas em cadeia dele.
  async function gerar(tipo, proj, andar, estado, selId) {
    const D = PF.dados, base = slug(proj.nome);
    if (tipo === 'json') {
      return { blob: new Blob([JSON.stringify(D.paraArquivo(proj), null, 2)], { type: 'application/json' }), nome: `${base}.planta.json` };
    }
    if (tipo === 'backup') {
      const dia = new Date().toISOString().slice(0, 10);
      return { blob: new Blob([JSON.stringify(D.paraBackup(estado), null, 2)], { type: 'application/json' }), nome: `plantafacil-backup-${dia}.json` };
    }
    if (tipo === 'png') {
      const { W, H } = tamanhoPNG(PF.desenho.caixa(andar.itens));
      const svg = paginaSVG(proj, andar, { W, H, escala: false, pagina: 1, total: 1, selId });
      const c = await svgParaCanvas(svg, W, H, DENSIDADE_PNG);
      return { blob: await canvasParaBlob(c, 'image/png'), nome: `${base}-${slug(andar.nome)}.png` };
    }
    if (tipo === 'pdf') {
      // Cada andar: a planta numa página A4 e, se a lista estiver ligada, as medidas em seguida (A4 em pé).
      const plano = [];
      const porPagina = Math.floor((1123 - TOPO - 48) / LINHA) - 1;
      for (const a of proj.andares) {
        plano.push({ a, tipo: 'planta' });
        if (proj.config.lista && a.itens.length) {
          const linhas = linhasMedidas(a);
          for (let k = 0; k < linhas.length; k += porPagina) plano.push({ a, tipo: 'lista', linhas: linhas.slice(k, k + porPagina) });
        }
      }
      const paginas = [];
      for (let i = 0; i < plano.length; i++) {
        const { a, tipo: tp, linhas } = plano[i];
        const { W, H } = tp === 'planta' ? tamanhoA4(PF.desenho.caixa(a.itens)) : { W: 794, H: 1123 };
        const base = { W, H, pagina: i + 1, total: plano.length };
        const svg = tp === 'planta'
          ? paginaSVG(proj, a, Object.assign({ escala: true, selId: a.id === andar.id ? selId : null }, base))
          : paginaListaSVG(proj, a, linhas, base);
        const c = await svgParaCanvas(svg, W, H, DENSIDADE_PDF);
        const jpg = new Uint8Array(await (await canvasParaBlob(c, 'image/jpeg', 0.9)).arrayBuffer());
        paginas.push({ jpg, w: c.width, h: c.height, pw: +(W * 0.75).toFixed(2), ph: +(H * 0.75).toFixed(2) });
      }
      return { blob: montarPDF(paginas), nome: `${base}.pdf` };
    }
    throw new Error('tipo de exportação desconhecido');
  }

  function baixar(blob, nome) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function podeCompartilhar() {
    try {
      const f = new File(['x'], 'a.png', { type: 'image/png' });
      return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [f] }) && matchMedia('(pointer: coarse)').matches);
    } catch (e) { return false; }
  }

  async function compartilhar(blob, nome) {
    const f = new File([blob], nome, { type: blob.type });
    try { await navigator.share({ files: [f], title: nome }); return true; } catch (e) { return e && e.name === 'AbortError'; }
  }

  // ---------- compartilhar por link ----------
  // O projeto vai inteiro no #hash do endereço (nunca é enviado a servidor algum): JSON compacto, comprimido
  // (deflate) quando o navegador sabe, em base64 seguro para URL. Quem abre o link recebe uma cópia.
  const r1 = n => Math.round(n * 10) / 10;
  function empacotar(proj) {
    return {
      v: 1, n: proj.nome, c: proj.config,
      a: proj.andares.map(a => ({ n: a.nome, i: a.itens.map(i => [i.tipo, i.nome, r1(i.x), r1(i.y), r1(i.w), r1(i.h), i.cor, i.textura || 'liso', i.simbolo || '', i.parede || 0, i.lados == null ? 'cdbe' : i.lados, i.giro || 0, (i.aberturas || []).map(b => [b.lado, r1(b.pos), r1(b.larg), b.tipo]), i.travado ? 1 : 0]) })),
    };
  }
  function desempacotar(o) {
    if (!o || o.v !== 1 || !Array.isArray(o.a)) throw new Error('link inválido');
    return {
      nome: o.n, config: o.c,
      andares: o.a.map(a => ({ nome: a.n, itens: a.i.map(([tipo, nome, x, y, w, h, cor, textura, simbolo, parede, lados, giro, ab, travado]) => ({
        tipo, nome, x, y, w, h, cor, textura, simbolo, parede, lados, giro, travado: !!travado,
        aberturas: Array.isArray(ab) ? ab.map(([lado, pos, larg, tipoA]) => ({ lado, pos, larg, tipo: tipoA })) : [],
      })) })),
    };
  }
  function paraB64(bytes) {
    let s = '';
    for (let k = 0; k < bytes.length; k += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function deB64(t) {
    const s = atob(t.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(s, c => c.charCodeAt(0));
  }
  async function fluxo(Classe, bytes) {
    const f = new Classe('deflate-raw');
    const w = f.writable.getWriter();
    w.write(bytes); w.close();
    return new Uint8Array(await new Response(f.readable).arrayBuffer());
  }

  async function gerarLink(proj, base) {
    const bytes = new TextEncoder().encode(JSON.stringify(empacotar(proj)));
    let corpo = 'r.' + paraB64(bytes);
    if (typeof CompressionStream !== 'undefined') {
      try { corpo = 'z.' + paraB64(await fluxo(CompressionStream, bytes)); } catch (e) { /* usa sem compressão */ }
    }
    return `${base}#p=${corpo}`;
  }

  // Devolve um objeto de projeto (ainda não sanitizado) ou null se o endereço não tem projeto.
  async function lerLink(hash) {
    const m = /^#p=([zr])\.([A-Za-z0-9_-]+)$/.exec(hash || '');
    if (!m) return null;
    let bytes = deB64(m[2]);
    if (m[1] === 'z') {
      if (typeof DecompressionStream === 'undefined') throw new Error('este navegador não abre links comprimidos');
      bytes = await fluxo(DecompressionStream, bytes);
    }
    return desempacotar(JSON.parse(new TextDecoder().decode(bytes)));
  }

  PF.exportar = { gerar, baixar, compartilhar, podeCompartilhar, montarPDF, paginaSVG, paginaListaSVG, linhasMedidas, slug, gerarLink, lerLink, empacotar, desempacotar };
})(typeof window !== 'undefined' ? window : globalThis);
