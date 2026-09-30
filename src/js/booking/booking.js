// Fluxo de agendamento em tela cheia. Funciona em qualquer página.
//   abrirAgendamento({ servicos?, profissionalId?, remarcarId? })
//   fecharAgendamento()
import '../../css/booking.css';
import { garantirDados } from '../data/seed.js';
import { db } from '../data/store.js';
import { sessaoAtual } from '../data/api.js';
import { servicoPorId, profissionalPorId, profissionaisPara } from '../data/catalog.js';
import { isoDia } from '../lib/format.js';
import { estado, resetar, temProgresso, profissionaisPossiveis } from './estado.js';
import { htmlResumo, htmlProgresso, linhasBarra } from './resumo.js';
import { el, esc, icone, monograma, $, $$ } from './ui.js';
import { animarAbertura, animarFechamento, animarSaidaPasso, animarEntradaPasso, animarTitulo } from './movimento.js';
import * as passoServicos from './passo-servicos.js';
import * as passoProfissional from './passo-profissional.js';
import * as passoHorario from './passo-horario.js';
import * as passoDados from './passo-dados.js';
import * as passoConfirmado from './passo-confirmado.js';

const MODULOS = { 1: passoServicos, 2: passoProfissional, 3: passoHorario, 4: passoDados, 5: passoConfirmado };

let raiz = null;
let palco = null;
let aberto = false;
let fechando = false;
let passoAtual = null;
let navToken = 0;
let emTransicao = false;
let ultimoFoco = null;
let estadoEmpurrado = false;
let ignorarPop = 0;
let desligarDb = null;
let acaoAtual = null;
let paddingOriginal = '';

const emitirModal = (open) => window.dispatchEvent(new CustomEvent('dc:modal', { detail: { open } }));

// ---------- DOM ----------

function montarDom() {
  if (raiz) return;
  raiz = el(`
    <div class="ag" id="dc-agendar" hidden data-lenis-prevent>
      <div class="ag__palco" role="dialog" aria-modal="true" aria-labelledby="ag-titulo">
        <aside class="ag__lado" data-lenis-prevent>
          <div class="ag__marca" data-entra-lado>${monograma('ag__mono')}<span>DC Barbershop</span></div>
          <div class="ag__cabeca" data-entra-lado>
            <h2 class="ag__titulo" id="ag-titulo" tabindex="-1"><span class="ag__titulo-mascara"><span class="ag__titulo-txt"></span></span></h2>
            <p class="ag__sub"></p>
          </div>
          <div class="ag__resumo" data-entra-lado></div>
          <div class="ag__prog" data-entra-lado></div>
        </aside>
        <div class="ag__topo">
          <button type="button" class="ag__voltar">${icone.voltar}<span>Voltar</span></button>
          <div class="ag__prog ag__prog--movel" aria-hidden="true"></div>
          <button type="button" class="ag__fechar" aria-label="Fechar agendamento">${icone.fechar}</button>
        </div>
        <div class="ag__conteudo" data-lenis-prevent><div class="ag__passos"></div></div>
        <div class="ag__rodape">
          <button type="button" class="ag__barra" aria-expanded="false" aria-controls="ag-folha">
            <span class="ag__barra-topo"><span class="ag__barra-l1"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></span>
            <span class="ag__barra-l2"></span><span class="sr-only">, ver resumo</span>
          </button>
          <p class="ag__dica"></p>
          <button type="button" class="btn btn--ouro ag__principal">Continuar</button>
        </div>
        <div class="ag__folha" id="ag-folha" hidden data-lenis-prevent>
          <div class="ag__folha-topo"><p>Resumo</p><button type="button" class="ag__folha-fechar" aria-label="Fechar resumo">${icone.fechar}</button></div>
          <div class="ag__folha-corpo"></div>
        </div>
        <div class="ag-dialogo" hidden>
          <div class="ag-dialogo__caixa" role="alertdialog" aria-modal="true" aria-labelledby="ag-dlg-t" aria-describedby="ag-dlg-d">
            <p class="ag-dialogo__titulo" id="ag-dlg-t">Sair do agendamento?</p>
            <p class="ag-dialogo__texto" id="ag-dlg-d">O que você escolheu será perdido.</p>
            <div class="ag-dialogo__acoes">
              <button type="button" class="btn btn--linha" data-dlg="sair">Sair</button>
              <button type="button" class="btn btn--ouro" data-dlg="ficar">Continuar agendando</button>
            </div>
          </div>
        </div>
        <p class="sr-only" aria-live="polite" id="ag-anuncio"></p>
      </div>
    </div>`);
  document.body.appendChild(raiz);
  palco = $('.ag__palco', raiz);

  $('.ag__fechar', raiz).addEventListener('click', () => pedirFechar());
  $('.ag__voltar', raiz).addEventListener('click', voltar);
  $('.ag__principal', raiz).addEventListener('click', (e) => {
    if (emTransicao) { e.preventDefault(); return; }
    if (acaoAtual?.aoClicar) acaoAtual.aoClicar();
  });
  $('.ag__barra', raiz).addEventListener('click', () => alternarFolha());
  $('.ag__folha-fechar', raiz).addEventListener('click', () => alternarFolha(false));
  raiz.addEventListener('click', aoClicarResumo);
  $('.ag-dialogo', raiz).addEventListener('click', (e) => {
    const b = e.target.closest('[data-dlg]');
    if (b) resolverDialogo(b.dataset.dlg === 'sair');
    else if (e.target.classList.contains('ag-dialogo')) resolverDialogo(false);
  });
  raiz.addEventListener('keydown', aoTeclar);
  window.addEventListener('popstate', aoPopState);
}

