// Seções "Faturas" e "E-mails recebidos", com a janela de visualização.
import { db } from '../data/store.js';
import { resolverEmailHtml } from '../data/api.js';
import { moeda, hhmm, tempoRelativo } from '../lib/format.js';
import { dataCompacta } from '../booking/datas.js';
import { el, esc, icone } from '../booking/ui.js';
import { abrirJanela } from './modal.js';

const TIPOS = {
  confirmacao: 'Confirmação',
  cancelamento: 'Cancelamento',
  fatura: 'Fatura',
  'boas-vindas': 'Conta',
  campanha: 'Novidades',
  automacao: 'Lembrete',
};

const ehPdf = (f) => (f.arquivoTipo || '').includes('pdf') || /^data:application\/pdf/.test(f.arquivo || '');

export const faturasDe = (cliente) =>
  db.listSync('faturas', (f) => f.clienteId === cliente.id).sort((a, b) => new Date(b.enviadaEm) - new Date(a.enviadaEm));

export const emailsDe = (cliente) => {
  const email = (cliente.email || '').toLowerCase();
  return db.listSync('emails', (e) => e.clienteId === cliente.id || (e.para || '').toLowerCase() === email)
    .sort((a, b) => new Date(b.enviadoEm) - new Date(a.enviadoEm));
};

const quando = (d) => {
  const x = new Date(d);
  return `${dataCompacta(x)} às ${hhmm(x)}`;
};

export function htmlFaturas(cliente) {
  const lista = faturasDe(cliente);
  if (!lista.length) {
    return `<div class="ct-vazio"><p class="ct-vazio__titulo">Nenhuma fatura ainda</p><p>Depois de cada atendimento a barbearia envia a fatura por e-mail e ela fica guardada aqui.</p></div>`;
  }
  return `
    <ul class="ct-faturas">
      ${lista.map((f) => `
        <li>
          <button type="button" class="ct-fatura" data-acao="fatura" data-id="${f.id}" data-foco="f-${f.id}" aria-label="Abrir fatura ${esc(f.numero)}">
            <span class="ct-fatura__mini">${ehPdf(f)
              ? `<span class="ct-fatura__pdf">${icone.documento}<span>PDF</span></span>`
              : `<img src="${f.arquivo}" alt="" loading="lazy" decoding="async">`}</span>
            <span class="ct-fatura__info">
              <strong>${esc(f.numero)}</strong>
              <span>${esc(dataCompacta(f.enviadaEm))}</span>
              <span class="ct-fatura__valor">${moeda(f.valor)}</span>
            </span>
          </button>
        </li>`).join('')}
    </ul>`;
}

export function htmlEmails(cliente, { todos = false } = {}) {
  const lista = emailsDe(cliente);
  if (!lista.length) {
    return `<div class="ct-vazio"><p class="ct-vazio__titulo">Nenhum e-mail ainda</p><p>Confirmações, faturas e lembretes que enviarmos para ${esc(cliente.email)} aparecem aqui.</p></div>`;
  }
  const mostrar = todos ? lista : lista.slice(0, 6);
  return `
    <ul class="ct-emails">
      ${mostrar.map((e) => `
        <li>
          <button type="button" class="ct-email${e.aberto ? '' : ' is-novo'}" data-acao="email" data-id="${e.id}" data-foco="e-${e.id}">
            <span class="ct-email__assunto">${esc(e.assunto)}</span>
            <span class="ct-email__meta">${TIPOS[e.tipo] || 'E-mail'}, ${esc(tempoRelativo(e.enviadoEm))}</span>
            ${e.aberto ? '' : '<span class="sr-only">, não lido</span>'}
          </button>
        </li>`).join('')}
    </ul>
    ${lista.length > 6 ? `<button type="button" class="ct-mais" data-acao="emails-todos" data-foco="emails-todos">${todos ? 'Mostrar menos' : `Ver os ${lista.length} e-mails`}</button>` : ''}`;
}

function baixar(href, nome) {
  const a = document.createElement('a');
  a.href = href;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function abrirFatura(id) {
  const f = db.listSync('faturas').find((x) => x.id === id);
  if (!f) return;
  const nome = f.arquivoNome || `${(f.numero || 'fatura').replace(/[ /]/g, '-')}.${ehPdf(f) ? 'pdf' : 'jpg'}`;
  const corpo = ehPdf(f)
    ? el(`<iframe class="ct-janela__pdf" src="${f.arquivo}" title="Fatura ${esc(f.numero)}"></iframe>`)
    : el(`<div class="ct-janela__imagem"><img src="${f.arquivo}" alt="Fatura ${esc(f.numero)}, ${moeda(f.valor)}"></div>`);
  const j = abrirJanela({
    titulo: `Fatura ${f.numero}`,
    meta: `${esc(dataCompacta(f.enviadaEm))}, ${moeda(f.valor)}`,
    corpo,
    classe: 'ct-janela--fatura',
    acoes: `<button type="button" class="btn btn--branco ct-janela__baixar" data-baixar>${icone.baixar}<span>Baixar</span></button>`,
  });
  j.raiz.querySelector('[data-baixar]').addEventListener('click', () => baixar(f.arquivo, nome));
}

export function abrirEmail(id) {
  const e = db.listSync('emails').find((x) => x.id === id);
  if (!e) return;
  let html = resolverEmailHtml(e.html || '');
  // links do e-mail abrem fora da pré-visualização
  html = html.includes('<head>') ? html.replace('<head>', '<head><base target="_blank">') : `<base target="_blank">${html}`;
  const iframe = el(`<iframe class="ct-janela__email" title="${esc(e.assunto)}" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe>`);
  iframe.srcdoc = html;
  const anexos = (e.anexos || []).filter((a) => a.faturaId);
  abrirJanela({
    titulo: e.assunto,
    meta: `De DC Barbershop para ${esc(e.para)}, ${esc(quando(e.enviadoEm))}`,
    corpo: iframe,
    classe: 'ct-janela--email',
    acoes: anexos.length ? `<button type="button" class="btn btn--linha ct-janela__anexo" data-anexo="${anexos[0].faturaId}">${icone.documento}<span>Ver anexo</span></button>` : '',
  }).raiz.querySelector('[data-anexo]')?.addEventListener('click', (ev) => abrirFatura(ev.currentTarget.dataset.anexo));
  if (!e.aberto) db.update('emails', e.id, { aberto: true, abertoEm: new Date().toISOString() });
}
