import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import logoMono from '../../assets/monogram.svg?raw';
import logoFull from '../../assets/logo-full.svg?raw';
import { garantirDados } from '../data/seed.js';
import { assinarNewsletter } from '../data/api.js';
import { montarTabela, montarProdutos, montarHorarios, montarRegua, montarServicosMobile } from './conteudo.js';
import { introAbertura, cenaAbertura } from './cenas/abertura.js';
import { cenaCasa } from './cenas/casa.js';
import { cenaServicos } from './cenas/servicos.js';
import { cenaCombo } from './cenas/combo.js';
import { cenaApp } from './cenas/app.js';
import { cenaEquipe } from './cenas/equipe.js';
import { cenaAvaliacoes } from './cenas/avaliacoes.js';
import { cenaFinal } from './cenas/final.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ehMobile = () => matchMedia('(max-width: 900px)').matches;

// ---------- Logotipos ----------
$$('[data-logo]').forEach((el) => { el.innerHTML = el.dataset.logo === 'mono' ? logoMono : logoFull; });

// ---------- Conteúdo a partir dos dados ----------
montarTabela();
montarProdutos();
montarHorarios();
montarRegua();
montarServicosMobile();
garantirDados();

// ---------- Rolagem suave ----------
const lenis = new Lenis({ lerp: reduzido ? 1 : 0.08, smoothWheel: !reduzido, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

// ---------- Cabeçalho ----------
const topo = $('[data-topo]');
const estadoTopo = { forcarOculto: false, ultimoY: 0 };
lenis.on('scroll', ({ scroll, direction }) => {
  if (menu.classList.contains('aberto')) return;
  const esconder = estadoTopo.forcarOculto || (direction === 1 && scroll > 140);
  topo.classList.toggle('escondido', esconder);
});
export const controleTopo = {
  ocultar(v) { estadoTopo.forcarOculto = v; topo.classList.toggle('escondido', v); },
  tema(t) { if (t) topo.dataset.tema = t; else delete topo.dataset.tema; },
};

// ---------- Menu ----------
const menu = $('[data-menu]');
const menuBotao = $('[data-menu-botao]');
const abrirMenu = (v) => {
  menu.classList.toggle('aberto', v);
  menuBotao.setAttribute('aria-expanded', String(v));
};
const podeHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
if (podeHover) {
  let t;
  menu.addEventListener('mouseenter', () => { clearTimeout(t); abrirMenu(true); });
  menu.addEventListener('mouseleave', () => { t = setTimeout(() => abrirMenu(false), 180); });
}
menuBotao.addEventListener('click', () => abrirMenu(!menu.classList.contains('aberto')));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('aberto')) { abrirMenu(false); menuBotao.focus(); } });
document.addEventListener('click', (e) => { if (!menu.contains(e.target)) abrirMenu(false); });

// ---------- Saltos entre seções: cobre, pula, descobre ----------
const cortina = $('[data-cortina]');
const DESLOCAMENTO = { '#equipe': 0.4, '#servicos': 0.01, '#combo': 0.02 };
let pulando = false;
export async function pular(hash, { instantaneo = false } = {}) {
  const alvo = hash && hash !== '#' ? $(hash) : null;
  if (!alvo || pulando) return;
  pulando = true;
  abrirMenu(false);
  const topoDoc = alvo.getBoundingClientRect().top + window.scrollY;
  const extra = (DESLOCAMENTO[hash] || 0) * Math.max(0, alvo.offsetHeight - innerHeight);
  const y = Math.max(0, topoDoc + (ehMobile() && DESLOCAMENTO[hash] ? 0 : extra));
  if (instantaneo || reduzido) {
    lenis.scrollTo(y, { immediate: true, force: true });
    pulando = false;
    return;
  }
  await gsap.fromTo(cortina, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'power3.inOut' });
  lenis.scrollTo(y, { immediate: true, force: true });
  ScrollTrigger.update();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  topo.classList.remove('escondido');
  await gsap.to(cortina, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.65, ease: 'power3.inOut' });
  gsap.set(cortina, { clipPath: 'inset(100% 0% 0% 0%)' });
  history.replaceState(null, '', hash === '#topo' ? location.pathname : hash);
  pulando = false;
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-ancora]');
  if (!a) return;
  e.preventDefault();
  pular(a.getAttribute('href'));
});

