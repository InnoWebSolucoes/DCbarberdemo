// Componentes de interface: camadas (gaveta e modal), avisos, confirmação e pequenos pedaços de HTML.
import { html, raw, FOCAVEIS, visivel, qsa } from './dom.js';
import { icon } from './icons.js';
import { STATUS } from './dados.js';
import { iniciais } from '../lib/format.js';

const reduzido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Camadas ----------

const pilha = [];

export function abrirCamada({ tipo = 'gaveta', classe = '', rotulo = '', aoFechar } = {}) {
  const anterior = document.activeElement;
  const el = document.createElement('div');
  el.className = `camada camada--${tipo} ${classe}`.trim();
  el.innerHTML = `<div class="camada__fundo" data-fechar-camada></div><section class="camada__painel" role="dialog" aria-modal="true" tabindex="-1"></section>`;
  const painel = el.querySelector('.camada__painel');
  if (rotulo) painel.setAttribute('aria-label', rotulo);
  document.getElementById('camadas').append(el);
  document.body.classList.add('tem-camada');

  const camada = {
    el, painel, tipo, fechada: false, atualizar: null, antesDeFechar: null,
    fechar() {
      if (camada.fechada) return;
      if (camada.antesDeFechar && camada.antesDeFechar() === false) return;
      camada.fechada = true;
      pilha.splice(pilha.indexOf(camada), 1);
      el.classList.remove('is-aberta');
      el.classList.add('is-saindo');
      setTimeout(() => el.remove(), reduzido() ? 0 : 360);
      if (!pilha.length) document.body.classList.remove('tem-camada');
      aoFechar?.();
      if (anterior && document.contains(anterior)) anterior.focus({ preventScroll: true });
    },
    focar(sel) {
      const alvo = (sel && painel.querySelector(sel)) || painel.querySelector('[data-foco-inicial]') || painel;
      alvo.focus({ preventScroll: true });
    },
  };
  el.querySelector('[data-fechar-camada]').addEventListener('click', () => camada.fechar());
  el.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-act="fechar"]')) {
      ev.preventDefault();
      camada.fechar();
    }
  });
  pilha.push(camada);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-aberta')));
  return camada;
}

export const camadaNoTopo = () => pilha[pilha.length - 1] || null;
export const temCamada = () => pilha.length > 0;

export function atualizarCamadas() {
  pilha.forEach((c) => {
    try {
      c.atualizar?.();
    } catch (e) {
      console.error(e);
    }
  });
}

document.addEventListener('keydown', (ev) => {
  const topo = camadaNoTopo();
  if (!topo) return;
  if (ev.key === 'Escape') {
    if (ev.target.closest?.('[data-esc-local]')) return;
    ev.preventDefault();
    topo.fechar();
    return;
  }
  if (ev.key === 'Tab') {
    const itens = qsa(FOCAVEIS, topo.painel).filter(visivel);
    if (!itens.length) {
      ev.preventDefault();
      topo.painel.focus();
      return;
    }
    const primeiro = itens[0];
    const ultimo = itens[itens.length - 1];
    const dentro = topo.painel.contains(document.activeElement);
    if (ev.shiftKey && (document.activeElement === primeiro || !dentro)) {
      ev.preventDefault();
      ultimo.focus();
    } else if (!ev.shiftKey && (document.activeElement === ultimo || !dentro)) {
      ev.preventDefault();
      primeiro.focus();
    }
  }
});

// Cabeçalho padrão das gavetas e modais.
export const topoCamada = ({ titulo, sub = '', extra = '', id = '' }) => html`
  <header class="camada__topo">
    <div class="camada__titulos">
      ${sub ? html`<p class="camada__sub">${sub}</p>` : ''}
      <h2 class="camada__titulo" ${id ? raw(`id="${id}"`) : ''}>${titulo}</h2>
      ${extra}
    </div>
    <button class="icone-btn" type="button" data-act="fechar" aria-label="Fechar">${icon('fechar', 20)}</button>
  </header>`;

// ---------- Confirmação ----------

export function confirmar({ titulo, texto = '', ok = 'Confirmar', cancelar = 'Voltar', perigo = false }) {
  return new Promise((resolve) => {
    let resposta = false;
    const c = abrirCamada({ tipo: 'modal', classe: 'camada--confirmar', rotulo: titulo, aoFechar: () => resolve(resposta) });
    c.painel.setAttribute('role', 'alertdialog');
    c.painel.innerHTML = html`
      <div class="confirmar">
        <h2 class="confirmar__titulo">${titulo}</h2>
        ${texto ? html`<p class="confirmar__texto">${texto}</p>` : ''}
        <div class="confirmar__acoes">
          <button type="button" class="btn a-btn a-btn--linha" data-act="fechar">${cancelar}</button>
          <button type="button" class="btn a-btn ${perigo ? 'a-btn--perigo' : 'a-btn--preto'}" data-ok data-foco-inicial>${ok}</button>
        </div>
      </div>`.toString();
    c.painel.querySelector('[data-ok]').addEventListener('click', () => {
      resposta = true;
      c.fechar();
    });
    c.focar();
  });
}

