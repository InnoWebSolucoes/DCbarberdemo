// Gráfico de barras em SVG feito à mão: receita por dia.
import { html, raw, render } from '../dom.js';
import { moeda, isoDia } from '../../lib/format.js';

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const passoBonito = (max) => {
  const alvo = max / 4;
  const p = 10 ** Math.floor(Math.log10(alvo || 1));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= alvo) return m * p;
  return 10 * p;
};

// Barra com a ponta de cima arredondada (4px) e base reta.
const barra = (x, y, w, h, r = 4) => {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
};

export function graficoReceita(el, serie) {
  const W = Math.max(300, el.clientWidth || 600);
  const H = 232;
  const m = { t: 24, r: 6, b: 44, l: 48 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const hoje = isoDia(new Date());
  const valor = (d) => (isoDia(d.dia) === hoje ? d.real + d.previsto : d.real);
  const max = Math.max(1, ...serie.map(valor));
  const passo = passoBonito(max);
  const topo = Math.ceil(max / passo) * passo;
  const y = (v) => m.t + ph - (v / topo) * ph;
  const banda = pw / serie.length;
  const bw = Math.min(24, banda * 0.62);
  const iMax = serie.reduce((im, d, i) => (valor(d) > valor(serie[im]) ? i : im), 0);

  const ticks = [];
  for (let v = 0; v <= topo + 0.001; v += passo) ticks.push(v);

  const svg = `
  <svg class="grafico__svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Receita por dia nos últimos 14 dias">
    ${ticks.map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" class="grafico__grade ${v === 0 ? 'grafico__base' : ''}"/>
      <text x="${m.l - 10}" y="${y(v) + 4}" text-anchor="end" class="grafico__eixo">${v >= 1000 ? `${(v / 1000).toString().replace('.', ',')} mil` : v}</text>`).join('')}
    ${serie.map((d, i) => {
      const cx = m.l + banda * i + banda / 2;
      const ehHoje = isoDia(d.dia) === hoje;
      const v = valor(d);
      const bx = cx - bw / 2;
      const by = y(v);
      const bh = m.t + ph - by;
      const rotulo = ehHoje ? 'hoje' : SEMANA[d.dia.getDay()];
      const mostrarValor = (i === iMax || ehHoje) && v > 0;
      const partes = [];
      if (ehHoje && d.real > 0 && d.previsto > 0) {
        // Hoje: parte concluída em ouro escuro, restante previsto em ouro claro.
        const yReal = y(d.real);
        partes.push(`<path d="${barra(bx, by, bw, yReal - by - 2)}" class="grafico__barra grafico__barra--previsto"/>`);
        partes.push(`<rect x="${bx}" y="${yReal}" width="${bw}" height="${m.t + ph - yReal}" class="grafico__barra grafico__barra--hoje"/>`);
      } else if (v > 0) {
        partes.push(`<path d="${barra(bx, by, bw, bh)}" class="grafico__barra ${ehHoje ? 'grafico__barra--previsto' : ''}"/>`);
      }
      return `<g class="grafico__col ${ehHoje ? 'is-hoje' : ''} ${d.fechado ? 'is-fechado' : ''}" data-i="${i}">
        <rect x="${m.l + banda * i}" y="${m.t}" width="${banda}" height="${ph + m.b}" class="grafico__alvo"/>
        ${partes.join('')}
        ${d.fechado && !v ? `<line x1="${cx - 5}" x2="${cx + 5}" y1="${m.t + ph - 3}" y2="${m.t + ph - 3}" class="grafico__fechado"/>` : ''}
        ${mostrarValor ? `<text x="${cx}" y="${by - 8}" text-anchor="middle" class="grafico__valor">${moeda(v)}</text>` : ''}
        <text x="${cx}" y="${H - m.b + 19}" text-anchor="middle" class="grafico__dia">${d.dia.getDate()}</text>
        <text x="${cx}" y="${H - m.b + 35}" text-anchor="middle" class="grafico__sem">${rotulo}</text>
      </g>`;
    }).join('')}
  </svg>`;

  render(el, html`
    ${raw(svg)}
    <div class="grafico__dica" role="presentation" hidden></div>
    <table class="sr-only"><caption>Receita por dia</caption><thead><tr><th>Dia</th><th>Receita</th></tr></thead><tbody>
      ${serie.map((d) => html`<tr><td>${d.dia.toLocaleDateString('pt-BR')}</td><td>${d.fechado ? 'Fechado' : moeda(valor(d))}</td></tr>`)}
    </tbody></table>`);

  const dica = el.querySelector('.grafico__dica');
  const svgEl = el.querySelector('svg');
  const mostrar = (i) => {
    const d = serie[i];
    const ehHoje = isoDia(d.dia) === hoje;
    const data = d.dia.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
    dica.innerHTML = html`<strong class="maiuscula">${data}</strong>
      ${d.fechado ? html`<span>Fechado</span>`
        : ehHoje ? html`<span>${moeda(d.real)} concluídos</span><span>${moeda(d.previsto)} ainda por atender</span>`
        : html`<span>${moeda(d.real)} em ${d.n} ${d.n === 1 ? 'atendimento' : 'atendimentos'}</span>`}`.toString();
    dica.hidden = false;
    const cx = m.l + banda * i + banda / 2;
    const left = Math.min(Math.max(cx, 90), W - 90);
    dica.style.left = `${left}px`;
    dica.style.top = `${Math.max(0, y(valor(d)) - 12)}px`;
    svgEl.querySelectorAll('.grafico__col').forEach((g) => g.classList.toggle('is-foco', Number(g.dataset.i) === i));
  };
  const esconder = () => {
    dica.hidden = true;
    svgEl.querySelectorAll('.grafico__col').forEach((g) => g.classList.remove('is-foco'));
  };
  svgEl.addEventListener('pointermove', (ev) => {
    const g = ev.target.closest('.grafico__col');
    if (g) mostrar(Number(g.dataset.i));
  });
  svgEl.addEventListener('pointerleave', esconder);
}
