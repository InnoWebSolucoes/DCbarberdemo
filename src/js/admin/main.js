// Painel da DC Barbershop: estrutura, rotas, busca global e atualização ao vivo.
import { db } from '../data/store.js';
import { garantirDados } from '../data/seed.js';
import { rodarFila } from './fila.js';
import { verificarImagem } from './imagens.js';
import { html, render, qs, debounce, normalizar } from './dom.js';
import { icon } from './icons.js';
import { col, invalidar, agendamentosDoDia, hojeISO } from './dados.js';
import { toast, atualizarCamadas, avatar, temCamada } from './ui.js';
import { hhmm, dataCurta, isoDia } from '../lib/format.js';
import { abrirAgendamento } from './paineis/agendamento.js';
import { abrirCliente } from './paineis/cliente.js';
import { abrirNovoAgendamento, idsCriadosAqui } from './paineis/novo-agendamento.js';

import visao from './telas/visao.js';
import agenda from './telas/agenda.js';
import agendamentos from './telas/agendamentos.js';
import clientes from './telas/clientes.js';
import faturas from './telas/faturas.js';
import marketing from './telas/marketing.js';
import emails from './telas/emails.js';
import config from './telas/config.js';

const ROTAS = {
  'visao-geral': { nome: 'Visão geral', tela: visao, grupo: 1 },
  agenda: { nome: 'Agenda', tela: agenda, grupo: 1 },
  agendamentos: { nome: 'Agendamentos', tela: agendamentos, grupo: 1 },
  clientes: { nome: 'Clientes', tela: clientes, grupo: 1 },
  faturas: { nome: 'Faturas', tela: faturas, grupo: 2 },
  marketing: { nome: 'E-mail marketing', tela: marketing, grupo: 2 },
  emails: { nome: 'E-mails enviados', tela: emails, grupo: 2 },
  configuracoes: { nome: 'Configurações', tela: config, grupo: 3 },
};

const el = {
  app: qs('#app'),
  nav: qs('#nav'),
  rodape: qs('#lateral-rodape'),
  topo: qs('#topo'),
  conteudo: qs('#conteudo'),
  veu: qs('#veu'),
};

let atual = { id: null, tela: null, params: [] };

// ---------- Rotas ----------

function lerHash() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const id = ROTAS[partes[0]] ? partes[0] : 'visao-geral';
  return { id, params: partes.slice(1) };
}

function navegar() {
  const { id, params } = lerHash();
  const mesma = atual.id === id;
  if (mesma && atual.tela.mudarParams) {
    atual.params = params;
    atual.tela.mudarParams(params);
  } else {
    atual.tela?.desmontar?.();
    atual = { id, tela: ROTAS[id].tela, params };
    // Cada tela ganha um contêiner próprio: os ouvintes de eventos somem junto com ele.
    const caixa = document.createElement('div');
    caixa.className = `tela tela--${id}`;
    el.conteudo.replaceChildren(caixa);
    window.scrollTo(0, 0);
    atual.tela.montar(caixa, params);
    if (!mesma) el.conteudo.focus({ preventScroll: true });
  }
  document.title = `${ROTAS[id].nome}, painel DC Barbershop`;
  desenharNav();
  fecharMenu();
}

// ---------- Lateral ----------

function desenharNav() {
  const hoje = agendamentosDoDia(hojeISO()).filter((a) => a.status !== 'cancelado').length;
  const grupos = [1, 2, 3].map((g) => Object.entries(ROTAS).filter(([, r]) => r.grupo === g));
  render(el.nav, grupos.map((itens) => html`
    <div class="adm-nav__grupo">
      ${itens.map(([id, r]) => html`
        <a href="#/${id}" ${atual.id === id ? html`aria-current="page"` : ''}>
          <span>${r.nome}</span>
          ${id === 'agenda' && hoje ? html`<span class="adm-nav__conta" title="Agendamentos hoje">${hoje}</span>` : ''}
        </a>`)}
    </div>`));
  desenharRodape();
}

function desenharRodape() {
  const quando = db.getMeta('filaProcessadaEm');
  render(el.rodape, html`
    <strong>DC Barbershop</strong>
    Rua de Faria Guimarães, 214<br>Porto
    <div><a class="adm-lateral__site" href="/" target="_blank" rel="noopener">Abrir o site ${icon('externo', 14)}</a></div>
    <p class="adm-fila">${quando ? `Lembretes verificados às ${hhmm(new Date(quando))}` : 'Lembretes ainda não verificados'}</p>`);
}

function abrirMenu() {
  el.app.classList.add('menu-aberto');
  el.veu.hidden = false;
  qs('.adm-nav a', el.nav)?.focus();
}
function fecharMenu() {
  if (!el.app.classList.contains('menu-aberto')) return;
  el.app.classList.remove('menu-aberto');
  el.veu.hidden = true;
}

