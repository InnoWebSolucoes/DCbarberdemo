// Passo 4: dados do cliente, com ou sem conta.
import { sessaoAtual, cadastrar, entrar, sair, criarAgendamento, horariosLivres, atualizarCliente } from '../data/api.js';
import { primeiroNome } from '../lib/format.js';
import { estado, candidatos, resumo, marcarMexeu } from './estado.js';
import { el, esc, icone, $, $$, emailValido, telefoneValido } from './ui.js';
import { deIso } from './datas.js';

const campo = ({ id, nome, rotulo, tipo = 'text', valor = '', dica = '', auto = '', modo = '', opcional = false, extra = '' }) => `
  <div class="ag-campo" data-campo="${nome}">
    <label class="ag-campo__rotulo" for="${id}">${rotulo}${opcional ? '<span class="ag-campo__opc">Opcional</span>' : ''}</label>
    <input class="ag-campo__input" id="${id}" name="${nome}" type="${tipo}" value="${esc(valor)}"${auto ? ` autocomplete="${auto}"` : ''}${modo ? ` inputmode="${modo}"` : ''} aria-describedby="${id}-dica ${id}-erro" ${extra}>
    <p class="ag-campo__dica" id="${id}-dica">${dica}</p>
    <p class="ag-campo__erro" id="${id}-erro" hidden></p>
  </div>`;

const caixa = ({ id, nome, rotulo, marcado, dica = '' }) => `
  <label class="ag-check" for="${id}">
    <input type="checkbox" id="${id}" name="${nome}" class="ag-check__input"${marcado ? ' checked' : ''}>
    <span class="ag-check__caixa" aria-hidden="true">${icone.check}</span>
    <span class="ag-check__texto">${rotulo}${dica ? `<span class="ag-check__dica">${dica}</span>` : ''}</span>
  </label>`;

function erroCampo(form, nome, msg) {
  const c = $(`[data-campo="${nome}"]`, form);
  if (!c) return;
  const input = $('input, textarea', c);
  const erro = $('.ag-campo__erro', c);
  c.classList.toggle('is-erro', !!msg);
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  erro.hidden = !msg;
  erro.textContent = msg || '';
}

const MSG = {
  nome: 'Digite seu nome.',
  telefone: 'Digite um telefone com pelo menos 9 números, por exemplo +351 912 345 678.',
  email: 'Digite um e-mail válido, por exemplo nome@gmail.com.',
  senha: 'A senha precisa ter pelo menos 6 caracteres.',
};

