// Configurações: horários, equipe, serviços e preços, dados do negócio, armazenamento e dados de demonstração.
import { html, render, acoes } from '../dom.js';
import { icon } from '../icons.js';
import { chave, confirmar, toast, kb } from '../ui.js';
import { pedirFaturaAoConcluir, definirPedirFatura } from '../acoes.js';
import { db } from '../../data/store.js';
import { semear } from '../../data/seed.js';
import { horarios, diasSemana, equipe, categorias, servicosDaCategoria, negocio, profissionalPorId } from '../../data/catalog.js';
import { precoServico, duracao } from '../../lib/format.js';

const LIMITE = 10 * 1024 * 1024;
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];
let raiz = null;
let restaurando = false;

const turnosTexto = (t) => (t.length ? t.map(([a, f]) => `${a} às ${f}`).join(', ') : 'Fechado');

function porColecao() {
  const tam = (k) => (localStorage.getItem('dc:' + k)?.length || 0) * 2;
  return [
    ['Faturas e arquivos', tam('faturas')],
    ['E-mails enviados', tam('emails')],
    ['Agendamentos', tam('agendamentos')],
    ['Clientes', tam('clientes')],
    ['Campanhas e automações', tam('campanhas') + tam('automacoes')],
  ];
}

function armazenamento() {
  const uso = db.usoBytes();
  const pct = Math.min(100, Math.round((uso / LIMITE) * 100));
  return html`
    <p class="uso"><strong class="tnum">${kb(uso)}</strong> <span class="fraco">de cerca de 10 MB disponíveis neste navegador</span></p>
    <div class="medidor medidor--grande ${pct > 80 ? 'is-alto' : ''}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Armazenamento usado"><span style="width:${Math.max(pct, 1)}%"></span></div>
    <ul class="uso__lista">${porColecao().map(([n, b]) => html`<li><span>${n}</span><span class="tnum fraco">${kb(b)}</span></li>`)}</ul>
    <p class="campo__ajuda">Nesta demonstração tudo fica guardado no navegador. Com o sistema no ar, os dados e os arquivos ficam num servidor seguro.</p>`;
}

