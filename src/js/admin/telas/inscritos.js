// Inscritos: clientes com marketing ligado, prazo do lembrete, origem e data. Adicionar e remover.
import { html, raw, render, acoes, debounce, normalizar } from '../dom.js';
import { icon } from '../icons.js';
import { col, porId, statsDe, ORIGEM_CLI, PRAZOS_LEMBRETE, inscritos, haDias } from '../dados.js';
import { vazio, paginacao, thOrdem, ordenar, alternarOrdem, toast, confirmar, abrirCamada, topoCamada } from '../ui.js';
import { abrirCliente } from '../paineis/cliente.js';
import { atualizarCliente, assinarNewsletter } from '../../data/api.js';
import { dataCurta, dataMedia, primeiroNome } from '../../lib/format.js';

const POR_PAGINA = 25;
const st = { q: '', ordem: { campo: 'desde', dir: 'desc' }, pagina: 1 };
let raiz = null;

function filtrados() {
  const q = normalizar(st.q);
  const lista = inscritos().filter((c) => !q || normalizar(c.nome).includes(q) || c.email.includes(q));
  return ordenar(lista, st.ordem, {
    nome: (c) => c.nome,
    lembrete: (c) => c.lembreteDias || 0,
    origem: (c) => ORIGEM_CLI[c.origem] || c.origem || '',
    desde: (c) => c.criadoEm,
    ultima: (c) => statsDe(c.id).ultima?.inicio || null,
  });
}

function desenharTabela() {
  const alvo = raiz?.querySelector('[data-tabela]');
  if (!alvo) return;
  const lista = filtrados();
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  st.pagina = Math.min(st.pagina, paginas);
  const pagina = lista.slice((st.pagina - 1) * POR_PAGINA, st.pagina * POR_PAGINA);
  const o = st.ordem;
  render(raiz.querySelector('[data-conta]'), `${inscritos().length} inscritos recebem lembretes e campanhas.`);
  render(alvo, lista.length ? html`
    <div class="tabela-caixa">
      <div class="tabela-rolo">
        <table class="tabela tabela--insc">
          <thead><tr>
            ${thOrdem('Nome', 'nome', o)}
            ${thOrdem('Lembrete a cada', 'lembrete', o)}
            ${thOrdem('Origem', 'origem', o)}
            ${thOrdem('Cliente desde', 'desde', o)}
            ${thOrdem('Última visita', 'ultima', o)}
            <th><span class="sr-only">Ações</span></th>
          </tr></thead>
          <tbody>
            ${pagina.map((c) => {
              const s = statsDe(c.id);
              const prazos = PRAZOS_LEMBRETE.includes(c.lembreteDias) ? PRAZOS_LEMBRETE : [...PRAZOS_LEMBRETE, c.lembreteDias].filter(Boolean).sort((a, b) => a - b);
              return html`<tr>
                <td><button type="button" class="linha-botao" data-act="abrir" data-id="${c.id}">${c.nome}</button><span class="tabela__sub corta">${c.email}</span></td>
                <td><label class="sr-only" for="lem-${c.id}">Lembrete de ${c.nome}</label>
                  <select class="selecao selecao--sm selecao--mini" id="lem-${c.id}" data-lembrete="${c.id}">
                    ${prazos.map((d) => html`<option value="${d}" ${d === c.lembreteDias ? raw('selected') : ''}>${d} dias</option>`)}
                  </select></td>
                <td class="fraco">${ORIGEM_CLI[c.origem] || c.origem || 'Não informada'}</td>
                <td class="num">${dataMedia(c.criadoEm)}</td>
                <td class="num">${s.ultima ? html`${dataCurta(s.ultima.inicio)}<span class="tabela__sub">${haDias(s.ultima.inicio)}</span>` : html`<span class="fraco">Ainda não veio</span>`}</td>
                <td class="dir"><button type="button" class="btn a-btn a-btn--leve a-btn--sm" data-act="remover" data-id="${c.id}">Remover</button></td>
              </tr>`;
            })}
          </tbody>
        </table>
      </div>
      ${paginacao({ pagina: st.pagina, porPagina: POR_PAGINA, total: lista.length })}
    </div>`
    : html`<div class="tabela-caixa">${vazio(st.q ? `Nenhum inscrito encontrado para "${st.q}".` : 'Ninguém inscrito ainda. Clique em Adicionar inscrito ou peça aos clientes para aceitar os lembretes ao agendar.',
      html`<button type="button" class="btn a-btn a-btn--linha a-btn--sm" data-act="adicionar">${icon('mais', 15)}Adicionar inscrito</button>`)}</div>`);
}