export function montar(ctx) {
  const d = estado.dados;
  const raiz = el('<div class="ag-passo ag-dados"></div>');
  let tentou = false;
  let ocupado = false;

  function pintar() {
    const s = sessaoAtual();
    tentou = false;
    if (s) {
      if (!d.marketingTocado) d.marketing = !!s.marketing;
      raiz.innerHTML = `
        <div class="ag-quem">
          <span class="ag-quem__inicial" aria-hidden="true">${esc(primeiroNome(s.nome).charAt(0).toUpperCase())}</span>
          <p class="ag-quem__texto">Agendando como <strong>${esc(s.nome)}</strong> <span>(${esc(s.email)})</span></p>
          <button type="button" class="ag-link" data-acao="trocar">Não é você?</button>
        </div>
        <form class="ag-form" id="ag-form-dados" novalidate>
          ${s.telefone ? '' : campo({ id: 'ag-tel', nome: 'telefone', rotulo: 'Telefone', tipo: 'tel', valor: d.telefone, dica: 'Com o código do país, por exemplo +351 912 345 678.', auto: 'tel', modo: 'tel' })}
          <div class="ag-campo" data-campo="observacao">
            <label class="ag-campo__rotulo" for="ag-obs">Observação<span class="ag-campo__opc">Opcional</span></label>
            <textarea class="ag-campo__input ag-campo__area" id="ag-obs" name="observacao" rows="2" placeholder="Ex.: quero manter o comprimento em cima">${esc(d.observacao)}</textarea>
          </div>
          ${caixa({ id: 'ag-mkt', nome: 'marketing', rotulo: 'Quero receber lembrete quando for hora de cortar de novo', marcado: d.marketing, dica: 'Um e-mail quando passar o prazo desde a sua última visita. Dá para desligar na conta.' })}
          <p class="ag-form__erro" role="alert" hidden></p>
        </form>`;
    } else {
      const aba = d.aba;
      raiz.innerHTML = `
        <div class="ag-segmento" role="tablist" aria-label="Como continuar">
          <button type="button" role="tab" class="ag-segmento__opcao" id="ag-tab-sem" aria-controls="ag-form-dados" aria-selected="${aba === 'sem-conta'}" tabindex="${aba === 'sem-conta' ? 0 : -1}" data-aba="sem-conta">Continuar sem conta</button>
          <button type="button" role="tab" class="ag-segmento__opcao" id="ag-tab-entrar" aria-controls="ag-form-entrar" aria-selected="${aba === 'entrar'}" tabindex="${aba === 'entrar' ? 0 : -1}" data-aba="entrar">Entrar</button>
        </div>
        <form class="ag-form" id="ag-form-dados" role="tabpanel" aria-labelledby="ag-tab-sem" novalidate${aba === 'sem-conta' ? '' : ' hidden'}>
          ${campo({ id: 'ag-nome', nome: 'nome', rotulo: 'Nome', valor: d.nome, auto: 'name', dica: '' })}
          <div class="ag-form__par">
            ${campo({ id: 'ag-tel', nome: 'telefone', rotulo: 'Telefone', tipo: 'tel', valor: d.telefone, dica: 'Com o código do país, por exemplo +351 912 345 678.', auto: 'tel', modo: 'tel' })}
            ${campo({ id: 'ag-email', nome: 'email', rotulo: 'E-mail', tipo: 'email', valor: d.email, dica: 'A confirmação chega aqui.', auto: 'email', modo: 'email' })}
          </div>
          <div class="ag-campo" data-campo="observacao">
            <label class="ag-campo__rotulo" for="ag-obs">Observação<span class="ag-campo__opc">Opcional</span></label>
            <textarea class="ag-campo__input ag-campo__area" id="ag-obs" name="observacao" rows="2" placeholder="Ex.: quero manter o comprimento em cima">${esc(d.observacao)}</textarea>
          </div>
          ${caixa({ id: 'ag-criar', nome: 'criarConta', rotulo: 'Criar conta para acompanhar e remarcar', marcado: d.criarConta })}
          <div class="ag-form__senha"${d.criarConta ? '' : ' hidden'}>
            ${campo({ id: 'ag-senha', nome: 'senha', rotulo: 'Senha', tipo: 'password', valor: d.senha, dica: 'Pelo menos 6 caracteres.', auto: 'new-password' })}
          </div>
          ${caixa({ id: 'ag-mkt', nome: 'marketing', rotulo: 'Quero receber lembrete quando for hora de cortar de novo', marcado: d.marketing, dica: 'Um e-mail quando passar o prazo desde a sua última visita. Dá para desligar na conta.' })}
          <p class="ag-form__erro" role="alert" hidden></p>
        </form>
        <form class="ag-form" id="ag-form-entrar" role="tabpanel" aria-labelledby="ag-tab-entrar" novalidate${aba === 'entrar' ? '' : ' hidden'}>
          <p class="ag-form__intro">Entre para agendar com os dados da sua conta.</p>
          ${campo({ id: 'ag-l-email', nome: 'loginEmail', rotulo: 'E-mail', tipo: 'email', valor: d.loginEmail || d.email, auto: 'email', modo: 'email' })}
          ${campo({ id: 'ag-l-senha', nome: 'loginSenha', rotulo: 'Senha', tipo: 'password', valor: '', auto: 'current-password' })}
          <p class="ag-form__erro" role="alert" hidden></p>
          <button type="submit" class="btn btn--branco ag-form__entrar">Entrar</button>
        </form>`;
    }
    ctx.atualizar();
  }

  function validar(form) {
    const s = sessaoAtual();
    const v = (n) => (form.elements[n]?.value || '').trim();
    const erros = {};
    if (!s) {
      if (v('nome').length < 2) erros.nome = MSG.nome;
      if (!emailValido(v('email'))) erros.email = MSG.email;
      if (!telefoneValido(v('telefone'))) erros.telefone = MSG.telefone;
      if (d.criarConta && (form.elements.senha?.value || '').length < 6) erros.senha = MSG.senha;
    } else if (form.elements.telefone && !telefoneValido(v('telefone'))) {
      erros.telefone = MSG.telefone;
    }
    ['nome', 'email', 'telefone', 'senha'].forEach((n) => erroCampo(form, n, erros[n]));
    return erros;
  }

  function erroGeral(form, msg, acao) {
    const p = $('.ag-form__erro', form);
    p.hidden = !msg;
    p.innerHTML = msg ? esc(msg) + (acao ? ` <button type="button" class="ag-link" data-acao="${acao.id}">${acao.rotulo}</button>` : '') : '';
  }

  async function confirmar() {
    const form = $('#ag-form-dados', raiz);
    if (!form || form.hidden || ocupado) return;
    tentou = true;
    erroGeral(form, '');
    const erros = validar(form);
    const primeiro = Object.keys(erros)[0];
    if (primeiro) {
      form.elements[primeiro]?.focus();
      return;
    }
    // Confere se o horário continua livre antes de criar conta ou agendar.
    const dia = deIso(estado.dia);
    const aindaLivre = horariosLivres({ dia, duracaoMin: resumo().duracao, candidatos: candidatos() }).some((x) => x.hora === estado.slot.hora);
    if (!aindaLivre) return horarioTomado();

    ocupado = true;
    ctx.ocupado(true, 'Confirmando');
    try {
      let s = sessaoAtual();
      let cliente;
      if (s) {
        const tel = d.telefone.trim();
        if (tel && !s.telefone) await atualizarCliente(s.id, { telefone: tel });
        cliente = { nome: s.nome, email: s.email, telefone: tel || s.telefone };
      } else {
        if (d.criarConta) {
          s = await cadastrar({ nome: d.nome.trim(), email: d.email.trim(), telefone: d.telefone.trim(), senha: d.senha, marketing: d.marketing });
          estado.contaCriada = true;
        }
        cliente = { nome: d.nome.trim(), email: d.email.trim(), telefone: d.telefone.trim() };
      }
      const ag = await criarAgendamento({
        servicos: estado.servicos, profissionalId: estado.profissionalId, inicio: estado.slot.inicio,
        cliente, marketing: d.marketing, observacao: d.observacao.trim(), origem: 'site',
      });
      ocupado = false;
      ctx.concluido(ag, 'criado');
    } catch (err) {
      ocupado = false;
      ctx.ocupado(false);
      if (/reservado|não está mais livre/i.test(err.message)) return horarioTomado();
      if (/Já existe uma conta/i.test(err.message)) {
        erroCampo(form, 'senha', 'Já existe uma conta com este e-mail.');
        erroGeral(form, 'Este e-mail já tem conta. Entre com a sua senha ou desmarque "Criar conta".', { id: 'ir-entrar', rotulo: 'Entrar com este e-mail' });
        return;
      }
      erroGeral(form, err.message || 'Não foi possível confirmar. Tente de novo.');
    }
  }

  function horarioTomado() {
    const h = estado.slot?.hora;
    estado.avisoHorario = `O horário das ${h} acabou de ser reservado por outra pessoa. Escolha outro, suas escolhas continuam salvas.`;
    estado.slot = null;
    ctx.ir(3, { direcao: -1 });
  }

  async function fazerLogin(form) {
    const email = form.elements.loginEmail.value.trim();
    const senha = form.elements.loginSenha.value;
    erroGeral(form, '');
    erroCampo(form, 'loginEmail', emailValido(email) ? '' : MSG.email);
    erroCampo(form, 'loginSenha', senha ? '' : 'Digite a sua senha.');
    if (!emailValido(email)) return form.elements.loginEmail.focus();
    if (!senha) return form.elements.loginSenha.focus();
    const btn = $('.ag-form__entrar', form);
    btn.disabled = true;
    try {
      await entrar(email, senha);
      d.aba = 'sem-conta';
      pintar();
      ctx.anunciar('Você entrou na sua conta.');
      $('.ag-quem', raiz)?.setAttribute('tabindex', '-1');
      $('.ag-quem', raiz)?.focus();
    } catch (err) {
      btn.disabled = false;
      erroGeral(form, err.message);
    }
  }

  function trocarAba(aba, focar) {
    d.aba = aba;
    $$('.ag-segmento__opcao', raiz).forEach((b) => {
      const on = b.dataset.aba === aba;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
      if (on && focar) b.focus();
    });
    $('#ag-form-dados', raiz).hidden = aba !== 'sem-conta';
    $('#ag-form-entrar', raiz).hidden = aba !== 'entrar';
    ctx.atualizar();
  }

  raiz.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.name || t.type === 'checkbox') return;
    if (t.name in d) d[t.name] = t.value;
    marcarMexeu();
    if (tentou) validar($('#ag-form-dados', raiz));
  });

  raiz.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'criarConta') {
      d.criarConta = t.checked;
      const bloco = $('.ag-form__senha', raiz);
      bloco.hidden = !t.checked;
      if (t.checked) $('#ag-senha', raiz)?.focus();
      else erroCampo($('#ag-form-dados', raiz), 'senha', '');
    }
    if (t.name === 'marketing') {
      d.marketing = t.checked;
      d.marketingTocado = true;
    }
  });

  raiz.addEventListener('focusout', (e) => {
    const t = e.target;
    if (!t.name || !tentou) return;
    validar($('#ag-form-dados', raiz));
  });

  raiz.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.id === 'ag-form-entrar') fazerLogin(e.target);
    else confirmar();
  });

  raiz.addEventListener('click', (e) => {
    const aba = e.target.closest('[data-aba]');
    if (aba) return trocarAba(aba.dataset.aba, false);
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    if (acao === 'trocar') {
      sair();
      d.aba = 'entrar';
      pintar();
      $('#ag-tab-entrar', raiz)?.focus();
    }
    if (acao === 'ir-entrar') {
      d.loginEmail = d.email;
      trocarAba('entrar', false);
      const f = $('#ag-form-entrar', raiz);
      f.elements.loginEmail.value = d.email;
      f.elements.loginSenha.focus();
    }
  });

  raiz.addEventListener('keydown', (e) => {
    if (!e.target.closest('.ag-segmento')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      trocarAba(d.aba === 'entrar' ? 'sem-conta' : 'entrar', true);
    }
  });

  pintar();

  return {
    el: raiz,
    titulo: 'Seus dados',
    sub: 'Para enviar a confirmação e avisar se algo mudar.',
    rodape: () => {
      const logado = !!sessaoAtual();
      const naAbaEntrar = !logado && d.aba === 'entrar';
      return {
        rotulo: 'Confirmar agendamento',
        habilitado: !naAbaEntrar,
        dica: naAbaEntrar ? 'Entre na sua conta ou continue sem conta.' : 'Pagamento no local: dinheiro, MB Way ou Multibanco.',
        form: naAbaEntrar ? null : 'ag-form-dados',
        aoClicar: null,
      };
    },
  };
}