function desenhar() {
  if (!raiz) return;
  const hoje = new Date().getDay();
  render(raiz, html`
    <header class="pag-topo">
      <div>
        <h1 class="pag-topo__titulo">Configurações</h1>
        <p class="pag-topo__sub">Horários, equipe e preços que aparecem no site e na agenda.</p>
      </div>
    </header>

    <div class="cfg-grade">
      <section class="cfg-bloco" aria-labelledby="cfg-hor">
        <h2 class="secao-titulo" id="cfg-hor">Horário de funcionamento</h2>
        <table class="tabela tabela--simples">
          <tbody>${ORDEM_DIAS.map((d) => html`<tr class="${d === hoje ? 'is-hoje' : ''}">
            <th scope="row">${diasSemana[d]}${d === hoje ? html` <span class="fraco">(hoje)</span>` : ''}</th>
            <td class="num ${horarios[d].length ? '' : 'fraco'}">${turnosTexto(horarios[d])}</td></tr>`)}</tbody>
        </table>
        <p class="campo__ajuda">Almoço das 13:00 às 14:00. A agenda e o site só oferecem horários dentro destes turnos.</p>
      </section>

      <section class="cfg-bloco" aria-labelledby="cfg-neg">
        <h2 class="secao-titulo" id="cfg-neg">Dados do negócio</h2>
        <dl class="definicoes definicoes--cfg">
          <dt>Nome</dt><dd>${negocio.nome}</dd>
          <dt>Endereço</dt><dd>${negocio.endereco}, ${negocio.cidade}<br><span class="fraco">${negocio.referencia}</span></dd>
          <dt>Telefone</dt><dd class="tnum">${negocio.telefone}</dd>
          <dt>E-mail</dt><dd>${negocio.email}</dd>
          <dt>Instagram</dt><dd><a class="link-seco link-seco--leve" href="${negocio.instagram}" target="_blank" rel="noopener">${negocio.instagramUser}</a></dd>
          <dt>Pagamento</dt><dd>${negocio.pagamento.join(', ')}</dd>
        </dl>
      </section>
    </div>

    <section class="cfg-bloco cfg-bloco--largo" aria-labelledby="cfg-eq">
      <h2 class="secao-titulo" id="cfg-eq">Equipe</h2>
      <ul class="equipe">${equipe.map((p) => html`<li class="equipe__item">
        <img src="${p.foto}" alt="" width="64" height="64" loading="lazy">
        <div><strong>${p.nomeCompleto}</strong><span class="equipe__funcao">${p.funcao}</span><p>${p.resumo}</p></div>
      </li>`)}</ul>
    </section>

    <section class="cfg-bloco cfg-bloco--largo" aria-labelledby="cfg-serv">
      <div class="secao-topo"><div><h2 class="secao-titulo" id="cfg-serv">Serviços e preços</h2>
        <p class="secao-sub">Tabela usada no site, na agenda e no cálculo dos totais.</p></div></div>
      <div class="tabela-caixa">
        <div class="tabela-rolo">
          <table class="tabela tabela--serv">
            <thead><tr><th>Serviço</th><th>Duração</th><th class="dir">Preço</th><th>Quem faz</th></tr></thead>
            ${categorias.map((cat) => html`<tbody>
              <tr class="tabela__grupo"><th colspan="4" scope="colgroup">${cat.nome}</th></tr>
              ${servicosDaCategoria(cat.id).map((s) => html`<tr>
                <td class="forte">${s.nome}</td>
                <td class="num fraco">${duracao(s.duracao)}</td>
                <td class="dir num">${precoServico(s)}</td>
                <td class="fraco">${s.prof.map((id) => profissionalPorId(id).nome).join(' e ')}</td>
              </tr>`)}
            </tbody>`)}
          </table>
        </div>
      </div>
    </section>

    <div class="cfg-grade">
      <section class="cfg-bloco" aria-labelledby="cfg-fat">
        <h2 class="secao-titulo" id="cfg-fat">Faturas</h2>
        ${chave({ id: 'cfg-fatura', marcado: pedirFaturaAoConcluir(), rotulo: 'Pedir a fatura ao concluir um atendimento', desc: 'Ao marcar Concluído, a Nova fatura abre já preenchida.' })}
      </section>
      <section class="cfg-bloco" aria-labelledby="cfg-arm">
        <h2 class="secao-titulo" id="cfg-arm">Armazenamento</h2>
        <div data-uso>${armazenamento()}</div>
      </section>
    </div>

    <section class="cfg-bloco cfg-perigo" aria-labelledby="cfg-demo">
      <div>
        <h2 class="secao-titulo" id="cfg-demo">Dados de demonstração</h2>
        <p class="secao-sub">Apaga os agendamentos, clientes, faturas e e-mails deste navegador e cria de novo os dados de exemplo.</p>
      </div>
      <button type="button" class="btn a-btn a-btn--linha" data-act="restaurar" ${restaurando ? html`disabled` : ''}>${restaurando ? html`<span class="giro"></span>Restaurando` : html`${icon('repetir', 16)}Restaurar dados de demonstração`}</button>
    </section>`);
}

export default {
  montar(el) {
    raiz = el;
    desenhar();
    acoes(el, {
      restaurar: async () => {
        const ok = await confirmar({
          titulo: 'Restaurar os dados de demonstração?',
          texto: 'Tudo o que foi criado neste navegador (agendamentos, faturas, campanhas, e-mails) será apagado e os dados de exemplo voltam ao estado inicial.',
          ok: 'Restaurar dados',
          perigo: true,
        });
        if (!ok) return;
        restaurando = true;
        desenhar();
        try {
          await new Promise((r) => setTimeout(r, 50));
          await semear();
          toast('Dados de demonstração restaurados.');
        } catch (e) {
          toast(`Não foi possível restaurar: ${e.message}`, { tipo: 'erro' });
        } finally {
          restaurando = false;
          desenhar();
        }
      },
    });
    el.addEventListener('change', (ev) => {
      if (ev.target.id === 'cfg-fatura') {
        definirPedirFatura(ev.target.checked);
        toast(ev.target.checked ? 'A Nova fatura vai abrir ao concluir um atendimento.' : 'A Nova fatura não abre mais sozinha ao concluir.');
      }
    });
  },
  atualizar() {
    if (!raiz || restaurando) return;
    const uso = raiz.querySelector('[data-uso]');
    if (uso) render(uso, armazenamento());
    const ch = raiz.querySelector('#cfg-fatura');
    if (ch) ch.checked = pedirFaturaAoConcluir();
  },
  desmontar() {
    raiz = null;
  },
};