function abrirAdicionar() {
  const c = abrirCamada({ tipo: 'modal', rotulo: 'Adicionar inscrito' });
  c.painel.innerHTML = html`
    ${topoCamada({ titulo: 'Adicionar inscrito', sub: 'E-mail marketing' })}
    <form class="camada__corpo form-inscrito" novalidate>
      <label class="campo"><span class="campo__rotulo">Nome</span><input class="entrada" name="nome" autocomplete="off" data-foco-inicial></label>
      <label class="campo"><span class="campo__rotulo">E-mail</span><input class="entrada" name="email" type="email" autocomplete="off" required></label>
      <label class="campo"><span class="campo__rotulo">Lembrete de corte a cada</span>
        <select class="selecao" name="dias">${PRAZOS_LEMBRETE.map((d) => html`<option value="${d}" ${d === 21 ? raw('selected') : ''}>${d} dias</option>`)}</select></label>
      <p class="campo__ajuda">Adicione só quem pediu para receber os e-mails. Todo e-mail tem o link para cancelar.</p>
      <p class="erro-caixa" data-erro hidden></p>
      <button type="submit" hidden></button>
    </form>
    <footer class="camada__rodape">
      <button type="button" class="btn a-btn a-btn--leve" data-act="fechar">Cancelar</button>
      <button type="button" class="btn a-btn a-btn--preto" data-ok>Adicionar</button>
    </footer>`.toString();
  const form = c.painel.querySelector('form');
  const erro = c.painel.querySelector('[data-erro]');
  const enviar = async () => {
    const nome = form.nome.value.trim();
    const email = form.email.value.trim().toLowerCase();
    const dias = Number(form.dias.value);
    try {
      const existente = col('clientes').find((x) => x.email === email);
      if (existente?.marketing) throw new Error(`${existente.nome} já está inscrito.`);
      let cli;
      if (existente) cli = await atualizarCliente(existente.id, { marketing: true, lembreteDias: dias });
      else {
        cli = await assinarNewsletter({ email, nome });
        cli = await atualizarCliente(cli.id, { lembreteDias: dias, origem: 'painel', nome: nome || cli.nome });
      }
      c.fechar();
      toast(`${cli.nome} inscrito. Recebe o lembrete a cada ${dias} dias.`);
    } catch (e) {
      erro.textContent = e.message;
      erro.hidden = false;
    }
  };
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    enviar();
  });
  c.painel.querySelector('[data-ok]').addEventListener('click', enviar);
  c.focar();
}

export default {
  montar(el) {
    raiz = el;
    render(el, html`
      <div class="camp-topo">
        <p class="camp-topo__txt" data-conta></p>
        <button type="button" class="btn a-btn a-btn--preto" data-act="adicionar">${icon('mais', 16)}Adicionar inscrito</button>
      </div>
      <div class="filtros">
        <div class="entrada-ico">${icon('busca', 17)}
          <label class="sr-only" for="insc-q">Buscar inscrito</label>
          <input class="entrada entrada--sm" id="insc-q" type="search" placeholder="Nome ou e-mail" value="${st.q}" autocomplete="off">
        </div>
      </div>
      <div data-tabela></div>`);
    desenharTabela();
    acoes(el, {
      abrir: (b) => abrirCliente(b.dataset.id),
      adicionar: abrirAdicionar,
      ordem: (b) => {
        st.ordem = alternarOrdem(st.ordem, b.dataset.id, ['desde', 'ultima', 'lembrete'].includes(b.dataset.id));
        desenharTabela();
      },
      pagina: (b) => {
        st.pagina = Number(b.dataset.id);
        desenharTabela();
      },
      remover: async (b) => {
        const c = porId('clientes', b.dataset.id);
        const ok = await confirmar({
          titulo: `Remover ${primeiroNome(c.nome)} dos inscritos?`,
          texto: `${c.email} deixa de receber lembretes e campanhas. Confirmações e faturas continuam chegando.`,
          ok: 'Remover inscrição',
          perigo: true,
        });
        if (!ok) return;
        await atualizarCliente(c.id, { marketing: false });
        toast(`${c.nome} removido dos inscritos.`, { acao: 'Desfazer', aoAgir: () => atualizarCliente(c.id, { marketing: true }) });
      },
    });
    el.addEventListener('change', async (ev) => {
      const id = ev.target.dataset.lembrete;
      if (!id) return;
      const c = porId('clientes', id);
      await atualizarCliente(id, { lembreteDias: Number(ev.target.value) });
      toast(`Lembrete de ${primeiroNome(c.nome)} a cada ${ev.target.value} dias.`);
    });
    const buscar = debounce(() => {
      st.pagina = 1;
      desenharTabela();
    }, 140);
    el.addEventListener('input', (ev) => {
      if (ev.target.id !== 'insc-q') return;
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
