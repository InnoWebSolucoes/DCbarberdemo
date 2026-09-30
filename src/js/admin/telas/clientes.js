// Clientes: tabela com visitas, última visita, total gasto e opção de marketing.
import { html, render, acoes, debounce, normalizar } from '../dom.js';
import { icon } from '../icons.js';
import { col, statsDe, ORIGEM_CLI, haDias } from '../dados.js';
import { vazio, paginacao, thOrdem, ordenar, alternarOrdem, toast } from '../ui.js';
import { csv, baixar, numeroCsv } from '../arquivos.js';
import { abrirCliente } from '../paineis/cliente.js';
import { moeda, dataCurta, isoDia } from '../../lib/format.js';

const POR_PAGINA = 25;
const st = { q: '', filtro: 'todos', ordem: { campo: 'ultima', dir: 'desc' }, pagina: 1 };
let raiz = null;

const DIA = 86400000;
const FILTROS = [
  { id: 'todos', nome: 'Todos', f: () => true },
  { id: 'inscritos', nome: 'Inscritos no marketing', f: (c) => c.marketing },
  { id: 'sumidos', nome: 'Sem vir há 30 dias', f: (c) => { const s = statsDe(c.id); return s.ultima && !s.proximo && Date.now() - new Date(s.ultima.inicio).getTime() >= 30 * DIA; } },
  { id: 'novos', nome: 'Novos', f: (c) => Date.now() - new Date(c.criadoEm).getTime() <= 30 * DIA },
];

function filtrados() {
  const q = normalizar(st.q);
  const dig = q.replace(/\D/g, '');
  const f = FILTROS.find((x) => x.id === st.filtro)?.f || (() => true);
  const lista = col('clientes').filter((c) => f(c) && (!q || normalizar(c.nome).includes(q) || c.email.includes(q) || (dig.length >= 3 && c.telefone.replace(/\D/g, '').includes(dig))));
  return ordenar(lista, st.ordem, {
    nome: (c) => c.nome,
    email: (c) => c.email,
    visitas: (c) => statsDe(c.id).visitas,
    ultima: (c) => statsDe(c.id).ultima?.inicio || null,
    total: (c) => statsDe(c.id).total,
    marketing: (c) => (c.marketing ? 1 : 0),
  });
}

function desenharPilulas() {
  const todos = col('clientes');
  render(raiz.querySelector('[data-pilulas]'), FILTROS.map((x) => html`
    <button type="button" class="pilula" data-act="filtro" data-id="${x.id}" aria-pressed="${st.filtro === x.id}">${x.nome}<span class="pilula__n">${todos.filter(x.f).length}</span></button>`));
}

function desenharTabela() {
  const alvo = raiz?.querySelector('[data-tabela]');
  if (!alvo) return;
  const lista = filtrados();
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  st.pagina = Math.min(st.pagina, paginas);
  const pagina = lista.slice((st.pagina - 1) * POR_PAGINA, st.pagina * POR_PAGINA);
  const o = st.ordem;
  render(alvo, lista.length ? html`
    <div class="tabela-caixa">
      <div class="tabela-rolo">
        <table class="tabela tabela--cli">
          <thead><tr>
            ${thOrdem('Nome', 'nome', o)}
            ${thOrdem('E-mail', 'email', o)}
            <th>Telefone</th>
            ${thOrdem('Visitas', 'visitas', o, 'dir')}
            ${thOrdem('Última visita', 'ultima', o)}
            ${thOrdem('Total gasto', 'total', o, 'dir')}
            ${thOrdem('Marketing', 'marketing', o)}
          </tr></thead>
          <tbody>
            ${pagina.map((c) => {
              const s = statsDe(c.id);
              return html`<tr class="clicavel" data-act="abrir" data-id="${c.id}">
                <td class="td-nome"><button type="button" class="linha-botao" data-act="abrir" data-id="${c.id}">${c.nome}</button>
                  ${s.proximo ? html`<span class="tabela__sub">Volta ${dataCurta(s.proximo.inicio)}</span>` : ''}</td>
                <td class="td-email"><span class="corta">${c.email}</span></td>
                <td class="num fraco td-tel">${c.telefone || 'Sem telefone'}</td>
                <td class="dir num td-visitas">${s.visitas}</td>
                <td class="num td-ultima">${s.ultima ? html`${dataCurta(s.ultima.inicio)}<span class="tabela__sub">${haDias(s.ultima.inicio)}</span>` : html`<span class="fraco">Nenhuma</span>`}</td>
                <td class="dir num forte td-gasto">${moeda(s.total)}</td>
                <td class="td-mkt">${c.marketing ? html`<span class="sim"><i aria-hidden="true"></i>Inscrito</span>` : html`<span class="nao">Não</span>`}</td>
              </tr>`;
            })}
          </tbody>
        </table>
      </div>
      ${paginacao({ pagina: st.pagina, porPagina: POR_PAGINA, total: lista.length })}
    </div>`
    : html`<div class="tabela-caixa">${vazio(st.q ? `Nenhum cliente encontrado para "${st.q}". Busque pelo nome, e-mail ou telefone.` : 'Nenhum cliente neste filtro. Escolha Todos para ver a lista completa.',
      html`<button type="button" class="btn a-btn a-btn--linha a-btn--sm" data-act="limpar">Ver todos os clientes</button>`)}</div>`);
}

