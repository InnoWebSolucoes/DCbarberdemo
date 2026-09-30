// Campo para escolher um cliente existente (com busca) ou cadastrar um novo.
import { html, render, normalizar, debounce } from '../dom.js';
import { icon } from '../icons.js';
import { col, porId, statsDe } from '../dados.js';
import { avatar } from '../ui.js';
import { dataCurta } from '../../lib/format.js';

let seq = 0;

export function seletorCliente(el, { clienteId = null, permitirNovo = false, aoMudar = () => {} } = {}) {
  const uid = `sc${++seq}`;
  const st = { id: clienteId, modo: clienteId ? 'escolhido' : 'busca', q: '', sel: 0, novo: { nome: '', email: '', telefone: '' } };

  const resultados = () => {
    const q = normalizar(st.q);
    const todos = col('clientes');
    if (!q) {
      // Sem busca: os clientes atendidos mais recentemente.
      return [...todos].filter((c) => statsDe(c.id).ultima).sort((a, b) => statsDe(b.id).ultima.inicio.localeCompare(statsDe(a.id).ultima.inicio)).slice(0, 6);
    }
    const dig = q.replace(/\D/g, '');
    return todos
      .filter((c) => normalizar(c.nome).includes(q) || c.email.includes(q) || (dig.length >= 3 && c.telefone.replace(/\D/g, '').includes(dig)))
      .sort((a, b) => normalizar(a.nome).indexOf(q) - normalizar(b.nome).indexOf(q) || a.nome.localeCompare(b.nome))
      .slice(0, 7);
  };

  const desenhar = (focar) => {
    if (st.modo === 'escolhido') {
      const c = porId('clientes', st.id);
      const s = statsDe(st.id);
      render(el, html`
        <div class="sc-escolhido">
          ${avatar(c?.nome || '')}
          <span class="sc-escolhido__info"><strong>${c?.nome || 'Cliente removido'}</strong>
            <small>${c?.email || ''}${c?.telefone ? `, ${c.telefone}` : ''}</small>
            <small>${s.visitas ? `${s.visitas} ${s.visitas === 1 ? 'visita' : 'visitas'}, última em ${dataCurta(s.ultima.inicio)}` : 'Ainda sem visitas concluídas'}</small></span>
          <button type="button" class="btn a-btn a-btn--leve a-btn--sm" data-sc="trocar">Trocar</button>
        </div>`);
      if (focar) el.querySelector('[data-sc="trocar"]').focus();
      return;
    }
    if (st.modo === 'novo') {
      render(el, html`
        <div class="sc-novo">
          <div class="linha-campos">
            <label class="campo"><span class="campo__rotulo">Nome</span><input class="entrada" id="${uid}-nome" data-novo="nome" value="${st.novo.nome}" autocomplete="off" required></label>
            <label class="campo"><span class="campo__rotulo">Telefone</span><input class="entrada" id="${uid}-tel" data-novo="telefone" value="${st.novo.telefone}" type="tel" placeholder="+351 912 345 678" autocomplete="off"></label>
          </div>
          <label class="campo"><span class="campo__rotulo">E-mail</span><input class="entrada" id="${uid}-email" data-novo="email" type="email" value="${st.novo.email}" placeholder="nome@exemplo.com" autocomplete="off" required>
            <span class="campo__ajuda">Recebe a confirmação do horário e, depois, a fatura.</span></label>
          <button type="button" class="link-seco sc-voltar" data-sc="buscar">Escolher um cliente que já existe</button>
        </div>`);
      if (focar) el.querySelector(`#${uid}-nome`).focus();
      return;
    }
    const lista = resultados();
    st.sel = Math.min(st.sel, Math.max(0, lista.length - 1));
    const campo = el.querySelector(`#${uid}-q`);
    if (campo) {
      // Já está no modo busca: troca só a lista para não atrapalhar a digitação.
      render(el.querySelector('.sc-dica'), st.q ? '' : 'Atendidos recentemente');
      render(el.querySelector(`#${uid}-lista`), itens(lista));
      if (lista.length) campo.setAttribute('aria-activedescendant', `${uid}-op-${st.sel}`);
      else campo.removeAttribute('aria-activedescendant');
      el.querySelector(`#${uid}-op-${st.sel}`)?.scrollIntoView({ block: 'nearest' });
      if (focar && document.activeElement !== campo) campo.focus();
      return;
    }
    render(el, html`
      <div class="sc-busca">
        <div class="entrada-ico">${icon('busca', 17)}
          <input class="entrada" id="${uid}-q" type="search" value="${st.q}" placeholder="Nome, e-mail ou telefone" autocomplete="off"
            role="combobox" aria-expanded="true" aria-controls="${uid}-lista" aria-label="Buscar cliente" data-esc-local ${lista.length ? html`aria-activedescendant="${uid}-op-${st.sel}"` : ''}>
        </div>
        <p class="sc-dica">${st.q ? '' : 'Atendidos recentemente'}</p>
        <ul class="sc-lista" id="${uid}-lista" role="listbox" aria-label="Clientes">${itens(lista)}</ul>
        ${permitirNovo ? html`<button type="button" class="btn a-btn a-btn--linha a-btn--sm sc-novo-btn" data-sc="novo">${icon('mais', 15)}Cliente novo</button>` : ''}
      </div>`);
    if (focar) {
      const q = el.querySelector(`#${uid}-q`);
      q.focus();
      q.setSelectionRange(q.value.length, q.value.length);
    }
  };

  const itens = (lista) => html`
    ${lista.map((c, i) => html`
      <li role="option" id="${uid}-op-${i}" aria-selected="${i === st.sel}" class="sc-op" data-sc="escolher" data-id="${c.id}">
        ${avatar(c.nome)}<span><strong>${c.nome}</strong><small>${c.email}</small></span>
      </li>`)}
    ${!lista.length ? html`<li class="sc-nada">Nenhum cliente com "${st.q}".${permitirNovo ? ' Cadastre como cliente novo.' : ''}</li>` : ''}`;

  const escolher = (id) => {
    st.id = id;
    st.modo = 'escolhido';
    desenhar(true);
    aoMudar(api.valor());
  };

  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-sc]');
    if (!b) return;
    const a = b.dataset.sc;
    if (a === 'escolher') escolher(b.dataset.id);
    else if (a === 'trocar' || a === 'buscar') {
      st.modo = 'busca';
      st.id = null;
      desenhar(true);
      aoMudar(api.valor());
    } else if (a === 'novo') {
      st.modo = 'novo';
      st.id = null;
      if (st.q && !st.q.includes('@')) st.novo.nome = st.q.replace(/\b\w/g, (l) => l.toUpperCase());
      else if (st.q.includes('@')) st.novo.email = st.q;
      desenhar(true);
      aoMudar(api.valor());
    }
  });

  const refazer = debounce(() => desenhar(true), 80);
  el.addEventListener('input', (ev) => {
    if (ev.target.id === `${uid}-q`) {
      st.q = ev.target.value;
      st.sel = 0;
      refazer();
    } else if (ev.target.dataset.novo) {
      st.novo[ev.target.dataset.novo] = ev.target.value;
      aoMudar(api.valor());
    }
  });
  el.addEventListener('keydown', (ev) => {
    if (ev.target.id !== `${uid}-q`) return;
    const n = el.querySelectorAll('.sc-op').length;
    if (ev.key === 'ArrowDown' && n) { ev.preventDefault(); st.sel = (st.sel + 1) % n; desenhar(true); }
    else if (ev.key === 'ArrowUp' && n) { ev.preventDefault(); st.sel = (st.sel - 1 + n) % n; desenhar(true); }
    else if (ev.key === 'Enter') {
      ev.preventDefault();
      const op = el.querySelectorAll('.sc-op')[st.sel];
      if (op) escolher(op.dataset.id);
    } else if (ev.key === 'Escape' && st.q) {
      ev.preventDefault();
      ev.stopPropagation();
      st.q = '';
      desenhar(true);
    }
  });

  const api = {
    valor() {
      if (st.modo === 'escolhido') return { id: st.id, cliente: porId('clientes', st.id) };
      if (st.modo === 'novo') return { novo: true, ...st.novo };
      return null;
    },
    definir(id) {
      if (id) {
        st.id = id;
        st.modo = 'escolhido';
      } else {
        st.modo = 'busca';
        st.id = null;
      }
      desenhar();
    },
    focar() { desenhar(true); },
    atualizar() { if (st.modo !== 'novo') desenhar(); },
  };
  desenhar();
  return api;
}
