// Agendamento pelo celular: blocos entram pelos lados, as telas do telefone trocam
// e os cartões da direita se empilham como fichas.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export function cenaApp({ gsap }) {
  const cena = $('[data-cena="app"]');
  const esquerda = $('[data-app-esquerda]');
  const telefone = $('[data-telefone]');
  const telas = $$('[data-tela]');
  const cartoes = $('[data-app-cartoes]');
  const pilha = $$('.cartao-pilha');
  const selo = $$('.tela__selo path');
  const ease = 'circ.inOut';

  gsap.set(telas.slice(1), { yPercent: 100 });
  selo.forEach((p) => { const L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: cena, start: 'top 80%', end: 'bottom bottom', scrub: 1.4, invalidateOnRefresh: true },
  });
  tl.set({}, {}, 1);

  tl.fromTo(esquerda, { xPercent: -115 }, { xPercent: 0, duration: 0.2, ease }, 0)
    .fromTo(cartoes, { xPercent: 115 }, { xPercent: 0, duration: 0.2, ease }, 0)
    .fromTo(telefone, { y: () => innerHeight * 0.35, rotation: -5, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 0.2, ease: 'power3.out' }, 0.04);

  const trocas = [0.34, 0.52, 0.7];
  trocas.forEach((t, k) => {
    tl.to(telas[k], { scale: 0.9, opacity: 0, duration: 0.12, ease: 'power1.in' }, t + 0.02)
      .fromTo(telas[k + 1], { yPercent: 100 }, { yPercent: 0, duration: 0.13, ease }, t);
    if (pilha[k + 1]) tl.fromTo(pilha[k + 1], { y: () => innerHeight }, { y: 0, duration: 0.15, ease }, t);
  });
  tl.to(selo, { strokeDashoffset: 0, duration: 0.08, stagger: 0.04, ease: 'power2.out' }, 0.8);
}
