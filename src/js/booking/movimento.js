// Animações do agendamento (GSAP). Todas respeitam prefers-reduced-motion.
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { reduzMovimento } from './ui.js';

gsap.registerPlugin(CustomEase);
export const SAIDA = CustomEase.create('dcSaida', '0.16,1,0.3,1');
export const CORTINA = CustomEase.create('dcCortina', '0.76,0,0.24,1');
export { gsap };

// Abertura: o palco sobe revelado por um recorte.
export function animarAbertura(raiz, palco) {
  gsap.killTweensOf([raiz, palco]);
  if (reduzMovimento()) {
    return gsap.fromTo(raiz, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  }
  const tl = gsap.timeline();
  tl.set(raiz, { opacity: 1 });
  tl.fromTo(palco,
    { clipPath: 'inset(100% 0% 0% 0% round 32px 32px 0px 0px)' },
    { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', duration: 0.9, ease: CORTINA, clearProps: 'clipPath' });
  const lado = palco.querySelectorAll('[data-entra-lado]');
  tl.from(lado, { y: 40, opacity: 0, duration: 0.8, ease: SAIDA, stagger: 0.06 }, 0.45);
  return tl;
}

export function animarFechamento(raiz, palco) {
  gsap.killTweensOf([raiz, palco]);
  if (reduzMovimento()) return gsap.to(raiz, { opacity: 0, duration: 0.15 });
  return gsap.timeline()
    .to(palco, { clipPath: 'inset(0% 0% 100% 0% round 0px 0px 32px 32px)', duration: 0.7, ease: CORTINA })
    .set(palco, { clearProps: 'clipPath' });
}

// Troca de passo: o conteúdo antigo sobe e some; o novo sobe de uma máscara.
export function animarSaidaPasso(antigo, direcao = 1) {
  if (!antigo) return Promise.resolve();
  gsap.killTweensOf(antigo);
  if (reduzMovimento()) return gsap.to(antigo, { opacity: 0, duration: 0.12 }).then();
  return gsap.to(antigo, { y: -28 * direcao, opacity: 0, duration: 0.3, ease: 'power2.in' }).then();
}

export function animarEntradaPasso(novo, direcao = 1) {
  const blocos = novo.querySelectorAll(':scope > *');
  if (reduzMovimento()) return gsap.fromTo(novo, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  return gsap.fromTo(blocos,
    { y: 56 * direcao, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.65, ease: SAIDA, stagger: 0.06, clearProps: 'transform,opacity' });
}

// Título grande: a linha nova sobe de dentro da máscara.
export function animarTitulo(span) {
  if (!span || reduzMovimento()) return;
  gsap.fromTo(span, { yPercent: 108 }, { yPercent: 0, duration: 0.7, ease: SAIDA, clearProps: 'transform' });
}

// Horários entram em cascata curta.
export function animarLista(itens) {
  if (!itens.length || reduzMovimento()) return;
  gsap.fromTo(itens, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: SAIDA, stagger: { each: 0.018, from: 'start' }, clearProps: 'transform,opacity' });
}

// Hexágono dourado liga como um tubo de neon, depois o check se desenha.
export function animarConfirmacao(svg) {
  const hex = svg.querySelector('.ag-neon__hex');
  const brilho = svg.querySelector('.ag-neon__brilho');
  const check = svg.querySelector('.ag-neon__check');
  const preparar = (p) => {
    const L = p.getTotalLength();
    gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
    return L;
  };
  if (reduzMovimento()) {
    gsap.set(svg, { opacity: 1 });
    gsap.set([hex, check], { strokeDasharray: 'none', strokeDashoffset: 0, opacity: 1 });
    gsap.set(brilho, { strokeDasharray: 'none', strokeDashoffset: 0, opacity: 0.85 });
    return gsap.timeline();
  }
  preparar(hex);
  preparar(brilho);
  preparar(check);
  gsap.set(check, { opacity: 0 });
  const tl = gsap.timeline();
  tl.set(svg, { opacity: 1 });
  tl.to([hex, brilho], { strokeDashoffset: 0, duration: 0.95, ease: 'power2.inOut' });
  // cintilação de neon ligando
  tl.to(svg, { keyframes: [
    { opacity: 0.25, duration: 0.05 },
    { opacity: 1, duration: 0.05 },
    { opacity: 0.45, duration: 0.07 },
    { opacity: 1, duration: 0.04 },
    { opacity: 0.7, duration: 0.05 },
    { opacity: 1, duration: 0.12 },
  ] }, '-=0.08');
  tl.fromTo(brilho, { opacity: 0 }, { opacity: 0.85, duration: 0.5, ease: 'power1.out' }, '<');
  tl.set(check, { opacity: 1 }, '-=0.25');
  tl.to(check, { strokeDashoffset: 0, duration: 0.45, ease: 'power3.out' }, '<');
  return tl;
}
