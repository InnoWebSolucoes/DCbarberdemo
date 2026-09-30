// Página /conta: entrada ou painel do cliente, com atualização ao vivo.
import '../../css/tokens.css';
import { abrirAgendamento } from '../booking/booking.js';
import '../../css/conta.css';
import { garantirDados } from '../data/seed.js';
import { db } from '../data/store.js';
import { sessaoAtual, sair } from '../data/api.js';
import { primeiroNome } from '../lib/format.js';
import { el, $, $$ } from '../booking/ui.js';
import { contagem } from '../booking/datas.js';
import { montarEntrada } from './entrar.js';
import { htmlProximo, htmlHistorico, acaoHorario, agendamentosDe } from './horarios.js';
import { htmlFaturas, htmlEmails, abrirFatura, abrirEmail, faturasDe, emailsDe } from './documentos.js';
import { htmlPreferencias, ligarPreferencias, sincronizarPreferencias, htmlDados, ligarDados, podeRepintarDados } from './ajustes.js';

const principal = document.getElementById('ct-principal');
const btnSair = document.querySelector('[data-sair]');
let sessaoId = undefined;
let painel = null;
const estadoPainel = { historicoTodos: false, emailsTodos: false, pintar: (s) => pintarSecao(s) };

// Troca o HTML de um contêiner mantendo o foco no mesmo controle, se ele continuar existindo.
function trocarHtml(alvo, html) {
  const ativo = document.activeElement;
  const chave = alvo.contains(ativo) ? ativo.dataset?.foco : null;
  alvo.innerHTML = html;
  if (chave) alvo.querySelector(`[data-foco="${chave}"]`)?.focus({ preventScroll: true });
}

const cliente = () => sessaoAtual();

// ---------- Painel ----------

function saudacao(c) {
  const { futuros } = agendamentosDe(c);
  if (futuros[0]) return `Seu próximo horário é ${contagem(futuros[0].inicio)}.`;
  return 'Você não tem horário marcado.';
}

function montarPainel(c) {
  const raiz = el(`
    <div class="ct-painel">
      <header class="ct-ola">
        <h1 class="ct-ola__titulo" tabindex="-1"></h1>
        <p class="ct-ola__sub"></p>
        <nav class="ct-nav" aria-label="Seções da conta">
          <a href="#proximo">Próximo horário</a>
          <a href="#historico">Histórico</a>
          <a href="#faturas">Faturas</a>
          <a href="#emails">E-mails</a>
          <a href="#preferencias">Preferências</a>
          <a href="#dados">Dados pessoais</a>
        </nav>
      </header>

      <section class="ct-secao" id="proximo" aria-labelledby="t-proximo">
        <h2 class="ct-secao__titulo" id="t-proximo">Próximo horário</h2>
        <div class="ct-secao__corpo" data-secao="proximo"></div>
      </section>

      <div class="ct-duas">
        <section class="ct-secao" id="historico" aria-labelledby="t-historico">
          <h2 class="ct-secao__titulo" id="t-historico">Histórico</h2>
          <div class="ct-secao__corpo" data-secao="historico"></div>
        </section>
        <div class="ct-coluna">
          <section class="ct-secao" id="faturas" aria-labelledby="t-faturas">
            <h2 class="ct-secao__titulo" id="t-faturas">Faturas<span class="ct-secao__n" data-n="faturas"></span></h2>
            <div class="ct-secao__corpo" data-secao="faturas"></div>
          </section>
          <section class="ct-secao" id="emails" aria-labelledby="t-emails">
            <h2 class="ct-secao__titulo" id="t-emails">E-mails recebidos<span class="ct-secao__n" data-n="emails"></span></h2>
            <p class="ct-secao__desc">O que a DC enviou para o seu e-mail.</p>
            <div class="ct-secao__corpo" data-secao="emails"></div>
          </section>
        </div>
      </div>

      <div class="ct-duas ct-duas--ajustes">
        <section class="ct-secao" id="preferencias" aria-labelledby="t-pref">
          <h2 class="ct-secao__titulo" id="t-pref">Preferências</h2>
          <div class="ct-secao__corpo ct-cartao" data-secao="preferencias"></div>
        </section>
        <section class="ct-secao" id="dados" aria-labelledby="t-dados">
          <h2 class="ct-secao__titulo" id="t-dados">Dados pessoais</h2>
          <div class="ct-secao__corpo ct-cartao" data-secao="dados"></div>
        </section>
      </div>
    </div>`);

  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const { acao, id } = b.dataset;
    if (acao === 'fatura') return abrirFatura(id);
    if (acao === 'email') return abrirEmail(id);
    if (acao === 'emails-todos') { estadoPainel.emailsTodos = !estadoPainel.emailsTodos; return pintarSecao('emails'); }
    acaoHorario(acao, id, estadoPainel);
  });
  ligarPreferencias($('[data-secao="preferencias"]', raiz), cliente);
  ligarDados($('[data-secao="dados"]', raiz), cliente);
  principal.replaceChildren(raiz);
  painel = raiz;
  ['ola', 'proximo', 'historico', 'faturas', 'emails', 'preferencias', 'dados'].forEach((s) => pintarSecao(s, true));
}

