// Agendamento pelo celular: as telas do telefone trocam e os cartões se empilham como fichas.
// Computador: blocos entram pelos lados.
// Celular: cena presa, um toque dourado mostra onde a pessoa tocaria antes de cada troca de tela.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export function cenaApp({ gsap, mobile }) {
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

  if (mobile) {
    const ponto = $('[data-toque-ponto]');
    const alvos = telas.map((t) => $('[data-toque]', t));
    gsap.set(ponto, { xPercent: -50, yPercent: -50, opacity: 0 });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: cena, start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true },
    });
    tl.set({}, {}, 1);
    tl.fromTo(telefone, { scale: 0.88, rotation: -3 }, { scale: 1, rotation: 0, duration: 0.12, ease: 'power2.out' }, 0);

    const trocas = [0.24, 0.47, 0.7];
    trocas.forEach((t, k) => {
      const alvo = alvos[k];
      const px = () => alvo.offsetLeft + alvo.offsetWidth / 2;
      const py = () => alvo.offsetTop + alvo.offsetHeight / 2;
      tl.fromTo(ponto, { x: px, y: py, scale: 0.3, opacity: 0 }, { x: px, y: py, scale: 1, opacity: 1, duration: 0.04, ease: 'power2.out', immediateRender: k === 0 }, t - 0.09)
        .to(alvo, { scale: 0.94, duration: 0.02, yoyo: true, repeat: 1 }, t - 0.05)
        .to(ponto, { scale: 1.8, opacity: 0, duration: 0.04 }, t - 0.045)
        .to(telas[k], { scale: 0.9, opacity: 0, duration: 0.1, ease: 'power1.in' }, t)
        .fromTo(telas[k + 1], { yPercent: 100 }, { yPercent: 0, duration: 0.11, ease }, t - 0.01);
      if (pilha[k + 1]) tl.fromTo(pilha[k + 1], { y: () => innerHeight * 0.45 }, { y: 0, duration: 0.12, ease }, t - 0.01);
    });
    tl.to(selo, { strokeDashoffset: 0, duration: 0.06, stagger: 0.03, ease: 'power2.out' }, 0.8);
    return;
  }

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
