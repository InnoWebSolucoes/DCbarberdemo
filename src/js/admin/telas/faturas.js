// Faturas: enviadas (com miniatura), atendimentos de hoje por faturar e a opção de pedir ao concluir.
import { html, render, acoes, debounce, normalizar } from '../dom.js';
import { icon } from '../icons.js';
import { col, porId, agendamentosDoDia, hojeISO } from '../dados.js';
import { vazio, chave, toast } from '../ui.js';
import { baixar } from '../arquivos.js';
import { pedirFaturaAoConcluir, definirPedirFatura } from '../acoes.js';
import { abrirNovaFatura } from '../paineis/nova-fatura.js';
import { abrirEmail, abrirFoto, abrirPdf } from '../paineis/email.js';
import { moeda, dataCurta, hhmm } from '../../lib/format.js';

const st = { q: '' };
let raiz = null;

function porFaturar() {
  return agendamentosDoDia(hojeISO()).filter((a) => a.status === 'concluido' && !a.faturaId && (a.total || 0) > 0);
}

function desenharPendentes() {
  const alvo = raiz.querySelector('[data-pendentes]');
  const lista = porFaturar();
  render(alvo, lista.length ? html`
    <section class="pendentes" aria-labelledby="pend-t">
      <div class="secao-topo"><div><h2 class="secao-titulo" id="pend-t">Concluídos hoje sem fatura</h2>
        <p class="secao-sub">${lista.length} ${lista.length === 1 ? 'atendimento' : 'atendimentos'} esperando a fatura</p></div></div>
      <ul class="pendentes__lista">
        ${lista.map((a) => html`<li class="pendentes__item">
          <span class="pendentes__hora tnum">${hhmm(new Date(a.inicio))}</span>
          <span class="pendentes__quem"><strong>${a.clienteNome}</strong><small>${a.servicosNomes.join(' + ')}, ${a.profissionalNome}</small></span>
          <span class="pendentes__val tnum">${moeda(a.total)}</span>
          <button type="button" class="btn a-btn a-btn--linha a-btn--sm" data-act="faturar" data-id="${a.id}">${icon('clipe', 15)}Enviar fatura</button>
        </li>`)}
      </ul>
    </section>` : '');
}

function desenharLista() {
  const alvo = raiz.querySelector('[data-lista]');
  const todas = [...col('faturas')].sort((a, b) => b.enviadaEm.localeCompare(a.enviadaEm));
  const q = normalizar(st.q);
  const lista = q ? todas.filter((f) => normalizar(f.numero).includes(q) || normalizar(f.clienteNome).includes(q) || f.clienteEmail.includes(q)) : todas;
  const total = todas.reduce((t, f) => t + (f.valor || 0), 0);
  render(raiz.querySelector('[data-resumo]'), todas.length
    ? `${todas.length} ${todas.length === 1 ? 'fatura enviada' : 'faturas enviadas'}, ${moeda(total)} no total. Cada uma vai por e-mail e fica na conta do cliente.`
    : 'Envie a fatura por e-mail logo depois do atendimento. O cliente também a encontra na conta dele.');
  if (!todas.length) {
    render(alvo, html`<div class="tabela-caixa">${vazio('Nenhuma fatura enviada ainda. Clique em Nova fatura para mandar a primeira.',
      html`<button type="button" class="btn a-btn a-btn--preto a-btn--sm" data-act="nova">${icon('mais', 15)}Nova fatura</button>`)}</div>`);
    return;
  }
  render(alvo, html`
    <div class="filtros">
      <div class="entrada-ico">${icon('busca', 17)}
        <label class="sr-only" for="fat-q">Buscar fatura</label>
        <input class="entrada entrada--sm" id="fat-q" type="search" placeholder="Número ou cliente" value="${st.q}" autocomplete="off">
      </div>
    </div>
    ${lista.length ? html`
    <ul class="faturas">
      ${lista.map((f) => {
        const email = porId('emails', f.emailId);
        const ag = porId('agendamentos', f.agendamentoId);
        const img = f.arquivoTipo?.startsWith('image/');
        return html`<li class="fatura">
          <button type="button" class="fatura__mini" data-act="ver" data-id="${f.id}" aria-label="Ver arquivo da fatura ${f.numero}">
            ${img ? html`<img src="${f.arquivo}" alt="" loading="lazy">` : html`<span class="fatura__pdf">${icon('arquivo', 24)}<small>PDF</small></span>`}
          </button>
          <div class="fatura__num"><strong class="tnum">${f.numero}</strong><small>${f.arquivoNome}</small></div>
          <div class="fatura__cli"><strong>${f.clienteNome}</strong><small>${f.clienteEmail}</small></div>
          <div class="fatura__ag">${ag ? html`${dataCurta(ag.inicio)}, ${ag.servicosNomes.join(' + ')}` : html`<span class="fraco">Sem atendimento ligado</span>`}<small>Enviada em ${dataCurta(f.enviadaEm)} às ${hhmm(new Date(f.enviadaEm))}</small></div>
          <div class="fatura__val tnum">${moeda(f.valor)}</div>
          <div class="fatura__estado">${email ? html`<span class="entrega ${email.aberto ? 'entrega--aberto' : 'entrega--nao'}"><i aria-hidden="true"></i>${email.aberto ? 'Aberta' : 'Não aberta'}</span>` : ''}</div>
          <div class="fatura__acoes">
            ${email ? html`<button type="button" class="btn a-btn a-btn--leve a-btn--sm" data-act="email" data-id="${email.id}">Ver e-mail</button>` : ''}
            <button type="button" class="icone-btn" data-act="baixar" data-id="${f.id}" aria-label="Baixar ${f.arquivoNome}" title="Baixar">${icon('baixar', 18)}</button>
          </div>
        </li>`;
      })}
    </ul>` : html`<div class="tabela-caixa">${vazio(`Nenhuma fatura encontrada para "${st.q}". Busque pelo número (FR 2026/0140) ou pelo nome do cliente.`)}</div>`}`);
}

