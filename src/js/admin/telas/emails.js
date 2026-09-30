// E-mails enviados: a caixa de saída, com filtro por tipo, busca e pré-visualização.
import { html, render, acoes, debounce, normalizar } from '../dom.js';
import { icon } from '../icons.js';
import { emailsRecentes, porId, tipoEmail, dataEnvio, TIPO_EMAIL, hojeISO } from '../dados.js';
import { vazio } from '../ui.js';
import { cabecalhoEmail, listaAnexos, srcdoc, acaoAnexo, abrirEmail } from '../paineis/email.js';
import { hhmm, isoDia, dataCurta } from '../../lib/format.js';

const PASSO = 60;
const st = { tipo: '', q: '', sel: null, limite: PASSO };
let raiz = null;

const estreito = () => matchMedia('(max-width: 900px)').matches;

function filtrados() {
  const q = normalizar(st.q);
  return emailsRecentes().filter((e) => (!st.tipo || e.tipo === st.tipo)
    && (!q || normalizar(e.nomePara || '').includes(q) || e.para.includes(q) || normalizar(e.assunto).includes(q)));
}

const quando = (e) => {
  const d = new Date(dataEnvio(e));
  return isoDia(d) === hojeISO() ? hhmm(d) : dataCurta(d);
};

function desenharFiltros() {
  const todos = emailsRecentes();
  const cont = todos.reduce((m, e) => ((m[e.tipo] = (m[e.tipo] || 0) + 1), m), {});
  const tipos = Object.keys(TIPO_EMAIL).filter((t) => cont[t]);
  render(raiz.querySelector('[data-tipos]'), html`
    <button type="button" class="pilula" data-act="tipo" data-id="" aria-pressed="${!st.tipo}">Todos<span class="pilula__n">${todos.length}</span></button>
    ${tipos.map((t) => html`<button type="button" class="pilula" data-act="tipo" data-id="${t}" aria-pressed="${st.tipo === t}">${TIPO_EMAIL[t]}<span class="pilula__n">${cont[t]}</span></button>`)}`);
  const hoje = todos.filter((e) => isoDia(dataEnvio(e)) === hojeISO()).length;
  render(raiz.querySelector('[data-resumo]'), `${todos.length} e-mails enviados, ${hoje} hoje. Confirmações, faturas e lembretes saem sozinhos.`);
}

function desenharLista() {
  const lista = filtrados();
  if (!estreito() && (!st.sel || !lista.some((e) => e.id === st.sel))) st.sel = lista[0]?.id || null;
  const visiveis = lista.slice(0, st.limite);
  render(raiz.querySelector('[data-lista]'), lista.length ? html`
    <ul class="caixa__itens" role="listbox" aria-label="E-mails enviados">
      ${visiveis.map((e) => html`<li role="option" aria-selected="${e.id === st.sel}">
        <button type="button" class="caixa__item ${e.id === st.sel ? 'is-sel' : ''}" data-act="ver" data-id="${e.id}">
          <span class="caixa__linha1">
            <strong class="caixa__para">${e.nomePara || e.para}</strong>
            <span class="caixa__quando tnum">${quando(e)}</span>
          </span>
          <span class="caixa__assunto">${e.assunto}</span>
          <span class="caixa__linha3">
            <span class="etq etq--${e.tipo}">${tipoEmail(e)}</span>
            ${e.anexos?.length ? html`<span class="caixa__clipe" title="Com anexo">${icon('clipe', 14)}<span class="sr-only">Com anexo</span></span>` : ''}
            <span class="caixa__aberto ${e.aberto ? 'is-aberto' : ''}">${e.aberto ? 'Aberto' : 'Não aberto'}</span>
          </span>
        </button>
      </li>`)}
    </ul>
    ${lista.length > visiveis.length ? html`<div class="caixa__mais"><button type="button" class="btn a-btn a-btn--linha a-btn--sm" data-act="mais">Mostrar mais ${Math.min(PASSO, lista.length - visiveis.length)} de ${lista.length - visiveis.length}</button></div>` : ''}`
    : vazio(st.q ? `Nenhum e-mail encontrado para "${st.q}". Busque pelo nome, e-mail ou assunto.` : 'Nenhum e-mail deste tipo ainda. Eles aparecem aqui assim que saem.'));
}

