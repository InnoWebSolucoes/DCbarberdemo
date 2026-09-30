// Gaveta com os detalhes de um agendamento e as ações do balcão.
import { html, raw, render, acoes } from '../dom.js';
import { icon } from '../icons.js';
import { porId, emailsDoAgendamento, ORIGEM_AG, tipoEmail, diaDe, dataEnvio, dataCriacao } from '../dados.js';
import { abrirCamada, topoCamada, statusTag, toast, waLink } from '../ui.js';
import { concluir, marcarFaltou, cancelar, reabrir } from '../acoes.js';
import { horariosLivres, remarcarAgendamento, diaAberto } from '../../data/api.js';
import { servicoPorId, profissionaisPara } from '../../data/catalog.js';
import { moeda, duracao, hhmm, dataLonga, dataHora, isoDia, precoServico, tempoRelativo } from '../../lib/format.js';
import { abrirEmail, abrirFoto } from './email.js';
import { abrirNovaFatura } from './nova-fatura.js';
import { abrirCliente } from './cliente.js';

const abertas = new Map();

export function abrirAgendamento(id) {
  if (abertas.has(id)) {
    abertas.get(id).focar();
    return;
  }
  if (!porId('agendamentos', id)) return;
  const estado = { remarcar: false, dia: null, prof: null, hora: null, erro: '', ocupado: false };
  const c = abrirCamada({ tipo: 'gaveta', rotulo: 'Detalhes do agendamento', aoFechar: () => abertas.delete(id) });
  abertas.set(id, c);

  const desenhar = () => {
    const ag = porId('agendamentos', id);
    if (!ag) {
      c.fechar();
      return;
    }
    render(c.painel, conteudo(ag, estado));
  };
  c.atualizar = desenhar;
  desenhar();

  acoes(c.painel, {
    concluir: async () => { await concluir(porId('agendamentos', id)); },
    faltou: async () => { await marcarFaltou(porId('agendamentos', id)); },
    reabrir: async () => { await reabrir(porId('agendamentos', id)); },
    cancelar: async () => {
      const ok = await cancelar(porId('agendamentos', id));
      if (ok) desenhar();
    },
    fatura: () => {
      const ag = porId('agendamentos', id);
      abrirNovaFatura({ clienteId: ag.clienteId, agendamentoId: ag.id });
    },
    'ver-fatura': () => {
      const ag = porId('agendamentos', id);
      const f = porId('faturas', ag.faturaId);
      if (f?.arquivoTipo?.startsWith('image/')) abrirFoto(f.arquivo, f.arquivoNome);
      else if (f?.emailId) abrirEmail(f.emailId);
    },
    remarcar: () => {
      const ag = porId('agendamentos', id);
      Object.assign(estado, { remarcar: !estado.remarcar, dia: isoDia(ag.inicio), prof: ag.profissionalId, hora: null, erro: '' });
      if (estado.remarcar && new Date(ag.inicio) < new Date()) estado.dia = isoDia(new Date());
      desenhar();
      if (estado.remarcar) c.painel.querySelector('#rem-dia')?.focus();
    },
    hora: (b) => {
      estado.hora = b.dataset.id;
      estado.erro = '';
      desenhar();
    },
    'confirmar-remarcar': async () => {
      const ag = porId('agendamentos', id);
      if (!estado.hora) return;
      const [h, m] = estado.hora.split(':').map(Number);
      const inicio = diaDe(estado.dia);
      inicio.setHours(h, m, 0, 0);
      estado.ocupado = true;
      desenhar();
      try {
        await remarcarAgendamento(id, inicio, estado.prof);
        Object.assign(estado, { remarcar: false, hora: null, erro: '', ocupado: false });
        desenhar();
        toast(`Remarcado para ${dataLonga(inicio)} às ${estado.hora || hhmm(inicio)}. ${ag.clienteNome.split(' ')[0]} recebeu o e-mail com o novo horário.`);
      } catch (e) {
        estado.erro = e.message;
        estado.ocupado = false;
        desenhar();
      }
    },
    email: (b) => abrirEmail(b.dataset.id),
    cliente: () => abrirCliente(porId('agendamentos', id).clienteId),
  });

  c.painel.addEventListener('change', (ev) => {
    if (ev.target.id === 'rem-dia' && ev.target.value) {
      estado.dia = ev.target.value;
      estado.hora = null;
      desenhar();
    } else if (ev.target.id === 'rem-prof') {
      estado.prof = ev.target.value;
      estado.hora = null;
      desenhar();
    }
  });
  c.focar();
  return c;
}

