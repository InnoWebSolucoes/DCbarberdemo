// Automações: lembrete de corte, cliente sumido e obrigado pela visita.
import { html, render, debounce, qsa } from '../dom.js';
import { icon } from '../icons.js';
import { col, porId, dataEnvio } from '../dados.js';
import { chave, toast } from '../ui.js';
import { srcdoc } from '../paineis/email.js';
import { db } from '../../data/store.js';
import { emailLivre, preencher } from '../../data/templates.js';
import { tempoRelativo } from '../../lib/format.js';

const ORDEM = ['lembrete-corte', 'sentimos-falta', 'pos-atendimento'];
const VARS = [
  { id: 'nome', desc: 'Primeiro nome do cliente' },
  { id: 'dias', desc: 'Dias desde a última visita' },
  { id: 'semanas', desc: 'Semanas desde a última visita' },
  { id: 'barbeiro', desc: 'Quem fez o último atendimento' },
];
const CAMPOS = ['assunto', 'titulo', 'texto', 'cta', 'ctaUrl', 'dias'];

const rascunhos = new Map();
const ultimoCampo = new Map();
let raiz = null;

const exemplo = (a, r) => {
  const dias = a.gatilho === 'ao-concluir' ? 0 : Math.max(Number(r.dias) || a.dias || 21, 1) + 3;
  return { nome: 'Rafael', dias, semanas: Math.round(dias / 7), barbeiro: 'David' };
};

function rascunho(a) {
  if (!rascunhos.has(a.id)) rascunhos.set(a.id, Object.fromEntries(CAMPOS.map((c) => [c, a[c] ?? ''])));
  return rascunhos.get(a.id);
}
const sujo = (a) => CAMPOS.some((c) => String(rascunho(a)[c] ?? '') !== String(a[c] ?? ''));

function metricas(id) {
  const lista = col('emails').filter((e) => e.automacaoId === id);
  const ultimo = lista.reduce((m, e) => (!m || dataEnvio(e) > m ? dataEnvio(e) : m), null);
  const abertos = lista.filter((e) => e.aberto).length;
  return { n: lista.length, ultimo, abertura: lista.length ? Math.round((abertos / lista.length) * 100) : 0 };
}

function cartao(a) {
  const r = rascunho(a);
  const m = metricas(a.id);
  const vars = a.gatilho === 'ao-concluir' ? VARS.filter((v) => v.id === 'nome' || v.id === 'barbeiro') : VARS;
  return html`
  <article class="auto painel" data-auto="${a.id}" aria-labelledby="auto-t-${a.id}">
    <header class="auto__topo">
      <div class="auto__titulos">
        <h2 class="auto__nome" id="auto-t-${a.id}">${a.nome}</h2>
        <p class="auto__desc">${a.descricao}</p>
        <p class="auto__num" data-metricas>${metricasHtml(m)}</p>
      </div>
      ${chave({ id: `auto-on-${a.id}`, marcado: a.ativo, rotulo: a.ativo ? 'Ligada' : 'Desligada', attrs: `data-ligar="${a.id}"` })}
    </header>
    <div class="auto__corpo">
      <div class="auto__editor">
        <div class="auto__gatilho">
          ${a.gatilho === 'ao-concluir'
            ? html`<p>Sai quando o atendimento é marcado como <strong>Concluído</strong> na agenda.</p>`
            : html`<label class="auto__dias">Enviar <input class="entrada entrada--sm entrada--dias tnum" type="number" min="1" max="365" data-campo="dias" value="${r.dias}" aria-label="Dias depois da última visita"> dias depois da última visita, para quem não tem horário marcado.</label>
              ${a.id === 'lembrete-corte' ? html`<p class="campo__ajuda">Clientes que escolheram outro prazo na conta seguem o prazo deles.</p>` : ''}`}
        </div>
        <label class="campo"><span class="campo__rotulo">Assunto</span><input class="entrada" data-campo="assunto" value="${r.assunto}"></label>
        <label class="campo"><span class="campo__rotulo">Título</span><input class="entrada" data-campo="titulo" value="${r.titulo}"></label>
        <label class="campo"><span class="campo__rotulo">Texto</span><textarea class="texto" data-campo="texto" rows="5">${r.texto}</textarea>
          <span class="campo__ajuda">Deixe uma linha em branco para começar outro parágrafo.</span></label>
        <div class="linha-campos">
          <label class="campo"><span class="campo__rotulo">Texto do botão</span><input class="entrada" data-campo="cta" value="${r.cta}"></label>
          <label class="campo"><span class="campo__rotulo">Link do botão</span><input class="entrada" data-campo="ctaUrl" value="${r.ctaUrl}"></label>
        </div>
        <div class="variaveis" role="group" aria-label="Inserir variável">
          <span class="variaveis__rotulo">Inserir no campo:</span>
          ${vars.map((v) => html`<button type="button" class="var-chip" data-var="${v.id}" title="${v.desc}">{{${v.id}}}</button>`)}
        </div>
        <div class="auto__salvar" data-salvar>${barraSalvar(a)}</div>
      </div>
      <div class="auto__previa">
        <div class="previa-cab previa-cab--auto">
          <p class="previa-cab__titulo">Pré-visualização</p>
          <dl class="previa-cab__meta"><dt>Assunto</dt><dd data-previa-assunto>${preencher(r.assunto, exemplo(a, r))}</dd></dl>
        </div>
        <iframe class="email-quadro auto__quadro" title="Pré-visualização de ${a.nome}" sandbox="allow-same-origin" data-previa></iframe>
      </div>
    </div>
  </article>`;
}