function exportar() {
  const lista = filtrados();
  const conteudo = csv(lista, [
    { rotulo: 'Nome', valor: (c) => c.nome },
    { rotulo: 'E-mail', valor: (c) => c.email },
    { rotulo: 'Telefone', valor: (c) => c.telefone },
    { rotulo: 'Visitas', valor: (c) => statsDe(c.id).visitas },
    { rotulo: 'Última visita', valor: (c) => (statsDe(c.id).ultima ? new Date(statsDe(c.id).ultima.inicio).toLocaleDateString('pt-BR') : '') },
    { rotulo: 'Total gasto (€)', valor: (c) => numeroCsv(statsDe(c.id).total) },
    { rotulo: 'Marketing', valor: (c) => (c.marketing ? 'Sim' : 'Não') },
    { rotulo: 'Lembrete (dias)', valor: (c) => c.lembreteDias || '' },
    { rotulo: 'Origem', valor: (c) => ORIGEM_CLI[c.origem] || c.origem || '' },
    { rotulo: 'Cliente desde', valor: (c) => new Date(c.criadoEm).toLocaleDateString('pt-BR') },
  ]);
  baixar(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }), `clientes-dc-${isoDia(new Date())}.csv`);
  toast(`${lista.length} clientes exportados em CSV.`);
}

export default {
  montar(el) {
    raiz = el;
    const total = col('clientes').length;
    render(el, html`
      <header class="pag-topo">
        <div>
          <h1 class="pag-topo__titulo">Clientes</h1>
          <p class="pag-topo__sub">${total} clientes. Clique num nome para ver o histórico, as faturas e os e-mails.</p>
        </div>
        <div class="pag-topo__acoes">
          <button type="button" class="btn a-btn a-btn--linha" data-act="csv">${icon('baixar', 16)}Exportar CSV</button>
        </div>
      </header>
      <div class="filtros">
        <div class="entrada-ico">${icon('busca', 17)}
          <label class="sr-only" for="cli-q">Buscar cliente</label>
          <input class="entrada entrada--sm" id="cli-q" type="search" placeholder="Nome, e-mail ou telefone" value="${st.q}" autocomplete="off">
        </div>
        <div class="pilulas" data-pilulas role="group" aria-label="Filtrar clientes"></div>
      </div>
      <div data-tabela></div>`);
    desenharPilulas();
    desenharTabela();
    acoes(el, {
      abrir: (b) => abrirCliente(b.dataset.id),
      filtro: (b) => {
        st.filtro = b.dataset.id;
        st.pagina = 1;
        desenharPilulas();
        desenharTabela();
      },
      ordem: (b) => {
        st.ordem = alternarOrdem(st.ordem, b.dataset.id, !['nome', 'email'].includes(b.dataset.id));
        desenharTabela();
      },
      pagina: (b) => {
        st.pagina = Number(b.dataset.id);
        desenharTabela();
        raiz.querySelector('.tabela-caixa')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      },
      limpar: () => {
        st.q = '';
        st.filtro = 'todos';
        raiz.querySelector('#cli-q').value = '';
        desenharPilulas();
        desenharTabela();
      },
      csv: exportar,
    });
    const buscar = debounce(() => {
      st.pagina = 1;
      desenharTabela();
    }, 140);
    el.addEventListener('input', (ev) => {
      if (ev.target.id !== 'cli-q') return;
      st.q = ev.target.value;
      buscar();
    });
  },
  atualizar() {
    if (!raiz) return;
    desenharPilulas();
    desenharTabela();
  },
  desmontar() {
    raiz = null;
  },
};
