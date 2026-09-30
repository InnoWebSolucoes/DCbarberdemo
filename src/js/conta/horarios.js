// Seções "Próximo horário" e "Histórico".
import { db } from '../data/store.js';
import { negocio, profissionalPorId } from '../data/catalog.js';
import { cancelarAgendamento } from '../data/api.js';
import { hhmm, duracao as fmtDuracao } from '../lib/format.js';
import { abrirAgendamento } from '../booking/booking.js';
import { baixarIcs } from '../booking/ics.js';
import { esc, foto, icone, monograma } from '../booking/ui.js';
import { diaLongo, diaCurto, contagem, diasEntre, dataCompacta } from '../booking/datas.js';
import { confirmar, avisar } from './modal.js';

const STATUS = {
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  faltou: 'Não compareceu',
  confirmado: 'Realizado',
};

export function agendamentosDe(cliente) {
  const agora = Date.now();
  const todos = db.listSync('agendamentos', (a) => a.clienteId === cliente.id);
  const futuros = todos
    .filter((a) => a.status === 'confirmado' && new Date(a.fim || a.inicio).getTime() > agora)
    .sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
  const passados = todos
    .filter((a) => !futuros.includes(a))
    .sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
  return { futuros, passados };
}

function ultimaVisitaTexto(a) {
  const d = diasEntre(a.inicio, new Date());
  if (d <= 0) return 'hoje';
  if (d === 1) return 'ontem';
  return `há ${d} dias`;
}

const pessoa = (id, nome) => {
  const p = profissionalPorId(id);
  return p ? `${foto(p, { classe: 'ct-prox__foto' })}<span><strong>${esc(p.nome)}</strong><span>${esc(p.funcao)}</span></span>` : `<span><strong>${esc(nome)}</strong></span>`;
};

export function htmlProximo(cliente) {
  const { futuros, passados } = agendamentosDe(cliente);
  const prox = futuros[0];
  if (!prox) {
    const ultimo = passados.find((a) => a.status === 'concluido');
    return `
      <div class="ct-vazio ct-vazio--grande">
        ${monograma('ct-vazio__mono')}
        <div class="ct-vazio__texto">
          <p class="ct-vazio__titulo">Nenhum horário marcado</p>
          <p>${ultimo ? `Sua última visita foi ${ultimaVisitaTexto(ultimo)}: ${esc(ultimo.servicosNomes.join(', '))} com ${esc(ultimo.profissionalNome)}.` : 'Escolha o serviço, o profissional e o horário. A confirmação chega no seu e-mail.'}</p>
        </div>
        <div class="ct-vazio__acoes">
          <button type="button" class="btn btn--ouro" data-acao="agendar" data-foco="vazio-agendar">Agendar horário</button>
          ${ultimo ? `<button type="button" class="btn btn--linha" data-acao="de-novo" data-id="${ultimo.id}" data-foco="vazio-denovo">Repetir a última visita</button>` : ''}
        </div>
      </div>`;
  }
  const inicio = new Date(prox.inicio);
  const outros = futuros.slice(1);
  return `
    <article class="ct-prox" aria-labelledby="ct-prox-dia">
      <div class="ct-prox__quando">
        <p class="ct-prox__contagem">${esc(contagem(inicio))}</p>
        <p class="ct-prox__dia" id="ct-prox-dia">${esc(diaLongo(inicio))}</p>
        <p class="ct-prox__hora">${hhmm(inicio)}</p>
        <p class="ct-prox__dur">${fmtDuracao(prox.duracao)}, até ${hhmm(new Date(prox.fim))}</p>
      </div>
      <div class="ct-prox__oque">
        <ul class="ct-prox__servicos">${prox.servicosNomes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
        <div class="ct-prox__pessoa">${pessoa(prox.profissionalId, prox.profissionalNome)}</div>
        <dl class="ct-prox__dados">
          <div><dt>Total</dt><dd>${esc(prox.totalTexto)}</dd></div>
          <div><dt>Código</dt><dd>${esc(prox.codigo)}</dd></div>
          <div><dt>Onde</dt><dd>${esc(negocio.endereco)}</dd></div>
        </dl>
      </div>
      <div class="ct-prox__acoes">
        <button type="button" class="btn btn--ouro" data-acao="remarcar" data-id="${prox.id}" data-foco="p-remarcar">Remarcar</button>
        <button type="button" class="btn btn--linha" data-acao="ics" data-id="${prox.id}" data-foco="p-ics">${icone.calendario}Adicionar ao calendário</button>
        <a class="btn btn--linha" href="${negocio.mapa}" target="_blank" rel="noopener">${icone.mapa}Como chegar</a>
        <button type="button" class="ct-prox__cancelar" data-acao="cancelar" data-id="${prox.id}" data-foco="p-cancelar">Cancelar horário</button>
      </div>
    </article>
    ${outros.length ? `
      <div class="ct-outros">
        <p class="ct-outros__titulo">Também marcado</p>
        <ul class="ct-lista">
          ${outros.map((a) => `
            <li class="ct-linha">
              <div class="ct-linha__data"><strong>${esc(diaCurto(a.inicio))}</strong><span>${hhmm(new Date(a.inicio))}</span></div>
              <div class="ct-linha__oque"><strong>${esc(a.servicosNomes.join(', '))}</strong><span>com ${esc(a.profissionalNome)}, ${esc(a.totalTexto)}</span></div>
              <div class="ct-linha__acoes">
                <button type="button" class="ct-link" data-acao="remarcar" data-id="${a.id}" data-foco="o-rem-${a.id}">Remarcar</button>
                <button type="button" class="ct-link ct-link--mudo" data-acao="cancelar" data-id="${a.id}" data-foco="o-can-${a.id}">Cancelar</button>
              </div>
            </li>`).join('')}
        </ul>
      </div>` : ''}`;
}

