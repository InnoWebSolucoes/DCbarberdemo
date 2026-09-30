// Passo 1: escolha dos serviços.
import { categorias, servicosDaCategoria, servicoPorId } from '../data/catalog.js';
import { precoServico, duracao as fmtDuracao } from '../lib/format.js';
import { estado, combinam, marcarMexeu } from './estado.js';
import { el, esc, icone, $, $$ } from './ui.js';
import { animarLista } from './movimento.js';

const AVISO_MISTURA = 'Esses serviços são feitos por profissionais diferentes. Agende um de cada vez.';

function linha(s) {
  const marcado = estado.servicos.includes(s.id);
  const destaque = s.id === 'corte';
  return `
    <label class="ag-serv${marcado ? ' is-marcado' : ''}${destaque ? ' ag-serv--destaque' : ''}" data-id="${s.id}">
      <input type="checkbox" class="ag-serv__input" value="${s.id}"${marcado ? ' checked' : ''} aria-describedby="ag-sd-${s.id}">
      <span class="ag-serv__caixa" aria-hidden="true">${icone.check}</span>
      <span class="ag-serv__corpo">
        <span class="ag-serv__nome">${esc(s.nome)}${destaque ? '<span class="ag-tag">O mais pedido</span>' : ''}</span>
        <span class="ag-serv__desc" id="ag-sd-${s.id}">${esc(s.desc)}</span>
      </span>
      <span class="ag-serv__meta">
        <span class="ag-serv__preco">${esc(precoServico(s))}</span>
        <span class="ag-serv__dur">${fmtDuracao(s.duracao)}</span>
      </span>
    </label>`;
}

function contagemCategoria(cat) {
  return estado.servicos.filter((id) => servicoPorId(id)?.cat === cat).length;
}

export function montar(ctx) {
  const abas = categorias.map((c) => {
    const ativa = c.id === estado.categoria;
    const n = contagemCategoria(c.id);
    return `<button type="button" role="tab" class="ag-aba" id="ag-aba-${c.id}" data-cat="${c.id}" aria-selected="${ativa}" aria-controls="ag-lista-servicos" tabindex="${ativa ? 0 : -1}">
      ${esc(c.nome)}<span class="ag-aba__n"${n ? '' : ' hidden'}>${n}</span></button>`;
  }).join('');

  const raiz = el(`
    <div class="ag-passo ag-servicos">
      <div class="ag-abas-wrap">
        <div class="ag-abas" role="tablist" aria-label="Categorias de serviço">${abas}</div>
      </div>
      <div class="ag-lista" id="ag-lista-servicos" role="tabpanel" aria-labelledby="ag-aba-${estado.categoria}"></div>
    </div>`);

  const lista = $('.ag-lista', raiz);
  const aviso = el(`<div class="ag-aviso" role="alert"><p>${AVISO_MISTURA}</p><button type="button" class="ag-aviso__acao">Trocar a seleção por este</button></div>`);
  let pendente = null;

  function pintarLista(animar) {
    lista.innerHTML = servicosDaCategoria(estado.categoria).map(linha).join('');
    lista.setAttribute('aria-labelledby', `ag-aba-${estado.categoria}`);
    if (animar) animarLista($$('.ag-serv', lista));
  }

  function esconderAviso() {
    aviso.remove();
    pendente = null;
  }

  function sincronizar() {
    $$('.ag-serv', lista).forEach((l) => {
      const on = estado.servicos.includes(l.dataset.id);
      l.classList.toggle('is-marcado', on);
      $('input', l).checked = on;
    });
    $$('.ag-aba', raiz).forEach((b) => {
      const n = contagemCategoria(b.dataset.cat);
      const badge = $('.ag-aba__n', b);
      badge.textContent = n;
      badge.hidden = !n;
    });
  }

  function trocarCategoria(cat, focar) {
    if (cat === estado.categoria) return;
    estado.categoria = cat;
    $$('.ag-aba', raiz).forEach((b) => {
      const on = b.dataset.cat === cat;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
      if (on) {
        if (focar) b.focus();
        b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    });
    esconderAviso();
    pintarLista(true);
  }

  $('.ag-abas', raiz).addEventListener('click', (e) => {
    const b = e.target.closest('.ag-aba');
    if (b) trocarCategoria(b.dataset.cat, false);
  });
  $('.ag-abas', raiz).addEventListener('keydown', (e) => {
    const abasEl = $$('.ag-aba', raiz);
    const i = abasEl.findIndex((b) => b.dataset.cat === estado.categoria);
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % abasEl.length;
    if (e.key === 'ArrowLeft') j = (i - 1 + abasEl.length) % abasEl.length;
    if (e.key === 'Home') j = 0;
    if (e.key === 'End') j = abasEl.length - 1;
    if (j != null) {
      e.preventDefault();
      trocarCategoria(abasEl[j].dataset.cat, true);
    }
  });

  lista.addEventListener('change', (e) => {
    const input = e.target.closest('.ag-serv__input');
    if (!input) return;
    const id = input.value;
    const label = input.closest('.ag-serv');
    if (input.checked) {
      const proximos = [...estado.servicos, id];
      if (!combinam(proximos)) {
        input.checked = false;
        pendente = id;
        label.after(aviso);
        return;
      }
      estado.servicos = proximos;
    } else {
      estado.servicos = estado.servicos.filter((x) => x !== id);
    }
    esconderAviso();
    marcarMexeu();
    label.classList.toggle('is-marcado', input.checked);
    ctx.servicosMudaram();
    sincronizar();
  });

  aviso.addEventListener('click', (e) => {
    if (!e.target.closest('.ag-aviso__acao') || !pendente) return;
    estado.servicos = [pendente];
    marcarMexeu();
    const alvo = pendente;
    esconderAviso();
    ctx.servicosMudaram();
    sincronizar();
    $(`.ag-serv[data-id="${alvo}"] input`, lista)?.focus();
  });

  pintarLista(false);

  return {
    el: raiz,
    titulo: 'Escolha os serviços',
    sub: 'Pode marcar mais de um.',
    sincronizar,
    rodape: () => ({
      rotulo: 'Continuar',
      habilitado: estado.servicos.length > 0,
      dica: estado.servicos.length ? '' : 'Escolha pelo menos um serviço para continuar.',
      aoClicar: () => ctx.avancar(),
    }),
  };
}