// ---------- Barra superior e busca global ----------

function desenharTopo() {
  const data = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  el.topo.innerHTML = html`
    <button class="icone-btn adm-topo__menu" type="button" data-act="menu" aria-label="Abrir menu" aria-controls="lateral">${icon('menu', 22)}</button>
    <a class="adm-topo__marca" href="#/visao-geral" aria-label="DC Barbershop"></a>
    <div class="busca-global" role="search">
      <label class="sr-only" for="busca-global">Buscar cliente ou código</label>
      <span class="busca-global__ico">${icon('busca', 17)}</span>
      <input id="busca-global" class="busca-global__campo" type="search" autocomplete="off" spellcheck="false"
        placeholder="${matchMedia('(max-width: 720px)').matches ? 'Buscar' : 'Buscar cliente ou código (DC4123)'}" role="combobox" aria-expanded="false" aria-controls="busca-lista" aria-autocomplete="list" data-esc-local>
      <span class="busca-global__atalho" aria-hidden="true">/</span>
      <div class="busca-global__lista" id="busca-lista" role="listbox" hidden></div>
    </div>
    <span class="adm-topo__data">${data}</span>
    <button class="btn a-btn a-btn--preto adm-topo__novo" type="button" data-act="novo">${icon('mais', 17)}<span>Novo agendamento</span></button>
  `.toString();

  el.topo.querySelector('[data-act="menu"]').addEventListener('click', abrirMenu);
  el.topo.querySelector('[data-act="novo"]').addEventListener('click', () => abrirNovoAgendamento());
  ligarBusca(qs('#busca-global'), qs('#busca-lista'));
}

function ligarBusca(campo, lista) {
  let itens = [];
  let sel = -1;

  const fechar = () => {
    lista.hidden = true;
    campo.setAttribute('aria-expanded', 'false');
    campo.removeAttribute('aria-activedescendant');
    sel = -1;
  };

  const escolher = (i) => {
    const it = itens[i];
    if (!it) return;
    fechar();
    campo.value = '';
    campo.blur();
    if (it.tipo === 'cliente') abrirCliente(it.id);
    else abrirAgendamento(it.id);
  };

  const marcar = (i) => {
    sel = i;
    lista.querySelectorAll('[role="option"]').forEach((o, k) => o.setAttribute('aria-selected', k === i ? 'true' : 'false'));
    const ativo = lista.querySelector(`[data-i="${i}"]`);
    if (ativo) {
      campo.setAttribute('aria-activedescendant', ativo.id);
      ativo.scrollIntoView({ block: 'nearest' });
    }
  };

  const buscar = () => {
    const q = normalizar(campo.value);
    if (q.length < 2) return fechar();
    const qDig = q.replace(/\D/g, '');
    const cli = col('clientes')
      .filter((c) => normalizar(c.nome).includes(q) || c.email.includes(q) || (qDig.length >= 3 && c.telefone.replace(/\D/g, '').includes(qDig)))
      .sort((a, b) => normalizar(a.nome).indexOf(q) - normalizar(b.nome).indexOf(q) || a.nome.localeCompare(b.nome))
      .slice(0, 6);
    const agora = Date.now();
    const ags = col('agendamentos')
      .filter((a) => a.codigo.toLowerCase().includes(q) || (q.length >= 3 && normalizar(a.clienteNome).includes(q) && new Date(a.inicio).getTime() > agora - 86400000 * 3))
      .sort((a, b) => (a.codigo.toLowerCase() === q ? -2 : a.codigo.toLowerCase().startsWith(q) ? -1 : 0) - (b.codigo.toLowerCase() === q ? -2 : b.codigo.toLowerCase().startsWith(q) ? -1 : 0)
        || Math.abs(new Date(a.inicio).getTime() - agora) - Math.abs(new Date(b.inicio).getTime() - agora))
      .slice(0, 5);
    itens = [...cli.map((c) => ({ tipo: 'cliente', id: c.id, c })), ...ags.map((a) => ({ tipo: 'ag', id: a.id, a }))];
    let i = -1;
    const opcao = (it) => {
      i++;
      if (it.tipo === 'cliente') {
        return html`<button type="button" class="busca-global__item" role="option" id="busca-op-${i}" data-i="${i}" aria-selected="false" tabindex="-1">
          ${avatar(it.c.nome)}<span><strong>${it.c.nome}</strong><small>${it.c.email}</small></span></button>`;
      }
      const a = it.a;
      const d = new Date(a.inicio);
      return html`<button type="button" class="busca-global__item" role="option" id="busca-op-${i}" data-i="${i}" aria-selected="false" tabindex="-1">
        <span class="busca-global__codigo">${a.codigo}</span><span><strong>${a.clienteNome}</strong><small>${isoDia(d) === hojeISO() ? 'Hoje' : dataCurta(d)} às ${hhmm(d)}, ${a.profissionalNome}</small></span></button>`;
    };
    render(lista, itens.length ? html`
      ${cli.length ? html`<div class="busca-global__grupo" role="presentation">Clientes</div>${itens.filter((x) => x.tipo === 'cliente').map(opcao)}` : ''}
      ${ags.length ? html`<div class="busca-global__grupo" role="presentation">Agendamentos</div>${itens.filter((x) => x.tipo === 'ag').map(opcao)}` : ''}`
      : html`<p class="busca-global__nada">Nada encontrado para "${campo.value.trim()}". Tente o nome, o e-mail ou o código do agendamento.</p>`);
    lista.hidden = false;
    campo.setAttribute('aria-expanded', 'true');
    if (itens.length) marcar(0);
  };

  campo.addEventListener('input', debounce(buscar, 90));
  campo.addEventListener('focus', () => campo.value.trim().length >= 2 && buscar());
  campo.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown' && itens.length) { ev.preventDefault(); marcar((sel + 1) % itens.length); }
    else if (ev.key === 'ArrowUp' && itens.length) { ev.preventDefault(); marcar((sel - 1 + itens.length) % itens.length); }
    else if (ev.key === 'Enter' && sel >= 0) { ev.preventDefault(); escolher(sel); }
    else if (ev.key === 'Escape') { if (!lista.hidden) { ev.stopPropagation(); fechar(); } else campo.blur(); }
  });
  lista.addEventListener('mousedown', (ev) => ev.preventDefault());
  lista.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-i]');
    if (b) escolher(Number(b.dataset.i));
  });
  campo.addEventListener('blur', () => setTimeout(fechar, 120));

  document.addEventListener('keydown', (ev) => {
    if (ev.key !== '/' || temCamada()) return;
    const t = ev.target;
    if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
    ev.preventDefault();
    campo.focus();
  });
}

