// Monta as partes da página que vêm dos dados reais (tabela, produtos, horários, régua do combo).
import { categorias, servicos, produtos, horarios, diasSemana } from '../data/catalog.js';
import { precoServico, duracao, moeda, escapeHtml } from '../lib/format.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export function montarTabela() {
  const lista = $('[data-precos-lista]');
  if (!lista) return;
  lista.innerHTML = categorias.map((c) => {
    const itens = servicos.filter((s) => s.cat === c.id);
    const nota = c.id === 'estudio' ? '<small>com a Clayre</small>' : `<small>${itens.length} serviços</small>`;
    return `
      <section class="categoria" data-categoria="${c.id}">
        <h3>${escapeHtml(c.nome)} ${nota}</h3>
        <ul>
          ${itens.map((s) => `
            <li>
              <button class="item-preco" type="button" data-agendar data-servicos="${s.id}">
                <span class="item-preco__nome">${escapeHtml(s.nome)}</span>
                <span class="item-preco__dur">${duracao(s.duracao)}</span>
                <span class="item-preco__valor">${precoServico(s).replace('A partir de ', 'desde ')}</span>
                <span class="item-preco__desc">${escapeHtml(s.desc)}</span>
              </button>
            </li>`).join('')}
        </ul>
      </section>`;
  }).join('');

  const imagens = $$('[data-precos-imagem] img');
  const ativar = (cat) => imagens.forEach((img) => img.classList.toggle('ativa', img.dataset.cat === cat));
  $$('.categoria', lista).forEach((sec) => {
    sec.addEventListener('mouseenter', () => ativar(sec.dataset.categoria));
    sec.addEventListener('focusin', () => ativar(sec.dataset.categoria));
  });
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => e.isIntersecting && ativar(e.target.dataset.categoria));
  }, { rootMargin: '-45% 0px -45% 0px' });
  $$('.categoria', lista).forEach((sec) => obs.observe(sec));
}

export function montarProdutos() {
  const ul = $('[data-produtos]');
  if (!ul) return;
  ul.innerHTML = produtos.map((p) => `<li><span>${escapeHtml(p.nome)}</span><span>${moeda(p.preco)}</span></li>`).join('');
}

export function montarHorarios() {
  const tbody = $('[data-horarios]');
  if (!tbody) return;
  const hoje = new Date().getDay();
  const ordem = [1, 2, 3, 4, 5, 6, 0];
  const texto = (turnos) => {
    if (!turnos.length) return 'Fechado';
    return turnos.map(([a, b]) => `${a.replace(':00', 'h').replace(':', 'h')} às ${b.replace(':00', 'h').replace(':', 'h')}`).join(' e ');
  };
  tbody.innerHTML = ordem.map((d) => `
    <tr class="${d === hoje ? 'hoje' : ''}">
      <td>${diasSemana[d]}${d === hoje ? ', hoje' : ''}</td>
      <td>${texto(horarios[d])}</td>
    </tr>`).join('');
}

// Régua de 0 a 125 minutos, um traço a cada 5 minutos
export const MARCOS = [0, 30, 60, 75, 90, 120];
export function montarRegua() {
  const trilho = $('[data-regua-trilho]');
  if (!trilho) return;
  const selos = { 0: 'corte', 30: 'barboterapia', 60: 'sobrancelha', 90: 'rosto' };
  const nomes = { corte: 'Corte', barboterapia: 'Barboterapia', sobrancelha: 'Sobrancelha', rosto: 'Esfoliação e máscara' };
  let html = '';
  for (let m = 0; m <= 150; m += 5) {
    const grande = m % 15 === 0;
    const selo = selos[m];
    html += `<div class="regua__tick ${grande ? 'regua__tick--grande' : ''}">
      ${grande ? `<span>${m} min</span>` : ''}
      ${selo ? `<div class="regua__selo"><img src="/media/combo/${selo}.webp" alt="${nomes[selo]}" loading="lazy"></div>` : ''}
    </div>`;
  }
  trilho.innerHTML = html;
}

// No celular os serviços viram uma lista com a mídia em cima de cada texto
export function montarServicosMobile() {
  const janelas = $$('[data-obturador] .obturador__janela');
  $$('.servico-texto').forEach((art, i) => {
    if ($('.servico-texto__midia', art)) return;
    const orig = janelas[i]?.firstElementChild;
    if (!orig) return;
    const midia = document.createElement('div');
    midia.className = 'servico-texto__midia';
    const clone = orig.cloneNode(true);
    if (clone.tagName === 'VIDEO') clone.setAttribute('data-auto', '');
    midia.appendChild(clone);
    art.prepend(midia);
  });
}
