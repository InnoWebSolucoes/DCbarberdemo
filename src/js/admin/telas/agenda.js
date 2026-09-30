// Agenda do dia: uma coluna por profissional, das 09:00 às 19:00 em passos de 30 min.
import { html, raw, render, acoes } from '../dom.js';
import { icon } from '../icons.js';
import { agendamentosDoDia, hojeISO, diaDe, somarDias, STATUS } from '../dados.js';
import { vazio } from '../ui.js';
import { abrirAgendamento } from '../paineis/agendamento.js';
import { abrirNovoAgendamento } from '../paineis/novo-agendamento.js';
import { equipe, horarios } from '../../data/catalog.js';
import { moeda, hhmm, isoDia, minutos, pad, dataLonga } from '../../lib/format.js';

const INICIO = 9 * 60;
const FIM = 19 * 60;
const PASSO = 30;
const LINHAS = (FIM - INICIO) / PASSO;

let raiz = null;
let dia = hojeISO();
let relogio = null;
let teclas = null;

const linhaPx = () => (matchMedia('(max-width: 720px)').matches ? 46 : 52);
const hm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const minDoDia = (d) => d.getHours() * 60 + d.getMinutes();

// Intervalos fechados dentro da janela 09:00 às 19:00 (almoço, fim do expediente).
function faixasFechadas(turnos) {
  const faixas = [];
  let cursor = INICIO;
  turnos.forEach(([a, f], i) => {
    const ini = minutos(a);
    if (ini > cursor) faixas.push({ ini: cursor, fim: ini, nome: i === 0 ? 'Fechado' : 'Almoço' });
    cursor = Math.max(cursor, minutos(f));
  });
  if (cursor < FIM) faixas.push({ ini: cursor, fim: FIM, nome: 'Fechado' });
  return faixas;
}

// Distribui blocos sobrepostos em faixas lado a lado (como nos calendários).
function emFaixas(ags) {
  const itens = ags.map((a) => ({ a, ini: minDoDia(new Date(a.inicio)), fim: minDoDia(new Date(a.inicio)) + a.duracao })).sort((x, y) => x.ini - y.ini || y.fim - x.fim);
  const grupos = [];
  let grupo = null;
  for (const it of itens) {
    if (!grupo || it.ini >= grupo.fim) {
      grupo = { fim: it.fim, cols: [] };
      grupos.push(grupo);
    }
    grupo.fim = Math.max(grupo.fim, it.fim);
    let c = grupo.cols.findIndex((fimCol) => fimCol <= it.ini);
    if (c < 0) {
      c = grupo.cols.length;
      grupo.cols.push(it.fim);
    } else grupo.cols[c] = it.fim;
    it.col = c;
    it.grupo = grupo;
  }
  return itens.map((it) => ({ ...it, n: it.grupo.cols.length }));
}

function coluna(prof, ags, turnos, L, agoraMin, ehHoje, passado) {
  const meus = ags.filter((a) => a.profissionalId === prof.id);
  const ativos = meus.filter((a) => a.status !== 'cancelado');
  const ocupado = (m) => ativos.some((a) => {
    const i = minDoDia(new Date(a.inicio));
    return m < i + a.duracao && m + PASSO > i;
  });
  const vagos = [];
  if (!passado) {
    for (const [a, f] of turnos) {
      for (let m = minutos(a); m + PASSO <= minutos(f); m += PASSO) {
        if (ehHoje && m < agoraMin + 30) continue;
        if (ocupado(m)) continue;
        vagos.push(m);
      }
    }
  }
  const top = (m) => ((m - INICIO) / PASSO) * L;
  return html`
    <div class="agenda__col" data-prof="${prof.id}" role="group" aria-label="${prof.nome}">
      ${faixasFechadas(turnos).map((fx) => html`<div class="agenda__fechado" style="top:${top(fx.ini)}px;height:${((fx.fim - fx.ini) / PASSO) * L}px"><span>${fx.nome}</span></div>`)}
      ${vagos.map((m) => html`<button type="button" class="agenda__vago" style="top:${top(m)}px;height:${L}px" data-act="vago" data-prof="${prof.id}" data-hora="${hm(m)}" aria-label="Novo agendamento com ${prof.nome} às ${hm(m)}"><span>${icon('mais', 14)}${hm(m)}</span></button>`)}
      ${emFaixas(meus).map((it) => {
        const a = it.a;
        const h = Math.max(22, ((it.fim - it.ini) / PASSO) * L - 4);
        const curto = a.duracao <= 30;
        const largura = 100 / it.n;
        return html`<button type="button" class="bloco bloco--${a.status} ${curto ? 'bloco--curto' : ''}" data-act="abrir" data-id="${a.id}"
          style="top:${top(it.ini) + 2}px;height:${h}px;left:calc(${it.col * largura}% + 5px);width:calc(${largura}% - 10px)"
          aria-label="${hm(it.ini)}, ${a.clienteNome}, ${a.servicosNomes.join(' + ')}, ${STATUS[a.status]}">
          <span class="bloco__linha"><span class="bloco__hora tnum">${hm(it.ini)}</span><strong class="bloco__nome">${a.clienteNome}</strong></span>
          <span class="bloco__serv">${a.servicosNomes.join(' + ')}</span>
          ${!curto ? html`<span class="bloco__meta tnum">${moeda(a.total)}${a.status !== 'confirmado' ? `, ${STATUS[a.status].toLowerCase()}` : ''}</span>` : ''}
        </button>`;
      })}
    </div>`;
}

