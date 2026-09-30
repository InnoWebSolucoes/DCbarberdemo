// Equipe: o título fica parado e os três cartões sobem em velocidades diferentes,
// param para leitura e saem por cima.
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export function cenaEquipe({ gsap, mobile, topo }) {
  const cena = $('[data-cena="equipe"]');
  const cartoes = $$('.pessoa', cena);

  ScrollTrigger.create({
    trigger: cena,
    start: 'top 60px',
    end: 'bottom 60px',
    onToggle: (st) => topo.tema(st.isActive ? 'claro' : null),
  });

  gsap.from($$('#equipe-titulo .linha > span'), {
    yPercent: 115, duration: 1.2, ease: 'power4.out', stagger: 0.1,
    scrollTrigger: { trigger: cena, start: mobile ? 'top 80%' : 'top 55%', toggleActions: 'play none none reverse' },
  });

  if (mobile) {
    cartoes.forEach((c) => gsap.from(c, {
      y: 70, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: c, start: 'top 90%' },
    }));
    return;
  }

  const entrada = [1.2, 1.55, 0.95];
  const saida = [1.15, 1.75, 1.4];
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: cena, start: 'top top', end: 'bottom bottom', scrub: 1.5, invalidateOnRefresh: true },
  });
  tl.set({}, {}, 1);
  cartoes.forEach((c, i) => {
    tl.fromTo(c, { y: () => innerHeight * entrada[i] }, { y: 0, duration: 0.42, ease: 'power1.out' }, 0.04)
      .to(c, { y: () => -innerHeight * saida[i], duration: 0.28, ease: 'power1.in' }, 0.72);
  });
}
