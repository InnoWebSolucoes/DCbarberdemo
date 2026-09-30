// A casa: o hexágono com o monograma fica parado, o endereço entra ao lado,
// e tudo segue para a esquerda com o hexágono rolando até os três cartões.
const $ = (s, el = document) => el.querySelector(s);
const vw = (v) => (window.innerWidth * v) / 100;

export function cenaCasa({ gsap, mobile }) {
  const cena = $('[data-cena="casa"]');
  const camera = $('[data-casa-camera]');
  const faixa = $('[data-casa-faixa]');
  const fundo = $('[data-casa-fundo]');
  const emblema = $('[data-emblema-b]');
  const delta = () => -(faixa.scrollWidth - window.innerWidth);

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: cena,
      start: 'top top',
      end: 'bottom bottom',
      scrub: mobile ? 0.7 : 1.2,
      invalidateOnRefresh: true,
      onToggle: (st) => { camera.style.pointerEvents = st.isActive || st.progress > 0 ? '' : 'none'; },
    },
  });

  tl.fromTo(camera, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0)
    .fromTo(faixa, { x: () => vw(mobile ? 100 : 62) }, { x: 0, duration: 0.22, ease: 'power2.out' }, 0.04)
    .to(faixa, { x: () => delta(), duration: 0.66 }, 0.28)
    .fromTo(emblema, { x: 0, rotation: 0 }, { x: () => delta(), rotation: () => (delta() / vw(mobile ? 90 : 55)) * 90, duration: 0.66 }, 0.28)
    .fromTo(fundo, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.2)
    .to({}, { duration: 0.06 }, 0.94);
}
