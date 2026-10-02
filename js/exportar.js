(function (g) {
  'use strict';
  const PF = g.PF = g.PF || {};

  const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'planta';
  const dataBR = ms => new Date(ms).toLocaleDateString('pt-BR');

  // Margem (px da página) reservada em volta do desenho para as cotas e totais.
  const RESPIRO = 100;
  const TOPO = 78, RODAPE = 64, LATERAL = 36;

  // Uma página completa (título, desenho em escala, legenda) como SVG autônomo.
  function paginaSVG(proj, andar, o) {
    const D = PF.desenho, t = D.TEMA_EXPORT, cfg = proj.config;
    const { W, H } = o;
    const cp = D.caixa(andar.itens);
    const area = { x: LATERAL, y: TOPO, w: W - 2 * LATERAL, h: H - TOPO - RODAPE };
    let k = 1, plano = '';
    if (cp) {
      k = Math.max(0.05, Math.min(8, (area.w - 2 * RESPIRO) / cp.w, (area.h - 2 * RESPIRO) / cp.h));
      const tx = area.x + area.w / 2 - (cp.x + cp.w / 2) * k;
      const ty = area.y + area.h / 2 - (cp.y + cp.h / 2) * k;
      plano = `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(5)})">` +
        D.conteudo(andar, { z: k, t, medidas: cfg.medidas, folgasTodos: cfg.folgas, total: cfg.total, selId: o.selId || null }) + '</g>';
    } else {
      plano = `<text x="${W / 2}" y="${area.y + area.h / 2}" text-anchor="middle" font-size="15" fill="${t.suave}" font-family="${D.FONTE}">Andar vazio</text>`;
    }

    const f = D.FONTE, m = D.MONO, ey = H - 30;
    let leg = '', cx = LATERAL;
    const entrada = (larg, desenho, rotulo) => {
      leg += desenho(cx) + `<text x="${cx + 26}" y="${ey + 4}" font-size="11" fill="${t.suave}" font-family="${m}">${rotulo}</text>`;
      cx += larg;
    };
    const caixaLeg = (c, fill, stroke, extra) => `<rect x="${c}" y="${ey - 6}" width="18" height="12" fill="${fill}" stroke="${stroke}" stroke-width="1" ${extra || ''}/>`;
    const linhaLeg = (c, cor) => `<path d="M${c} ${ey}H${c + 18}M${c} ${ey - 4}V${ey + 4}M${c + 18} ${ey - 4}V${ey + 4}" stroke="${cor}" stroke-width="1.4" fill="none"/>`;
    const az = D.CORES.azul.claro, ci = D.CORES.cinza.claro;
    entrada(86, c => caixaLeg(c, t.parede, t.paredeBorda), 'parede');
    entrada(90, c => caixaLeg(c, ci[0], ci[1], 'stroke-dasharray="3 2"'), 'cômodo');
    entrada(74, c => caixaLeg(c, az[0], az[1]), 'item');
    entrada(80, c => linhaLeg(c, t.cota), 'medida');
    entrada(80, c => linhaLeg(c, t.folga), 'folga');
    entrada(80, c => linhaLeg(c, t.total), 'total');

    let escala = '';
    if (o.escala && cp) {
      const n = 37.795 / k;                                   // 1 cm real = k px a 96 dpi
      const r = n > 100 ? Math.round(n / 10) * 10 : Math.round(n / 5) * 5;
      escala = `<text x="${W - LATERAL}" y="${ey + 4}" text-anchor="end" font-size="11" fill="${t.suave}" font-family="${m}">escala ≈ 1:${Math.max(1, r)} (A4 a 100%)</text>`;
    }
    const pagina = o.total > 1 ? `<text x="${W - LATERAL}" y="34" text-anchor="end" font-size="11" fill="${t.suave}" font-family="${m}">PÁGINA ${o.pagina} / ${o.total}</text>` : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<rect width="${W}" height="${H}" fill="${t.fundo}"/>` +
      `<text x="${LATERAL}" y="36" font-size="22" font-weight="600" fill="${t.texto}" font-family="${f}">${D.esc(proj.nome)}</text>` +
      `<text x="${LATERAL}" y="57" font-size="12" fill="${t.suave}" font-family="${m}">${D.esc(andar.nome)} · ${dataBR(Date.now())}</text>` +
      pagina +
      `<path d="M${LATERAL} 68H${W - LATERAL}" stroke="${t.gradeForte}" stroke-width="1"/>` +
      plano +
      `<path d="M${LATERAL} ${H - 54}H${W - LATERAL}" stroke="${t.gradeForte}" stroke-width="1"/>` +
      leg + escala + '</svg>';
  }

  function tamanhoPNG(cp) {
    const W = 1200;
    if (!cp) return { W, H: 640 };
    const k = Math.min(8, (W - 2 * LATERAL - 2 * RESPIRO) / cp.w);
    return { W, H: Math.round(Math.min(1800, Math.max(560, cp.h * k + 2 * RESPIRO + TOPO + RODAPE))) };
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
      const c = await svgParaCanvas(svg, W, H, 2);
      return { blob: await canvasParaBlob(c, 'image/png'), nome: `${base}-${slug(andar.nome)}.png` };
    }
    if (tipo === 'pdf') {
      const paginas = [];
      for (let i = 0; i < proj.andares.length; i++) {
        const a = proj.andares[i];
        const { W, H } = tamanhoA4(PF.desenho.caixa(a.itens));
        const svg = paginaSVG(proj, a, { W, H, escala: true, pagina: i + 1, total: proj.andares.length, selId: a.id === andar.id ? selId : null });
        const c = await svgParaCanvas(svg, W, H, 2);
        const jpg = new Uint8Array(await (await canvasParaBlob(c, 'image/jpeg', 0.92)).arrayBuffer());
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
      a: proj.andares.map(a => ({ n: a.nome, i: a.itens.map(i => [i.tipo, i.nome, r1(i.x), r1(i.y), r1(i.w), r1(i.h), i.cor, i.textura || 'liso', i.simbolo || '', i.parede || 0]) })),
    };
  }
  function desempacotar(o) {
    if (!o || o.v !== 1 || !Array.isArray(o.a)) throw new Error('link inválido');
    return {
      nome: o.n, config: o.c,
      andares: o.a.map(a => ({ nome: a.n, itens: a.i.map(([tipo, nome, x, y, w, h, cor, textura, simbolo, parede]) => ({ tipo, nome, x, y, w, h, cor, textura, simbolo, parede })) })),
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

  PF.exportar = { gerar, baixar, compartilhar, podeCompartilhar, montarPDF, paginaSVG, slug, gerarLink, lerLink, empacotar, desempacotar };
})(typeof window !== 'undefined' ? window : globalThis);
