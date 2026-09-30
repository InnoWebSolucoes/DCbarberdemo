// Gaveta com a ficha do cliente: contato, histórico, faturas, e-mails e marketing.
import { html, raw, render, acoes } from '../dom.js';
import { icon } from '../icons.js';
import { col, porId, statsDe, ORIGEM_CLI, tipoEmail, PRAZOS_LEMBRETE, haDias, dataEnvio } from '../dados.js';
import { abrirCamada, topoCamada, statusTag, chave, toast, waLink } from '../ui.js';
import { atualizarCliente } from '../../data/api.js';
import { moeda, dataCurta, dataMedia, hhmm, dataHora, primeiroNome } from '../../lib/format.js';
import { abrirEmail, abrirFoto } from './email.js';
import { abrirNovaFatura } from './nova-fatura.js';
import { abrirNovoAgendamento } from './novo-agendamento.js';

const abertas = new Map();

export function abrirCliente(id) {
  if (abertas.has(id)) {
    abertas.get(id).focar();
    return;
  }
  if (!porId('clientes', id)) return;
  const st = { todas: false };
  const c = abrirCamada({ tipo: 'gaveta', rotulo: 'Ficha do cliente', aoFechar: () => abertas.delete(id) });
  abertas.set(id, c);
  const desenhar = () => {
    const cli = porId('clientes', id);
    if (!cli) return c.fechar();
    render(c.painel, conteudo(cli, st));
  };
  c.atualizar = desenhar;
  desenhar();

  acoes(c.painel, {
    agendar: () => abrirNovoAgendamento({ clienteId: id }),
    fatura: () => abrirNovaFatura({ clienteId: id }),
    todas: () => {
      st.todas = !st.todas;
      desenhar();
    },
    ag: async (b) => (await import('./agendamento.js')).abrirAgendamento(b.dataset.id),
    email: (b) => abrirEmail(b.dataset.id),
    'ver-fatura': (b) => {
      const f = porId('faturas', b.dataset.id);
      if (!f) return;
      if (f.arquivoTipo?.startsWith('image/')) abrirFoto(f.arquivo, f.arquivoNome);
      else if (f.emailId) abrirEmail(f.emailId);
    },
  });
  c.painel.addEventListener('change', async (ev) => {
    const cli = porId('clientes', id);
    if (ev.target.id === `mkt-${id}`) {
      await atualizarCliente(id, { marketing: ev.target.checked });
      toast(ev.target.checked ? `${primeiroNome(cli.nome)} volta a receber lembretes e campanhas.` : `${primeiroNome(cli.nome)} não recebe mais e-mails de marketing.`);
    } else if (ev.target.id === `lem-${id}`) {
      await atualizarCliente(id, { lembreteDias: Number(ev.target.value) });
      toast(`Lembrete de corte de ${primeiroNome(cli.nome)} a cada ${ev.target.value} dias.`);
    }
  });
  c.focar();
  return c;
}

