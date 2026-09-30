// Pequenos utilitários de interface usados pelo agendamento e pela conta.
import { escapeHtml } from '../lib/format.js';

export const esc = escapeHtml;

// Cria um elemento a partir de uma string HTML (primeiro nó).
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

let seq = 0;
export const uid = (p = 'ag') => `${p}-${++seq}`;

// Recorte do retrato: centro do rosto em cada foto (fração da largura e altura).
const FOCO = {
  david: [0.51, 0.25],
  emmanuel: [0.48, 0.27],
  clayre: [0.47, 0.31],
};

// Foto recortada em volta do rosto. `forma`: 'circulo' | 'retrato'.
export function foto(prof, { forma = 'circulo', classe = '' } = {}) {
  const [fx, fy] = FOCO[prof.id] || [0.5, 0.3];
  return `<span class="dc-foto dc-foto--${forma} ${classe}" style="--fx:${fx};--fy:${fy}" aria-hidden="true"><img src="${prof.foto}" alt="" loading="lazy" decoding="async"></span>`;
}

// Monograma DC colorido pela cor do texto (máscara sobre o SVG da marca).
export const monograma = (classe = '') => `<span class="dc-monograma ${classe}" aria-hidden="true"></span>`;

// Hexágono de topo plano. Pontos para uma caixa w x h.
export function pontosHex(w, h, m = 0) {
  const x0 = m, x1 = w * 0.25, x2 = w * 0.75, x3 = w - m;
  const y0 = m, y1 = h / 2, y2 = h - m;
  return `${x1 + m / 2},${y0} ${x2 - m / 2},${y0} ${x3},${y1} ${x2 - m / 2},${y2} ${x1 + m / 2},${y2} ${x0},${y1}`;
}

const svg = (corpo, vb = '0 0 24 24', extra = '') =>
  `<svg viewBox="${vb}" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${extra}>${corpo}</svg>`;

export const icone = {
  fechar: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  voltar: svg('<path d="M15 5l-7 7 7 7"/>'),
  avancar: svg('<path d="M9 5l7 7-7 7"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  remover: svg('<path d="M7 7l10 10M17 7L7 17"/>'),
  calendario: svg('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  mapa: svg('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>'),
  relogio: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  baixar: svg('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
  email: svg('<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/>'),
  documento: svg('<path d="M14 3.5H7.5a2 2 0 00-2 2v13a2 2 0 002 2h9a2 2 0 002-2V8L14 3.5z"/><path d="M14 3.5V8h4.5"/>'),
  sair: svg('<path d="M14 5h3.5a2 2 0 012 2v10a2 2 0 01-2 2H14M10 16l-4-4 4-4M6 12h9"/>'),
};

export const reduzMovimento = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Plural simples em português.
export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Validações de formulário
export const emailValido = (e = '') => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e.trim());
export const telefoneValido = (t = '') => t.replace(/\D/g, '').length >= 9;
