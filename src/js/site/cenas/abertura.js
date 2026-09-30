// Abertura: o hexágono de luz do teto se acende, abre o vídeo, e ao rolar
// o vídeo volta a ser hexágono e entra na colmeia de cortes.
import { forma } from '../forma.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const vw = (v) => (window.innerWidth * v) / 100;

const s = { x: 0, y: 0, w: 0, h: 0, m: 1, r: 0 };
let desenhar = () => {};

function medidas(mobile) {
  const camera = $('[data-cena="abertura"] .camera');
  const W = camera.clientWidth;
  const H = camera.clientHeight;
  const hexW = vw(mobile ? 34 : 16);
  const hexH = hexW / 0.866;
  const gap = vw(mobile ? 2.2 : 1.1);
  const passo = hexW + gap;
  const sy = hexH * 0.75 + gap * 0.866;
  const margem = mobile ? 8 : vw(1);
  return { W, H, hexW, hexH, gap, passo, sy, margem, raio: mobile ? 18 : vw(2.2) };
}

const quadro = (m) => ({ x: m.margem, y: m.margem, w: m.W - 2 * m.margem, h: m.H - 2 * m.margem, m: 0, r: m.raio });
const hex = (m, k = 1) => {
  const w = m.hexW * k;
  const h = w / 0.866;
  return { x: (m.W - w) / 2, y: (m.H - h) / 2, w, h, m: 1, r: w * 0.035 };
};

function ligarDesenho() {
  const mascara = $('[data-mascara]');
  const neon = $('[data-neon-path]');
  desenhar = () => {
    const d = forma(s);
    mascara.style.clipPath = `path("${d}")`;
    neon.setAttribute('d', d);
  };
}

export async function introAbertura({ gsap, reduzido, mobile }) {
  ligarDesenho();
  const mascara = $('[data-mascara]');
  const neonSvg = $('[data-neon]');
  const neonPath = $('[data-neon-path]');
  const video = $('[data-hero-video]');
  const linhasTitulo = $$('.titulo-heroi .linha > span');
  const linhasSub = $$('.abertura__sub .linha > span');
  const cta = $('.abertura__cta-linha > .btn');
  const topo = $('[data-topo]');
  const m = medidas(mobile);

  if (reduzido) {
    Object.assign(s, quadro(m));
    desenhar();
    gsap.set(neonSvg, { opacity: 0 });
    return;
  }

  Object.assign(s, hex(m, 1));
  desenhar();
  gsap.set(mascara, { opacity: 0 });
  gsap.set(video, { scale: 1.3 });
  gsap.set([...linhasTitulo, ...linhasSub, cta], { yPercent: 118 });
  gsap.set(topo, { yPercent: -160, opacity: 0, transition: 'none' });
  const L = neonPath.getTotalLength();
  gsap.set(neonPath, { strokeDasharray: L, strokeDashoffset: L });

  const tl = gsap.timeline();
  tl.to(neonPath, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0.3)
    .set(neonPath, { strokeDasharray: 'none' })
    .to(neonSvg, {
      keyframes: [
        { opacity: 0.2, duration: 0.05 },
        { opacity: 1, duration: 0.06 },
        { opacity: 0.4, duration: 0.05 },
        { opacity: 1, duration: 0.14 },
      ],
    })
    .to(mascara, { opacity: 1, duration: 0.6, ease: 'power1.inOut' }, '-=0.05')
    .to(s, { ...quadro(m), duration: 1.4, ease: 'expo.inOut', onUpdate: () => desenhar() }, '+=0.1')
    .to(video, { scale: 1, duration: 1.7, ease: 'expo.inOut' }, '<')
    .to(neonSvg, { opacity: 0, duration: 0.5, ease: 'power1.in' }, '<0.6')
    .to(topo, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, '<0.35')
    .to(linhasTitulo, { yPercent: 0, duration: 1.05, ease: 'power4.out', stagger: 0.08 }, '<0.1')
    .to(linhasSub, { yPercent: 0, duration: 0.95, ease: 'power4.out', stagger: 0.06 }, '<0.4')
    .to(cta, { yPercent: 0, duration: 0.95, ease: 'power4.out' }, '<0.12');

  await tl;
  gsap.set(topo, { clearProps: 'transform,opacity,transition' });
}

