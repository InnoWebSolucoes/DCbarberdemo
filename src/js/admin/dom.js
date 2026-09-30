// Pequeno ajudante de DOM: templates com escape automático e delegação de eventos.
import { escapeHtml } from '../lib/format.js';

export class Safe {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

export const raw = (s) => new Safe(s == null ? '' : String(s));

// Booleanos viram "true"/"false" para funcionar em aria-pressed="${x}".
// Para esconder um trecho, use sempre o ternário: ${x ? html`...` : ''}.
const valor = (v) => {
  if (v == null) return '';
  if (v === true || v === false) return String(v);
  if (Array.isArray(v)) return v.map(valor).join('');
  if (v instanceof Safe) return v.s;
  return escapeHtml(String(v));
};

// html`<p>${texto}</p>` escapa tudo, menos o que vier de html`` ou raw().
export const html = (partes, ...vals) =>
  new Safe(partes.reduce((o, p, i) => o + p + (i < vals.length ? valor(vals[i]) : ''), ''));

export const qs = (sel, el = document) => el.querySelector(sel);
export const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];

// Troca o conteúdo tentando manter o foco no "mesmo" elemento.
export function render(el, conteudo) {
  const ativo = document.activeElement;
  let chave = null;
  if (ativo && el.contains(ativo) && ativo !== el) {
    chave = ativo.id ? `#${CSS.escape(ativo.id)}`
      : ativo.dataset.act ? `[data-act="${CSS.escape(ativo.dataset.act)}"]${ativo.dataset.id ? `[data-id="${CSS.escape(ativo.dataset.id)}"]` : ''}`
      : null;
  }
  el.innerHTML = valor(conteudo);
  if (chave) {
    const novo = el.querySelector(chave);
    if (novo) novo.focus({ preventScroll: true });
  }
}

// Delegação: on(el, 'click', '[data-act]', (ev, alvo) => ...)
export function on(el, evento, seletor, fn) {
  const h = (ev) => {
    const alvo = ev.target.closest(seletor);
    if (alvo && el.contains(alvo)) fn(ev, alvo);
  };
  el.addEventListener(evento, h);
  return () => el.removeEventListener(evento, h);
}

// Liga cliques em [data-act] a um mapa de ações.
export function acoes(el, mapa) {
  return on(el, 'click', '[data-act]', (ev, alvo) => {
    const fn = mapa[alvo.dataset.act];
    if (fn) {
      ev.preventDefault();
      fn(alvo, ev);
    }
  });
}

export function debounce(fn, ms = 150) {
  let t;
  const d = (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
  d.cancelar = () => clearTimeout(t);
  return d;
}

export const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export const visivel = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export const normalizar = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