function pintarSecao(nome, forcar = false) {
  const c = cliente();
  if (!painel || !c) return;
  if (nome === 'ola') {
    $('.ct-ola__titulo', painel).textContent = `Olá, ${primeiroNome(c.nome)}`;
    $('.ct-ola__sub', painel).textContent = saudacao(c);
    return;
  }
  const alvo = $(`[data-secao="${nome}"]`, painel);
  if (nome === 'proximo') trocarHtml(alvo, htmlProximo(c));
  if (nome === 'historico') trocarHtml(alvo, htmlHistorico(c, { todos: estadoPainel.historicoTodos }));
  if (nome === 'faturas') {
    trocarHtml(alvo, htmlFaturas(c));
    const n = faturasDe(c).length;
    $('[data-n="faturas"]', painel).textContent = n ? String(n) : '';
  }
  if (nome === 'emails') {
    trocarHtml(alvo, htmlEmails(c, { todos: estadoPainel.emailsTodos }));
    const novos = emailsDe(c).filter((e) => !e.aberto).length;
    const n = $('[data-n="emails"]', painel);
    n.textContent = novos ? `${novos} ${novos === 1 ? 'novo' : 'novos'}` : '';
    n.classList.toggle('is-novo', !!novos);
  }
  if (nome === 'preferencias') {
    if (forcar || !sincronizarPreferencias(alvo, c)) trocarHtml(alvo, htmlPreferencias(c));
  }
  if (nome === 'dados' && (forcar || podeRepintarDados(alvo))) trocarHtml(alvo, htmlDados(c));
}

// ---------- Roteamento por sessão ----------

function irParaAncora() {
  const id = location.hash.slice(1);
  if (!id) return;
  const alvo = document.getElementById(id);
  if (alvo) setTimeout(() => alvo.scrollIntoView({ block: 'start' }), 60);
}

function renderizar({ focar = false } = {}) {
  const c = cliente();
  const trocouSessao = sessaoId !== undefined && (c?.id || null) !== sessaoId;
  if (trocouSessao && !location.hash) window.scrollTo({ top: 0, behavior: 'instant' });
  sessaoId = c?.id || null;
  btnSair.hidden = !c;
  document.body.classList.toggle('ct-logado', !!c);
  if (c) {
    montarPainel(c);
    document.title = `Minha conta | DC Barbershop`;
    irParaAncora();
    if (focar) $('.ct-ola__titulo', painel)?.focus({ preventScroll: true });
  } else {
    painel = null;
    const raiz = montarEntrada(principal);
    if (focar) $('.ct-entrada__titulo', raiz)?.focus({ preventScroll: true });
  }
}

let pendentes = new Set();
let agendado = null;
function aoMudar(col) {
  pendentes.add(col);
  if (agendado) return;
  agendado = requestAnimationFrame(() => {
    agendado = null;
    const cols = pendentes;
    pendentes = new Set();
    const c = cliente();
    if ((c?.id || null) !== sessaoId) return renderizar({ focar: true });
    if (!c) return;
    const tudo = cols.has('*');
    if (tudo || cols.has('agendamentos')) ['ola', 'proximo', 'historico'].forEach((s) => pintarSecao(s));
    if (tudo || cols.has('faturas')) pintarSecao('faturas');
    if (tudo || cols.has('emails')) pintarSecao('emails');
    if (tudo || cols.has('clientes')) ['ola', 'preferencias', 'dados'].forEach((s) => pintarSecao(s));
  });
}

// ---------- Início ----------

document.querySelector('[data-agendar]').addEventListener('click', () => abrirAgendamento());
btnSair.addEventListener('click', () => {
  sair();
  history.replaceState(null, '', location.pathname);
  window.scrollTo(0, 0);
});

// Barra do topo ganha fundo ao rolar
const topo = document.querySelector('.ct-topo');
const aoRolar = () => topo.classList.toggle('is-rolado', window.scrollY > 8);
window.addEventListener('scroll', aoRolar, { passive: true });

await garantirDados();
renderizar();
aoRolar();
db.onChange(aoMudar);
// Contagem regressiva ("daqui a 3 dias") atualiza sozinha
setInterval(() => { if (painel) ['ola', 'proximo'].forEach((s) => pintarSecao(s)); }, 60000);
window.addEventListener('hashchange', irParaAncora);
