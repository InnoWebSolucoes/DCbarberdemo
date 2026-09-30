// Agendamentos: tabela com filtros, busca, ordenação, paginação e exportação CSV.
import { html, raw, render, acoes, debounce, normalizar } from '../dom.js';
import { icon } from '../icons.js';
import { col, STATUS, ORIGEM_AG, inicioDoDia, somarDias, hojeISO, dataCriacao } from '../dados.js';
import { statusTag, vazio, paginacao, thOrdem, ordenar, alternarOrdem, toast } from '../ui.js';
import { csv, baixar, numeroCsv } from '../arquivos.js';
import { abrirAgendamento } from '../paineis/agendamento.js';
import { equipe } from '../../data/catalog.js';
import { moeda, hhmm, isoDia, dataCurta, dataHora } from '../../lib/format.js';

const PERIODOS = [
  { id: 'hoje', nome: 'Hoje', futuro: true },
  { id: 'amanha', nome: 'Amanhã', futuro: true },
  { id: 'proximos7', nome: 'Próximos 7 dias', futuro: true },
  { id: 'ultimos7', nome: 'Últimos 7 dias' },
  { id: 'ultimos30', nome: 'Últimos 30 dias' },
  { id: 'mes', nome: 'Este mês' },
  { id: 'todos', nome: 'Todo o período' },
];
const POR_PAGINA = 25;
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const st = { periodo: 'proximos7', prof: '', status: '', origem: '', q: '', ordem: { campo: 'inicio', dir: 'asc' }, pagina: 1 };
let raiz = null;

function intervalo(p) {
  const hoje = inicioDoDia(new Date());
  switch (p) {
    case 'hoje': return [hoje, somarDias(hoje, 1)];
    case 'amanha': return [somarDias(hoje, 1), somarDias(hoje, 2)];
    case 'proximos7': return [hoje, somarDias(hoje, 7)];
    case 'ultimos7': return [somarDias(hoje, -7), somarDias(hoje, 1)];
    case 'ultimos30': return [somarDias(hoje, -30), somarDias(hoje, 1)];
    case 'mes': return [new Date(hoje.getFullYear(), hoje.getMonth(), 1), new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)];
    default: return [null, null];
  }
}

function filtrados() {
  const [ini, fim] = intervalo(st.periodo);
  const q = normalizar(st.q);
  const lista = col('agendamentos').filter((a) => {
    const t = new Date(a.inicio);
    if (ini && (t < ini || t >= fim)) return false;
    if (st.prof && a.profissionalId !== st.prof) return false;
    if (st.status && a.status !== st.status) return false;
    if (st.origem && a.origem !== st.origem) return false;
    if (q && !(normalizar(a.clienteNome).includes(q) || a.clienteEmail.includes(q) || a.codigo.toLowerCase().includes(q))) return false;
    return true;
  });
  return ordenar(lista, st.ordem, {
    inicio: (a) => a.inicio,
    cliente: (a) => a.clienteNome,
    profissional: (a) => a.profissionalNome,
    total: (a) => a.total || 0,
    status: (a) => STATUS[a.status],
    origem: (a) => ORIGEM_AG[a.origem] || a.origem,
    codigo: (a) => a.codigo,
  });
}

