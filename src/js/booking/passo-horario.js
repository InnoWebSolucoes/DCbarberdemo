// Passo 3: dia e hora.
import { horariosLivres, diaAberto, JANELA_DIAS, remarcarAgendamento } from '../data/api.js';
import { isoDia } from '../lib/format.js';
import { estado, candidatos, resumo, marcarMexeu } from './estado.js';
import { el, esc, icone, $, $$ } from './ui.js';
import { deIso, diaLongo, diaCurto, semanaCurta, mesCurto, diasEntre } from './datas.js';
import { animarLista } from './movimento.js';

export function montar(ctx) {
  const duracaoMin = resumo().duracao;
  const cands = candidatos();
  const ignorarId = estado.modo === 'remarcar' ? estado.remarcar?.id : null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dias = Array.from({ length: JANELA_DIAS }, (_, i) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i));

  let cache = new Map();
  const livres = (iso) => {
    if (!cache.has(iso)) {
      const d = deIso(iso);
      cache.set(iso, diaAberto(d) ? horariosLivres({ dia: d, duracaoMin, candidatos: cands, ignorarId }) : []);
    }
    return cache.get(iso);
  };
  const proximoComVaga = (depoisDe) => {
    for (const d of dias) {
      const iso = isoDia(d);
      if (depoisDe && iso <= depoisDe) continue;
      if (diaAberto(d) && livres(iso).length) return iso;
    }
    return null;
  };

  // Dia inicial: o escolhido antes, se ainda tiver vaga; senão o primeiro com vaga.
  if (!estado.dia || !dias.some((d) => isoDia(d) === estado.dia) || !diaAberto(deIso(estado.dia))) {
    estado.dia = proximoComVaga(null) || isoDia(dias.find((d) => diaAberto(d)) || dias[0]);
  }
  if (estado.slot && !livres(estado.dia).some((s) => s.hora === estado.slot.hora)) estado.slot = null;

  const itemDia = (d) => {
    const iso = isoDia(d);
    const aberto = diaAberto(d);
    const dif = diasEntre(hoje, d);
    const semana = dif === 0 ? 'Hoje' : dif === 1 ? 'Amanhã' : semanaCurta(d);
    const marcado = iso === estado.dia;
    const rotulo = `${diaLongo(d)}${aberto ? '' : ', fechado'}`;
    return `
      <label class="ag-dia${aberto ? '' : ' is-fechado'}${marcado ? ' is-marcado' : ''}" data-dia="${iso}">
        <input type="radio" name="ag-dia" class="ag-dia__input" value="${iso}"${marcado ? ' checked' : ''}${aberto ? '' : ' disabled'} aria-label="${esc(rotulo)}">
        <span class="ag-dia__semana">${semana}</span>
        <span class="ag-dia__num">${d.getDate()}</span>
        <span class="ag-dia__mes">${aberto ? mesCurto(d) : 'Fechado'}</span>
      </label>`;
  };

  const raiz = el(`
    <div class="ag-passo ag-horario">
      <div class="ag-aviso ag-aviso--erro" role="alert" hidden><p></p></div>
      <div class="ag-dias">
        <button type="button" class="ag-dias__seta ag-dias__seta--ant" aria-label="Dias anteriores">${icone.voltar}</button>
        <div class="ag-dias__trilho" role="radiogroup" aria-label="Dia">${dias.map(itemDia).join('')}</div>
        <button type="button" class="ag-dias__seta ag-dias__seta--prox" aria-label="Próximos dias">${icone.avancar}</button>
      </div>
      <div class="ag-slots" aria-live="polite"></div>
    </div>`);

  const trilho = $('.ag-dias__trilho', raiz);
  const slotsEl = $('.ag-slots', raiz);
  const avisoEl = $('.ag-aviso', raiz);

  function mostrarAviso(texto) {
    avisoEl.hidden = !texto;
    $('p', avisoEl).textContent = texto || '';
  }

  function marcarLotados() {
    // Marca dias abertos sem vaga, aos poucos para não travar a abertura.
    const pendentes = dias.filter((d) => diaAberto(d)).map(isoDia);
    const passo = () => {
      const lote = pendentes.splice(0, 6);
      lote.forEach((iso) => {
        const item = $(`.ag-dia[data-dia="${iso}"]`, trilho);
        if (!item) return;
        const cheio = livres(iso).length === 0;
        item.classList.toggle('is-lotado', cheio);
        $('.ag-dia__mes', item).textContent = cheio ? 'Lotado' : mesCurto(deIso(iso));
      });
      if (pendentes.length && raiz.isConnected) setTimeout(passo, 16);
    };
    setTimeout(passo, 60);
  }

  function pintarSlots(animar) {
    const lista = livres(estado.dia);
    const dia = deIso(estado.dia);
    if (!lista.length) {
      const prox = proximoComVaga(estado.dia);
      const passou = isoDia(new Date()) === estado.dia;
      slotsEl.innerHTML = `
        <div class="ag-vazio">
          <p class="ag-vazio__titulo">Sem horários livres neste dia</p>
          <p class="ag-vazio__texto">${passou ? 'Os horários de hoje já passaram ou estão reservados.' : `${esc(diaLongo(dia))} está com a agenda cheia para ${esc(resumo().duracao >= 60 ? 'esta duração' : 'este serviço')}.`}</p>
          ${prox ? `<button type="button" class="btn btn--linha ag-vazio__btn" data-ir-dia="${prox}">Ver ${esc(diaCurto(deIso(prox)))}</button>` : `<p class="ag-vazio__texto">Não há vagas nos próximos ${JANELA_DIAS} dias. Ligue para a barbearia.</p>`}
        </div>`;
      return;
    }
    const grupos = [
      { nome: 'Manhã', itens: lista.filter((s) => s.inicio.getHours() < 13) },
      { nome: 'Tarde', itens: lista.filter((s) => s.inicio.getHours() >= 13) },
    ].filter((g) => g.itens.length);
    slotsEl.innerHTML = `
      <p class="ag-slots__dia">${esc(diaLongo(dia))}<span>${lista.length === 1 ? '1 horário livre' : `${lista.length} horários livres`}</span></p>
      ${grupos.map((g) => `
        <div class="ag-slots__grupo">
          <p class="ag-slots__rotulo">${g.nome}</p>
          <div class="ag-slots__grade" role="radiogroup" aria-label="Horários da ${g.nome.toLowerCase()}">
            ${g.itens.map((s) => {
              const on = estado.slot?.hora === s.hora && isoDia(estado.slot.inicio) === estado.dia;
              return `<label class="ag-slot${on ? ' is-marcado' : ''}"><input type="radio" name="ag-hora" class="ag-slot__input" value="${s.hora}"${on ? ' checked' : ''}><span>${s.hora}</span></label>`;
            }).join('')}
          </div>
        </div>`).join('')}`;
    if (animar) animarLista($$('.ag-slot', slotsEl));
  }

  function centralizarDia(suave) {
    const item = $(`.ag-dia[data-dia="${estado.dia}"]`, trilho);
    if (!item) return;
    const alvo = item.offsetLeft - trilho.clientWidth / 2 + item.offsetWidth / 2;
    trilho.scrollTo({ left: Math.max(0, alvo), behavior: suave ? 'smooth' : 'auto' });
  }

  function escolherDia(iso, { focar = false } = {}) {
    if (!iso) return;
    estado.dia = iso;
    if (estado.slot && isoDia(estado.slot.inicio) !== iso) estado.slot = null;
    $$('.ag-dia', trilho).forEach((d) => {
      const on = d.dataset.dia === iso;
      d.classList.toggle('is-marcado', on);
      $('input', d).checked = on;
      if (on && focar) $('input', d).focus({ preventScroll: true });
    });
    centralizarDia(true);
    pintarSlots(true);
    ctx.atualizar();
  }

  trilho.addEventListener('change', (e) => {
    const input = e.target.closest('.ag-dia__input');
    if (!input) return;
    marcarMexeu();
    mostrarAviso('');
    escolherDia(input.value);
  });

  slotsEl.addEventListener('change', (e) => {
    const input = e.target.closest('.ag-slot__input');
    if (!input) return;
    const s = livres(estado.dia).find((x) => x.hora === input.value);
    if (!s) return;
    estado.slot = { hora: s.hora, inicio: s.inicio.toISOString(), profissionais: s.profissionais };
    marcarMexeu();
    mostrarAviso('');
    $$('.ag-slot', slotsEl).forEach((l) => l.classList.toggle('is-marcado', $('input', l).checked));
    ctx.atualizar();
  });

  slotsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir-dia]');
    if (b) escolherDia(b.dataset.irDia, { focar: true });
  });

  $('.ag-dias__seta--ant', raiz).addEventListener('click', () => trilho.scrollBy({ left: -trilho.clientWidth * 0.8, behavior: 'smooth' }));
  $('.ag-dias__seta--prox', raiz).addEventListener('click', () => trilho.scrollBy({ left: trilho.clientWidth * 0.8, behavior: 'smooth' }));
  const setas = () => {
    const max = trilho.scrollWidth - trilho.clientWidth - 8;
    $('.ag-dias__seta--ant', raiz).disabled = trilho.scrollLeft <= 8;
    $('.ag-dias__seta--prox', raiz).disabled = trilho.scrollLeft >= max;
  };
  trilho.addEventListener('scroll', setas, { passive: true });

  // Aviso vindo do passo 4 (horário tomado)
  if (estado.avisoHorario) {
    mostrarAviso(estado.avisoHorario);
    estado.avisoHorario = '';
  }
  pintarSlots(false);

  async function confirmarRemarcacao() {
    const pid = estado.profissionalId === 'qualquer' ? estado.slot.profissionais[0] : estado.profissionalId;
    ctx.ocupado(true, 'Remarcando');
    try {
      const ag = await remarcarAgendamento(estado.remarcar.id, estado.slot.inicio, pid);
      estado.resultado = ag;
      ctx.concluido(ag, 'remarcado');
    } catch (err) {
      ctx.ocupado(false);
      cache = new Map();
      estado.slot = null;
      pintarSlots(false);
      mostrarAviso(`${err.message} Escolha outro horário.`);
      ctx.atualizar();
    }
  }

  const remarcando = estado.modo === 'remarcar';
  return {
    el: raiz,
    titulo: remarcando ? 'Escolha o novo horário' : 'Escolha o dia e a hora',
    sub: remarcando ? `Seu horário atual continua valendo até você confirmar o novo.` : 'Domingo a barbearia fica fechada.',
    aoMostrar() {
      centralizarDia(false);
      setas();
      marcarLotados();
    },
    // Outra aba ou o admin mexeu na agenda: recalcula sem perder a escolha, se ainda existir.
    aoMudarAgenda() {
      cache = new Map();
      const antes = estado.slot;
      if (antes && !livres(estado.dia).some((s) => s.hora === antes.hora)) {
        estado.slot = null;
        mostrarAviso(`O horário das ${antes.hora} acabou de ser reservado. Escolha outro.`);
        ctx.atualizar();
      }
      pintarSlots(false);
      marcarLotados();
    },
    rodape: () => ({
      rotulo: remarcando ? 'Confirmar novo horário' : 'Continuar',
      habilitado: !!estado.slot,
      dica: estado.slot ? '' : 'Escolha um horário livre.',
      aoClicar: () => (remarcando ? confirmarRemarcacao() : ctx.ir(4)),
    }),
  };
}