const metricasHtml = (m) => (m.n
  ? html`<strong class="tnum">${m.n}</strong> ${m.n === 1 ? 'e-mail enviado' : 'e-mails enviados'}, ${m.abertura}% abertos${m.ultimo ? `, o último ${tempoRelativo(m.ultimo)}` : ''}`
  : 'Nenhum e-mail enviado ainda');

const barraSalvar = (a) => (sujo(a)
  ? html`<span class="auto__aviso">Alterações não salvas</span>
    <button type="button" class="btn a-btn a-btn--leve a-btn--sm" data-acao="descartar">Descartar</button>
    <button type="button" class="btn a-btn a-btn--preto a-btn--sm" data-acao="salvar">Salvar alterações</button>`
  : html`<span class="auto__ok">${icon('check', 15)}Tudo salvo</span>`);

function atualizarPrevia(cartaoEl, a) {
  const r = rascunho(a);
  const v = exemplo(a, r);
  const corpo = emailLivre({ titulo: preencher(r.titulo, v), texto: preencher(r.texto, v), cta: r.cta, ctaUrl: r.ctaUrl });
  cartaoEl.querySelector('[data-previa]').srcdoc = srcdoc(corpo);
  cartaoEl.querySelector('[data-previa-assunto]').textContent = preencher(r.assunto, v);
}

function desenhar() {
  const lista = ORDEM.map((id) => porId('automacoes', id)).filter(Boolean);
  const extras = col('automacoes').filter((a) => !ORDEM.includes(a.id));
  const todas = [...lista, ...extras];
  render(raiz, todas.length ? html`<div class="autos">${todas.map(cartao)}</div>`
    : html`<p class="vazio">Nenhuma automação encontrada. Restaure os dados de demonstração em Configurações.</p>`);
  todas.forEach((a) => atualizarPrevia(raiz.querySelector(`[data-auto="${a.id}"]`), a));
}

function sincronizar() {
  // Mudanças vindas de fora (outra aba, fila): atualiza chave, números e campos que não estão sendo editados.
  for (const el of qsa('[data-auto]', raiz)) {
    const a = porId('automacoes', el.dataset.auto);
    if (!a) continue;
    const ch = el.querySelector('[data-ligar]');
    if (ch && ch.checked !== !!a.ativo) {
      ch.checked = !!a.ativo;
      ch.closest('.chave').querySelector('.chave__rotulo').textContent = a.ativo ? 'Ligada' : 'Desligada';
    }
    render(el.querySelector('[data-metricas]'), metricasHtml(metricas(a.id)));
    if (!sujo(a)) {
      rascunhos.delete(a.id);
      const r = rascunho(a);
      el.querySelectorAll('[data-campo]').forEach((c) => {
        if (document.activeElement !== c && c.value !== String(r[c.dataset.campo] ?? '')) c.value = r[c.dataset.campo] ?? '';
      });
      atualizarPrevia(el, a);
    }
    render(el.querySelector('[data-salvar]'), barraSalvar(a));
  }
}