function desenharTabela() {
  const alvo = raiz?.querySelector('[data-tabela]');
  if (!alvo) return;
  const lista = filtrados();
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  st.pagina = Math.min(st.pagina, paginas);
  const pagina = lista.slice((st.pagina - 1) * POR_PAGINA, st.pagina * POR_PAGINA);
  const validos = lista.filter((a) => a.status !== 'cancelado' && a.status !== 'faltou');
  const soma = validos.reduce((t, a) => t + (a.total || 0), 0);
  const hoje = hojeISO();
  const o = st.ordem;

  render(raiz.querySelector('[data-resumo]'), lista.length
    ? html`<strong>${lista.length} ${lista.length === 1 ? 'agendamento' : 'agendamentos'}</strong>, ${moeda(soma)} sem contar cancelados e faltas`
    : '');

  render(alvo, lista.length ? html`
    <div class="tabela-caixa">
      <div class="tabela-rolo">
        <table class="tabela tabela--ags">
          <thead><tr>
            ${thOrdem('Quando', 'inicio', o)}
            ${thOrdem('Cliente', 'cliente', o)}
            <th>Serviços</th>
            ${thOrdem('Profissional', 'profissional', o)}
            ${thOrdem('Origem', 'origem', o)}
            ${thOrdem('Total', 'total', o, 'dir')}
            ${thOrdem('Status', 'status', o)}
            ${thOrdem('Código', 'codigo', o)}
          </tr></thead>
          <tbody>
            ${pagina.map((a) => {
              const d = new Date(a.inicio);
              const dia = isoDia(d);
              return html`<tr class="clicavel" data-act="abrir" data-id="${a.id}">
                <td class="num td-quando"><span class="forte">${dia === hoje ? 'Hoje' : dataCurta(d)}</span> <span class="fraco">${dia === hoje ? '' : SEMANA[d.getDay()]}</span><span class="tabela__sub">${hhmm(d)}</span></td>
                <td class="td-cliente"><button type="button" class="linha-botao" data-act="abrir" data-id="${a.id}">${a.clienteNome}</button><span class="tabela__sub corta">${a.clienteEmail}</span></td>
                <td class="td-serv"><span class="corta-2">${a.servicosNomes.join(' + ')}</span></td>
                <td class="td-prof">${a.profissionalNome}</td>
                <td class="td-origem fraco">${ORIGEM_AG[a.origem] || a.origem}</td>
                <td class="dir num td-total">${a.totalTexto && a.totalTexto !== moeda(a.total) ? html`<span title="${a.totalTexto}">${moeda(a.total)}</span>` : moeda(a.total)}</td>
                <td class="td-status">${statusTag(a.status)}</td>
                <td class="num fraco td-codigo">${a.codigo}</td>
              </tr>`;
            })}
          </tbody>
        </table>
      </div>
      ${paginacao({ pagina: st.pagina, porPagina: POR_PAGINA, total: lista.length })}
    </div>`
    : html`<div class="tabela-caixa">${vazio(
      st.q ? `Nenhum agendamento encontrado para "${st.q}". Confira o nome, o e-mail ou o código, ou mude o período.` : 'Nenhum agendamento com estes filtros. Mude o período ou limpe os filtros.',
      html`<button type="button" class="btn a-btn a-btn--linha a-btn--sm" data-act="limpar">Limpar filtros</button>`)}</div>`);
}

function exportar() {
  const lista = filtrados();
  if (!lista.length) {
    toast('Nada para exportar com estes filtros.', { tipo: 'erro' });
    return;
  }
  const conteudo = csv(lista, [
    { rotulo: 'Código', valor: (a) => a.codigo },
    { rotulo: 'Data', valor: (a) => new Date(a.inicio).toLocaleDateString('pt-BR') },
    { rotulo: 'Hora', valor: (a) => hhmm(new Date(a.inicio)) },
    { rotulo: 'Cliente', valor: (a) => a.clienteNome },
    { rotulo: 'E-mail', valor: (a) => a.clienteEmail },
    { rotulo: 'Telefone', valor: (a) => a.clienteTelefone || '' },
    { rotulo: 'Serviços', valor: (a) => a.servicosNomes.join(' + ') },
    { rotulo: 'Profissional', valor: (a) => a.profissionalNome },
    { rotulo: 'Duração (min)', valor: (a) => a.duracao },
    { rotulo: 'Total (€)', valor: (a) => numeroCsv(a.total) },
    { rotulo: 'Status', valor: (a) => STATUS[a.status] || a.status },
    { rotulo: 'Origem', valor: (a) => ORIGEM_AG[a.origem] || a.origem },
    { rotulo: 'Criado em', valor: (a) => dataHora(dataCriacao(a)) },
  ]);
  baixar(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }), `agendamentos-dc-${hojeISO()}.csv`);
  toast(`${lista.length} ${lista.length === 1 ? 'agendamento exportado' : 'agendamentos exportados'} em CSV.`);
}