// ---------- Avisos (toasts) ----------

export function toast(texto, { tipo = 'ok', acao = '', aoAgir = null, duracao = 5200 } = {}) {
  const raiz = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast--${tipo}`;
  el.innerHTML = html`
    <span class="toast__marca" aria-hidden="true"></span>
    <p class="toast__texto">${texto}</p>
    ${acao ? html`<button type="button" class="toast__acao">${acao}</button>` : ''}
    <button type="button" class="toast__fechar" aria-label="Dispensar aviso">${icon('fechar', 16)}</button>`.toString();
  raiz.append(el);
  while (raiz.children.length > 4) raiz.firstElementChild.remove();
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-visivel')));
  let t;
  const sair = () => {
    clearTimeout(t);
    el.classList.remove('is-visivel');
    setTimeout(() => el.remove(), reduzido() ? 0 : 300);
  };
  const armar = () => {
    clearTimeout(t);
    t = setTimeout(sair, duracao);
  };
  el.addEventListener('mouseenter', () => clearTimeout(t));
  el.addEventListener('mouseleave', armar);
  el.querySelector('.toast__fechar').addEventListener('click', sair);
  el.querySelector('.toast__acao')?.addEventListener('click', () => {
    aoAgir?.();
    sair();
  });
  armar();
  return sair;
}

// ---------- Pedaços de HTML ----------

export const statusTag = (s) => html`<span class="st st--${s}"><i aria-hidden="true"></i>${STATUS[s] || s}</span>`;

export const chave = ({ id, marcado, rotulo, desc = '', attrs = '' }) => html`
  <label class="chave" for="${id}">
    <input type="checkbox" role="switch" id="${id}" ${marcado ? raw('checked') : ''} ${raw(attrs)}>
    <span class="chave__trilho" aria-hidden="true"><span class="chave__bola"></span></span>
    ${rotulo || desc ? html`<span class="chave__textos">${rotulo ? html`<span class="chave__rotulo">${rotulo}</span>` : ''}${desc ? html`<span class="chave__desc">${desc}</span>` : ''}</span>` : ''}
  </label>`;

export const vazio = (texto, acao = '') => html`<div class="vazio"><p>${texto}</p>${acao}</div>`;

export const avatar = (nome, classe = '') => html`<span class="avatar ${classe}" aria-hidden="true">${iniciais(nome)}</span>`;

export const waLink = (tel = '') => {
  const d = String(tel).replace(/\D/g, '');
  return d ? `https://wa.me/${d}` : '';
};

export const kb = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`);

// Paginação simples: "1 a 25 de 312" e botões anterior/próxima.
export function paginacao({ pagina, porPagina, total, act = 'pagina' }) {
  if (total <= porPagina) return html`<div class="pag"><span class="pag__info">${total} ${total === 1 ? 'resultado' : 'resultados'}</span></div>`;
  const paginas = Math.ceil(total / porPagina);
  const ini = (pagina - 1) * porPagina + 1;
  const fim = Math.min(total, pagina * porPagina);
  return html`
    <div class="pag">
      <span class="pag__info">${ini} a ${fim} de ${total}</span>
      <div class="pag__botoes">
        <button type="button" class="icone-btn icone-btn--linha" data-act="${act}" data-id="${pagina - 1}" ${pagina <= 1 ? raw('disabled') : ''} aria-label="Página anterior">${icon('esq')}</button>
        <span class="pag__num">${pagina} de ${paginas}</span>
        <button type="button" class="icone-btn icone-btn--linha" data-act="${act}" data-id="${pagina + 1}" ${pagina >= paginas ? raw('disabled') : ''} aria-label="Próxima página">${icon('dir')}</button>
      </div>
    </div>`;
}

// Cabeçalho de coluna ordenável.
export function thOrdem(rotulo, campo, ordem, classe = '') {
  const ativo = ordem.campo === campo;
  const dir = ativo ? (ordem.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return html`<th class="${classe}" aria-sort="${dir}"><button type="button" class="th-ordem ${ativo ? 'is-ativo' : ''}" data-act="ordem" data-id="${campo}">${rotulo}<span class="th-ordem__seta ${ativo && ordem.dir === 'asc' ? 'is-asc' : ''}" aria-hidden="true">${icon('baixo', 14)}</span></button></th>`;
}

export function ordenar(lista, ordem, getters) {
  const g = getters[ordem.campo];
  if (!g) return lista;
  const f = ordem.dir === 'asc' ? 1 : -1;
  return [...lista].sort((a, b) => {
    const x = g(a);
    const y = g(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    if (typeof x === 'string') return x.localeCompare(y, 'pt-BR') * f;
    return (x - y) * f;
  });
}

export const alternarOrdem = (ordem, campo, padraoDesc = true) =>
  ordem.campo === campo ? { campo, dir: ordem.dir === 'asc' ? 'desc' : 'asc' } : { campo, dir: padraoDesc ? 'desc' : 'asc' };