function aoClicarResumo(e) {
  const rem = e.target.closest('[data-remover]');
  if (rem) {
    estado.servicos = estado.servicos.filter((id) => id !== rem.dataset.remover);
    estado.mexeu = true;
    servicosMudaram();
    passoAtual?.sincronizar?.();
    if (!estado.servicos.length) alternarFolha(false);
    return;
  }
  const ir = e.target.closest('[data-ir]');
  if (ir) {
    alternarFolha(false);
    irPara(Number(ir.dataset.ir), { direcao: -1 });
  }
}

// ---------- Resumo, rodapé ----------

function atualizar() {
  if (!raiz) return;
  $('.ag__resumo', raiz).innerHTML = htmlResumo();
  $$('.ag__prog', raiz).forEach((p) => { p.innerHTML = htmlProgresso(); });
  const folha = $('.ag__folha', raiz);
  if (!folha.hidden) $('.ag__folha-corpo', folha).innerHTML = htmlResumo();

  const voltarBtn = $('.ag__voltar', raiz);
  const podeVoltar = estado.passo >= 2 && estado.passo <= 4 && !(estado.modo === 'remarcar' && estado.passo === 3);
  voltarBtn.hidden = !podeVoltar;

  acaoAtual = passoAtual?.rodape?.() || null;
  const rodape = $('.ag__rodape', raiz);
  rodape.hidden = !acaoAtual;
  palco.classList.toggle('sem-rodape', !acaoAtual);
  if (!acaoAtual) return;
  const btn = $('.ag__principal', raiz);
  if (!btn.classList.contains('is-ocupado')) {
    btn.textContent = acaoAtual.rotulo;
    btn.disabled = !acaoAtual.habilitado;
  }
  if (acaoAtual.form) {
    btn.type = 'submit';
    btn.setAttribute('form', acaoAtual.form);
  } else {
    btn.type = 'button';
    btn.removeAttribute('form');
  }
  $('.ag__dica', raiz).textContent = acaoAtual.dica || '';
  const [l1, l2] = linhasBarra();
  $('.ag__barra-l1', raiz).textContent = l1;
  $('.ag__barra-l2', raiz).textContent = l2;
  $('.ag__barra', raiz).disabled = !estado.servicos.length;
}

function ocupado(sim, rotulo = '') {
  const btn = $('.ag__principal', raiz);
  btn.classList.toggle('is-ocupado', sim);
  btn.setAttribute('aria-busy', sim ? 'true' : 'false');
  if (sim) {
    btn.disabled = true;
    btn.innerHTML = `<span class="ag__spinner" aria-hidden="true"></span>${esc(rotulo)}`;
  } else {
    atualizar();
  }
}

function anunciar(texto) {
  const a = $('#ag-anuncio', raiz);
  a.textContent = '';
  setTimeout(() => { a.textContent = texto; }, 30);
}

function alternarFolha(forcar) {
  const folha = $('.ag__folha', raiz);
  const barra = $('.ag__barra', raiz);
  const abrir = forcar ?? folha.hidden;
  if (abrir && !estado.servicos.length) return;
  folha.hidden = !abrir;
  barra.setAttribute('aria-expanded', abrir);
  if (abrir) {
    $('.ag__folha-corpo', folha).innerHTML = htmlResumo();
    $('.ag__folha-fechar', folha).focus();
  }
}