export function cenaAbertura({ gsap, mobile }) {
  ligarDesenho();
  const cena = $('[data-cena="abertura"]');
  const mascara = $('[data-mascara]');
  const video = $('[data-hero-video]');
  const veu = $('.abertura__veu');
  const texto = $('[data-hero-texto]');
  const filaA = $('[data-fila="a"]');
  const filaB = $('[data-fila="b"]');
  const filaC = $('[data-fila="c"]');
  const emblema = $('[data-emblema-a]');
  const M = () => medidas(mobile);

  // posições das fileiras (x do primeiro hexágono de cada fileira, em px)
  const xB = (k) => { const m = M(); return m.W / 2 - m.hexW / 2 - 2 * m.passo + k * m.passo; };
  const xAC = (k) => { const m = M(); return m.W / 2 - m.hexW / 2 - 2.5 * m.passo + k * m.passo; };
  const yFila = (d) => { const m = M(); return m.H / 2 - m.hexH / 2 + d * m.sy; };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: cena,
      start: 'top top',
      end: 'bottom bottom',
      scrub: mobile ? 0.7 : 1.1,
      invalidateOnRefresh: true,
      onUpdate: (st) => {
        texto.style.pointerEvents = st.progress > 0.05 ? 'none' : '';
        if (st.progress > 0.985) video.pause();
        else if (video.paused) video.play().catch(() => {});
      },
      onRefresh: () => desenhar(),
    },
  });

  tl.fromTo(texto, { opacity: 1, filter: 'blur(0px)', y: 0 }, { opacity: 0, filter: 'blur(16px)', y: () => -innerHeight * 0.05, duration: 0.12, ease: 'power1.in' }, 0)
    .fromTo(s,
      { x: () => quadro(M()).x, y: () => quadro(M()).y, w: () => quadro(M()).w, h: () => quadro(M()).h, m: 0, r: () => quadro(M()).r },
      { x: () => hex(M()).x, y: () => hex(M()).y, w: () => hex(M()).w, h: () => hex(M()).h, m: 1, r: () => hex(M()).r, duration: 0.22, ease: 'power2.inOut', onUpdate: () => desenhar() },
      0.04)
    .fromTo(video, { scale: 1 }, { scale: () => (2.3 * M().hexW) / M().W, duration: 0.22, ease: 'power2.inOut' }, 0.04)
    .fromTo(veu, { opacity: 1 }, { opacity: 0.12, duration: 0.2 }, 0.04)

    .fromTo([filaA, filaB, filaC], { opacity: 0 }, { opacity: 1, duration: 0.07 }, 0.19)
    .fromTo(filaB, { x: () => xB(0), y: () => yFila(0) }, { x: () => xB(-4), y: () => yFila(0), duration: 0.44 }, 0.26)
    .to(filaB, { x: () => xB(-7.5), duration: 0.25, ease: 'power1.in' }, 0.7)
    .fromTo(filaA, { x: () => xAC(0), y: () => yFila(-1) }, { x: () => xAC(2.5), y: () => yFila(-1), duration: 0.44 }, 0.26)
    .to(filaA, { x: () => xAC(6.5), duration: 0.25, ease: 'power1.in' }, 0.7)
    .fromTo(filaC, { x: () => xAC(0), y: () => yFila(1) }, { x: () => xAC(2.5), y: () => yFila(1), duration: 0.44 }, 0.26)
    .to(filaC, { x: () => xAC(6.5), duration: 0.25, ease: 'power1.in' }, 0.7)

    .fromTo(mascara, { x: 0 }, { x: () => -4 * M().passo, duration: 0.44 }, 0.26)
    .to(mascara, { x: () => -7.5 * M().passo, duration: 0.25, ease: 'power1.in' }, 0.7)
    .fromTo(emblema, { x: () => 4 * M().passo, opacity: 1 }, { x: 0, duration: 0.44 }, 0.26)
    .to({}, { duration: 0.05 }, 0.95);

  const aoRedimensionar = () => { if (tl.scrollTrigger?.progress === 0) { Object.assign(s, quadro(M())); desenhar(); } };
  window.addEventListener('resize', aoRedimensionar);
  return () => window.removeEventListener('resize', aoRedimensionar);
}
