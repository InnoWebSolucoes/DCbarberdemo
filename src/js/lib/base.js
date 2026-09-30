// O site vive em um subcaminho (innoweb.agency/dcbarber/).
// BASE vem do "base" do vite.config.js; url() prefixa caminhos que começam com "/".
export const BASE = import.meta.env.BASE_URL || '/';

export const url = (p = '') => (p.startsWith('/') && !p.startsWith('//') && !p.startsWith(BASE) ? BASE + p.slice(1) : p);

// Endereço absoluto do site, sem barra no fim (para e-mails e calendário)
export const raiz = () => (typeof location !== 'undefined' ? location.origin : '') + BASE.replace(/\/$/, '');
