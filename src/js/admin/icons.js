// Conjunto mínimo de ícones, traço de 1.5px, desenhados à mão.
import { raw } from './dom.js';

const P = {
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  esq: '<path d="m14.5 6-6 6 6 6"/>',
  dir: '<path d="m9.5 6 6 6-6 6"/>',
  baixo: '<path d="m6 9.5 6 6 6-6"/>',
  fechar: '<path d="m6 6 12 12M18 6 6 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  whatsapp: '<path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6Z"/><path d="M9.2 9.1c.2 2.6 2.9 5.4 5.7 5.7l1-1.2-1.8-1-1 .7c-.9-.4-1.9-1.4-2.3-2.3l.7-1-1-1.8Z"/>',
  telefone: '<path d="M6.5 4h3l1.5 4-2 1.3a9 9 0 0 0 5.7 5.7L16 13l4 1.5v3A2 2 0 0 1 17.9 19.5 15.5 15.5 0 0 1 4.5 6.1 2 2 0 0 1 6.5 4Z"/>',
  email: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  clipe: '<path d="m19 11.5-6.8 6.8a4.2 4.2 0 0 1-6-6l7.2-7.1a2.8 2.8 0 0 1 4 4l-7.1 7.1a1.4 1.4 0 0 1-2-2L15 7.6"/>',
  baixar: '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>',
  enviar: '<path d="M12 19V6M7 10.5l5-5 5 5"/>',
  arquivo: '<path d="M7 3.5h6.5L18 8v12.5H7Z"/><path d="M13 3.5V8h5"/>',
  calendario: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  externo: '<path d="M13.5 5.5H18.5v5M18.5 5.5l-8 8M16 14v4.5H5.5V8H10"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  relogio: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.8"/>',
  lixo: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
  copiar: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5v-3a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 5.5V14A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  editar: '<path d="M5 19h3.5L18.5 9 15 5.5l-10 10Z"/><path d="m13 7.5 3.5 3.5"/>',
  desktop: '<rect x="3.5" y="5" width="17" height="11" rx="1.5"/><path d="M9 20h6M12 16v4"/>',
  celular: '<rect x="7" y="3.5" width="10" height="17" rx="2"/><path d="M11 17.5h2"/>',
  repetir: '<path d="M5 11a7 7 0 0 1 12-4.5L19 8.5M19 4.5v4h-4M19 13a7 7 0 0 1-12 4.5L5 15.5M5 19.5v-4h4"/>',
  sair: '<path d="M14 5.5h4.5v13H14M10 8.5 6.5 12l3.5 3.5M6.5 12H15"/>',
  imagem: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m5 17.5 4.5-4.5 3 3 2.5-2.5 4 4"/>',
};

export const icon = (nome, tam = 18, extra = '') =>
  raw(`<svg class="ico ${extra}" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[nome] || ''}</svg>`);
