// Seções "Preferências" e "Dados pessoais".
import { atualizarCliente } from '../data/api.js';
import { esc, $, $$, telefoneValido } from '../booking/ui.js';
import { avisar } from './modal.js';

const INTERVALOS = [
  { dias: 21, rotulo: 'A cada 3 semanas' },
  { dias: 28, rotulo: 'A cada 4 semanas' },
  { dias: 42, rotulo: 'A cada 6 semanas' },
];

export function htmlPreferencias(c) {
  const atual = c.lembreteDias || 21;
  const opcoes = INTERVALOS.some((i) => i.dias === atual) ? INTERVALOS : [...INTERVALOS, { dias: atual, rotulo: `A cada ${atual} dias` }].sort((a, b) => a.dias - b.dias);
  return `
    <div class="ct-pref">
      <label class="ct-chave" for="ct-mkt">
        <span class="ct-chave__texto">
          <strong>Lembretes e novidades por <span class="nw">e-mail</span></strong>
          <span>Lembrete para voltar, horários livres e promoções da casa. Poucos <span class="nw">e-mails</span> por mês.</span>
        </span>
        <input type="checkbox" id="ct-mkt" class="ct-chave__input" role="switch"${c.marketing ? ' checked' : ''}>
        <span class="ct-chave__trilho" aria-hidden="true"><span></span></span>
      </label>
      <fieldset class="ct-intervalo"${c.marketing ? '' : ' disabled'}>
        <legend class="ct-intervalo__titulo">Lembrete de corte</legend>
        <p class="ct-intervalo__texto" id="ct-int-texto">Mandamos um <span class="nw">e-mail</span> quando passar esse tempo desde o seu último corte, se você não tiver horário marcado.</p>
        <div class="ct-intervalo__opcoes ct-intervalo__opcoes--${opcoes.length}" aria-describedby="ct-int-texto">
          ${opcoes.map((o) => `
            <label class="ct-opcao">
              <input type="radio" name="ct-lembrete" value="${o.dias}"${o.dias === atual ? ' checked' : ''}>
              <span>${esc(o.rotulo)}</span>
            </label>`).join('')}
        </div>
        ${c.marketing ? '' : '<p class="ct-intervalo__off">Ligue os lembretes acima para escolher o intervalo.</p>'}
      </fieldset>
    </div>`;
}

export function ligarPreferencias(secao, obterCliente) {
  secao.addEventListener('change', async (e) => {
    const c = obterCliente();
    if (!c) return;
    if (e.target.id === 'ct-mkt') {
      await atualizarCliente(c.id, { marketing: e.target.checked });
      avisar(e.target.checked ? 'Lembretes ligados.' : 'Lembretes desligados.');
    }
    if (e.target.name === 'ct-lembrete') {
      const dias = Number(e.target.value);
      await atualizarCliente(c.id, { lembreteDias: dias });
      avisar(`Pronto. Lembramos você ${dias % 7 === 0 ? `a cada ${dias / 7} semanas` : `a cada ${dias} dias`}.`);
    }
  });
}

// Atualiza a seção sem recriar o HTML (preserva o foco no controle).
export function sincronizarPreferencias(secao, c) {
  const chave = $('#ct-mkt', secao);
  if (!chave) return;
  const atual = c.lembreteDias || 21;
  const temOpcao = $$('input[name="ct-lembrete"]', secao).some((r) => Number(r.value) === atual);
  if (!temOpcao) return false;
  chave.checked = !!c.marketing;
  $$('input[name="ct-lembrete"]', secao).forEach((r) => { r.checked = Number(r.value) === atual; });
  const fs = $('.ct-intervalo', secao);
  fs.disabled = !c.marketing;
  let off = $('.ct-intervalo__off', secao);
  if (!c.marketing && !off) fs.insertAdjacentHTML('beforeend', '<p class="ct-intervalo__off">Ligue os lembretes acima para escolher o intervalo.</p>');
  if (c.marketing && off) off.remove();
  return true;
}

export function htmlDados(c) {
  return `
    <form class="ct-dados" novalidate>
      <div class="ct-dados__grade">
        <div class="ag-campo" data-campo="nome">
          <label class="ag-campo__rotulo" for="ct-d-nome">Nome</label>
          <input class="ag-campo__input" id="ct-d-nome" name="nome" autocomplete="name" value="${esc(c.nome)}" aria-describedby="ct-d-nome-erro">
          <p class="ag-campo__erro" id="ct-d-nome-erro" hidden></p>
        </div>
        <div class="ag-campo" data-campo="telefone">
          <label class="ag-campo__rotulo" for="ct-d-tel">Telefone</label>
          <input class="ag-campo__input" id="ct-d-tel" name="telefone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(c.telefone || '')}" placeholder="+351 912 345 678" aria-describedby="ct-d-tel-erro">
          <p class="ag-campo__erro" id="ct-d-tel-erro" hidden></p>
        </div>
      </div>
      <p class="ct-dados__email">E-mail da conta: <strong>${esc(c.email)}</strong>. É por ele que você entra e recebe as confirmações.</p>
      <div class="ct-dados__acoes">
        <button type="submit" class="btn btn--branco" disabled>Salvar alterações</button>
      </div>
    </form>`;
}

export function ligarDados(secao, obterCliente) {
  const erro = (form, nome, msg) => {
    const campo = $(`[data-campo="${nome}"]`, form);
    campo.classList.toggle('is-erro', !!msg);
    const p = $('.ag-campo__erro', campo);
    p.hidden = !msg;
    p.textContent = msg || '';
    $('input', campo).setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  const mudou = (form) => {
    const c = obterCliente();
    return form.elements.nome.value.trim() !== c.nome || form.elements.telefone.value.trim() !== (c.telefone || '');
  };
  secao.addEventListener('input', (e) => {
    const form = e.target.form;
    if (!form) return;
    form.dataset.sujo = mudou(form) ? '1' : '';
    $('button[type="submit"]', form).disabled = !mudou(form);
  });
  secao.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const c = obterCliente();
    const nome = form.elements.nome.value.trim();
    const tel = form.elements.telefone.value.trim();
    erro(form, 'nome', nome.length < 2 ? 'Digite seu nome.' : '');
    erro(form, 'telefone', tel && !telefoneValido(tel) ? 'Digite um telefone com pelo menos 9 números, por exemplo +351 912 345 678.' : '');
    if (nome.length < 2) return form.elements.nome.focus();
    if (tel && !telefoneValido(tel)) return form.elements.telefone.focus();
    form.dataset.sujo = '';
    await atualizarCliente(c.id, { nome, telefone: tel });
    $('button[type="submit"]', form).disabled = true;
    avisar('Dados salvos.');
  });
}

// Só repinta se a pessoa não estiver editando.
export function podeRepintarDados(secao) {
  const form = $('.ct-dados', secao);
  return !form || (!form.dataset.sujo && !form.contains(document.activeElement));
}
