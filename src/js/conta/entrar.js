// Tela de entrada: entrar, criar conta e conta de demonstração.
import { equipe } from '../data/catalog.js';
import { db } from '../data/store.js';
import { entrar, cadastrar } from '../data/api.js';
import { el, esc, foto, $, $$, emailValido } from '../booking/ui.js';

const campo = ({ id, nome, rotulo, tipo = 'text', auto = '', modo = '', dica = '' }) => `
  <div class="ag-campo" data-campo="${nome}">
    <label class="ag-campo__rotulo" for="${id}">${rotulo}</label>
    <input class="ag-campo__input" id="${id}" name="${nome}" type="${tipo}"${auto ? ` autocomplete="${auto}"` : ''}${modo ? ` inputmode="${modo}"` : ''} aria-describedby="${id}-dica ${id}-erro">
    <p class="ag-campo__dica" id="${id}-dica">${dica}</p>
    <p class="ag-campo__erro" id="${id}-erro" hidden></p>
  </div>`;

function erroCampo(form, nome, msg) {
  const c = $(`[data-campo="${nome}"]`, form);
  if (!c) return;
  c.classList.toggle('is-erro', !!msg);
  $('input', c).setAttribute('aria-invalid', msg ? 'true' : 'false');
  const e = $('.ag-campo__erro', c);
  e.hidden = !msg;
  e.textContent = msg || '';
}

function erroGeral(form, msg) {
  const p = $('.ct-form__erro', form);
  p.hidden = !msg;
  p.textContent = msg || '';
}

// Escolhe o cliente mais rico para a demonstração: com faturas e horário futuro.
function candidatosDemo() {
  const agora = new Date();
  const futuros = new Set(db.listSync('agendamentos', (a) => a.status === 'confirmado' && new Date(a.inicio) > agora).map((a) => a.clienteId));
  const faturas = db.listSync('faturas').reduce((m, f) => m.set(f.clienteId, (m.get(f.clienteId) || 0) + 1), new Map());
  const visitas = db.listSync('agendamentos', (a) => a.status === 'concluido').reduce((m, a) => m.set(a.clienteId, (m.get(a.clienteId) || 0) + 1), new Map());
  return db.listSync('clientes')
    .map((c) => ({ c, nota: (faturas.get(c.id) ? 100 : 0) + (futuros.has(c.id) ? 50 : 0) + Math.min(visitas.get(c.id) || 0, 20) }))
    .sort((a, b) => b.nota - a.nota)
    .map((x) => x.c);
}

export async function entrarDemo() {
  for (const c of candidatosDemo().slice(0, 12)) {
    try {
      if (!c.senhaHash) {
        return await cadastrar({ nome: c.nome, email: c.email, telefone: c.telefone, senha: 'demo123', marketing: !!c.marketing });
      }
      return await entrar(c.email, 'demo123');
    } catch {
      /* conta com outra senha: tenta o próximo */
    }
  }
  throw new Error('Não encontramos um cliente de demonstração. Restaure os dados no painel.');
}

