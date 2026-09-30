// Final: o brilho dourado sobe por trás das folhas e o hexágono gira devagar
// até pousar sobre o "Próximo!".
const $ = (s, el = document) => el.querySelector(s);

export function cenaFinal({ gsap }) {
  const final = $('[data-final]');
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: final, start: 'top bottom', end: 'bottom bottom', scrub: 1.6 },
  })
    .fromTo('[data-final-brilho]', { scale: 0.9, y: () => innerHeight * 0.16 }, { scale: 1.2, y: () => -innerHeight * 0.06 }, 0)
    .fromTo('[data-final-folhas]', { y: () => innerHeight * 0.16 }, { y: 0 }, 0)
    .fromTo('[data-final-emblema]', { rotation: -48, y: () => innerHeight * 0.14 }, { rotation: -14, y: 0 }, 0)
    .fromTo('[data-final-titulo]', { yPercent: 35 }, { yPercent: 0 }, 0);
}
