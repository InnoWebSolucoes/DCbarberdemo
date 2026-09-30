// Visão geral: números do dia, próximos atendimentos, receita de 14 dias, serviços e e-mails.
import { html, render, acoes } from '../dom.js';
import { icon } from '../icons.js';
import { col, porId, agendamentosDoDia, hojeISO, ocupacaoSemana, somarDias, inicioDoDia, tipoEmail, emailsRecentes, dataEnvio } from '../dados.js';
import { statusTag, vazio } from '../ui.js';
import { concluir, marcarFaltou } from '../acoes.js';
import { abrirAgendamento } from '../paineis/agendamento.js';
import { abrirEmail } from '../paineis/email.js';
import { graficoReceita } from './grafico.js';
import { horarios, servicoPorId, equipe } from '../../data/catalog.js';
import { moeda, hhmm, duracao, isoDia, tempoRelativo, minutos } from '../../lib/format.js';

let raiz = null;
let ro = null;
let relogio = null;

function estadoDaLoja(agora = new Date()) {
  const m = agora.getHours() * 60 + agora.getMinutes();
  const turnos = horarios[agora.getDay()] || [];
  for (let i = 0; i < turnos.length; i++) {
    const [a, f] = turnos[i];
    if (m < minutos(a)) return i === 0 ? `Abre hoje às ${a}` : `Almoço. Reabre às ${a}`;
    if (m < minutos(f)) return `Aberta agora, até ${f}`;
  }
  for (let d = 1; d <= 7; d++) {
    const dia = somarDias(agora, d);
    const t = horarios[dia.getDay()];
    if (t?.length) return `Fechada agora. Abre ${d === 1 ? 'amanhã' : dia.toLocaleDateString('pt-BR', { weekday: 'long' })} às ${t[0][0]}`;
  }
  return 'Fechada';
}

function numeros() {
  const hoje = agendamentosDoDia(hojeISO());
  const validos = hoje.filter((a) => a.status !== 'cancelado');
  const cancelados = hoje.length - validos.length;
  const feitos = validos.filter((a) => a.status === 'concluido');
  const pendentes = validos.filter((a) => a.status === 'confirmado');
  const previstos = validos.filter((a) => a.status !== 'faltou');
  const receita = previstos.reduce((t, a) => t + (a.total || 0), 0);
  const recebido = feitos.reduce((t, a) => t + (a.total || 0), 0);
  const oc = ocupacaoSemana();
  const limite = Date.now() - 30 * 86400000;
  const novos = col('clientes').filter((c) => new Date(c.criadoEm).getTime() >= limite);
  const doSite = novos.filter((c) => c.origem === 'site' || c.origem === 'newsletter' || c.origem === 'agendamento').length;
  return html`
    <section class="kpis" aria-label="Números de hoje">
      <div class="kpi">
        <p class="kpi__rotulo">Agendamentos hoje</p>
        <p class="kpi__valor">${validos.length}</p>
        <p class="kpi__nota">${feitos.length} ${feitos.length === 1 ? 'concluído' : 'concluídos'}, ${pendentes.length} por atender${cancelados ? `, ${cancelados} ${cancelados === 1 ? 'cancelado' : 'cancelados'}` : ''}</p>
      </div>
      <div class="kpi">
        <p class="kpi__rotulo">Receita prevista hoje</p>
        <p class="kpi__valor">${moeda(receita)}</p>
        <p class="kpi__nota">${moeda(recebido)} já em atendimentos concluídos</p>
      </div>
      <div class="kpi">
        <p class="kpi__rotulo">Ocupação da semana</p>
        <p class="kpi__valor">${oc.pct}%</p>
        <div class="kpi__profs">${equipe.map((p) => {
          const x = oc.porProf[p.id];
          const pct = x.total ? Math.round((x.ocupados / x.total) * 100) : 0;
          return html`<span class="kpi__prof"><span class="kpi__prof-nome">${p.nome}</span><span class="medidor" aria-hidden="true"><span style="width:${pct}%"></span></span><span class="tnum">${pct}%</span></span>`;
        })}</div>
      </div>
      <div class="kpi">
        <p class="kpi__rotulo">Clientes novos</p>
        <p class="kpi__valor">${novos.length}</p>
        <p class="kpi__nota">nos últimos 30 dias${novos.length ? `, ${doSite} pelo site` : ''}</p>
      </div>
    </section>`;
}

