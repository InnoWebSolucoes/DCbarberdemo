// Combo completo: uma régua de minutos corre sob o ponteiro enquanto cada etapa
// passa em letras grandes e a linha dourada vai sendo desenhada.
import { MARCOS } from '../conteudo.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const vw = (v) => (window.innerWidth * v) / 100;

export function cenaCombo({ gsap, mobile }) {
  const cena = $('[data-cena="combo"]');
  const intro = $('[data-combo-intro]');
  const regua = $('[data-regua]');
  const trilho = $('[data-regua-trilho]');
  const palavras = $('[data-combo-palavras]');
  const itens = $$('span', palavras);
  const curva = $('[data-combo-curva]');
  const linha = $('[data-curva]');
  const passos = $$('[data-combo-passos] li');
  const fim = $('[data-combo-fim]');

  // No celular a régua fica parada, de 0 a 120 minutos na largura da tela, e o ponteiro anda sobre ela
  const pxMin = () => vw(mobile ? 3.1667 : 1.25) / 5;
  const ponteiro = $('.regua__ponteiro');
  const centro = (k) => window.innerWidth / 2 - (itens[k].offsetLeft + itens[k].offsetWidth / 2);
  const K = MARCOS.length;
  const INI = 0.17;
  const FIM = 0.86;
  const tk = (k) => INI + (k * (FIM - INI)) / (K - 1);

  const L = linha.getTotalLength();
  gsap.set(linha, { strokeDasharray: L, strokeDashoffset: L });

  // Selo de cada etapa: acende quando a etapa passa pelo ponteiro (o estilo existe só no celular)
  const selos = $$('[data-selo]');
  const seloDaEtapa = ['corte', 'barboterapia', 'sobrancelha', 'rosto', 'rosto', null];
  let seloAtivo;
  const marcarSelo = (t) => {
    let k = -1;
    for (let i = 0; i < K; i++) if (t >= tk(i) - 0.04) k = i;
    const nome = k >= 0 ? seloDaEtapa[k] : null;
    if (nome === seloAtivo) return;
    seloAtivo = nome;
    selos.forEach((el) => el.classList.toggle('ativo', el.dataset.selo === nome));
  };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: cena, start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true },
    onUpdate: () => marcarSelo(tl.time()),
  });
  tl.set({}, {}, 1);

  tl.to(intro, { yPercent: -60, opacity: 0, duration: 0.08, ease: 'power1.in' }, 0.06)
    .fromTo([regua, curva], { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.1)
    .fromTo(palavras, { opacity: 0, x: () => centro(0) + vw(45) }, { opacity: 1, x: () => centro(0), duration: tk(0) - 0.1, ease: 'power2.out' }, 0.1)
    .fromTo(trilho, { x: () => vw(30) }, { x: 0, duration: tk(0) - 0.1, ease: 'power2.out' }, 0.1)
    .to(linha, { strokeDashoffset: 0, duration: FIM - tk(0) }, tk(0));

  if (mobile) tl.fromTo(ponteiro, { x: 0 }, { x: 0, duration: 0.01 }, 0);
  for (let k = 0; k < K - 1; k++) {
    const d = tk(k + 1) - tk(k);
    tl.to(palavras, { x: () => centro(k + 1), duration: d, ease: 'power2.inOut' }, tk(k));
    if (mobile) tl.to(ponteiro, { x: () => MARCOS[k + 1] * pxMin(), duration: d, ease: 'power2.inOut' }, tk(k));
    else tl.to(trilho, { x: () => -MARCOS[k + 1] * pxMin(), duration: d, ease: 'power2.inOut' }, tk(k));
  }

  passos.forEach((li, k) => {
    tl.fromTo(li, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.035 }, tk(k) - 0.02);
    if (k < K - 1) tl.to(li, { opacity: 0, y: -10, duration: 0.03 }, tk(k + 1) - 0.07);
  });

  tl.fromTo(fim, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.05, ease: 'power2.out' }, FIM - 0.01);

  gsap.from($$('.combo__titulo .linha > span'), {
    yPercent: 115, duration: 1.2, ease: 'power4.out', stagger: 0.1,
    scrollTrigger: { trigger: cena, start: 'top 65%', toggleActions: 'play none none reverse' },
  });
}
