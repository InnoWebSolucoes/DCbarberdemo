// Verifica se as imagens de exemplo das campanhas existem no site.
// As que não carregam são tiradas das pré-visualizações para não aparecer um ícone quebrado.
import { url as caminho } from '../lib/base.js';

const estado = new Map();

export function verificarImagem(url, aoTerminar) {
  if (!url || url.startsWith('data:') || url.includes('/dc-campanha/')) return;
  if (estado.has(url)) return;
  estado.set(url, null);
  const img = new Image();
  img.onload = () => { estado.set(url, true); aoTerminar?.(); };
  img.onerror = () => { estado.set(url, false); aoTerminar?.(); };
  img.src = caminho(url);
}

export const imagemOk = (url) => !url || estado.get(url) !== false;

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function limparQuebradas(htmlEmail) {
  let saida = htmlEmail;
  for (const [url, ok] of estado) {
    if (ok === false) saida = saida.replace(new RegExp(`<img[^>]*src="[^"]*${escapar(url)}"[^>]*>`, 'g'), '');
  }
  return saida;
}