function desenhar({ manterRolagem = true } = {}) {
  if (!raiz) return;
  const data = diaDe(dia);
  const hoje = hojeISO();
  const ehHoje = dia === hoje;
  const passado = dia < hoje;
  const turnos = horarios[data.getDay()] || [];
  const ags = agendamentosDoDia(dia);
  const validos = ags.filter((a) => a.status !== 'cancelado');
  const cancelados = ags.length - validos.length;
  const previsto = validos.filter((a) => a.status !== 'faltou').reduce((t, a) => t + (a.total || 0), 0);
  const L = linhaPx();
  const agora = new Date();
  const agoraMin = minDoDia(agora);
  const rolo = raiz.querySelector('.agenda__rolo');
  const pos = rolo && manterRolagem ? { x: rolo.scrollLeft, y: rolo.scrollTop } : null;

  render(raiz, html`
    <header class="pag-topo agenda-topo">
      <div>
        <h1 class="pag-topo__titulo">Agenda</h1>
        <p class="pag-topo__sub"><span class="maiuscula">${dataLonga(data)}</span>${ehHoje ? ', hoje' : ''}</p>
      </div>
      <div class="agenda-ctrl" role="group" aria-label="Escolher o dia">
        <button type="button" class="icone-btn icone-btn--linha" data-act="dia" data-id="-1" aria-label="Dia anterior">${icon('esq')}</button>
        <button type="button" class="btn a-btn a-btn--linha a-btn--sm" data-act="hoje" ${ehHoje ? raw('aria-pressed="true"') : ''}>Hoje</button>
        <button type="button" class="icone-btn icone-btn--linha" data-act="dia" data-id="1" aria-label="Próximo dia">${icon('dir')}</button>
        <label class="sr-only" for="agenda-data">Ir para a data</label>
        <input type="date" id="agenda-data" class="entrada entrada--sm agenda-ctrl__data" value="${dia}">
      </div>
    </header>

    ${turnos.length ? html`
    <div class="agenda-resumo">
      <p><strong>${validos.length} ${validos.length === 1 ? 'agendamento' : 'agendamentos'}</strong>, ${moeda(previsto)} previstos${cancelados ? `, ${cancelados} ${cancelados === 1 ? 'cancelado' : 'cancelados'}` : ''}. Clique num horário vazio para marcar.</p>
      <ul class="legenda" aria-label="Legenda">
        ${Object.entries(STATUS).map(([k, v]) => html`<li class="legenda__item legenda__item--${k}"><i aria-hidden="true"></i>${v}</li>`)}
      </ul>
    </div>
    <div class="agenda" style="--linha:${L}px">
      <div class="agenda__rolo" tabindex="-1">
        <div class="agenda__grade" style="grid-template-columns: 58px repeat(${equipe.length}, minmax(196px, 1fr))">
          <div class="agenda__canto"></div>
          ${equipe.map((p) => {
            const meus = validos.filter((a) => a.profissionalId === p.id);
            return html`<div class="agenda__cab">
              <img src="${p.foto}" alt="" width="34" height="34">
              <span><strong>${p.nome}</strong><small>${meus.length} ${meus.length === 1 ? 'horário' : 'horários'}, ${moeda(meus.filter((a) => a.status !== 'faltou').reduce((t, a) => t + (a.total || 0), 0))}</small></span>
            </div>`;
          })}
          <div class="agenda__horas" aria-hidden="true">
            ${Array.from({ length: LINHAS }, (_, i) => INICIO + i * PASSO).map((m) => html`<span class="${m % 60 ? 'meia' : ''}" style="top:${((m - INICIO) / PASSO) * L}px">${hm(m)}</span>`)}
            ${ehHoje && agoraMin >= INICIO && agoraMin <= FIM ? html`<span class="agenda__agora-hora" style="top:${((agoraMin - INICIO) / PASSO) * L}px">${hhmm(agora)}</span>` : ''}
          </div>
          ${equipe.map((p) => coluna(p, ags, turnos, L, agoraMin, ehHoje, passado))}
          ${ehHoje && agoraMin >= INICIO && agoraMin <= FIM ? html`<div class="agenda__agora" style="top:${((agoraMin - INICIO) / PASSO) * L}px" aria-hidden="true"></div>` : ''}
        </div>
      </div>
    </div>`
    : html`
    <div class="painel agenda-fechada">
      ${vazio(`${data.getDay() === 0 ? 'Domingo' : 'Neste dia'} a DC está fechada. Escolha outro dia para ver a agenda.`,
        html`<div class="agenda-fechada__acoes">
          <button type="button" class="btn a-btn a-btn--linha a-btn--sm" data-act="dia" data-id="-1">${icon('esq', 16)}Sábado</button>
          <button type="button" class="btn a-btn a-btn--preto a-btn--sm" data-act="dia" data-id="1">Segunda-feira${icon('dir', 16)}</button>
        </div>`)}
    </div>`}`);

  const novoRolo = raiz.querySelector('.agenda__rolo');
  if (!novoRolo) return;
  if (pos) {
    novoRolo.scrollLeft = pos.x;
    novoRolo.scrollTop = pos.y;
  } else {
    // Abre perto de agora (hoje) ou do primeiro horário do dia.
    const primeiro = validos[0] ? minDoDia(new Date(validos[0].inicio)) : INICIO;
    const alvo = ehHoje ? Math.max(INICIO, agoraMin - 60) : primeiro - 30;
    novoRolo.scrollTop = Math.max(0, ((alvo - INICIO) / PASSO) * L);
  }
}