// ---------- Agendamento ----------
let moduloAgenda = null;
export async function agendar(opcoes = {}) {
  abrirMenu(false);
  try {
    moduloAgenda ??= await import('../booking/booking.js');
    moduloAgenda.abrirAgendamento(opcoes);
  } catch (erro) {
    console.error('Agendamento indisponível', erro);
  }
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-agendar]');
  if (!b) return;
  e.preventDefault();
  const opcoes = {};
  if (b.dataset.servicos) opcoes.servicos = b.dataset.servicos.split(',');
  if (b.dataset.profissional) opcoes.profissionalId = b.dataset.profissional;
  agendar(opcoes);
});
window.addEventListener('dc:modal', (e) => {
  if (e.detail?.open) lenis.stop();
  else lenis.start();
});

// ---------- Vídeos: carregam perto da tela e só tocam quando visíveis ----------
const carregar = (v) => {
  if (v.dataset.src && !v.src) { v.src = v.dataset.src; v.load(); }
};
const obsCarga = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && carregar(e.target)), { rootMargin: '600px 0px' });
const obsPlay = new IntersectionObserver((es) => es.forEach((e) => {
  const v = e.target;
  if (e.isIntersecting) { carregar(v); v.play().catch(() => {}); } else v.pause();
}), { threshold: 0.15 });
$$('.insta video, video[data-auto]').forEach((v) => { obsCarga.observe(v); obsPlay.observe(v); });

// Arrastar a fileira do Instagram com o mouse
const trilhoInsta = $('[data-insta]');
if (trilhoInsta) {
  let x0 = 0, s0 = 0, arrastou = false, ativo = false;
  trilhoInsta.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    ativo = true; arrastou = false; x0 = e.clientX; s0 = trilhoInsta.scrollLeft;
    trilhoInsta.classList.add('arrastando');
  });
  window.addEventListener('pointermove', (e) => {
    if (!ativo) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 4) arrastou = true;
    trilhoInsta.scrollLeft = s0 - dx;
  });
  window.addEventListener('pointerup', () => { ativo = false; trilhoInsta.classList.remove('arrastando'); });
  trilhoInsta.addEventListener('click', (e) => { if (arrastou) { e.preventDefault(); arrastou = false; } }, true);
}

// ---------- Lembrete por e-mail ----------
const form = $('[data-lembrete]');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('[data-lembrete-msg]');
  const email = form.email.value;
  msg.classList.remove('erro');
  try {
    await assinarNewsletter({ email });
    msg.textContent = 'Pronto. Você vai receber um lembrete quando for hora de voltar.';
    form.reset();
  } catch (erro) {
    msg.textContent = erro.message;
    msg.classList.add('erro');
  }
});

// ---------- Cenas ----------
const video = $('[data-hero-video]');
video.src = ehMobile() ? '/media/video/hero-mobile.mp4' : '/media/video/hero.mp4';
if (ehMobile()) video.poster = '/media/video/hero-mobile.jpg';

const ctxBase = { gsap, ScrollTrigger, lenis, topo: controleTopo, reduzido };

async function iniciar() {
  await document.fonts?.ready;
  video.play().catch(() => {});
  await introAbertura({ ...ctxBase, mobile: ehMobile() });
  document.body.classList.remove('carregando');
  lenis.start();

  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 901px)', mobile: '(max-width: 900px)' }, (c) => {
    const ctx = { ...ctxBase, mobile: c.conditions.mobile };
    cenaAbertura(ctx);
    cenaCasa(ctx);
    cenaCombo(ctx);
    cenaFinal(ctx);
    if (c.conditions.desktop) {
      cenaServicos(ctx);
      cenaApp(ctx);
      cenaEquipe(ctx);
      cenaAvaliacoes(ctx);
    } else {
      cenaEquipe(ctx);
    }
  });
  ScrollTrigger.refresh();

  // Links vindos de fora: /#agendar abre o agendamento, /#precos pula para a seção
  const hash = location.hash;
  if (hash === '#agendar') {
    history.replaceState(null, '', location.pathname);
    agendar();
  } else if (hash && $(hash)) {
    pular(hash, { instantaneo: true });
  }
}

iniciar();