function proximos() {
  const agora = new Date();
  const hoje = agendamentosDoDia(hojeISO()).filter((a) => a.status !== 'cancelado');
  const fechado = !(horarios[agora.getDay()] || []).length;
  // Primeiro os que ainda pedem ação (já passaram e seguem confirmados), depois os próximos.
  const pendentesPassados = hoje.filter((a) => a.status === 'confirmado' && new Date(a.fim) <= agora);
  const futuros = hoje.filter((a) => new Date(a.fim) > agora);
  const lista = [...pendentesPassados, ...futuros].slice(0, 8);
  const resto = pendentesPassados.length + futuros.length - lista.length;
  return html`
    <section class="vg-hoje" aria-labelledby="vg-hoje-t">
      <div class="secao-topo">
        <div><h2 class="secao-titulo" id="vg-hoje-t">Próximos de hoje</h2>
          <p class="secao-sub">${futuros.length ? `${futuros.length} ${futuros.length === 1 ? 'horário' : 'horários'} até o fim do dia` : 'Nenhum horário pela frente hoje'}</p></div>
        <a class="link-seco" href="#/agenda">Ver agenda</a>
      </div>
      ${lista.length ? html`
      <ul class="lista-hoje">
        ${lista.map((a) => {
          const ini = new Date(a.inicio);
          const fim = new Date(a.fim);
          const agoraNele = ini <= agora && fim > agora;
          const atrasado = a.status === 'confirmado' && fim <= agora;
          return html`
          <li class="lista-hoje__item ${agoraNele ? 'is-agora' : ''}">
            <button type="button" class="lista-hoje__abrir" data-act="abrir" data-id="${a.id}">
              <span class="lista-hoje__hora tnum">${hhmm(ini)}<small>${duracao(a.duracao)}</small></span>
              <span class="lista-hoje__quem"><strong>${a.clienteNome}</strong><small>${a.servicosNomes.join(' + ')}, com ${a.profissionalNome}</small></span>
            </button>
            <span class="lista-hoje__estado">
              ${agoraNele ? html`<span class="selo-agora">Em atendimento</span>` : atrasado ? html`<span class="selo-atraso">Sem status</span>` : ''}
              ${a.status === 'confirmado' ? html`
                <button type="button" class="btn a-btn a-btn--linha a-btn--sm" data-act="concluir" data-id="${a.id}" aria-label="Marcar ${a.clienteNome} como concluído">${icon('check', 15)}Concluído</button>
                <button type="button" class="btn a-btn a-btn--leve a-btn--sm" data-act="faltou" data-id="${a.id}" aria-label="Marcar que ${a.clienteNome} faltou">Faltou</button>`
              : statusTag(a.status)}
            </span>
          </li>`;
        })}
      </ul>
      ${resto > 0 ? html`<p class="lista-hoje__mais"><a class="link-seco" href="#/agenda">Mais ${resto} na agenda de hoje</a></p>` : ''}`
      : vazio(fechado ? 'Hoje a DC está fechada. A agenda de amanhã já pode ser vista na Agenda.' : hoje.length ? 'Todos os atendimentos de hoje já têm status. Bom trabalho.' : 'Nenhum agendamento hoje. Clique em Novo agendamento para marcar um cliente.',
        html`<a class="btn a-btn a-btn--linha a-btn--sm" href="#/agenda">Abrir agenda</a>`)}
    </section>`;
}

function dadosReceita() {
  const hoje = inicioDoDia(new Date());
  const dias = Array.from({ length: 28 }, (_, i) => somarDias(hoje, i - 27));
  const mapa = new Map(dias.map((d) => [isoDia(d), { real: 0, previsto: 0, n: 0 }]));
  for (const a of col('agendamentos')) {
    const k = isoDia(a.inicio);
    const x = mapa.get(k);
    if (!x) continue;
    if (a.status === 'concluido') { x.real += a.total || 0; x.n++; }
    else if (a.status === 'confirmado') x.previsto += a.total || 0;
  }
  const serie = dias.map((d) => ({ dia: d, fechado: !(horarios[d.getDay()] || []).length, ...mapa.get(isoDia(d)) }));
  return { atual: serie.slice(14), anterior: serie.slice(0, 14) };
}

function receita() {
  const { atual, anterior } = dadosReceita();
  const total = atual.reduce((t, d) => t + d.real, 0);
  const antes = anterior.reduce((t, d) => t + d.real, 0);
  const variacao = antes ? Math.round(((total - antes) / antes) * 100) : 0;
  return html`
    <section class="vg-receita" aria-labelledby="vg-rec-t">
      <div class="secao-topo">
        <div><h2 class="secao-titulo" id="vg-rec-t">Receita dos últimos 14 dias</h2>
          <p class="secao-sub">Atendimentos concluídos, hoje em ouro</p></div>
        <div class="vg-receita__total"><strong class="tnum">${moeda(total)}</strong>
          <small>${Math.abs(variacao)}% ${variacao >= 0 ? 'acima' : 'abaixo'} dos 14 dias anteriores</small></div>
      </div>
      <div class="grafico" data-grafico></div>
    </section>`;
}