async function salvar(el, a) {
  const r = rascunho(a);
  const dias = Math.max(1, Math.min(365, Math.round(Number(r.dias) || a.dias || 1)));
  const patch = { assunto: r.assunto.trim(), titulo: r.titulo.trim(), texto: r.texto.trim(), cta: r.cta.trim(), ctaUrl: r.ctaUrl.trim() || '/#agendar' };
  if (a.gatilho !== 'ao-concluir') patch.dias = dias;
  if (!patch.assunto || !patch.titulo || !patch.texto) {
    toast('Preencha assunto, título e texto antes de salvar.', { tipo: 'erro' });
    return;
  }
  rascunhos.delete(a.id);
  await db.update('automacoes', a.id, patch);
  toast(`${a.nome}: alterações salvas.`);
}

export default {
  montar(el) {
    raiz = el;
    desenhar();
    const previaDepois = debounce((cartaoEl, a) => atualizarPrevia(cartaoEl, a), 160);

    el.addEventListener('focusin', (ev) => {
      const c = ev.target.closest('[data-campo]');
      if (c && c.dataset.campo !== 'dias' && c.dataset.campo !== 'ctaUrl') ultimoCampo.set(c.closest('[data-auto]').dataset.auto, c.dataset.campo);
    });
    el.addEventListener('input', (ev) => {
      const c = ev.target.closest('[data-campo]');
      if (!c) return;
      const cartaoEl = c.closest('[data-auto]');
      const a = porId('automacoes', cartaoEl.dataset.auto);
      rascunho(a)[c.dataset.campo] = c.value;
      render(cartaoEl.querySelector('[data-salvar]'), barraSalvar(a));
      previaDepois(cartaoEl, a);
    });
    el.addEventListener('change', async (ev) => {
      const id = ev.target.dataset.ligar;
      if (!id) return;
      const a = porId('automacoes', id);
      await db.update('automacoes', id, { ativo: ev.target.checked });
      toast(ev.target.checked ? `${a.nome} ligada. Os e-mails saem sozinhos a cada verificação da fila.` : `${a.nome} desligada. Nenhum e-mail novo sai desta automação.`);
    });
    el.addEventListener('mousedown', (ev) => {
      if (ev.target.closest('.var-chip')) ev.preventDefault();
    });
    el.addEventListener('click', async (ev) => {
      const cartaoEl = ev.target.closest('[data-auto]');
      if (!cartaoEl) return;
      const a = porId('automacoes', cartaoEl.dataset.auto);
      const chip = ev.target.closest('[data-var]');
      const botao = ev.target.closest('[data-acao]');
      if (chip) {
        const campo = ultimoCampo.get(a.id) || 'texto';
        const alvo = cartaoEl.querySelector(`[data-campo="${campo}"]`);
        const token = `{{${chip.dataset.var}}}`;
        const ini = alvo.selectionStart ?? alvo.value.length;
        const fim = alvo.selectionEnd ?? alvo.value.length;
        alvo.setRangeText(token, ini, fim, 'end');
        alvo.focus();
        alvo.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (botao?.dataset.acao === 'salvar') {
        await salvar(cartaoEl, a);
      } else if (botao?.dataset.acao === 'descartar') {
        rascunhos.delete(a.id);
        const r = rascunho(a);
        cartaoEl.querySelectorAll('[data-campo]').forEach((c) => { c.value = r[c.dataset.campo] ?? ''; });
        render(cartaoEl.querySelector('[data-salvar]'), barraSalvar(a));
        atualizarPrevia(cartaoEl, a);
      }
    });
  },
  atualizar() {
    if (raiz) sincronizar();
  },
  desmontar() {
    raiz = null;
  },
};

