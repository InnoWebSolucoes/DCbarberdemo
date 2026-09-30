// Passo 5: horário confirmado (ou remarcado).
import { negocio } from '../data/catalog.js';
import { sessaoAtual, cadastrar } from '../data/api.js';
import { db } from '../data/store.js';
import { hhmm, primeiroNome, duracao as fmtDuracao } from '../lib/format.js';
import { estado } from './estado.js';
import { el, esc, icone, pontosHex, $ } from './ui.js';
import { diaLongo, diasEntre } from './datas.js';
import { baixarIcs } from './ics.js';
import { animarConfirmacao, gsap, SAIDA } from './movimento.js';
import { diasSemana } from '../data/catalog.js';
import { url } from '../lib/base.js';

const W = 120, H = 104;

function caminhoHex() {
  const pts = pontosHex(W, H, 6).split(' ');
  return `M${pts.join('L')}Z`;
}

function saudacao(ag) {
  const nome = primeiroNome(ag.clienteNome);
  const dias = diasEntre(new Date(), ag.inicio);
  if (dias === 0) return `Até mais tarde, ${nome}.`;
  if (dias === 1) return `Até amanhã, ${nome}.`;
  if (dias < 7) return `Até ${diasSemana[new Date(ag.inicio).getDay()].toLowerCase()}, ${nome}.`;
  return `Até lá, ${nome}.`;
}

