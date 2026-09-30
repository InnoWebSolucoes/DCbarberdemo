// Campanhas: lembrete mensal em destaque e lista com envios, aberturas e cliques.
import { html, render, acoes } from '../dom.js';
import { icon } from '../icons.js';
import { col, porId, listaPublico, metricasCampanha, refImagemCampanha } from '../dados.js';
import { vazio, confirmar, toast } from '../ui.js';
import { abrirCampanha, PRESET_MENSAL, proximaMensal } from '../paineis/campanha.js';
import { db } from '../../data/store.js';
import { PUBLICOS, enviarCampanha } from '../../data/api.js';
import { hhmm } from '../../lib/format.js';

let raiz = null;
let enviando = null;

const nomePublico = (id) => PUBLICOS.find((p) => p.id === id)?.nome || id;
const quandoCurto = (iso) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')} às ${hhmm(d)}`;
};

function statusCampanha(c) {
  if (c.status === 'agendada' && c.recorrencia === 'mensal') {
    return html`<span class="cst cst--agendada"><i aria-hidden="true"></i>Todo mês</span><span class="tabela__sub">Próximo: ${c.agendadaPara ? quandoCurto(c.agendadaPara) : 'sem data'}</span>`;
  }
  if (c.status === 'agendada') return html`<span class="cst cst--agendada"><i aria-hidden="true"></i>Agendada</span><span class="tabela__sub">${c.agendadaPara ? quandoCurto(c.agendadaPara) : ''}</span>`;
  if (c.status === 'enviada') {
    const em = c.historico?.[c.historico.length - 1]?.em || c.enviadaEm;
    return html`<span class="cst cst--enviada"><i aria-hidden="true"></i>Enviada</span><span class="tabela__sub">${em ? quandoCurto(em) : ''}</span>`;
  }
  return html`<span class="cst cst--rascunho"><i aria-hidden="true"></i>Rascunho</span>`;
}

function destaque() {
  const mensal = col('campanhas').find((c) => c.recorrencia === 'mensal');
  if (!mensal) {
    return html`
      <section class="mensal mensal--vazio">
        <div class="mensal__texto">
          <h2 class="mensal__titulo">Lembrete mensal</h2>
          <p>Um e-mail no início de cada mês para quem ainda não marcou horário. É o que mais traz cliente de volta.</p>
        </div>
        <button type="button" class="btn a-btn a-btn--preto" data-act="criar-mensal">${icon('repetir', 16)}Criar lembrete mensal</button>
      </section>`;
  }
  const m = metricasCampanha(mensal.id);
  const n = listaPublico(mensal.publico).length;
  const ativo = mensal.status === 'agendada';
  const dia = mensal.diaMes || (mensal.agendadaPara ? new Date(mensal.agendadaPara).getDate() : 1);
  const vezes = (mensal.historico || []).length;
  return html`
    <section class="mensal" aria-labelledby="mensal-t">
      <div class="mensal__texto">
        <p class="mensal__sub">${icon('repetir', 15)}${ativo ? `Ativo, todo dia ${dia}` : 'Pausado'}</p>
        <h2 class="mensal__titulo" id="mensal-t">${mensal.nome}</h2>
        <p class="mensal__assunto">"${mensal.assunto}"</p>
      </div>
      <dl class="mensal__nums">
        <div><dt>Próximo envio</dt><dd>${ativo && mensal.agendadaPara ? quandoCurto(mensal.agendadaPara) : 'Pausado'}</dd></div>
        <div><dt>Público agora</dt><dd><span class="tnum">${n}</span> ${n === 1 ? 'pessoa' : 'pessoas'}<small>${nomePublico(mensal.publico)}</small></dd></div>
        <div><dt>Já enviado</dt><dd>${vezes ? html`<span class="tnum">${vezes}</span> ${vezes === 1 ? 'vez' : 'vezes'}<small>${m.envios} e-mails, ${m.aberturaPct}% abertos</small>` : 'Ainda não'}</dd></div>
      </dl>
      <div class="mensal__acoes">
        <button type="button" class="btn a-btn a-btn--linha a-btn--sm" data-act="editar" data-id="${mensal.id}">${icon('editar', 15)}Editar</button>
        <button type="button" class="btn a-btn a-btn--preto a-btn--sm" data-act="enviar" data-id="${mensal.id}" ${enviando === mensal.id ? html`disabled` : ''}>${enviando === mensal.id ? html`<span class="giro"></span>Enviando` : html`${icon('email', 15)}Enviar agora`}</button>
      </div>
    </section>`;
}