// Serviços mudaram: invalida escolhas que dependem deles.
function servicosMudaram() {
  if (estado.profissionalId && estado.profissionalId !== 'qualquer') {
    const ok = profissionaisPossiveis().some((p) => p.id === estado.profissionalId);
    if (!ok) estado.profissionalId = null;
  }
  if (estado.profissionalId === 'qualquer' && profissionaisPossiveis().length < 2) estado.profissionalId = null;
  estado.slot = null;
  atualizar();
}

// ---------- Navegação ----------

const ctx = {
  ir: (n, op) => irPara(n, op),
  avancar() {
    const prof = estado.profissionalId;
    const compat = prof && (prof === 'qualquer' ? profissionaisPossiveis().length > 1 : profissionaisPossiveis().some((p) => p.id === prof));
    if (estado.profPreset && compat) {
      estado.profPreset = false;
      irPara(3);
    } else {
      estado.profPreset = false;
      irPara(2);
    }
  },
  atualizar,
  servicosMudaram,
  ocupado,
  anunciar,
  fechar: () => fecharAgendamento(),
  concluido(ag, tipo) {
    estado.resultado = ag;
    window.dispatchEvent(new CustomEvent('dc:agendamento', { detail: { tipo, agendamento: ag } }));
    const btn = $('.ag__principal', raiz);
    btn.classList.remove('is-ocupado');
    irPara(5);
  },
};

function tituloDe(texto, sub, animar) {
  const txt = $('.ag__titulo-txt', raiz);
  txt.textContent = texto;
  $('.ag__sub', raiz).textContent = sub || '';
  if (animar) animarTitulo(txt);
}

async function irPara(n, { direcao, animar = true } = {}) {
  if (!raiz) return;
  const dir = direcao ?? (n >= estado.passo ? 1 : -1);
  const token = ++navToken;
  passoAtual?.destruir?.();
  estado.passo = n;
  alternarFolha(false);
  const passo = MODULOS[n].montar(ctx);
  passoAtual = passo;
  palco.dataset.passo = n;
  tituloDe(passo.titulo, passo.sub, animar);
  atualizar();

  const container = $('.ag__passos', raiz);
  const antigo = container.firstElementChild;
  emTransicao = true;
  if (animar && antigo) {
    await animarSaidaPasso(antigo, dir);
    if (token !== navToken) return;
  }
  container.replaceChildren(passo.el);
  $('.ag__conteudo', raiz).scrollTop = 0;
  if (animar && !passo.semAnimacaoEntrada) animarEntradaPasso(passo.el, dir);
  emTransicao = false;
  passo.aoMostrar?.();
  $('#ag-titulo', raiz).focus({ preventScroll: true });
}

function voltar() {
  if (emTransicao) return;
  const n = estado.passo;
  if (n === 2) irPara(1, { direcao: -1 });
  else if (n === 3 && estado.modo === 'novo') irPara(profissionaisPara(estado.servicos).length ? 2 : 1, { direcao: -1 });
  else if (n === 4) irPara(3, { direcao: -1 });
}

// ---------- Teclado e foco ----------

function focaveis() {
  const dlg = $('.ag-dialogo', raiz);
  const escopo = !dlg.hidden ? dlg : palco;
  return $$('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])', escopo)
    .filter((x) => x.offsetParent !== null || x === document.activeElement);
}

function aoTeclar(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (!$('.ag-dialogo', raiz).hidden) return resolverDialogo(false);
    if (!$('.ag__folha', raiz).hidden) {
      alternarFolha(false);
      return $('.ag__barra', raiz).focus();
    }
    return pedirFechar();
  }
  if (e.key === 'Tab') {
    const lista = focaveis();
    if (!lista.length) return;
    const primeiro = lista[0];
    const ultimo = lista[lista.length - 1];
    if (e.shiftKey && (document.activeElement === primeiro || !palco.contains(document.activeElement))) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  }
}

// ---------- Confirmação de saída ----------

let aoResolver = null;
function perguntarSaida() {
  return new Promise((resolve) => {
    const dlg = $('.ag-dialogo', raiz);
    dlg.hidden = false;
    aoResolver = resolve;
    $('[data-dlg="ficar"]', dlg).focus();
  });
}
function resolverDialogo(sair) {
  const dlg = $('.ag-dialogo', raiz);
  if (dlg.hidden) return;
  dlg.hidden = true;
  const r = aoResolver;
  aoResolver = null;
  if (!sair) $('.ag__fechar', raiz).focus();
  r?.(sair);
}

async function pedirFechar() {
  if (!aberto || fechando) return;
  if (temProgresso()) {
    const sair = await perguntarSaida();
    if (!sair) return;
  }
  fecharAgendamento();
}