function conteudo(ag, estado) {
  const ini = new Date(ag.inicio);
  const fim = new Date(ag.fim);
  const emails = emailsDoAgendamento(ag.id);
  const fatura = porId('faturas', ag.faturaId);
  const tel = ag.clienteTelefone || porId('clientes', ag.clienteId)?.telefone || '';
  const wa = waLink(tel);
  const passado = fim < new Date();

  const botoes = [];
  if (ag.status === 'confirmado') {
    botoes.push(html`<button type="button" class="btn a-btn a-btn--verde" data-act="concluir">${icon('check', 17)}Concluído</button>`);
    botoes.push(html`<button type="button" class="btn a-btn a-btn--linha" data-act="faltou">Faltou</button>`);
  } else if (ag.status === 'concluido' || ag.status === 'faltou') {
    botoes.push(html`<button type="button" class="btn a-btn a-btn--linha" data-act="reabrir">Voltar para confirmado</button>`);
  }
  if (ag.status !== 'cancelado') {
    botoes.push(html`<button type="button" class="btn a-btn ${ag.status === 'concluido' && !fatura ? 'a-btn--preto' : 'a-btn--linha'}" data-act="fatura">${icon('clipe', 16)}${fatura ? 'Enviar outra fatura' : 'Enviar fatura'}</button>`);
  }
  botoes.push(html`<button type="button" class="btn a-btn a-btn--linha" data-act="remarcar" aria-expanded="${estado.remarcar}">${ag.status === 'cancelado' ? 'Remarcar e reativar' : 'Remarcar'}</button>`);
  if (ag.status === 'confirmado') botoes.push(html`<button type="button" class="btn a-btn a-btn--leve texto-perigo" data-act="cancelar">Cancelar</button>`);

  return html`
    ${topoCamada({
      sub: html`Agendamento <span class="tnum">${ag.codigo}</span>`,
      titulo: ag.clienteNome,
      extra: html`<div class="gaveta-ag__linha">${statusTag(ag.status)}<span class="tnum">${hhmm(ini)} até ${hhmm(fim)}</span><span>${ag.profissionalNome}</span></div>`,
    })}
    <div class="camada__corpo">
      <section class="bloco-gaveta">
        <p class="gaveta-ag__quando">${dataLonga(ini)}</p>
        ${ag.status === 'confirmado' && passado ? html`<p class="gaveta-ag__aviso">O horário já passou. Marque se o cliente veio ou faltou.</p>` : ''}
        ${ag.status === 'cancelado' ? html`<p class="gaveta-ag__aviso">Cancelado ${ag.canceladoPor === 'barbearia' ? 'pela barbearia' : 'pelo cliente'}${ag.canceladoEm ? `, ${tempoRelativo(ag.canceladoEm)}` : ''}.</p>` : ''}
        <div class="gaveta-ag__acoes">${botoes}</div>
        ${estado.remarcar ? painelRemarcar(ag, estado) : ''}
      </section>

      <section class="bloco-gaveta">
        <h3 class="bloco-gaveta__titulo">Cliente <button type="button" class="link-seco" data-act="cliente">Ver ficha</button></h3>
        <dl class="definicoes">
          <dt>Telefone</dt>
          <dd>${tel ? html`<span class="tnum">${tel}</span>` : 'Não informado'}
            ${wa ? html`<span class="contato-links">
              <a class="contato-link" href="${wa}" target="_blank" rel="noopener">${icon('whatsapp', 16)}WhatsApp</a>
              <a class="contato-link" href="tel:${tel.replace(/\s/g, '')}">${icon('telefone', 16)}Ligar</a></span>` : ''}
          </dd>
          <dt>E-mail</dt><dd><a class="link-seco link-seco--leve" href="mailto:${ag.clienteEmail}">${ag.clienteEmail}</a></dd>
        </dl>
      </section>

      <section class="bloco-gaveta">
        <h3 class="bloco-gaveta__titulo">Atendimento</h3>
        <ul class="linhas-servico">
          ${ag.servicos.map((sid, i) => {
            const s = servicoPorId(sid);
            return html`<li><span>${s?.nome || ag.servicosNomes[i]}</span><span class="tnum">${s ? precoServico(s) : ''}</span></li>`;
          })}
          <li class="linhas-servico__total"><span>Total</span><span class="tnum">${ag.totalTexto || moeda(ag.total)}</span></li>
        </ul>
        <dl class="definicoes">
          <dt>Duração</dt><dd>${duracao(ag.duracao)}</dd>
          <dt>Profissional</dt><dd>${ag.profissionalNome}</dd>
          <dt>Origem</dt><dd>${ORIGEM_AG[ag.origem] || ag.origem}</dd>
          <dt>Código</dt><dd class="tnum">${ag.codigo}</dd>
          <dt>Criado em</dt><dd class="tnum">${dataHora(dataCriacao(ag))}</dd>
          ${ag.observacao ? html`<dt>Observação</dt><dd>${ag.observacao}</dd>` : ''}
        </dl>
      </section>

      ${fatura ? html`
      <section class="bloco-gaveta">
        <h3 class="bloco-gaveta__titulo">Fatura</h3>
        <button type="button" class="fatura-linha" data-act="ver-fatura">
          ${fatura.arquivoTipo?.startsWith('image/') ? html`<img src="${fatura.arquivo}" alt="">` : html`<span class="fatura-linha__doc">${icon('arquivo', 22)}</span>`}
          <span><strong>${fatura.numero}</strong><small>${moeda(fatura.valor)}, enviada ${tempoRelativo(fatura.enviadaEm)}</small></span>
        </button>
      </section>` : ''}

      <section class="bloco-gaveta">
        <h3 class="bloco-gaveta__titulo">E-mails deste agendamento <small>${emails.length}</small></h3>
        ${emails.length ? html`<ul class="lista-emails">${emails.map((e) => html`
          <li><button type="button" class="lista-emails__item" data-act="email" data-id="${e.id}">
            <span class="etq etq--${e.tipo}">${tipoEmail(e)}</span>
            <span class="lista-emails__assunto">${e.assunto}</span>
            <span class="lista-emails__quando tnum">${dataHora(dataEnvio(e))}</span>
          </button></li>`)}</ul>`
        : html`<p class="fraco">Nenhum e-mail enviado para este agendamento. Agendamentos feitos pelo AppBarber ou antes do site não geram confirmação.</p>`}
      </section>
    </div>`;
}