// ---------- Atualização ao vivo ----------

let conhecidos = new Set();
const colsMudadas = new Set();

function avisarNovos() {
  const lista = col('agendamentos');
  const novos = lista.filter((a) => !conhecidos.has(a.id));
  conhecidos = new Set(lista.map((a) => a.id));
  if (!novos.length || novos.length > 3) return;
  for (const a of novos) {
    if (idsCriadosAqui.has(a.id)) continue;
    const d = new Date(a.inicio);
    const quando = isoDia(d) === hojeISO() ? hhmm(d) : `${dataCurta(d)} às ${hhmm(d)}`;
    toast(`Novo agendamento: ${a.clienteNome}, ${quando} com ${a.profissionalNome}`, {
      tipo: 'info', acao: 'Ver', aoAgir: () => abrirAgendamento(a.id), duracao: 9000,
    });
  }
}

const atualizarTudo = debounce(() => {
  const cols = new Set(colsMudadas);
  colsMudadas.clear();
  if (cols.has('agendamentos') || cols.has('*')) avisarNovos();
  try {
    atual.tela?.atualizar?.(cols);
  } catch (e) {
    console.error(e);
  }
  atualizarCamadas();
  desenharNav();
}, 120);

db.onChange((c) => {
  invalidar(c);
  colsMudadas.add(c && c.startsWith('meta') ? 'meta' : c);
  atualizarTudo();
});

// ---------- Fila de automações ----------

const quandoOcioso = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 200));

// ---------- Início ----------

async function iniciar() {
  el.nav.addEventListener('click', (ev) => {
    if (ev.target.closest('a')) fecharMenu();
  });
  el.veu.addEventListener('click', fecharMenu);
  qs('[data-act="menu-fechar"]').innerHTML = icon('fechar', 20).toString();
  qs('[data-act="menu-fechar"]').addEventListener('click', fecharMenu);
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && el.app.classList.contains('menu-aberto')) fecharMenu();
  });

  desenharTopo();
  try {
    await garantirDados();
  } catch (e) {
    console.error(e);
    toast('Não foi possível preparar os dados de demonstração. ' + (e.message || ''), { tipo: 'erro' });
  }
  invalidar('*');
  conhecidos = new Set(col('agendamentos').map((a) => a.id));
  col('campanhas').forEach((c) => verificarImagem(c.imagem));
  window.addEventListener('hashchange', navegar);
  if (!location.hash) history.replaceState(null, '', '#/visao-geral');
  navegar();
  quandoOcioso(() => rodarFila());
  setInterval(() => quandoOcioso(() => rodarFila()), 60000);
}

iniciar();
