// Tabela de preços no celular: uma categoria por vez, escolhida nas abas ou deslizando para o lado.
// Cada serviço abre para mostrar a descrição e o botão de agendar.
import gsap from 'gsap';
import { categorias, servicos } from '../data/catalog.js';
import { precoServico, duracao, moeda, escapeHtml } from '../lib/format.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const CAPAS = { cortes: 'cortes', barba: 'barba', combos: 'combos', quimica: 'quimica', cuidados: 'cuidados', estudio: 'estudio' };

const faixa = (itens) => {
  const precos = itens.filter((s) => s.preco != null).map((s) => s.preco);
  if (!precos.length) return 'preço sob consulta';
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  return min === max ? moeda(min) : `de ${moeda(min)} a ${moeda(max)}`;
};

const seta = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';

let montada = false;

export function montarTabelaCelular() {
  const raiz = $('[data-tabela-m]');
  if (!raiz || montada) return;
  montada = true;

  raiz.innerHTML = `
    <div class="tabela-m__abas" role="tablist" aria-label="Categorias de serviço">
      <span class="tabela-m__indicador" aria-hidden="true"></span>
      ${categorias.map((c, i) => `<button type="button" role="tab" class="tabela-m__aba" data-i="${i}" aria-selected="${i === 0}">${escapeHtml(c.nome)}</button>`).join('')}
    </div>
    <div class="tabela-m__painel" role="tabpanel" aria-live="polite">
      <div class="tabela-m__conteudo" data-conteudo></div>
    </div>
    <p class="tabela-m__dica">Deslize para o lado para trocar de categoria.</p>`;

  const abas = $('.tabela-m__abas', raiz);
  const botoes = $$('.tabela-m__aba', raiz);
  const indicador = $('.tabela-m__indicador', raiz);
  const painel = $('.tabela-m__painel', raiz);
  const conteudo = $('[data-conteudo]', raiz);
  let atual = 0;
  let trocando = false;

  const html = (i) => {
    const c = categorias[i];
    const itens = servicos.filter((s) => s.cat === c.id);
    const nota = c.id === 'estudio' ? 'Com a Clayre, no estúdio dentro da DC' : `${itens.length} serviços, ${faixa(itens)}`;
    return `
      <div class="tabela-m__capa">
        <img src="/media/tabela/${CAPAS[c.id]}.webp" alt="" loading="lazy">
        <div class="tabela-m__capa-texto">
          <p class="tabela-m__contagem">${i + 1} de ${categorias.length}</p>
          <h3>${escapeHtml(c.nome)}</h3>
          <p>${escapeHtml(nota)}</p>
        </div>
      </div>
      <ul class="tabela-m__lista">
        ${itens.map((s) => `
          <li class="tabela-m__item">
            <button type="button" class="tabela-m__linha" aria-expanded="false">
              <span class="tabela-m__nome">${escapeHtml(s.nome)}${s.destaque ? '<em>Mais pedido</em>' : ''}<small>${duracao(s.duracao)}</small></span>
              <span class="tabela-m__preco">${precoServico(s).replace('A partir de ', 'desde ')}</span>
              ${seta}
            </button>
            <div class="tabela-m__detalhe" hidden>
              <p>${escapeHtml(s.desc)}</p>
              <button type="button" class="btn btn--ouro" data-agendar data-servicos="${s.id}">Agendar este serviço</button>
            </div>
          </li>`).join('')}
      </ul>`;
  };

  const moverIndicador = (animar = true) => {
    const b = botoes[atual];
    const props = { x: b.offsetLeft, width: b.offsetWidth };
    if (animar) gsap.to(indicador, { ...props, duration: 0.5, ease: 'power3.out' });
    else gsap.set(indicador, props);
    const alvo = b.offsetLeft - (abas.clientWidth - b.offsetWidth) / 2;
    abas.scrollTo({ left: alvo, behavior: animar ? 'smooth' : 'auto' });
  };

  const entrar = (dir) => {
    const capa = $('.tabela-m__capa', conteudo);
    const linhas = $$('.tabela-m__item', conteudo);
    gsap.fromTo(conteudo, { x: 46 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
    gsap.fromTo($('img', capa), { scale: 1.12 }, { scale: 1, duration: 0.9, ease: 'power3.out' });
    gsap.fromTo(linhas, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out', stagger: 0.045, delay: 0.08 });
  };

  const ir = (i) => {
    if (i === atual || i < 0 || i >= categorias.length || trocando) return;
    const dir = i > atual ? 1 : -1;
    trocando = true;
    atual = i;
    botoes.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    moverIndicador();
    gsap.to(conteudo, {
      x: -46 * dir, opacity: 0, duration: 0.22, ease: 'power2.in',
      onComplete: () => {
        conteudo.innerHTML = html(i);
        entrar(dir);
        trocando = false;
        const topo = raiz.getBoundingClientRect().top;
        if (topo < 0) window.scrollBy({ top: topo - 12, behavior: 'smooth' });
      },
    });
  };

  botoes.forEach((b, i) => b.addEventListener('click', () => ir(i)));
  abas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { ir(atual + 1); botoes[atual].focus(); }
    if (e.key === 'ArrowLeft') { ir(atual - 1); botoes[atual].focus(); }
  });

  // Abrir e fechar um serviço
  conteudo.addEventListener('click', (e) => {
    const linha = e.target.closest('.tabela-m__linha');
    if (!linha) return;
    const item = linha.parentElement;
    const det = $('.tabela-m__detalhe', item);
    const abrir = linha.getAttribute('aria-expanded') !== 'true';
    $$('.tabela-m__linha[aria-expanded="true"]', conteudo).forEach((l) => {
      if (l === linha) return;
      l.setAttribute('aria-expanded', 'false');
      const d = l.nextElementSibling;
      gsap.to(d, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.inOut', onComplete: () => { d.hidden = true; } });
    });
    linha.setAttribute('aria-expanded', String(abrir));
    if (abrir) {
      det.hidden = false;
      gsap.fromTo(det, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.45, ease: 'power3.out' });
    } else {
      gsap.to(det, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.inOut', onComplete: () => { det.hidden = true; } });
    }
  });

  // Deslizar para trocar de categoria
  let x0 = 0, y0 = 0;
  painel.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  painel.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) ir(atual + (dx < 0 ? 1 : -1));
  }, { passive: true });

  conteudo.innerHTML = html(0);
  requestAnimationFrame(() => moverIndicador(false));
  window.addEventListener('resize', () => moverIndicador(false));

  // Entrada da tabela quando ela aparece na tela
  gsap.from([abas, painel], {
    y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12,
    scrollTrigger: { trigger: raiz, start: 'top 85%' },
  });
  gsap.from($$('.tabela-m__item', conteudo), {
    y: 18, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05,
    scrollTrigger: { trigger: raiz, start: 'top 60%' },
  });
}
