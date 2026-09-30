// Modal "Novo agendamento" para o balcão (origem: balcao).
import { html, raw, render, acoes, esperar } from '../dom.js';
import { icon } from '../icons.js';
import { diaDe, hojeISO, somarDias, col } from '../dados.js';
import { abrirCamada, topoCamada, toast } from '../ui.js';
import { seletorCliente } from './seletor-cliente.js';
import { criarAgendamento, horariosLivres, resumoServicos, diaAberto } from '../../data/api.js';
import { categorias, servicosDaCategoria, profissionaisPara, equipe } from '../../data/catalog.js';
import { precoServico, duracao, isoDia, dataLonga, hhmm, dataCurta } from '../../lib/format.js';

export const idsCriadosAqui = new Set();

const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function abrirNovoAgendamento(pre = {}) {
  const st = {
    servicos: pre.servicos || [],
    prof: pre.profissionalId || null,
    dia: pre.dia || hojeISO(),
    hora: pre.hora || null,
    horaPedida: pre.hora || null,
    obs: '',
    marketing: false,
    erro: '',
    enviando: false,
    tentou: false,
  };
  const c = abrirCamada({ tipo: 'modal', classe: 'camada--largo camada--novo', rotulo: 'Novo agendamento' });
  c.painel.innerHTML = html`
    ${topoCamada({ titulo: 'Novo agendamento', sub: 'Marcação feita no balcão' })}
    <div class="camada__corpo">
      <div class="novo-ag">
        <div class="novo-ag__col">
          <section class="passo">
            <h3 class="passo__titulo"><span class="passo__n">1</span>Cliente</h3>
            <div data-cliente></div>
            <div data-marketing></div>
          </section>
          <section class="passo">
            <h3 class="passo__titulo"><span class="passo__n">2</span>Serviços</h3>
            <div data-servicos></div>
          </section>
        </div>
        <div class="novo-ag__col novo-ag__col--dir">
          <section class="passo">
            <h3 class="passo__titulo"><span class="passo__n">3</span>Profissional</h3>
            <div data-prof></div>
          </section>
          <section class="passo">
            <h3 class="passo__titulo"><span class="passo__n">4</span>Dia e horário</h3>
            <div data-dia></div>
            <div data-horas></div>
          </section>
          <section class="passo">
            <label class="campo"><span class="campo__rotulo">Observação <span class="fraco">(opcional)</span></span>
              <textarea class="texto texto--curto" data-obs placeholder="Ex.: prefere degradê baixo, vem com o filho"></textarea></label>
          </section>
        </div>
      </div>
    </div>
    <footer class="camada__rodape">
      <div class="camada__rodape-info" data-resumo></div>
      <button type="button" class="btn a-btn a-btn--leve" data-act="fechar">Cancelar</button>
      <button type="button" class="btn a-btn a-btn--preto" data-act="salvar">Confirmar agendamento</button>
    </footer>`.toString();

  const q = (s) => c.painel.querySelector(s);
  const cli = seletorCliente(q('[data-cliente]'), {
    clienteId: pre.clienteId || null,
    permitirNovo: true,
    aoMudar: () => desenharMarketing(),
  });

  function desenharMarketing() {
    const v = cli.valor();
    render(q('[data-marketing]'), v?.novo ? html`
      <label class="marcar novo-ag__mkt"><input type="checkbox" data-mkt ${st.marketing ? raw('checked') : ''}>
        <span>Aceita receber lembretes de corte por e-mail</span></label>` : '');
  }

  function desenharServicos() {
    render(q('[data-servicos]'), categorias.map((cat) => html`
      <div class="grupo-serv">
        <p class="grupo-serv__nome">${cat.nome}</p>
        <div class="chips">
          ${servicosDaCategoria(cat.id).map((s) => html`
            <button type="button" class="chip-serv" data-act="serv" data-id="${s.id}" aria-pressed="${st.servicos.includes(s.id)}">
              <span class="chip-serv__nome">${s.nome}</span>
              <span class="chip-serv__meta">${precoServico(s)}, ${duracao(s.duracao)}</span>
            </button>`)}
        </div>
      </div>`));
  }

  const profsValidos = () => (st.servicos.length ? profissionaisPara(st.servicos) : equipe);

  function desenharProf() {
    const validos = profsValidos();
    if (st.prof && !validos.some((p) => p.id === st.prof)) st.prof = null;
    if (!st.prof && validos.length === 1 && st.servicos.length) st.prof = validos[0].id;
    render(q('[data-prof]'), validos.length ? html`
      <div class="profs" role="radiogroup" aria-label="Profissional">
        ${equipe.map((p) => {
          const ok = validos.some((v) => v.id === p.id);
          return html`<button type="button" class="prof-op" role="radio" data-act="prof" data-id="${p.id}" aria-checked="${st.prof === p.id}" ${ok ? '' : raw('disabled')}>
            <img src="${p.foto}" alt="" width="36" height="36" loading="lazy"><span><strong>${p.nome}</strong><small>${ok ? p.funcao : 'Não faz estes serviços'}</small></span></button>`;
        })}
      </div>` : html`<p class="erro-caixa">Nenhum profissional faz todos esses serviços juntos. Separe em dois agendamentos: um com os barbeiros e outro com a Clayre.</p>`);
  }

  function desenharDia() {
    const hoje = hojeISO();
    const amanha = isoDia(somarDias(new Date(), 1));
    render(q('[data-dia]'), html`
      <div class="novo-ag__dia">
        <div class="pilulas">
          <button type="button" class="pilula" data-act="dia" data-id="${hoje}" aria-pressed="${st.dia === hoje}">Hoje</button>
          <button type="button" class="pilula" data-act="dia" data-id="${amanha}" aria-pressed="${st.dia === amanha}">Amanhã</button>
        </div>
        <label class="sr-only" for="na-dia">Dia</label>
        <input class="entrada entrada--sm" type="date" id="na-dia" value="${st.dia}" min="${hoje}">
      </div>
      <p class="novo-ag__dia-nome">${dataLonga(diaDe(st.dia))}</p>`);
  }

  function desenharHoras() {
    const alvo = q('[data-horas]');
    const r = resumoServicos(st.servicos);
    if (!st.servicos.length) return render(alvo, html`<p class="fraco dica-passo">Escolha os serviços para ver os horários livres.</p>`);
    if (!st.prof) return render(alvo, html`<p class="fraco dica-passo">Escolha o profissional.</p>`);
    const dia = diaDe(st.dia);
    if (!diaAberto(dia)) return render(alvo, html`<p class="fraco dica-passo">A DC fecha aos domingos. Escolha outro dia.</p>`);
    const livres = horariosLivres({ dia, duracaoMin: r.duracao, candidatos: [st.prof] });
    if (st.hora && !livres.some((s) => s.hora === st.hora)) st.hora = null;
    if (!st.hora && st.horaPedida && livres.some((s) => s.hora === st.horaPedida)) st.hora = st.horaPedida;
    const aviso = st.horaPedida && !livres.some((s) => s.hora === st.horaPedida)
      ? html`<p class="nota nota--fina">${icon('relogio', 16)}<span>${st.horaPedida} não comporta ${duracao(r.duracao)} com ${porIdProf(st.prof)}. Escolha outro horário abaixo.</span></p>` : '';
    render(alvo, livres.length ? html`
      ${aviso}
      <p class="campo__rotulo horas__rotulo">Horários livres para ${duracao(r.duracao)}</p>
      <div class="horas" role="radiogroup" aria-label="Horário">
        ${livres.map((s) => html`<button type="button" class="hora" role="radio" data-act="hora" data-id="${s.hora}" aria-checked="${st.hora === s.hora}" aria-pressed="${st.hora === s.hora}">${s.hora}</button>`)}
      </div>` : html`${aviso}<p class="fraco dica-passo">Sem horários livres neste dia com ${porIdProf(st.prof)}. Tente outro dia.</p>`);
  }

  const porIdProf = (id) => equipe.find((p) => p.id === id)?.nome || '';

  function desenharResumo() {
    const r = resumoServicos(st.servicos);
    render(q('[data-resumo]'), st.servicos.length ? html`
      <span class="novo-ag__resumo"><strong>${r.totalTexto}</strong>, ${duracao(r.duracao)}${st.hora ? html`, ${dataCurta(diaDe(st.dia))} às ${st.hora}` : ''}${st.prof ? `, ${porIdProf(st.prof)}` : ''}</span>
      ${st.erro ? html`<span class="novo-ag__erro" role="alert">${st.erro}</span>` : ''}`
      : st.erro ? html`<span class="novo-ag__erro" role="alert">${st.erro}</span>` : 'Origem: balcão');
    const btn = q('[data-act="salvar"]');
    btn.disabled = st.enviando;
    btn.innerHTML = st.enviando ? html`<span class="giro"></span>Confirmando`.toString() : 'Confirmar agendamento';
  }

  const tudo = () => {
    desenharServicos();
    desenharProf();
    desenharDia();
    desenharHoras();
    desenharResumo();
  };

  acoes(c.painel, {
    serv: (b) => {
      const id = b.dataset.id;
      st.servicos = st.servicos.includes(id) ? st.servicos.filter((x) => x !== id) : [...st.servicos, id];
      st.erro = '';
      b.setAttribute('aria-pressed', String(st.servicos.includes(id)));
      desenharProf();
      desenharHoras();
      desenharResumo();
    },
    prof: (b) => {
      st.prof = b.dataset.id;
      desenharProf();
      desenharHoras();
      desenharResumo();
      q(`[data-act="prof"][data-id="${st.prof}"]`)?.focus();
    },
    dia: (b) => {
      st.dia = b.dataset.id;
      st.hora = null;
      desenharDia();
      desenharHoras();
      desenharResumo();
    },
    hora: (b) => {
      st.hora = b.dataset.id;
      st.erro = '';
      q('[data-horas]').querySelectorAll('.hora').forEach((h) => {
        const on = h.dataset.id === st.hora;
        h.setAttribute('aria-checked', String(on));
        h.setAttribute('aria-pressed', String(on));
      });
      desenharResumo();
    },
    salvar: () => salvar(),
  });

  c.painel.addEventListener('change', (ev) => {
    if (ev.target.id === 'na-dia' && ev.target.value) {
      st.dia = ev.target.value;
      st.hora = null;
      desenharDia();
      desenharHoras();
      desenharResumo();
    } else if (ev.target.matches('[data-mkt]')) st.marketing = ev.target.checked;
  });
  c.painel.addEventListener('input', (ev) => {
    if (ev.target.matches('[data-obs]')) st.obs = ev.target.value;
  });

  async function salvar() {
    const v = cli.valor();
    st.erro = '';
    if (!v) st.erro = 'Escolha o cliente ou cadastre um novo.';
    else if (v.novo && !v.nome.trim()) st.erro = 'Digite o nome do cliente.';
    else if (v.novo && !EMAIL_OK.test(v.email.trim())) st.erro = 'Digite um e-mail válido para o cliente.';
    else if (v.novo && porEmail(v.email)) st.erro = `Já existe um cliente com ${v.email.trim()}. Use "Escolher um cliente que já existe".`;
    else if (!st.servicos.length) st.erro = 'Escolha pelo menos um serviço.';
    else if (!st.prof) st.erro = 'Escolha o profissional.';
    else if (!st.hora) st.erro = 'Escolha o horário.';
    if (st.erro) {
      desenharResumo();
      return;
    }
    const cliente = v.novo
      ? { nome: v.nome.trim(), email: v.email.trim(), telefone: v.telefone.trim() }
      : { nome: v.cliente.nome, email: v.cliente.email, telefone: v.cliente.telefone };
    const [h, m] = st.hora.split(':').map(Number);
    const inicio = diaDe(st.dia);
    inicio.setHours(h, m, 0, 0);
    st.enviando = true;
    desenharResumo();
    try {
      await esperar(350);
      const ag = await criarAgendamento({
        servicos: st.servicos, profissionalId: st.prof, inicio, cliente,
        marketing: v.novo ? st.marketing : !!v.cliente.marketing,
        observacao: st.obs.trim(), origem: 'balcao',
      });
      idsCriadosAqui.add(ag.id);
      c.fechar();
      const quando = isoDia(inicio) === hojeISO() ? `hoje às ${hhmm(inicio)}` : `${dataCurta(inicio)} às ${hhmm(inicio)}`;
      toast(`Agendamento ${ag.codigo} criado: ${ag.clienteNome}, ${quando} com ${ag.profissionalNome}. Confirmação enviada por e-mail.`, {
        acao: 'Ver', aoAgir: async () => (await import('./agendamento.js')).abrirAgendamento(ag.id), duracao: 7000,
      });
      if (location.hash.startsWith('#/agenda')) location.hash = `#/agenda/${isoDia(inicio)}`;
    } catch (e) {
      st.erro = e.message || 'Não foi possível criar o agendamento.';
      st.enviando = false;
      desenharHoras();
      desenharResumo();
    }
  }

  const porEmail = (e) => {
    const n = e.trim().toLowerCase();
    return col('clientes').find((x) => x.email === n) || null;
  };

  c.atualizar = () => {
    if (!st.enviando) desenharHoras();
    cli.atualizar();
  };

  tudo();
  desenharMarketing();
  if (pre.clienteId) c.focar('[data-act="serv"]');
  else cli.focar();
  return c;
}
