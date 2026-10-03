(function (g) {
  'use strict';
  const PF = g.PF = g.PF || {};

  const CHAVE = 'plantafacil:v1';
  const TIPOS = ['item', 'comodo', 'parede'];
  const ROTULO = { item: 'Item', comodo: 'Cômodo', parede: 'Parede' };
  // Cores prontas; além delas, o seletor aceita qualquer cor livre no formato #rrggbb.
  const CORES = ['azul', 'ambar', 'verde', 'terra', 'roxo', 'cinza', 'amarelo', 'laranja', 'rosa', 'ciano', 'marrom', 'grafite'];
  const TEXTURAS = ['liso', 'rachura', 'cruzada', 'pontos', 'linhas', 'tijolo'];
  const SIMBOLOS = ['cooktop', 'geladeira', 'pia', 'sofa', 'poltrona', 'cama', 'mesa', 'cadeira', 'vaso', 'box', 'porta', 'janela', 'armario', 'estante', 'rack',
    'tv', 'chuveiro', 'banheira', 'lavatorio', 'lavadora', 'mesaRedonda', 'escrivaninha', 'criado', 'planta', 'tapete', 'escada', 'berco'];
  // Na exportação com "Escolher item por item": '' = desenho com a medida, 'fora' = não vai, 'cotas' = com as cotas detalhadas.
  const ESCOLHAS_EXP = ['', 'fora', 'cotas'];
  const ENCAIXES = [1, 5, 10];
  const ESPESSURAS = [0, 10, 15, 20, 25];
  const LADOS = 'cdbe'; // lados do cômodo com parede: c = cima, d = direita, b = baixo, e = esquerda
  const GIROS = [0, 90, 180, 270];
  // Aberturas nas paredes do cômodo. pos = distância do canto: da esquerda (lados c/b) ou de cima (lados e/d).
  const TIPOS_ABERTURA = ['janela', 'porta', 'vao'];
  const LARGURA_ABERTURA = { janela: 120, porta: 80, vao: 90 };
  // exp*: o que vai nos arquivos exportados (independe dos botões da tela). Por padrão, tudo.
  const CONFIG_PADRAO = { encaixe: 5, ima: true, medidas: true, folgas: false, total: false, travado: false, lista: true, expMedidas: true, expFolgas: false, expTotal: false, expCotas: false, expEscolha: false, expV: 2 };
  // Valores iniciais do formulário "Adicionar" (o usuário digita o tamanho que quiser).
  const NOVO_PADRAO = {
    item: { nome: '', w: 100, h: 60, cor: 'azul' },
    comodo: { nome: '', w: 400, h: 300, cor: 'cinza', parede: 15, lados: LADOS },
    parede: { nome: '', w: 300, h: 15, cor: 'cinza' },
  };

  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const clonar = o => JSON.parse(JSON.stringify(o));
  const num = (v, pad, min, max) => { v = Number(v); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : pad; };
  const texto = (v, pad, max) => { const s = String(v == null ? '' : v).trim().slice(0, max); return s || pad; };
  const corPadrao = tipo => (tipo === 'item' ? 'azul' : 'cinza');
  const limparCor = (c, tipo) => (CORES.includes(c) ? c : typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c.toUpperCase() : corPadrao(tipo));
  // Emoji para marcar o item: até 8 caracteres (um emoji composto, como 🧑‍🍳, já usa vários), sem espaços nem
  // sinais de marcação. Vai para o SVG por esc() e para a tela por textContent.
  const limparEmoji = v => [...String(v == null ? '' : v).replace(/[\s<>&"'`\u0000-\u001f]/g, '')].slice(0, 8).join('');
  // Normaliza os lados com parede: só c/d/b/e, sem repetir, na ordem cdbe. Sem valor = os quatro.
  const limparLados = v => (v == null ? LADOS : [...LADOS].filter(k => String(v).includes(k)).join(''));
  function limparAberturas(v, manterId) {
    if (!Array.isArray(v)) return [];
    return v.filter(a => a && typeof a === 'object').slice(0, 40).map(a => ({
      id: manterId && a.id ? String(a.id) : uid(),
      lado: ['c', 'd', 'b', 'e'].includes(a.lado) ? a.lado : 'c',
      pos: num(a.pos, 0, 0, 1e5),
      larg: num(a.larg, 100, 5, 1e4),
      tipo: TIPOS_ABERTURA.includes(a.tipo) ? a.tipo : 'janela',
    }));
  }

  // ---------- sanitização (usada ao carregar e ao importar) ----------
  function limparItem(i, manterId) {
    if (!i || typeof i !== 'object') return null;
    const tipo = TIPOS.includes(i.tipo) ? i.tipo : 'item';
    return {
      id: manterId && i.id ? String(i.id) : uid(),
      tipo,
      nome: String(i.nome == null ? '' : i.nome).slice(0, 60),
      x: num(i.x, 0, -1e5, 1e5),
      y: num(i.y, 0, -1e5, 1e5),
      w: num(i.w, 100, 1, 1e5),
      h: num(i.h, 60, 1, 1e5),
      cor: limparCor(i.cor, tipo),
      textura: TEXTURAS.includes(i.textura) ? i.textura : 'liso',
      simbolo: tipo === 'item' && SIMBOLOS.includes(i.simbolo) ? i.simbolo : '',
      parede: tipo === 'comodo' ? num(i.parede, 0, 0, 100) : 0, // espessura das paredes ao redor do cômodo
      lados: tipo === 'comodo' ? limparLados(i.lados) : '',     // quais lados têm parede
      giro: GIROS.includes(Number(i.giro)) ? Number(i.giro) : 0, // para onde o ícone está virado (90° por vez)
      aberturas: tipo === 'comodo' ? limparAberturas(i.aberturas, manterId) : [], // janelas, portas e vãos nas paredes
      travado: !!i.travado, // travado: não move nem muda de tamanho arrastando
      emoji: limparEmoji(i.emoji), // marca o que é o item (vai antes do nome)
      exp: ESCOLHAS_EXP.includes(i.exp) ? i.exp : '', // como vai na exportação com "Escolher item por item"
    };
  }

  function limparAndar(a, manterId) {
    const src = a || {};
    const itens = Array.isArray(src.itens) ? src.itens.map(i => limparItem(i, manterId)).filter(Boolean) : [];
    const v = src.vista;
    const vista = v && [v.tx, v.ty, v.z].every(Number.isFinite) && v.z > 0
      ? { tx: v.tx, ty: v.ty, z: Math.min(40, Math.max(0.005, v.z)) }
      : null;
    return { id: manterId && src.id ? String(src.id) : uid(), nome: texto(src.nome, 'Andar', 40), itens, vista };
  }

  function limparProjeto(pr, manterId) {
    const src = pr || {};
    const andares = Array.isArray(src.andares) ? src.andares.map(a => limparAndar(a, manterId)) : [];
    if (!andares.length) andares.push(novoAndar('Térreo'));
    const c = Object.assign({}, CONFIG_PADRAO, src.config);
    // Até 03/10/2026 a folha saía com folgas, total e cotas do selecionado ligados por padrão e ficava confusa.
    // Projeto daquela época (sem expV 2) volta uma vez para o padrão limpo: só as medidas escritas nos itens.
    const antigo = !(src.config && Number(src.config.expV) >= 2);
    const agora = Date.now();
    return {
      id: manterId && src.id ? String(src.id) : uid(),
      nome: texto(src.nome, 'Projeto', 60),
      criado: num(src.criado, agora, 0, 4e12),
      atualizado: num(src.atualizado, agora, 0, 4e12),
      andarAtual: manterId && andares.some(a => a.id === src.andarAtual) ? src.andarAtual : andares[0].id,
      andares,
      config: {
        encaixe: ENCAIXES.includes(Number(c.encaixe)) ? Number(c.encaixe) : CONFIG_PADRAO.encaixe,
        ima: !!c.ima, medidas: !!c.medidas, folgas: !!c.folgas, total: !!c.total, travado: !!c.travado, lista: !!c.lista,
        expMedidas: !!c.expMedidas, expFolgas: !antigo && !!c.expFolgas, expTotal: !antigo && !!c.expTotal,
        expCotas: !antigo && !!c.expCotas, expEscolha: !!c.expEscolha, expV: 2,
      },
    };
  }

  // ---------- fábricas ----------
  function novoAndar(nome) { return { id: uid(), nome: nome || 'Andar', itens: [], vista: null }; }

  function novoProjeto(nome) {
    const a = novoAndar('Térreo');
    const agora = Date.now();
    return { id: uid(), nome: nome || 'Novo projeto', criado: agora, atualizado: agora, andarAtual: a.id, andares: [a], config: Object.assign({}, CONFIG_PADRAO) };
  }

  function duplicarProjeto(pr) {
    const c = limparProjeto(clonar(pr), false);
    c.nome = texto(pr.nome + ' (cópia)', 'Projeto', 60);
    c.criado = c.atualizado = Date.now();
    return c;
  }

  function duplicarAndar(a) {
    const c = limparAndar(clonar(a), false);
    c.nome = texto(a.nome + ' (cópia)', 'Andar', 40);
    c.vista = null;
    return c;
  }

  // Cria um item com o tamanho que o usuário escolheu, centrado em (cx, cy) e encaixado na grade.
  function novoItem(spec, cx, cy, existentes, encaixe) {
    const tipo = TIPOS.includes(spec.tipo) ? spec.tipo : 'item';
    const base = NOVO_PADRAO[tipo];
    const w = num(spec.w, base.w, 1, 1e5), h = num(spec.h, base.h, 1, 1e5);
    const sn = v => Math.round(v / encaixe) * encaixe;
    const n = existentes.filter(i => i.tipo === tipo).length + 1;
    let x = sn(cx - w / 2), y = sn(cy - h / 2);
    while (existentes.some(i => i.x === x && i.y === y)) { x += 20; y += 20; }
    return limparItem({
      tipo, x, y, w, h,
      nome: texto(spec.nome, `${ROTULO[tipo]} ${n}`, 60),
      cor: spec.cor, textura: 'liso', simbolo: '', parede: spec.parede, lados: spec.lados, giro: 0, emoji: spec.emoji,
    }, false);
  }

  // Abertura nova: no primeiro lado com parede (cima, baixo, esquerda, direita) que tenha um trecho livre —
  // centrada se o meio estiver livre, senão no primeiro vão que couber (10 cm de folga das outras e dos cantos).
  // Sem trecho livre em nenhuma parede, fica centrada na primeira. null se o cômodo não tem parede.
  function novaAbertura(comodo, tipo) {
    const lados = comodo.parede > 0 ? (comodo.lados == null ? LADOS : comodo.lados) : '';
    const ordem = ['c', 'b', 'e', 'd'].filter(k => lados.includes(k));
    if (!ordem.length) return null;
    const t = TIPOS_ABERTURA.includes(tipo) ? tipo : 'janela', M = 10;
    const nova = (lado, larg, pos) => ({ id: uid(), lado, tipo: t, larg, pos: Math.max(0, Math.round(pos)) });
    for (const lado of ordem) {
      const comp = lado === 'c' || lado === 'b' ? comodo.w : comodo.h;
      const larg = Math.max(5, Math.min(LARGURA_ABERTURA[t] || 100, comp - 2 * M));
      const ocup = (comodo.aberturas || []).filter(a => a.lado === lado).map(a => [a.pos - M, a.pos + a.larg + M]).sort((p, q) => p[0] - q[0]);
      const livre = (p0, p1) => p0 >= M - 0.01 && p1 <= comp - M + 0.01 && ocup.every(([o0, o1]) => p1 <= o0 || p0 >= o1);
      const meio = (comp - larg) / 2;
      if (livre(meio, meio + larg)) return nova(lado, larg, meio);
      let ini = M;
      for (const [o0, o1] of ocup.concat([[comp - M + 1e-9, comp]])) {
        if (o0 - ini >= larg - 0.01 && livre(ini, ini + larg)) return nova(lado, larg, ini);
        ini = Math.max(ini, o1);
      }
    }
    const comp = ordem[0] === 'c' || ordem[0] === 'b' ? comodo.w : comodo.h;
    const larg = Math.max(5, Math.min(LARGURA_ABERTURA[t] || 100, comp - 2 * M));
    return nova(ordem[0], larg, (comp - larg) / 2);
  }

  // ---------- armazenamento local ----------
  function carregar() {
    let bruto = null;
    try { bruto = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { bruto = null; }
    const lista = bruto && Array.isArray(bruto.projetos) ? bruto.projetos.map(pr => limparProjeto(pr, true)) : [];
    if (!lista.length) lista.push(novoProjeto('Meu projeto'));
    const atualId = lista.some(pr => pr.id === (bruto && bruto.atualId)) ? bruto.atualId : lista[0].id;
    return { versao: 1, atualId, projetos: lista };
  }

  let timer = null;
  function salvarAgora(estado) {
    clearTimeout(timer);
    timer = null;
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); return true; } catch (e) { return false; }
  }
  function agendarSalvar(estado, aoFalhar) {
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; if (!salvarAgora(estado) && aoFalhar) aoFalhar(); }, 250);
  }

  // ---------- arquivos (exportar / importar) ----------
  function semVista(pr) {
    const c = clonar(pr);
    c.andares.forEach(a => { a.vista = null; });
    delete c.andarAtual;
    return c;
  }
  const cabecalho = () => ({ formato: 'plantafacil', versao: 1, exportado: new Date().toISOString() });
  const paraArquivo = pr => Object.assign(cabecalho(), { projeto: semVista(pr) });
  const paraBackup = estado => Object.assign(cabecalho(), { projetos: estado.projetos.map(semVista) });

  // Aceita arquivo de um projeto, backup de vários ou um projeto "solto". Sempre gera ids novos.
  function paraImportar(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('arquivo inválido');
    let lista = [];
    if (Array.isArray(obj.projetos)) lista = obj.projetos;
    else if (obj.projeto) lista = [obj.projeto];
    else if (Array.isArray(obj.andares)) lista = [obj];
    if (!lista.length) throw new Error('não encontrei projetos nesse arquivo');
    return lista.slice(0, 200).map(pr => limparProjeto(pr, false));
  }

  PF.dados = {
    TIPOS, ROTULO, CORES, TEXTURAS, SIMBOLOS, ESCOLHAS_EXP, limparEmoji, limparCor, ENCAIXES, ESPESSURAS, LADOS, TIPOS_ABERTURA, CONFIG_PADRAO, NOVO_PADRAO, limparLados, novaAbertura,
    uid, clonar, carregar, salvarAgora, agendarSalvar,
    novoProjeto, novoAndar, duplicarProjeto, duplicarAndar, novoItem,
    paraArquivo, paraBackup, paraImportar, limparProjeto,
  };
})(typeof window !== 'undefined' ? window : globalThis);