function irPara(novo) {
  if (!novo) return;
  location.hash = `#/agenda/${novo}`;
}

export default {
  montar(el, params) {
    raiz = el;
    dia = /^\d{4}-\d{2}-\d{2}$/.test(params[0] || '') ? params[0] : hojeISO();
    desenhar({ manterRolagem: false });
    acoes(el, {
      dia: (b) => irPara(isoDia(somarDias(diaDe(dia), Number(b.dataset.id)))),
      hoje: () => irPara(hojeISO()),
      abrir: (b) => abrirAgendamento(b.dataset.id),
      vago: (b) => abrirNovoAgendamento({ profissionalId: b.dataset.prof, dia, hora: b.dataset.hora }),
    });
    el.addEventListener('change', (ev) => {
      if (ev.target.id === 'agenda-data' && ev.target.value) irPara(ev.target.value);
    });
    teclas = (ev) => {
      if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey) return;
      if (document.querySelector('.camada') || ev.target.closest('input, textarea, select')) return;
      if (ev.key === 'ArrowLeft') irPara(isoDia(somarDias(diaDe(dia), -1)));
      else if (ev.key === 'ArrowRight') irPara(isoDia(somarDias(diaDe(dia), 1)));
    };
    document.addEventListener('keydown', teclas);
    relogio = setInterval(() => desenhar(), 60000);
  },
  mudarParams(params) {
    const novo = /^\d{4}-\d{2}-\d{2}$/.test(params[0] || '') ? params[0] : hojeISO();
    if (novo === dia) return;
    dia = novo;
    desenhar({ manterRolagem: false });
  },
  atualizar() {
    desenhar();
  },
  desmontar() {
    clearInterval(relogio);
    document.removeEventListener('keydown', teclas);
    raiz = null;
  },
};
