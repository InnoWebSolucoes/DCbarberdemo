// Janela sobreposta (fatura, e-mail, confirmação) e aviso rápido (toast).
import { el, esc, icone, $ } from '../booking/ui.js';

let aberta = null;

function focaveis(raiz) {
  return [...raiz.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])')]
    .filter((x) => x.offsetParent !== null);
}

// Abre uma janela. `corpo` é HTML ou um elemento. Devolve { fechar, raiz }.
export function abrirJanela({ titulo, meta = '', corpo, acoes = '', classe = '', aoFechar } = {}) {
  aberta?.fechar(true);
  const anterior = document.activeElement;
  const chaveFoco = anterior?.dataset?.foco;
  const raiz = el(`
    <div class="ct-janela ${classe}">
      <div class="ct-janela__fundo" data-fechar></div>
      <div class="ct-janela__caixa" role="dialog" aria-modal="true" aria-labelledby="ct-janela-t">
        <div class="ct-janela__topo">
          <div class="ct-janela__cab">
            <p class="ct-janela__titulo" id="ct-janela-t" tabindex="-1">${esc(titulo)}</p>
            ${meta ? `<p class="ct-janela__meta">${meta}</p>` : ''}
          </div>
          <div class="ct-janela__acoes">${acoes}<button type="button" class="ct-janela__x" data-fechar aria-label="Fechar">${icone.fechar}</button></div>
        </div>
        <div class="ct-janela__corpo"></div>
      </div>
    </div>`);
  const slot = $('.ct-janela__corpo', raiz);
  if (typeof corpo === 'string') slot.innerHTML = corpo;
  else if (corpo) slot.appendChild(corpo);
  document.body.appendChild(raiz);
  document.documentElement.classList.add('ct-travado');
  requestAnimationFrame(() => raiz.classList.add('is-aberta'));

  const tecla = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); fechar(); }
    if (e.key === 'Tab') {
      const f = focaveis(raiz);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  raiz.addEventListener('keydown', tecla);
  raiz.addEventListener('click', (e) => { if (e.target.closest('[data-fechar]')) fechar(); });

  function fechar(imediato = false) {
    if (!raiz.isConnected) return;
    aberta = null;
    document.documentElement.classList.remove('ct-travado');
    const remover = () => raiz.remove();
    if (imediato || matchMedia('(prefers-reduced-motion: reduce)').matches) remover();
    else {
      raiz.classList.remove('is-aberta');
      setTimeout(remover, 260);
    }
    aoFechar?.();
    const volta = anterior && document.contains(anterior) ? anterior : (chaveFoco && document.querySelector(`[data-foco="${chaveFoco}"]`));
    volta?.focus({ preventScroll: true });
  }

  aberta = { fechar, raiz };
  $('#ct-janela-t', raiz).focus({ preventScroll: true });
  return aberta;
}

export const janelaAberta = () => !!aberta;

// Confirmação simples. Resolve true/false.
export function confirmar({ titulo, texto, sim, nao = 'Voltar', perigo = false }) {
  return new Promise((resolve) => {
    let resposta = false;
    const corpo = el(`
      <div class="ct-confirma">
        <p class="ct-confirma__texto">${texto}</p>
        <div class="ct-confirma__acoes">
          <button type="button" class="btn btn--linha" data-r="nao">${esc(nao)}</button>
          <button type="button" class="btn ${perigo ? 'ct-btn-perigo' : 'btn--ouro'}" data-r="sim">${esc(sim)}</button>
        </div>
      </div>`);
    const j = abrirJanela({ titulo, corpo, classe: 'ct-janela--pequena', aoFechar: () => resolve(resposta) });
    corpo.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      resposta = b.dataset.r === 'sim';
      j.fechar();
    });
    $('[data-r="nao"]', corpo).focus();
  });
}

let toastTimer = null;
export function avisar(texto) {
  let t = document.querySelector('.ct-toast');
  if (!t) {
    t = el('<div class="ct-toast" role="status" aria-live="polite"></div>');
    document.body.appendChild(t);
  }
  t.textContent = texto;
  t.classList.add('is-visivel');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-visivel'), 2800);
}
