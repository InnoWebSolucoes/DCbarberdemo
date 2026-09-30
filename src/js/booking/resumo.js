// Resumo persistente (lado esquerdo no desktop, barra compacta no celular).
import { precoServico, duracao as fmtDuracao, moeda } from '../lib/format.js';
import { estado, resumo, servicosEscolhidos, profissionalEscolhido, PASSOS } from './estado.js';
import { esc, foto, icone, monograma, plural, pontosHex } from './ui.js';
import { diaLongo, faixaHora, diaCurto } from './datas.js';
import { hhmm } from '../lib/format.js';
import { profissionalPorId } from '../data/catalog.js';

const alterar = (passo, rotulo) =>
  `<button type="button" class="ag-resumo__alterar" data-ir="${passo}" aria-label="${rotulo}">Alterar</button>`;

function blocoServicos() {
  const lista = servicosEscolhidos();
  const podeRemover = estado.passo === 1;
  const podeAlterar = estado.modo === 'novo' && estado.passo > 1 && estado.passo < 5;
  const itens = lista.map((s) => `
    <li class="ag-resumo__servico">
      <span class="ag-resumo__nome">${esc(s.nome)}</span>
      <span class="ag-resumo__preco">${esc(precoServico(s))}</span>
      ${podeRemover ? `<button type="button" class="ag-resumo__remover" data-remover="${s.id}" aria-label="Remover ${esc(s.nome)}">${icone.remover}</button>` : ''}
    </li>`).join('');
  return `
    <div class="ag-resumo__bloco">
      <div class="ag-resumo__topo"><p class="ag-resumo__rotulo">Serviços</p>${podeAlterar ? alterar(1, 'Alterar serviços') : ''}</div>
      ${lista.length ? `<ul class="ag-resumo__servicos">${itens}</ul>` : '<p class="ag-resumo__vazio">Nenhum serviço escolhido ainda.</p>'}
    </div>`;
}

function blocoProfissional() {
  const p = profissionalEscolhido();
  const podeAlterar = estado.modo === 'novo' && estado.passo > 2 && estado.passo < 5;
  let corpo;
  if (estado.resultado) {
    corpo = pessoa(estado.resultado.profissionalId);
  } else if (!p) {
    corpo = '<p class="ag-resumo__vazio">Ainda não escolhido.</p>';
  } else if (p.id === 'qualquer') {
    corpo = `<div class="ag-resumo__pessoa"><span class="ag-resumo__circ">${monograma()}</span><div><strong>Sem preferência</strong><span>O primeiro que estiver livre</span></div></div>`;
  } else {
    corpo = pessoa(p.id);
  }
  return `
    <div class="ag-resumo__bloco">
      <div class="ag-resumo__topo"><p class="ag-resumo__rotulo">Profissional</p>${podeAlterar ? alterar(2, 'Alterar profissional') : ''}</div>
      ${corpo}
    </div>`;
}

function pessoa(id) {
  const p = profissionalEscolhidoPorId(id);
  if (!p) return '';
  return `<div class="ag-resumo__pessoa">${foto(p, { classe: 'ag-resumo__foto' })}<div><strong>${esc(p.nome)}</strong><span>${esc(p.funcao)}</span></div></div>`;
}

const profissionalEscolhidoPorId = (id) => profissionalPorId(id);

function blocoHorario() {
  const r = resumo();
  const podeAlterar = estado.passo === 4;
  let corpo;
  const inicio = estado.resultado?.inicio || estado.slot?.inicio;
  if (inicio) {
    corpo = `<p class="ag-resumo__data">${esc(diaLongo(inicio))}</p><p class="ag-resumo__hora">${esc(faixaHora(inicio, r.duracao))}</p>`;
  } else {
    corpo = '<p class="ag-resumo__vazio">Ainda não escolhido.</p>';
  }
  const atual = estado.modo === 'remarcar' && estado.remarcar && estado.passo < 5
    ? `<p class="ag-resumo__atual">Horário atual: ${esc(diaCurto(estado.remarcar.inicio))}, ${hhmm(new Date(estado.remarcar.inicio))}</p>`
    : '';
  return `
    <div class="ag-resumo__bloco">
      <div class="ag-resumo__topo"><p class="ag-resumo__rotulo">Dia e hora</p>${podeAlterar ? alterar(3, 'Alterar dia e hora') : ''}</div>
      ${corpo}${atual}
    </div>`;
}

function blocoTotal() {
  const r = resumo();
  const vazio = !estado.servicos.length;
  return `
    <div class="ag-resumo__total">
      <div><span>Total</span><strong>${vazio ? moeda(0) : esc(r.totalTexto)}</strong></div>
      <div><span>Duração</span><strong>${vazio ? '0 min' : fmtDuracao(r.duracao)}</strong></div>
    </div>`;
}

export function htmlResumo() {
  return `${blocoServicos()}${blocoProfissional()}${blocoHorario()}${blocoTotal()}`;
}

export function htmlProgresso() {
  const atual = Math.min(estado.passo, 5);
  const hex = (i) => {
    const feito = i < atual;
    const agora = i === atual;
    return `<li class="ag-prog__item${feito ? ' is-feito' : ''}${agora ? ' is-atual' : ''}">
      <svg class="ag-prog__hex" viewBox="0 0 16 14" aria-hidden="true"><polygon points="${pontosHex(16, 14, 1)}"/></svg>
      <span class="sr-only">${PASSOS[i - 1].nome}${feito ? ', concluído' : agora ? ', passo atual' : ''}</span>
    </li>`;
  };
  const itens = PASSOS.map((p) => hex(p.n)).join('<li class="ag-prog__linha" aria-hidden="true"></li>');
  const texto = atual >= 5 ? 'Concluído' : `Passo ${atual} de 4`;
  return `<ol class="ag-prog__lista">${itens}</ol><p class="ag-prog__texto">${texto}</p>`;
}

// Texto da barra compacta do celular: [linha principal, linha secundária]
export function linhasBarra() {
  const r = resumo();
  const n = estado.servicos.length;
  const total = n ? r.totalTexto : '';
  const p = profissionalEscolhido();
  if (!n) return ['Nenhum serviço escolhido', 'Escolha pelo menos um'];
  if (estado.passo === 1) return [`${plural(n, 'serviço', 'serviços')}, ${total}`, fmtDuracao(r.duracao)];
  if (estado.passo === 2) return [p ? p.nome : 'Escolha o profissional', `${plural(n, 'serviço', 'serviços')}, ${total}`];
  if (estado.slot) return [`${diaCurto(estado.slot.inicio)}, ${estado.slot.hora}`, `${p ? p.nome : ''}, ${total}`];
  return ['Escolha o horário', `${p ? p.nome : ''}, ${total}`];
}

export { monograma };