export function montar(ctx) {
  const ag = estado.resultado;
  const remarcado = estado.modo === 'remarcar';
  const inicio = new Date(ag.inicio);
  const naConta = location.pathname.replace(/\/+$/, '') === url('/conta');

  const raiz = el(`
    <div class="ag-passo ag-fim">
      <div class="ag-fim__topo">
        <svg class="ag-neon" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
          <path class="ag-neon__brilho" d="${caminhoHex()}"/>
          <path class="ag-neon__hex" d="${caminhoHex()}"/>
          <path class="ag-neon__check" d="M41 53 L54 66 L80 39"/>
        </svg>
        <div class="ag-fim__cabeca">
          <p class="ag-fim__saudacao">${esc(saudacao(ag))}</p>
          <p class="ag-fim__codigo">Código <strong>${esc(ag.codigo)}</strong></p>
        </div>
      </div>
      <dl class="ag-fim__dados">
        <div class="ag-fim__d-serv"><dt>${ag.servicosNomes.length > 1 ? 'Serviços' : 'Serviço'}</dt><dd>${ag.servicosNomes.map(esc).join('<br>')}</dd></div>
        <div class="ag-fim__d-prof"><dt>Profissional</dt><dd>${esc(ag.profissionalNome)}</dd></div>
        <div class="ag-fim__d-dia"><dt>Dia</dt><dd>${esc(diaLongo(inicio))}</dd></div>
        <div class="ag-fim__d-hora"><dt>Hora</dt><dd>${hhmm(inicio)}<span class="ag-fim__dur">${fmtDuracao(ag.duracao)}</span></dd></div>
        <div class="ag-fim__d-onde"><dt>Onde</dt><dd>${esc(negocio.endereco)}, ${esc(negocio.cidade)}<span class="ag-fim__ref">${esc(negocio.referencia)}</span></dd></div>
        <div class="ag-fim__d-total"><dt>Total</dt><dd>${esc(ag.totalTexto)}<span class="ag-fim__ref">Pagamento no local</span></dd></div>
      </dl>
      <p class="ag-fim__email">${icone.email}<span>${remarcado ? 'Enviamos o novo horário para' : 'Enviamos a confirmação para'} <strong>${esc(ag.clienteEmail)}</strong>.</span></p>
      <div class="ag-fim__acoes">
        <button type="button" class="btn btn--ouro" data-acao="ics">${icone.calendario}Adicionar ao calendário</button>
        <a class="btn btn--linha" href="${negocio.mapa}" target="_blank" rel="noopener">${icone.mapa}Como chegar</a>
      </div>
      <div class="ag-fim__conta"></div>
      <button type="button" class="ag-fim__fechar ag-link" data-acao="fechar">Fechar</button>
    </div>`);

  const contaEl = $('.ag-fim__conta', raiz);

  function pintarConta() {
    const s = sessaoAtual();
    const cli = db.listSync('clientes').find((c) => c.id === ag.clienteId);
    const temConta = (s && s.id === ag.clienteId) || !!cli?.senhaHash;
    if (temConta) {
      const texto = estado.contaCriada ? 'Conta criada. Seus horários, faturas e lembretes ficam lá.' : 'Remarque ou cancele quando precisar.';
      contaEl.innerHTML = `
        <div class="ag-fim__caixa">
          <p>${texto}</p>
          ${naConta
            ? '<button type="button" class="btn btn--branco" data-acao="fechar">Ver minha conta</button>'
            : `<a class="btn btn--branco" href="${url('/conta/')}">Ver minha conta</a>`}
        </div>`;
      return;
    }
    contaEl.innerHTML = `
      <form class="ag-fim__caixa ag-fim__criar" novalidate>
        <div>
          <p class="ag-fim__criar-titulo">Criar conta</p>
          <p>Crie uma senha para remarcar, ver faturas e escolher quando ser lembrado. Usamos o e-mail ${esc(ag.clienteEmail)}.</p>
        </div>
        <div class="ag-fim__linha">
          <div class="ag-campo" data-campo="senha">
            <label class="ag-campo__rotulo" for="ag-fim-senha">Senha</label>
            <input class="ag-campo__input" id="ag-fim-senha" name="senha" type="password" autocomplete="new-password" placeholder="Senha com 6 ou mais caracteres" aria-describedby="ag-fim-senha-erro">
            <p class="ag-campo__erro" id="ag-fim-senha-erro" hidden></p>
          </div>
          <button type="submit" class="btn btn--branco">Criar conta</button>
        </div>
      </form>`;
  }

  contaEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const input = form.elements.senha;
    const erro = $('.ag-campo__erro', form);
    const falhar = (msg) => {
      erro.hidden = false;
      erro.textContent = msg;
      input.setAttribute('aria-invalid', 'true');
      input.closest('.ag-campo').classList.add('is-erro');
      input.focus();
    };
    if (input.value.length < 6) return falhar('A senha precisa ter pelo menos 6 caracteres.');
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const cli = db.listSync('clientes').find((c) => c.id === ag.clienteId);
      await cadastrar({ nome: cli?.nome || ag.clienteNome, email: ag.clienteEmail, telefone: cli?.telefone || ag.clienteTelefone, senha: input.value, marketing: cli?.marketing ?? estado.dados.marketing });
      estado.contaCriada = true;
      pintarConta();
      ctx.anunciar('Conta criada.');
      contaEl.querySelector('.btn')?.focus();
    } catch (err) {
      btn.disabled = false;
      falhar(err.message);
    }
  });

  raiz.addEventListener('click', (e) => {
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    if (acao === 'ics') baixarIcs(ag);
    if (acao === 'fechar') ctx.fechar();
  });

  pintarConta();

  return {
    el: raiz,
    titulo: remarcado ? 'Horário remarcado' : 'Horário confirmado',
    sub: remarcado ? 'O horário antigo foi liberado.' : 'Chegue com 5 minutos de antecedência.',
    semAnimacaoEntrada: true,
    aoMostrar() {
      const svg = $('.ag-neon', raiz);
      const resto = raiz.querySelectorAll('.ag-fim__cabeca, .ag-fim__dados > div, .ag-fim__email, .ag-fim__acoes, .ag-fim__conta, .ag-fim__fechar');
      const tl = animarConfirmacao(svg);
      if (tl.duration() > 0.1) {
        gsap.set(resto, { opacity: 0, y: 24 });
        tl.to(resto, { opacity: 1, y: 0, duration: 0.6, ease: SAIDA, stagger: 0.05, clearProps: 'transform,opacity' }, '-=0.35');
      }
    },
    rodape: () => null,
  };
}
