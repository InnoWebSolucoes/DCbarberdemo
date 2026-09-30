// Passo 2: escolha do profissional.
import { estado, profissionaisPossiveis, marcarMexeu } from './estado.js';
import { el, esc, foto, icone, monograma, $$ } from './ui.js';

function cartao({ id, nome, funcao, resumo, visual }) {
  const marcado = estado.profissionalId === id;
  return `
    <label class="ag-prof${marcado ? ' is-marcado' : ''}${id === 'qualquer' ? ' ag-prof--qualquer' : ''}">
      <input type="radio" name="ag-prof" class="ag-prof__input" value="${id}"${marcado ? ' checked' : ''}>
      <span class="ag-prof__visual">${visual}<span class="ag-prof__marca" aria-hidden="true">${icone.check}</span></span>
      <span class="ag-prof__texto">
        <span class="ag-prof__nome">${esc(nome)}</span>
        <span class="ag-prof__funcao">${esc(funcao)}</span>
        <span class="ag-prof__resumo">${esc(resumo)}</span>
      </span>
    </label>`;
}

export function montar(ctx) {
  const possiveis = profissionaisPossiveis();
  if (estado.profissionalId && estado.profissionalId !== 'qualquer' && !possiveis.some((p) => p.id === estado.profissionalId)) {
    estado.profissionalId = null;
  }
  if (estado.profissionalId === 'qualquer' && possiveis.length < 2) estado.profissionalId = null;
  if (!estado.profissionalId && possiveis.length === 1) estado.profissionalId = possiveis[0].id;

  const cartoes = possiveis.map((p) => cartao({
    id: p.id, nome: p.nome, funcao: p.funcao, resumo: p.resumo,
    visual: foto(p, { forma: 'retrato', classe: 'ag-prof__foto' }),
  }));
  if (possiveis.length > 1) {
    cartoes.push(cartao({
      id: 'qualquer', nome: 'Sem preferência', funcao: 'O primeiro livre',
      resumo: 'Mostramos os horários de todos e o atendimento fica com quem estiver livre.',
      visual: `<span class="ag-prof__mono">${monograma()}</span>`,
    }));
  }

  const unico = possiveis.length === 1;
  const raiz = el(`
    <div class="ag-passo ag-profissional">
      ${unico ? `<p class="ag-passo__nota">Estes serviços são feitos só pela ${esc(possiveis[0].nome)}, no estúdio dentro da barbearia.</p>` : ''}
      <div class="ag-profs ag-profs--${cartoes.length}" role="radiogroup" aria-label="Profissional">${cartoes.join('')}</div>
    </div>`);

  raiz.addEventListener('change', (e) => {
    const input = e.target.closest('.ag-prof__input');
    if (!input) return;
    if (estado.profissionalId !== input.value) estado.slot = null;
    estado.profissionalId = input.value;
    marcarMexeu();
    $$('.ag-prof', raiz).forEach((c) => c.classList.toggle('is-marcado', c.querySelector('input').checked));
    ctx.atualizar();
  });

  return {
    el: raiz,
    titulo: 'Escolha o profissional',
    sub: unico ? 'Confira quem vai atender você.' : 'Todos fazem os serviços que você escolheu.',
    rodape: () => ({
      rotulo: 'Continuar',
      habilitado: !!estado.profissionalId,
      dica: estado.profissionalId ? '' : 'Escolha um profissional ou "Sem preferência".',
      aoClicar: () => ctx.ir(3),
    }),
  };
}