function lista() {
  const todas = [...col('campanhas')].sort((a, b) => {
    const ordem = { agendada: 0, rascunho: 1, enviada: 2 };
    return (ordem[a.status] ?? 3) - (ordem[b.status] ?? 3) || (b.enviadaEm || b.criadoEm).localeCompare(a.enviadaEm || a.criadoEm);
  });
  if (!todas.length) {
    return html`<div class="tabela-caixa">${vazio('Nenhuma campanha ainda. Clique em Nova campanha para escrever a primeira.',
      html`<button type="button" class="btn a-btn a-btn--preto a-btn--sm" data-act="nova">${icon('mais', 15)}Nova campanha</button>`)}</div>`;
  }
  return html`
    <div class="tabela-caixa">
      <div class="tabela-rolo">
        <table class="tabela tabela--camp">
          <thead><tr>
            <th>Campanha</th><th>Público</th><th>Status</th>
            <th class="dir">Envios</th><th class="dir">Aberturas</th><th class="dir">Cliques</th><th><span class="sr-only">Ações</span></th>
          </tr></thead>
          <tbody>
            ${todas.map((c) => {
              const m = metricasCampanha(c.id);
              return html`<tr>
                <td class="td-camp"><button type="button" class="linha-botao" data-act="editar" data-id="${c.id}">${c.nome}</button><span class="tabela__sub corta">${c.assunto}</span></td>
                <td class="fraco td-pub">${nomePublico(c.publico)}</td>
                <td class="td-st">${statusCampanha(c)}</td>
                <td class="dir num">${m.envios || (c.envios || 0)}</td>
                <td class="dir num">${m.envios ? html`<span class="forte">${m.aberturaPct}%</span><span class="tabela__sub">${m.abertos} de ${m.envios}</span>` : html`<span class="fraco">0%</span>`}</td>
                <td class="dir num">${m.envios ? html`<span class="forte">${m.cliquePct}%</span><span class="tabela__sub">${m.cliques} de ${m.envios}</span>` : html`<span class="fraco">0%</span>`}</td>
                <td class="td-acoes">
                  <button type="button" class="icone-btn" data-act="editar" data-id="${c.id}" aria-label="Editar ${c.nome}" title="Editar">${icon('editar', 17)}</button>
                  <button type="button" class="icone-btn" data-act="duplicar" data-id="${c.id}" aria-label="Duplicar ${c.nome}" title="Duplicar">${icon('copiar', 17)}</button>
                  <button type="button" class="icone-btn" data-act="excluir" data-id="${c.id}" aria-label="Excluir ${c.nome}" title="Excluir">${icon('lixo', 17)}</button>
                </td>
              </tr>`;
            })}
          </tbody>
        </table>
      </div>
    </div>
    <p class="rodape-nota">Aberturas e cliques são registrados quando o provedor de e-mail estiver ligado. Os números acima são da demonstração.</p>`;
}

function desenhar() {
  if (!raiz) return;
  render(raiz, html`
    <div class="camp-topo">
      <p class="camp-topo__txt">Campanhas vão para os inscritos do público escolhido. Use {{nome}} para chamar cada pessoa pelo nome.</p>
      <button type="button" class="btn a-btn a-btn--preto" data-act="nova">${icon('mais', 16)}Nova campanha</button>
    </div>
    ${destaque()}
    <h2 class="secao-titulo camp-lista-t">Todas as campanhas</h2>
    ${lista()}`);
}

async function enviarMensal(id) {
  const c = porId('campanhas', id);
  const n = listaPublico(c.publico).length;
  if (!n) {
    toast('Ninguém neste público agora. Todos já têm horário marcado.', { tipo: 'info' });
    return;
  }
  const ok = await confirmar({
    titulo: `Enviar para ${n} ${n === 1 ? 'inscrito' : 'inscritos'}?`,
    texto: `"${c.nome}" sai agora para o público ${nomePublico(c.publico)}. O envio mensal continua no dia marcado.`,
    ok: 'Enviar agora',
  });
  if (!ok) return;
  enviando = id;
  desenhar();
  try {
    await new Promise((r) => setTimeout(r, 700));
    const antes = c.envios || 0;
    const fim = await enviarCampanha(id);
    if (fim.recorrencia === 'mensal') {
      const dia = c.diaMes || (c.agendadaPara ? new Date(c.agendadaPara).getDate() : 1);
      const hora = c.horaMes || (c.agendadaPara ? hhmm(new Date(c.agendadaPara)) : '10:00');
      await db.update('campanhas', id, { agendadaPara: proximaMensal(dia, hora).toISOString(), diaMes: dia, horaMes: hora });
    }
    toast(`${c.nome} enviada para ${(fim.envios || 0) - antes} inscritos.`, { acao: 'Ver e-mails', aoAgir: () => (location.hash = '#/emails') });
  } catch (e) {
    toast(e.message, { tipo: 'erro' });
  } finally {
    enviando = null;
    desenhar();
  }
}

export default {
  montar(el) {
    raiz = el;
    desenhar();
    acoes(el, {
      nova: () => abrirCampanha(),
      'criar-mensal': () => abrirCampanha(null, PRESET_MENSAL),
      editar: (b) => abrirCampanha(b.dataset.id),
      enviar: (b) => enviarMensal(b.dataset.id),
      duplicar: async (b) => {
        const c = porId('campanhas', b.dataset.id);
        const { id, criadoEm, atualizadoEm, enviadaEm, historico, envios, ...resto } = c;
        const nova = await db.insert('campanhas', { ...resto, nome: `${c.nome} (cópia)`, status: 'rascunho', agendadaPara: null, envios: 0, historico: [] });
        if (nova.imagemDados) await db.update('campanhas', nova.id, { imagem: refImagemCampanha(nova.id) });
        toast(`Campanha duplicada como rascunho.`, { acao: 'Editar', aoAgir: () => abrirCampanha(nova.id) });
      },
      excluir: async (b) => {
        const c = porId('campanhas', b.dataset.id);
        const m = metricasCampanha(c.id);
        const ok = await confirmar({
          titulo: `Excluir "${c.nome}"?`,
          texto: m.envios ? `Os ${m.envios} e-mails já enviados continuam em E-mails enviados. A campanha some desta lista.` : 'A campanha some desta lista. Não dá para desfazer.',
          ok: 'Excluir campanha',
          perigo: true,
        });
        if (!ok) return;
        await db.remove('campanhas', c.id);
        toast(`Campanha "${c.nome}" excluída.`);
      },
    });
  },
  atualizar() {
    desenhar();
  },
  desmontar() {
    raiz = null;
  },
};