function desenharPrevia() {
  const alvo = raiz.querySelector('[data-previa]');
  if (!alvo || estreito()) return;
  const e = porId('emails', st.sel);
  if (!e) {
    render(alvo, vazio('Escolha um e-mail na lista para ver como ele chegou ao cliente.'));
    return;
  }
  if (alvo.dataset.id === e.id && alvo.dataset.aberto === String(!!e.aberto)) return;
  alvo.dataset.id = e.id;
  alvo.dataset.aberto = String(!!e.aberto);
  render(alvo, html`
    ${cabecalhoEmail(e)}
    ${listaAnexos(e)}
    <div class="caixa__quadro"><iframe class="email-quadro" title="Conteúdo do e-mail: ${e.assunto}" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe></div>`);
  alvo.querySelector('iframe').srcdoc = srcdoc(e.html);
}

function desenhar() {
  if (!raiz) return;
  desenharFiltros();
  desenharLista();
  desenharPrevia();
}

export default {
  montar(el) {
    raiz = el;
    render(el, html`
      <header class="pag-topo">
        <div>
          <h1 class="pag-topo__titulo">E-mails enviados</h1>
          <p class="pag-topo__sub" data-resumo></p>
        </div>
      </header>
      <p class="nota caixa__nota">${icon('email', 16)}<span>Nesta demonstração o envio é simulado: cada e-mail fica registrado aqui exatamente como o cliente o recebe. Quando o provedor de e-mail for ligado, as mesmas mensagens saem de verdade.</span></p>
      <div class="filtros caixa__filtros">
        <div class="entrada-ico">${icon('busca', 17)}
          <label class="sr-only" for="em-q">Buscar e-mail</label>
          <input class="entrada entrada--sm" id="em-q" type="search" placeholder="Destinatário ou assunto" value="${st.q}" autocomplete="off">
        </div>
        <div class="pilulas" role="group" aria-label="Filtrar por tipo" data-tipos></div>
      </div>
      <div class="caixa">
        <div class="caixa__lista" data-lista></div>
        <div class="caixa__previa" data-previa aria-live="polite"></div>
      </div>`);
    desenhar();
    acoes(el, {
      tipo: (b) => {
        st.tipo = b.dataset.id;
        st.limite = PASSO;
        desenhar();
      },
      ver: (b) => {
        if (estreito()) {
          abrirEmail(b.dataset.id);
          return;
        }
        st.sel = b.dataset.id;
        raiz.querySelectorAll('.caixa__item').forEach((x) => {
          const on = x.dataset.id === st.sel;
          x.classList.toggle('is-sel', on);
          x.parentElement.setAttribute('aria-selected', String(on));
        });
        desenharPrevia();
      },
      mais: () => {
        st.limite += PASSO;
        desenharLista();
      },
    });
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-act^="anexo-"]');
      if (b) acaoAnexo(b);
    });
    el.addEventListener('keydown', (ev) => {
      if (!ev.target.closest('.caixa__item') || !['ArrowDown', 'ArrowUp'].includes(ev.key)) return;
      ev.preventDefault();
      const itens = [...raiz.querySelectorAll('.caixa__item')];
      const i = itens.indexOf(ev.target.closest('.caixa__item'));
      const prox = itens[i + (ev.key === 'ArrowDown' ? 1 : -1)];
      if (prox) {
        prox.focus();
        prox.click();
      }
    });
    const buscar = debounce(() => {
      st.limite = PASSO;
      desenharLista();
      desenharPrevia();
    }, 140);
    el.addEventListener('input', (ev) => {
      if (ev.target.id !== 'em-q') return;
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