export function montarEntrada(principal, { aba = 'entrar' } = {}) {
  const retratos = equipe.map((p) => foto(p, { classe: 'ct-entrada__foto' })).join('');
  const raiz = el(`
    <div class="ct-entrada">
      <div class="ct-entrada__texto">
        <h1 class="ct-entrada__titulo" tabindex="-1">Sua conta na DC</h1>
        <p class="ct-entrada__lead">Veja o próximo horário, remarque, baixe as faturas e escolha de quanto em quanto tempo quer ser lembrado.</p>
        <div class="ct-entrada__nota">
          <div class="ct-entrada__fotos" aria-hidden="true">${retratos}</div>
          <p>Já agendou com a gente? Crie a conta com o mesmo e-mail e seus horários aparecem aqui.</p>
        </div>
      </div>
      <div class="ct-entrada__cartao">
        <div class="ag-segmento ct-entrada__abas" role="tablist" aria-label="Entrar ou criar conta">
          <button type="button" role="tab" class="ag-segmento__opcao" id="ct-tab-entrar" data-aba="entrar" aria-controls="ct-form-entrar">Entrar</button>
          <button type="button" role="tab" class="ag-segmento__opcao" id="ct-tab-criar" data-aba="criar" aria-controls="ct-form-criar">Criar conta</button>
        </div>
        <form class="ct-form" id="ct-form-entrar" role="tabpanel" aria-labelledby="ct-tab-entrar" novalidate>
          ${campo({ id: 'ct-e-email', nome: 'email', rotulo: 'E-mail', tipo: 'email', auto: 'email', modo: 'email' })}
          ${campo({ id: 'ct-e-senha', nome: 'senha', rotulo: 'Senha', tipo: 'password', auto: 'current-password' })}
          <p class="ct-form__erro" role="alert" hidden></p>
          <button type="submit" class="btn btn--ouro ct-form__enviar">Entrar</button>
        </form>
        <form class="ct-form" id="ct-form-criar" role="tabpanel" aria-labelledby="ct-tab-criar" novalidate hidden>
          ${campo({ id: 'ct-c-nome', nome: 'nome', rotulo: 'Nome', auto: 'name' })}
          ${campo({ id: 'ct-c-email', nome: 'email', rotulo: 'E-mail', tipo: 'email', auto: 'email', modo: 'email', dica: 'Use o mesmo e-mail dos seus agendamentos.' })}
          ${campo({ id: 'ct-c-tel', nome: 'telefone', rotulo: 'Telefone', tipo: 'tel', auto: 'tel', modo: 'tel', dica: 'Opcional. Com o código do país, por exemplo +351 912 345 678.' })}
          ${campo({ id: 'ct-c-senha', nome: 'senha', rotulo: 'Senha', tipo: 'password', auto: 'new-password', dica: 'Pelo menos 6 caracteres.' })}
          <p class="ct-form__erro" role="alert" hidden></p>
          <button type="submit" class="btn btn--ouro ct-form__enviar">Criar conta</button>
        </form>
      </div>
      <button type="button" class="ct-entrada__demo" data-demo>Entrar com uma conta de demonstração</button>
    </div>`);

  function trocarAba(nova, focar) {
    $$('[data-aba]', raiz).forEach((b) => {
      const on = b.dataset.aba === nova;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
      if (on && focar) b.focus();
    });
    $('#ct-form-entrar', raiz).hidden = nova !== 'entrar';
    $('#ct-form-criar', raiz).hidden = nova !== 'criar';
  }

  raiz.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-aba]');
    if (b) return trocarAba(b.dataset.aba, false);
    const demo = e.target.closest('[data-demo]');
    if (demo) {
      demo.disabled = true;
      demo.textContent = 'Preparando a demonstração';
      try {
        await entrarDemo();
      } catch (err) {
        demo.disabled = false;
        demo.textContent = err.message;
      }
    }
  });
  $('.ct-entrada__abas', raiz).addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const atual = $('[aria-selected="true"]', raiz).dataset.aba;
    trocarAba(atual === 'entrar' ? 'criar' : 'entrar', true);
  });

  raiz.addEventListener('input', (e) => {
    const f = e.target.form;
    if (f?.dataset.tentou) validar(f);
  });

  function validar(form) {
    const v = (n) => (form.elements[n]?.value || '').trim();
    const erros = {};
    if (form.id === 'ct-form-criar' && v('nome').length < 2) erros.nome = 'Digite seu nome.';
    if (!emailValido(v('email'))) erros.email = 'Digite um e-mail válido, por exemplo nome@gmail.com.';
    const senha = form.elements.senha.value;
    if (form.id === 'ct-form-entrar' && !senha) erros.senha = 'Digite a sua senha.';
    if (form.id === 'ct-form-criar' && senha.length < 6) erros.senha = 'A senha precisa ter pelo menos 6 caracteres.';
    ['nome', 'email', 'senha'].forEach((n) => erroCampo(form, n, erros[n]));
    return erros;
  }

  raiz.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    form.dataset.tentou = '1';
    erroGeral(form, '');
    const erros = validar(form);
    const primeiro = Object.keys(erros)[0];
    if (primeiro) return form.elements[primeiro].focus();
    const btn = $('.ct-form__enviar', form);
    btn.disabled = true;
    const v = (n) => (form.elements[n]?.value || '').trim();
    try {
      if (form.id === 'ct-form-entrar') await entrar(v('email'), form.elements.senha.value);
      else await cadastrar({ nome: v('nome'), email: v('email'), telefone: v('telefone'), senha: form.elements.senha.value });
      // a troca de sessão dispara a renderização do painel
    } catch (err) {
      btn.disabled = false;
      erroGeral(form, err.message);
      if (/Use "Criar conta"/.test(err.message)) {
        trocarAba('criar', false);
        $('#ct-c-email', raiz).value = v('email');
        $('#ct-c-nome', raiz).focus();
        erroGeral($('#ct-form-criar', raiz), 'Este e-mail já agendou conosco. Complete os dados para criar a senha.');
      }
      if (/Já existe uma conta/.test(err.message)) {
        trocarAba('entrar', false);
        $('#ct-e-email', raiz).value = v('email');
        $('#ct-e-senha', raiz).focus();
        erroGeral($('#ct-form-entrar', raiz), 'Você já tem conta com este e-mail. Entre com a sua senha.');
      }
    }
  });

  trocarAba(aba, false);
  principal.replaceChildren(raiz);
  return raiz;
}