function conteudo(cli, st) {
  const s = statsDe(cli.id);
  const ags = col('agendamentos').filter((a) => a.clienteId === cli.id).sort((a, b) => b.inicio.localeCompare(a.inicio));
  const faturas = col('faturas').filter((f) => f.clienteId === cli.id).sort((a, b) => b.enviadaEm.localeCompare(a.enviadaEm));
  const emails = col('emails').filter((e) => e.clienteId === cli.id).sort((a, b) => dataEnvio(b).localeCompare(dataEnvio(a)));
  const wa = waLink(cli.telefone);
  const lista = st.todas ? ags : ags.slice(0, 8);
  const prazos = PRAZOS_LEMBRETE.includes(cli.lembreteDias) ? PRAZOS_LEMBRETE : [...PRAZOS_LEMBRETE, cli.lembreteDias].filter(Boolean).sort((a, b) => a - b);

  return html`
    ${topoCamada({ sub: `Cliente desde ${dataMedia(cli.criadoEm)}`, titulo: cli.nome })}
    <div class="camada__corpo">
      <section class="bloco-gaveta">
        <dl class="definicoes">
          <dt>Telefone</dt>
          <dd>${cli.telefone ? html`<span class="tnum">${cli.telefone}</span>
            <span class="contato-links">
              <a class="contato-link" href="${wa}" target="_blank" rel="noopener">${icon('whatsapp', 16)}WhatsApp</a>
              <a class="contato-link" href="tel:${cli.telefone.replace(/\s/g, '')}">${icon('telefone', 16)}Ligar</a></span>` : 'Não informado'}</dd>
          <dt>E-mail</dt><dd><a class="link-seco link-seco--leve" href="mailto:${cli.email}">${cli.email}</a></dd>
          <dt>Origem</dt><dd>${ORIGEM_CLI[cli.origem] || cli.origem || 'Não informada'}</dd>
          ${cli.senhaHash ? html`<dt>Conta</dt><dd>Tem conta no site</dd>` : ''}
          ${cli.observacao ? html`<dt>Observação</dt><dd>${cli.observacao}</dd>` : ''}
        </dl>
        <div class="gaveta-ag__acoes">
          <button type="button" class="btn a-btn a-btn--preto" data-act="agendar">${icon('mais', 16)}Novo agendamento</button>
          <button type="button" class="btn a-btn a-btn--linha" data-act="fatura">${icon('clipe', 16)}Enviar fatura</button>
        </div>
      </section>

      <section class="bloco-gaveta">
        <div class="numeros-cliente">
          <div><span>Visitas</span><strong>${s.visitas}</strong></div>
          <div><span>Total gasto</span><strong>${moeda(s.total)}</strong></div>
          <div><span>Última visita</span><strong>${s.ultima ? dataCurta(s.ultima.inicio) : 'Nenhuma'}</strong>${s.ultima ? html`<small>${haDias(s.ultima.inicio)}</small>` : ''}</div>
          <div><span>Próximo horário</span><strong>${s.proximo ? dataCurta(s.proximo.inicio) : 'Nenhum'}</strong>${s.proximo ? html`<small>às ${hhmm(new Date(s.proximo.inicio))}</small>` : ''}</div>
        </div>
      </section>

      <section class="bloco-gaveta">
        <h3 class="bloco-gaveta__titulo">E-mail marketing</h3>
        ${chave({ id: `mkt-${cli.id}`, marcado: cli.marketing, rotulo: 'Recebe lembretes e campanhas', desc: cli.marketing ? 'Inscrito. Pode cancelar pelo link no rodapé de cada e-mail.' : 'Não inscrito. Só recebe confirmações e faturas.' })}
        <label class="campo campo--linha">
          <span class="campo__rotulo">Lembrete de corte a cada</span>
          <select class="selecao selecao--sm" id="lem-${cli.id}" ${cli.marketing ? '' : raw('disabled')}>
            ${prazos.map((d) => html`<option value="${d}" ${d === cli.lembreteDias ? raw('selected') : ''}>${d} dias</option>`)}
          </select>
        </label>
      </section>

      <section class="bloco-gaveta">
        <h3 class="bloco-gaveta__titulo">Histórico <small>${ags.length} ${ags.length === 1 ? 'agendamento' : 'agendamentos'}</small></h3>
        ${ags.length ? html`
          <ul class="historico">${lista.map((a) => {
            const d = new Date(a.inicio);
            return html`<li><button type="button" class="historico__item" data-act="ag" data-id="${a.id}">
              <span class="historico__data tnum">${dataCurta(d)}<small>${hhmm(d)}</small></span>
              <span class="historico__serv">${a.servicosNomes.join(' + ')}<small>com ${a.profissionalNome}</small></span>
              <span class="historico__fim"><span class="tnum">${moeda(a.total)}</span>${statusTag(a.status)}</span>
            </button></li>`;
          })}</ul>
          ${ags.length > 8 ? html`<button type="button" class="link-seco mais-link" data-act="todas">${st.todas ? 'Mostrar menos' : `Mostrar todos os ${ags.length}`}</button>` : ''}`
        : html`<p class="fraco">Ainda sem agendamentos. Use Novo agendamento para marcar o primeiro.</p>`}
      </section>

      <section class="bloco-gaveta">
        <h3 class="bloco-gaveta__titulo">Faturas <small>${faturas.length}</small></h3>
        ${faturas.length ? html`<div class="miniaturas">${faturas.map((f) => html`
          <button type="button" class="miniatura" data-act="ver-fatura" data-id="${f.id}">
            ${f.arquivoTipo?.startsWith('image/') ? html`<img src="${f.arquivo}" alt="">` : html`<span class="miniatura__doc">${icon('arquivo', 24)}<small>PDF</small></span>`}
            <span class="miniatura__num">${f.numero}</span><span class="miniatura__val">${moeda(f.valor)}, ${dataCurta(f.enviadaEm)}</span>
          </button>`)}</div>`
        : html`<p class="fraco">Nenhuma fatura enviada para este cliente. Use Enviar fatura depois do atendimento.</p>`}
      </section>

      <section class="bloco-gaveta">
        <h3 class="bloco-gaveta__titulo">E-mails recebidos <small>${emails.length}</small></h3>
        ${emails.length ? html`<ul class="lista-emails">${emails.slice(0, 12).map((e) => html`
          <li><button type="button" class="lista-emails__item" data-act="email" data-id="${e.id}">
            <span class="etq etq--${e.tipo}">${tipoEmail(e)}</span>
            <span class="lista-emails__assunto">${e.assunto}</span>
            <span class="lista-emails__quando tnum">${dataHora(dataEnvio(e))}</span>
          </button></li>`)}</ul>`
        : html`<p class="fraco">Nenhum e-mail enviado para este cliente ainda.</p>`}
      </section>
    </div>`;
}
