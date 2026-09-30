// Avaliações: fotos inteiras trocam pela mesma janela que fecha para cima,
// e cada depoimento sobe junto com a sua foto.
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const GAP = 2.2;

export function cenaAvaliacoes({ gsap, topo }) {
  const cena = $('[data-cena="avaliacoes"]');
  const janelas = $$('[data-obturador-avaliacoes] .obturador__janela');
  const cartoes = $$('.depoimento', cena);
  const raio = () => parseFloat(getComputedStyle(janelas[0]).borderTopLeftRadius) || 24;

  ScrollTrigger.create({
    trigger: cena,
    start: 'top 5%',
    end: 'bottom 95%',
    onToggle: (st) => topo.ocultar(st.isActive),
  });

  janelas.forEach((j, i) => { j.style.clipPath = i === 0 ? `inset(0% 0% 0% 0% round ${raio()}px)` : `inset(100% 0% 0% 0% round ${raio()}px)`; });
  const aplicar = (k, p) => {
    const e = p * (100 + GAP);
    const r = raio();
    janelas[k].style.clipPath = `inset(0% 0% ${Math.min(100, e).toFixed(2)}% 0% round ${r}px)`;
    janelas[k + 1].style.clipPath = `inset(${Math.min(100, Math.max(0, 100 + GAP - e)).toFixed(2)}% 0% 0% 0% round ${r}px)`;
  };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: cena, start: 'top top', end: 'bottom bottom', scrub: 1.4, invalidateOnRefresh: true },
  });
  tl.set({}, {}, 1);

  const trocas = [0.33, 0.64];
  trocas.forEach((t, k) => {
    const o = { p: 0 };
    tl.to(o, { p: 1, duration: 0.13, ease: 'power1.inOut', onUpdate: () => aplicar(k, o.p) }, t);
    tl.fromTo(janelas[k].firstElementChild, { scale: 1 }, { scale: 1.08, duration: 0.13 }, t);
    tl.fromTo(janelas[k + 1].firstElementChild, { scale: 1.15 }, { scale: 1, duration: 0.17, ease: 'power2.out' }, t);
  });

  const entradas = [0.02, 0.35, 0.66];
  cartoes.forEach((c, i) => {
    tl.fromTo(c, { y: () => innerHeight * (i === 0 ? 0.7 : 1.1) }, { y: 0, duration: 0.13, ease: 'power2.out' }, entradas[i]);
    if (i < cartoes.length - 1) tl.to(c, { y: () => -innerHeight * 1.05, duration: 0.12, ease: 'power1.in' }, trocas[i] - 0.02);
  });
}
