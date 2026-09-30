import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// O site é publicado em innoweb.agency/dcbarber/
const BASE = '/dcbarber/';

// Prefixa com BASE os caminhos "/..." que o Vite não reescreve sozinho no HTML
// (links, data-src dos vídeos, meta og:image).
const prefixarHtml = {
  name: 'dc-prefixar-html',
  transformIndexHtml: {
    order: 'post',
    handler: (html) => html.replace(
      /\b(href|src|poster|srcset|content|data-src)="\/(?!\/)([^"]*)"/g,
      (tudo, attr, resto) => (('/' + resto).startsWith(BASE) ? tudo : `${attr}="${BASE}${resto}"`),
    ),
  },
};

export default defineConfig({
  base: BASE,
  appType: 'mpa',
  plugins: [prefixarHtml],
  build: {
    outDir: 'dist/dcbarber',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        site: resolve(import.meta.dirname, 'index.html'),
        conta: resolve(import.meta.dirname, 'conta/index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
      },
    },
  },
  server: { port: 5180, host: true },
});
