import { url } from '../../lib/base.js';
// Serviços: a janela de cada serviço fecha para cima enquanto a próxima abre por baixo.
// As imagens não se mexem; só a janela anda. Abas, textos e preços acompanham.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// A primeira parte da rolagem é a entrada pela lateral (conduzida pela cena da casa).
// Depois disso vêm as cinco trocas de serviço.
let T0 = 0.1;
const PASSO = 0.14;
const DUR = 0.1;
const GAP = 2.4; // espaço entre as janelas, em % da altura

export function cenaServicos({ gsap, lenis }) {
  const cena = $('[data-cena="servicos"]');
  const janelas = $$('[data-obturador] .obturador__janela');
  const textos = $$('.servicos__textos .servico-texto');
  const relacionados = $$('.relacionados');
  const abas = $$('[data-aba]');
  const marcador = $('[data-marcador]');
  const N = janelas.length;
  const entrada = () => window.innerHeight / Math.max(1, cena.offsetHeight - window.innerHeight);
  T0 = entrada() + 0.06;
  const raio = () => parseFloat(getComputedStyle(janelas[0]).borderTopLeftRadius) || 24;
  let ativo = -1;
  let cenaAtiva = false;

  const midia = (i) => janelas[i]?.firstElementChild;
  const carregar = (i) => {
    const v = midia(i);
    if (v?.tagName === 'VIDEO' && v.dataset.src && !v.src) { v.src = url(v.dataset.src); v.load(); }
  };
  const tocar = () => janelas.forEach((j, i) => {
    const v = midia(i);
    if (v?.tagName !== 'VIDEO') return;
    if (i === ativo && cenaAtiva) v.play().catch(() => {});
    else v.pause();
  });

  const posMarcador = (i) => {
    const b = abas[i];
    gsap.to(marcador, { y: b.offsetTop + b.offsetHeight / 2 - 6, duration: 0.55, ease: 'power3.out' });
  };

  const trocar = (lista, i) => {
    lista.forEach((el, k) => {
      if (k === i) {
        el.classList.add('ativo');
        gsap.fromTo(el, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', overwrite: true });
      } else if (el.classList.contains('ativo')) {
        gsap.to(el, { opacity: 0, y: -14, duration: 0.3, ease: 'power1.in', overwrite: true, onComplete: () => el.classList.remove('ativo') });
      }
    });
  };

  const definirAtivo = (i) => {
    if (i === ativo) return;
    ativo = i;
    trocar(textos, i);
    trocar(relacionados, i);
    abas.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    posMarcador(i);
    carregar(i);
    carregar(i + 1);
    tocar();
  };

  const prog = new Array(N - 1).fill(0);
  const aplicar = (k) => {
    const e = prog[k] * (100 + GAP);
    const r = raio();
    janelas[k].style.clipPath = `inset(0% 0% ${Math.min(100, e).toFixed(2)}% 0% round ${r}px)`;
    janelas[k + 1].style.clipPath = `inset(${Math.min(100, Math.max(0, 100 + GAP - e)).toFixed(2)}% 0% 0% 0% round ${r}px)`;
  };

  janelas.forEach((j, i) => { j.style.clipPath = i === 0 ? `inset(0% 0% 0% 0% round ${raio()}px)` : `inset(100% 0% 0% 0% round ${raio()}px)`; });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: cena,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      invalidateOnRefresh: true,
      onToggle: (st) => { cenaAtiva = st.isActive; tocar(); },
    },
    onUpdate: () => {
      const t = tl.time();
      let i = 0;
      for (let k = 0; k < N - 1; k++) if (t >= T0 + k * PASSO + DUR / 2) i = k + 1;
      definirAtivo(i);
    },
  });
  tl.set({}, {}, 1);
  for (let k = 0; k < N - 1; k++) {
    const o = { p: 0 };
    const t = T0 + k * PASSO;
    tl.to(o, { p: 1, duration: DUR, ease: 'power1.inOut', onUpdate: () => { prog[k] = o.p; aplicar(k); } }, t);
    tl.fromTo(midia(k), { scale: 1 }, { scale: 1.08, duration: DUR, ease: 'power1.in' }, t);
    tl.fromTo(midia(k + 1), { scale: 1.14 }, { scale: 1, duration: DUR + 0.04, ease: 'power2.out' }, t);
  }

  // Título sobe quando a seção entra
  gsap.from($$('#servicos-titulo .linha > span'), {
    yPercent: 115, duration: 1.1, ease: 'power4.out', stagger: 0.08,
    scrollTrigger: { trigger: cena, start: 'top 70%', toggleActions: 'play none none reverse' },
  });

  // Pré-carrega os vídeos antes da seção chegar
  gsap.timeline({ scrollTrigger: { trigger: cena, start: 'top 250%', onEnter: () => { carregar(1); carregar(2); } } });

  // Clicar numa aba leva ao ponto certo da rolagem
  abas.forEach((b, i) => b.addEventListener('click', () => {
    const st = tl.scrollTrigger;
    const t = i === 0 ? T0 - 0.03 : T0 + (i - 1) * PASSO + DUR + 0.02;
    lenis.scrollTo(st.start + t * (st.end - st.start), { duration: 1.4 });
  }));

  definirAtivo(0);
  requestAnimationFrame(() => posMarcador(0));
}
