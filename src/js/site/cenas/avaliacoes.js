// Avaliações: fotos inteiras trocam pela mesma janela que fecha para cima,
// e cada depoimento sobe junto com a sua foto.
// No celular são seis fotos em retrato, com o depoimento apoiado na parte de baixo.
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const GAP = 2.2;
const visivel = (el) => getComputedStyle(el).display !== 'none';

export function cenaAvaliacoes({ gsap, topo, mobile }) {
  const cena = $('[data-cena="avaliacoes"]');
  const janelas = $$('[data-obturador-avaliacoes] .obturador__janela').filter(visivel);
  const cartoes = $$('.depoimento', cena).filter(visivel);
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
    scrollTrigger: { trigger: cena, start: 'top top', end: 'bottom bottom', scrub: mobile ? 1 : 1.4, invalidateOnRefresh: true },
  });
  tl.set({}, {}, 1);

  if (mobile) {
    const N = janelas.length;
    const trocas = Array.from({ length: N - 1 }, (_, k) => 0.12 + k * (0.74 / (N - 1)));
    trocas.forEach((t, k) => {
      const o = { p: 0 };
      tl.to(o, { p: 1, duration: 0.1, ease: 'power1.inOut', onUpdate: () => aplicar(k, o.p) }, t);
      tl.fromTo(janelas[k + 1].firstElementChild, { scale: 1.15 }, { scale: 1, duration: 0.14, ease: 'power2.out' }, t);
    });
    cartoes.forEach((c, i) => {
      const entra = i === 0 ? 0.01 : trocas[i - 1] + 0.03;
      tl.fromTo(c, { y: () => innerHeight * 0.4, opacity: 0 }, { y: 0, opacity: 1, duration: 0.07, ease: 'power3.out' }, entra);
      if (i < cartoes.length - 1) tl.to(c, { y: () => -innerHeight * 0.18, opacity: 0, duration: 0.05, ease: 'power1.in' }, trocas[i] - 0.02);
    });
    return;
  }

  // Todos os cartões no centro exato da tela, independente da altura de cada um
  gsap.set(cartoes, { xPercent: -50, yPercent: -50 });
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