function aoPopState() {
  if (ignorarPop > 0) { ignorarPop--; return; }
  if (!aberto || fechando) return;
  estadoEmpurrado = false;
  if (temProgresso()) {
    perguntarSaida().then((sair) => {
      if (sair) fecharAgendamento();
      else {
        history.pushState({ dcAgendar: true }, '');
        estadoEmpurrado = true;
      }
    });
  } else {
    fecharAgendamento();
  }
}

// ---------- Rolagem ----------

function travarRolagem() {
  const larguraBarra = window.innerWidth - document.documentElement.clientWidth;
  paddingOriginal = document.body.style.paddingRight;
  if (larguraBarra > 0) document.body.style.paddingRight = `${larguraBarra}px`;
  document.documentElement.classList.add('ag-travado');
}
function soltarRolagem() {
  document.documentElement.classList.remove('ag-travado');
  document.body.style.paddingRight = paddingOriginal;
}

// ---------- Configuração inicial ----------

function configurar(op) {
  op = op && typeof op === 'object' ? op : {};
  resetar();
  const s = sessaoAtual();
  if (s) Object.assign(estado.dados, { nome: s.nome, email: s.email, telefone: s.telefone || '', marketing: !!s.marketing });

  if (op.remarcarId) {
    const ag = db.listSync('agendamentos').find((a) => a.id === op.remarcarId);
    if (ag && ag.status !== 'cancelado') {
      Object.assign(estado, {
        modo: 'remarcar', remarcar: ag, servicos: [...ag.servicos], profissionalId: ag.profissionalId,
        dia: new Date(ag.inicio) > new Date() ? isoDia(ag.inicio) : null,
      });
      return 3;
    }
  }

  let servs = (op.servicos || []).filter((id) => servicoPorId(id));
  if (servs.length && !profissionaisPara(servs).length) servs = servs.slice(0, 1);
  estado.servicos = servs;

  const pid = op.profissionalId;
  if (pid && (pid === 'qualquer' || profissionalPorId(pid))) {
    const compat = !servs.length || (pid === 'qualquer' ? profissionaisPara(servs).length > 1 : profissionaisPara(servs).some((p) => p.id === pid));
    if (compat) {
      estado.profissionalId = pid;
      estado.profPreset = true;
    }
  }

  const primeiraCat = servs.length ? servicoPorId(servs[0]).cat : (estado.profissionalId && profissionalPorId(estado.profissionalId)?.grupo === 'estudio' ? 'estudio' : 'cortes');
  estado.categoria = primeiraCat;

  if (!servs.length) return 1;
  if (estado.profissionalId) {
    estado.profPreset = false;
    return 3;
  }
  return 2;
}

// ---------- API pública ----------

export async function abrirAgendamento(opcoes = {}) {
  await garantirDados();
  montarDom();
  if (aberto && !fechando) return;
  if (fechando) return;
  const inicial = configurar(opcoes);
  aberto = true;
  ultimoFoco = document.activeElement;
  $('.ag-dialogo', raiz).hidden = true;
  raiz.hidden = false;
  travarRolagem();
  emitirModal(true);
  history.pushState({ dcAgendar: true }, '');
  estadoEmpurrado = true;
  desligarDb = db.onChange((col) => {
    if (!aberto) return;
    if ((col === 'agendamentos' || col === '*') && estado.passo === 3) passoAtual?.aoMudarAgenda?.();
  });

  $('.ag__passos', raiz).replaceChildren();
  await irPara(inicial, { animar: false });
  animarAbertura(raiz, palco);
  if (passoAtual && !passoAtual.semAnimacaoEntrada) animarEntradaPasso(passoAtual.el, 1);
}

export async function fecharAgendamento() {
  if (!aberto || fechando || !raiz) return;
  fechando = true;
  if (aoResolver) resolverDialogo(false);
  alternarFolha(false);
  if (estadoEmpurrado) {
    estadoEmpurrado = false;
    ignorarPop++;
    history.back();
  }
  await animarFechamento(raiz, palco);
  raiz.hidden = true;
  passoAtual?.destruir?.();
  passoAtual = null;
  $('.ag__passos', raiz).replaceChildren();
  desligarDb?.();
  desligarDb = null;
  aberto = false;
  fechando = false;
  soltarRolagem();
  emitirModal(false);
  if (ultimoFoco && document.contains(ultimoFoco)) ultimoFoco.focus({ preventScroll: true });
}

export const agendamentoAberto = () => aberto;