function desenhar() {
  if (!raiz) return;
  const ligado = pedirFaturaAoConcluir();
  const ch = raiz.querySelector('#fat-auto');
  if (ch) ch.checked = ligado;
  desenharPendentes();
  const q = raiz.querySelector('#fat-q');
  const foco = document.activeElement === q;
  desenharLista();
  if (foco) {
    const novo = raiz.querySelector('#fat-q');
    novo.focus();
    novo.setSelectionRange(novo.value.length, novo.value.length);
  }
}

export default {
  montar(el) {
    raiz = el;
    render(el, html`
      <header class="pag-topo">
        <div>
          <h1 class="pag-topo__titulo">Faturas</h1>
          <p class="pag-topo__sub" data-resumo></p>
        </div>
        <div class="pag-topo__acoes">
          <button type="button" class="btn a-btn a-btn--preto" data-act="nova">${icon('mais', 16)}Nova fatura</button>
        </div>
      </header>
      <div class="ajuste-faixa">
        ${chave({ id: 'fat-auto', marcado: pedirFaturaAoConcluir(), rotulo: 'Pedir a fatura ao concluir um atendimento', desc: 'Ao marcar Concluído, a Nova fatura abre já com o cliente, o atendimento e o valor. Só falta anexar a foto e enviar.' })}
      </div>
      <div data-pendentes></div>
      <section aria-label="Faturas enviadas" data-lista></section>`);
    desenhar();
    acoes(el, {
      nova: () => abrirNovaFatura(),
      faturar: (b) => {
        const a = porId('agendamentos', b.dataset.id);
        if (a) abrirNovaFatura({ clienteId: a.clienteId, agendamentoId: a.id });
      },
      ver: (b) => {
        const f = porId('faturas', b.dataset.id);
        if (!f) return;
        if (f.arquivoTipo?.startsWith('image/')) abrirFoto(f.arquivo, f.arquivoNome);
        else abrirPdf(f.arquivo);
      },
      email: (b) => abrirEmail(b.dataset.id),
      baixar: (b) => {
        const f = porId('faturas', b.dataset.id);
        if (f) baixar(f.arquivo, f.arquivoNome);
      },
    });
    el.addEventListener('change', (ev) => {
      if (ev.target.id === 'fat-auto') {
        definirPedirFatura(ev.target.checked);
        toast(ev.target.checked ? 'Pronto. Ao concluir um atendimento, a fatura abre sozinha.' : 'A fatura não abre mais ao concluir. Envie pela agenda ou por aqui.');
      }
    });
    const buscar = debounce(() => desenhar(), 140);
    el.addEventListener('input', (ev) => {
      if (ev.target.id !== 'fat-q') return;
      st.q = ev.target.value;
      buscar();
    });
  },
  atualizar() {
    desenhar();
  },
  desmontar() {
    raiz = null;
  },
};
