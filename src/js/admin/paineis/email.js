// Pré-visualização de e-mail (modal e painel da caixa de saída) e visualizador de imagem.
import { html, raw } from '../dom.js';
import { icon } from '../icons.js';
import { porId, resolverAdmin, tipoEmail, dataEnvio } from '../dados.js';
import { abrirCamada, topoCamada } from '../ui.js';
import { baixar } from '../arquivos.js';
import { limparQuebradas } from '../imagens.js';
import { dataHora } from '../../lib/format.js';

// HTML pronto para srcdoc: resolve anexos e faz os links abrirem em outra aba.
export const srcdoc = (htmlEmail) => limparQuebradas(resolverAdmin(htmlEmail)).replace(/<head>/i, '<head><base target="_blank">');

export const iframeEmail = (htmlEmail, { titulo = 'Pré-visualização do e-mail', classe = '' } = {}) =>
  html`<iframe class="email-quadro ${classe}" title="${titulo}" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" srcdoc="${srcdoc(htmlEmail)}"></iframe>`;

// Ajusta a altura do iframe ao conteúdo (usado nos modais).
export function autoAltura(iframe, min = 320) {
  const ajustar = () => {
    try {
      const h = iframe.contentDocument?.documentElement?.scrollHeight;
      if (h) iframe.style.height = Math.max(min, h) + 'px';
    } catch { /* ignora */ }
  };
  iframe.addEventListener('load', ajustar);
  setTimeout(ajustar, 300);
}

export function anexosDe(e) {
  return (e.anexos || []).map((a) => {
    const f = porId('faturas', a.faturaId);
    return { ...a, arquivo: f?.arquivo || '', fatura: f };
  });
}

export const listaAnexos = (e) => {
  const anexos = anexosDe(e);
  if (!anexos.length) return '';
  return html`<ul class="anexos">${anexos.map((a, i) => html`
    <li class="anexo">
      ${a.tipo?.startsWith('image/') && a.arquivo
        ? html`<button type="button" class="anexo__mini" data-act="anexo-ver" data-id="${e.id}" data-i="${i}" aria-label="Ampliar ${a.nome}"><img src="${a.arquivo}" alt=""></button>`
        : html`<span class="anexo__mini anexo__mini--doc">${icon('arquivo', 22)}</span>`}
      <span class="anexo__info"><strong>${a.nome}</strong><small>${a.tipo === 'application/pdf' ? 'PDF' : 'Imagem JPG'}${a.fatura ? `, fatura ${a.fatura.numero}` : ''}</small></span>
      <span class="anexo__acoes">
        ${a.tipo?.startsWith('image/') && a.arquivo ? html`<button type="button" class="btn a-btn a-btn--leve a-btn--sm" data-act="anexo-ver" data-id="${e.id}" data-i="${i}">Ver</button>` : ''}
        ${a.tipo === 'application/pdf' && a.arquivo ? html`<button type="button" class="btn a-btn a-btn--leve a-btn--sm" data-act="anexo-abrir" data-id="${e.id}" data-i="${i}">Abrir</button>` : ''}
        ${a.arquivo ? html`<button type="button" class="btn a-btn a-btn--linha a-btn--sm" data-act="anexo-baixar" data-id="${e.id}" data-i="${i}">${icon('baixar', 15)}Baixar</button>` : html`<span class="fraco">Arquivo removido</span>`}
      </span>
    </li>`)}</ul>`;
};

// Trata cliques nos botões de anexo dentro de qualquer contêiner.
export function acaoAnexo(alvo) {
  const e = porId('emails', alvo.dataset.id);
  if (!e) return;
  const a = anexosDe(e)[Number(alvo.dataset.i)];
  if (!a?.arquivo) return;
  if (alvo.dataset.act === 'anexo-ver') abrirFoto(a.arquivo, a.nome);
  else if (alvo.dataset.act === 'anexo-baixar') baixar(a.arquivo, a.nome);
  else if (alvo.dataset.act === 'anexo-abrir') abrirPdf(a.arquivo);
}

export function abrirPdf(dataUrl) {
  fetch(dataUrl).then((r) => r.blob()).then((b) => {
    const url = URL.createObjectURL(b);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
}

export const cabecalhoEmail = (e) => html`
  <div class="email-cab">
    <p class="email-cab__assunto">${e.assunto}</p>
    <dl class="email-cab__meta">
      <dt>De</dt><dd>${e.de || 'DC Barbershop <dcbarbershop.porto@gmail.com>'}</dd>
      <dt>Para</dt><dd>${e.nomePara ? `${e.nomePara} <${e.para}>` : e.para}</dd>
      <dt>Enviado</dt><dd class="tnum">${dataHora(dataEnvio(e))}</dd>
      <dt>Situação</dt><dd>
        <span class="entrega"><i aria-hidden="true"></i>Entregue</span>
        <span class="entrega ${e.aberto ? 'entrega--aberto' : 'entrega--nao'}"><i aria-hidden="true"></i>${e.aberto ? 'Aberto' : 'Ainda não aberto'}</span>
        ${e.clicado ? html`<span class="entrega entrega--aberto"><i aria-hidden="true"></i>Clicou no botão</span>` : ''}
      </dd>
      <dt>Tipo</dt><dd><span class="etq etq--${e.tipo}">${tipoEmail(e)}</span></dd>
    </dl>
  </div>`;

export function abrirEmail(id) {
  const e = porId('emails', id);
  if (!e) return;
  const c = abrirCamada({ tipo: 'modal', classe: 'camada--medio', rotulo: e.assunto });
  c.painel.innerHTML = html`
    ${topoCamada({ titulo: 'E-mail enviado', sub: tipoEmail(e) })}
    <div class="camada__corpo camada__corpo--email">
      ${cabecalhoEmail(e)}
      ${listaAnexos(e)}
      <div class="email-moldura">${iframeEmail(e.html)}</div>
    </div>`.toString();
  c.painel.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act^="anexo-"]');
    if (b) acaoAnexo(b);
  });
  autoAltura(c.painel.querySelector('iframe'));
  c.focar('[data-act="fechar"]');
}

export function abrirFoto(src, nome = 'imagem.jpg') {
  const c = abrirCamada({ tipo: 'modal', classe: 'camada--foto', rotulo: nome });
  c.painel.innerHTML = html`
    <figure class="foto">
      <img src="${src}" alt="${nome}">
      <figcaption class="foto__barra">
        <span>${nome}</span>
        <span class="foto__acoes">
          <button type="button" class="btn a-btn a-btn--sm foto__btn" data-baixar>${icon('baixar', 15)}Baixar</button>
          <button type="button" class="icone-btn foto__fechar" data-act="fechar" aria-label="Fechar">${icon('fechar', 20)}</button>
        </span>
      </figcaption>
    </figure>`.toString();
  c.painel.querySelector('[data-baixar]').addEventListener('click', () => baixar(src, nome));
  c.focar('[data-act="fechar"]');
}

export { raw };