function painelRemarcar(ag, estado) {
  const profs = profissionaisPara(ag.servicos);
  const dia = diaDe(estado.dia);
  const aberto = diaAberto(dia);
  const livres = aberto ? horariosLivres({ dia, duracaoMin: ag.duracao, candidatos: [estado.prof], ignorarId: ag.id }) : [];
  return html`
    <div class="remarcar">
      <div class="linha-campos">
        <label class="campo"><span class="campo__rotulo">Novo dia</span>
          <input class="entrada" type="date" id="rem-dia" value="${estado.dia}" min="${isoDia(new Date())}"></label>
        <label class="campo"><span class="campo__rotulo">Profissional</span>
          <select class="selecao" id="rem-prof">${profs.map((p) => html`<option value="${p.id}" ${p.id === estado.prof ? raw('selected') : ''}>${p.nome}</option>`)}</select></label>
      </div>
      <p class="campo__rotulo remarcar__rotulo">Horários livres para ${duracao(ag.duracao)}</p>
      ${!aberto ? html`<p class="fraco">A DC fecha aos domingos. Escolha outro dia.</p>`
        : livres.length ? html`<div class="horas">${livres.map((s) => html`<button type="button" class="hora" data-act="hora" data-id="${s.hora}" aria-pressed="${estado.hora === s.hora}">${s.hora}</button>`)}</div>`
        : html`<p class="fraco">Sem horários livres neste dia com ${profs.find((p) => p.id === estado.prof)?.nome || 'este profissional'}. Tente outro dia ou outro profissional.</p>`}
      ${estado.erro ? html`<p class="erro-caixa">${estado.erro}</p>` : ''}
      <div class="remarcar__fim">
        <button type="button" class="btn a-btn a-btn--leve a-btn--sm" data-act="remarcar">Desistir</button>
        <button type="button" class="btn a-btn a-btn--preto a-btn--sm" data-act="confirmar-remarcar" ${!estado.hora || estado.ocupado ? raw('disabled') : ''}>
          ${estado.ocupado ? html`<span class="giro"></span>Remarcando` : estado.hora ? `Remarcar para ${estado.hora}` : 'Escolha um horário'}</button>
      </div>
    </div>`;
}
