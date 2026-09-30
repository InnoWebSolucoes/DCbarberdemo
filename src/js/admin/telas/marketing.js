// E-mail marketing: abas Automações, Campanhas e Inscritos, e o botão "Processar fila agora".
import { html, render, acoes } from '../dom.js';
import { icon } from '../icons.js';
import { inscritos } from '../dados.js';
import { toast } from '../ui.js';
import { rodarFila, resumoFila } from '../fila.js';
import { db } from '../../data/store.js';
import { hhmm, tempoRelativo } from '../../lib/format.js';
import automacoes from './automacoes.js';
import campanhas from './campanhas.js';
import listaInscritos from './inscritos.js';

const ABAS = {
  automacoes: { nome: 'Automações', tela: automacoes },
  campanhas: { nome: 'Campanhas', tela: campanhas },
  inscritos: { nome: 'Inscritos', tela: listaInscritos },
};

let raiz = null;
let aba = 'automacoes';
let sub = null;
let processando = false;

function desenharCabecalho() {
  const quando = db.getMeta('filaProcessadaEm');
  render(raiz.querySelector('[data-fila]'), html`
    <span class="fila-info" title="${quando ? `Última verificação ${tempoRelativo(quando)}` : ''}">${quando ? html`Fila verificada às <span class="tnum">${hhmm(new Date(quando))}</span>` : 'Fila ainda não verificada'}</span>
    <button type="button" class="btn a-btn a-btn--linha" data-act="fila" ${processando ? html`disabled aria-busy="true"` : ''}>
      ${processando ? html`<span class="giro"></span>Processando` : html`${icon('repetir', 16)}Processar fila agora`}</button>`);
  const n = inscritos().length;
  render(raiz.querySelector('[data-sub]'), `${n} ${n === 1 ? 'pessoa inscrita' : 'pessoas inscritas'}. Os lembretes saem sozinhos, sem precisar clicar em nada.`);
}

function desenharAbas() {
  render(raiz.querySelector('[data-abas]'), Object.entries(ABAS).map(([id, a]) => html`
    <a class="aba" href="#/marketing/${id}" role="tab" aria-selected="${aba === id}" ${aba === id ? html`aria-current="page"` : ''}>${a.nome}</a>`));
}

function montarAba() {
  sub?.desmontar?.();
  const caixa = document.createElement('div');
  caixa.className = `aba-conteudo aba-conteudo--${aba}`;
  raiz.querySelector('[data-aba]').replaceChildren(caixa);
  sub = ABAS[aba].tela;
  sub.montar(caixa);
}

async function processar() {
  if (processando) return;
  processando = true;
  desenharCabecalho();
  const inicio = performance.now();
  try {
    const enviados = await rodarFila({ avisar: false });
    const resto = 700 - (performance.now() - inicio);
    if (resto > 0) await new Promise((r) => setTimeout(r, resto));
    toast(enviados.length ? `${resumoFila(enviados).replace(/ automaticamente/g, '')}.` : 'Nada para enviar agora. Todos os lembretes e campanhas estão em dia.', {
      tipo: enviados.length ? 'ok' : 'info',
      acao: enviados.length ? 'Ver e-mails' : '',
      aoAgir: () => (location.hash = '#/emails'),
    });
  } finally {
    processando = false;
    if (raiz) desenharCabecalho();
  }
}

export default {
  montar(el, params) {
    raiz = el;
    aba = ABAS[params[0]] ? params[0] : 'automacoes';
    render(el, html`
      <header class="pag-topo">
        <div>
          <h1 class="pag-topo__titulo">E-mail marketing</h1>
          <p class="pag-topo__sub" data-sub></p>
        </div>
        <div class="pag-topo__acoes fila" data-fila></div>
      </header>
      <nav class="abas" role="tablist" aria-label="Seções de e-mail marketing" data-abas></nav>
      <div data-aba></div>`);
    desenharCabecalho();
    desenharAbas();
    montarAba();
    acoes(el.querySelector('[data-fila]'), { fila: processar });
  },
  mudarParams(params) {
    const nova = ABAS[params[0]] ? params[0] : 'automacoes';
    if (nova === aba) return;
    aba = nova;
    desenharAbas();
    montarAba();
    window.scrollTo(0, 0);
  },
  atualizar(cols) {
    if (!raiz) return;
    desenharCabecalho();
    sub?.atualizar?.(cols);
  },
  desmontar() {
    sub?.desmontar?.();
    sub = null;
    raiz = null;
  },
};