export function htmlHistorico(cliente, { todos = false } = {}) {
  const { passados } = agendamentosDe(cliente);
  if (!passados.length) {
    return `<div class="ct-vazio"><p class="ct-vazio__titulo">Ainda sem visitas</p><p>Depois do primeiro atendimento, ele aparece aqui para você repetir com um toque.</p></div>`;
  }
  const lista = todos ? passados : passados.slice(0, 6);
  return `
    <ul class="ct-lista">
      ${lista.map((a) => `
        <li class="ct-linha ct-linha--hist">
          <div class="ct-linha__data"><strong>${esc(dataCompacta(a.inicio))}</strong><span>${hhmm(new Date(a.inicio))}</span></div>
          <div class="ct-linha__oque"><strong>${esc(a.servicosNomes.join(', '))}</strong><span>com ${esc(a.profissionalNome)}, ${esc(a.totalTexto)}</span></div>
          <span class="ct-status ct-status--${a.status}">${STATUS[a.status] || esc(a.status)}</span>
          <button type="button" class="ct-link" data-acao="de-novo" data-id="${a.id}" data-foco="h-${a.id}">Agendar de novo</button>
        </li>`).join('')}
    </ul>
    ${passados.length > 6 ? `<button type="button" class="ct-mais" data-acao="hist-todos" data-foco="hist-todos">${todos ? 'Mostrar menos' : `Ver as ${passados.length} visitas`}</button>` : ''}`;
}

// Ações dos cartões de horário (delegadas no painel)
export async function acaoHorario(acao, id, ctx) {
  const ag = id ? db.listSync('agendamentos').find((a) => a.id === id) : null;
  if (acao === 'agendar') return abrirAgendamento();
  if (acao === 'remarcar' && ag) return abrirAgendamento({ remarcarId: ag.id });
  if (acao === 'de-novo' && ag) return abrirAgendamento({ servicos: ag.servicos, profissionalId: ag.profissionalId });
  if (acao === 'ics' && ag) return baixarIcs(ag);
  if (acao === 'hist-todos') { ctx.historicoTodos = !ctx.historicoTodos; return ctx.pintar('historico'); }
  if (acao === 'cancelar' && ag) {
    const inicio = new Date(ag.inicio);
    const ok = await confirmar({
      titulo: 'Cancelar este horário?',
      texto: `${esc(ag.servicosNomes.join(', '))} com ${esc(ag.profissionalNome)}, ${esc(diaLongo(inicio).toLowerCase())} às ${hhmm(inicio)}. O horário fica livre para outra pessoa e você recebe a confirmação por e-mail.`,
      sim: 'Cancelar horário',
      nao: 'Manter horário',
      perigo: true,
    });
    if (!ok) return;
    await cancelarAgendamento(ag.id, 'cliente');
    avisar('Horário cancelado. Enviamos a confirmação por e-mail.');
  }
}