const opcoes = (lista, atual) => lista.map(([v, n]) => html`<option value="${v}" ${v === atual ? raw('selected') : ''}>${n}</option>`);

function desenharFiltros() {
  render(raiz.querySelector('[data-filtros]'), html`
    <div class="entrada-ico">${icon('busca', 17)}
      <label class="sr-only" for="ags-q">Buscar agendamento</label>
      <input class="entrada entrada--sm" id="ags-q" type="search" placeholder="Cliente, e-mail ou código" value="${st.q}" autocomplete="off">
    </div>
    <label class="sr-only" for="ags-periodo">Período</label>
    <select class="selecao selecao--sm" id="ags-periodo" data-filtro="periodo">${opcoes(PERIODOS.map((p) => [p.id, p.nome]), st.periodo)}</select>
    <label class="sr-only" for="ags-prof">Profissional</label>
    <select class="selecao selecao--sm" id="ags-prof" data-filtro="prof">${opcoes([['', 'Toda a equipe'], ...equipe.map((p) => [p.id, p.nome])], st.prof)}</select>
    <label class="sr-only" for="ags-status">Status</label>
    <select class="selecao selecao--sm" id="ags-status" data-filtro="status">${opcoes([['', 'Todos os status'], ...Object.entries(STATUS)], st.status)}</select>
    <label class="sr-only" for="ags-origem">Origem</label>
    <select class="selecao selecao--sm" id="ags-origem" data-filtro="origem">${opcoes([['', 'Todas as origens'], ...Object.entries(ORIGEM_AG)], st.origem)}</select>
  `);
}

export default {
  montar(el) {
    raiz = el;
    render(el, html`
      <header class="pag-topo">
        <div>
          <h1 class="pag-topo__titulo">Agendamentos</h1>
          <p class="pag-topo__sub" data-resumo></p>
        </div>
        <div class="pag-topo__acoes">
          <button type="button" class="btn a-btn a-btn--linha" data-act="csv">${icon('baixar', 16)}Exportar CSV</button>
        </div>
      </header>
      <div class="filtros" data-filtros></div>
      <div data-tabela></div>`);
    desenharFiltros();
    desenharTabela();

    acoes(el, {
      abrir: (b) => abrirAgendamento(b.dataset.id),
      ordem: (b) => {
        st.ordem = alternarOrdem(st.ordem, b.dataset.id, b.dataset.id === 'inicio' || b.dataset.id === 'total');
        desenharTabela();
      },
      pagina: (b) => {
        st.pagina = Number(b.dataset.id);
        desenharTabela();
        raiz.querySelector('.tabela-caixa')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      },
      csv: exportar,
      limpar: () => {
        Object.assign(st, { prof: '', status: '', origem: '', q: '', periodo: 'todos', pagina: 1, ordem: { campo: 'inicio', dir: 'desc' } });
        desenharFiltros();
        desenharTabela();
      },
    });
    el.addEventListener('change', (ev) => {
      const f = ev.target.dataset.filtro;
      if (!f) return;
      st[f] = ev.target.value;
      st.pagina = 1;
      if (f === 'periodo') st.ordem = { campo: 'inicio', dir: PERIODOS.find((p) => p.id === st.periodo)?.futuro ? 'asc' : 'desc' };
      desenharTabela();
    });
    const buscar = debounce(() => {
      st.pagina = 1;
      desenharTabela();
    }, 140);
    el.addEventListener('input', (ev) => {
      if (ev.target.id !== 'ags-q') return;
      st.q = ev.target.value;
      buscar();
    });
  },
  atualizar() {
    desenharTabela();
  },
  desmontar() {
    raiz = null;
  },
};