function topServicos() {
  const limite = Date.now() - 30 * 86400000;
  const cont = new Map();
  for (const a of col('agendamentos')) {
    if (a.status !== 'concluido' || new Date(a.inicio).getTime() < limite) continue;
    for (const id of a.servicos) cont.set(id, (cont.get(id) || 0) + 1);
  }
  const lista = [...cont.entries()].map(([id, n]) => ({ s: servicoPorId(id), n })).filter((x) => x.s).sort((a, b) => b.n - a.n).slice(0, 6);
  const max = lista[0]?.n || 1;
  return html`
    <section aria-labelledby="vg-serv-t">
      <div class="secao-topo"><div><h2 class="secao-titulo" id="vg-serv-t">Serviços mais pedidos</h2><p class="secao-sub">Últimos 30 dias, atendimentos concluídos</p></div></div>
      ${lista.length ? html`<ol class="ranking">${lista.map((x, i) => html`
        <li class="ranking__item">
          <span class="ranking__pos tnum">${i + 1}</span>
          <span class="ranking__nome">${x.s.nome}</span>
          <span class="ranking__barra" aria-hidden="true"><span style="width:${Math.max(4, (x.n / max) * 100)}%"></span></span>
          <span class="ranking__n tnum">${x.n}</span>
          <span class="ranking__val tnum">${moeda((x.s.preco || 0) * x.n)}</span>
        </li>`)}</ol>`
      : vazio('Nenhum atendimento concluído nos últimos 30 dias. Marque os atendimentos como concluídos na agenda para ver o ranking.')}
    </section>`;
}

function ultimosEmails() {
  const lista = emailsRecentes().slice(0, 6);
  return html`
    <section aria-labelledby="vg-em-t">
      <div class="secao-topo"><div><h2 class="secao-titulo" id="vg-em-t">Últimos e-mails enviados</h2><p class="secao-sub">Confirmações, faturas, lembretes e campanhas</p></div>
        <a class="link-seco" href="#/emails">Ver todos</a></div>
      ${lista.length ? html`<ul class="mini-emails">${lista.map((e) => html`
        <li><button type="button" class="mini-emails__item" data-act="email" data-id="${e.id}">
          <span class="etq etq--${e.tipo}">${tipoEmail(e)}</span>
          <span class="mini-emails__txt"><strong>${e.nomePara || e.para}</strong><small>${e.assunto}</small></span>
          <span class="mini-emails__quando">${tempoRelativo(dataEnvio(e))}</span>
        </button></li>`)}</ul>`
      : vazio('Nenhum e-mail enviado ainda. As confirmações saem sozinhas quando alguém agenda.')}
    </section>`;
}

function desenhar() {
  const agora = new Date();
  const y = window.scrollY;
  render(raiz, html`
    <header class="pag-topo">
      <div>
        <h1 class="pag-topo__titulo">Visão geral</h1>
        <p class="pag-topo__sub">${estadoDaLoja(agora)}.</p>
      </div>
      <div class="pag-topo__acoes">
        <a class="btn a-btn a-btn--linha" href="#/faturas">${icon('clipe', 16)}Faturas</a>
        <a class="btn a-btn a-btn--linha" href="#/agenda">${icon('calendario', 16)}Agenda de hoje</a>
      </div>
    </header>
    ${numeros()}
    <div class="vg-grade">
      ${proximos()}
      <div class="vg-coluna">
        ${receita()}
        ${topServicos()}
      </div>
    </div>
    <div class="vg-baixo">
      ${ultimosEmails()}
    </div>`);
  desenharGrafico();
  window.scrollTo(0, y);
}

function desenharGrafico() {
  const alvo = raiz?.querySelector('[data-grafico]');
  if (!alvo) return;
  graficoReceita(alvo, dadosReceita().atual);
}

export default {
  montar(el) {
    raiz = el;
    desenhar();
    acoes(el, {
      abrir: (b) => abrirAgendamento(b.dataset.id),
      concluir: (b) => concluir(porId('agendamentos', b.dataset.id)),
      faltou: (b) => marcarFaltou(porId('agendamentos', b.dataset.id)),
      email: (b) => abrirEmail(b.dataset.id),
    });
    let largura = 0;
    ro = new ResizeObserver(() => {
      const g = raiz?.querySelector('[data-grafico]');
      if (g && Math.abs(g.clientWidth - largura) > 4) {
        largura = g.clientWidth;
        desenharGrafico();
      }
    });
    ro.observe(el);
    relogio = setInterval(desenhar, 60000);
  },
  atualizar() {
    if (raiz) desenhar();
  },
  desmontar() {
    ro?.disconnect();
    clearInterval(relogio);
    raiz = null;
  },
};
