// Leitura em cache das coleções e dados derivados usados pelas telas do painel.
// O cache é invalidado a cada db.onChange (ver main.js), então as telas leem
// cada coleção uma vez por renderização em vez de reparsear o localStorage.
import { db } from '../data/store.js';
import { resolverEmailHtml, PASSO_MIN } from '../data/api.js';
import { horarios, equipe } from '../data/catalog.js';
import { isoDia, minutos } from '../lib/format.js';

const COLECOES = ['clientes', 'agendamentos', 'faturas', 'emails', 'campanhas', 'automacoes', 'assinantes'];
const cache = new Map();
const memo = new Map();

export function col(nome) {
  if (!cache.has(nome)) cache.set(nome, db.listSync(nome));
  return cache.get(nome);
}

export function invalidar(nome) {
  if (!nome || nome === '*') cache.clear();
  else if (COLECOES.includes(nome)) cache.delete(nome);
  memo.clear();
}

const lembrar = (chave, fn) => {
  if (!memo.has(chave)) memo.set(chave, fn());
  return memo.get(chave);
};

export const porId = (nome, id) => (id ? col(nome).find((x) => x.id === id) || null : null);

// ---------- Rótulos ----------

export const STATUS = {
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  faltou: 'Faltou',
  cancelado: 'Cancelado',
};

export const ORIGEM_AG = { site: 'Site', appbarber: 'AppBarber', balcao: 'Balcão' };

export const ORIGEM_CLI = {
  site: 'Conta no site',
  agendamento: 'Agendamento',
  balcao: 'Balcão',
  newsletter: 'Formulário do site',
  painel: 'Adicionado no painel',
};

export const TIPO_EMAIL = {
  confirmacao: 'Confirmação',
  fatura: 'Fatura',
  automacao: 'Lembrete',
  campanha: 'Campanha',
  cancelamento: 'Cancelamento',
  'boas-vindas': 'Boas-vindas',
};

export function tipoEmail(e) {
  if (e.tipo === 'automacao' && e.automacaoId === 'pos-atendimento') return 'Pós-atendimento';
  if (e.tipo === 'confirmacao' && /remarcado/i.test(e.assunto || '')) return 'Remarcação';
  return TIPO_EMAIL[e.tipo] || e.tipo;
}

// ---------- Datas ----------

export const hojeISO = () => isoDia(new Date());

export function diaDe(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export const somarDias = (data, n) => {
  const d = new Date(data);
  d.setDate(d.getDate() + n);
  return d;
};

export const inicioDoDia = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Diferença em dias de calendário (não em blocos de 24 h).
export const diasAtras = (d) => Math.round((inicioDoDia(new Date()) - inicioDoDia(d)) / 86400000);
export const haDias = (d) => {
  const n = diasAtras(d);
  if (n <= 0) return 'hoje';
  if (n === 1) return 'ontem';
  return `há ${n} dias`;
};

export function segundaDaSemana(d) {
  const x = inicioDoDia(d);
  const dow = x.getDay();
  x.setDate(x.getDate() - (dow === 0 ? 6 : dow - 1));
  return x;
}

// ---------- Agendamentos ----------

export const agendamentosDoDia = (iso) =>
  lembrar(`dia:${iso}`, () => col('agendamentos').filter((a) => isoDia(a.inicio) === iso).sort((a, b) => a.inicio.localeCompare(b.inicio)));

// A semente grava algumas confirmações com data no futuro (ver relatório).
// Para exibir e ordenar, nada é mostrado como enviado depois de agora.
// Datas no futuro são espelhadas para os últimos dias, mantendo a ordem relativa.
const noPassado = (iso) => {
  const agora = Date.now();
  const t = new Date(iso).getTime();
  return t > agora ? new Date(agora - (t - agora) / 4 - 60000).toISOString() : iso;
};
export const dataEnvio = (e) => noPassado(e.enviadoEm);
export const dataCriacao = (x) => noPassado(x.criadoEm);
const porEnvio = (a, b) => dataEnvio(b).localeCompare(dataEnvio(a)) || b.enviadoEm.localeCompare(a.enviadoEm);

export const emailsRecentes = () => lembrar('emails-recentes', () => [...col('emails')].sort(porEnvio));

export const emailsDoAgendamento = (id) => col('emails').filter((e) => e.agendamentoId === id).sort(porEnvio);

// Visitas, última visita, total gasto e próximo horário de cada cliente, numa passada.
export const statsClientes = () =>
  lembrar('stats', () => {
    const m = new Map();
    const agora = Date.now();
    for (const a of col('agendamentos')) {
      let s = m.get(a.clienteId);
      if (!s) m.set(a.clienteId, (s = { visitas: 0, total: 0, ultima: null, proximo: null, faltas: 0, agendamentos: 0 }));
      s.agendamentos++;
      if (a.status === 'concluido') {
        s.visitas++;
        s.total += a.total || 0;
        if (!s.ultima || a.inicio > s.ultima.inicio) s.ultima = a;
      } else if (a.status === 'faltou') s.faltas++;
      else if (a.status === 'confirmado' && new Date(a.inicio).getTime() > agora) {
        if (!s.proximo || a.inicio < s.proximo.inicio) s.proximo = a;
      }
    }
    return m;
  });

export const VAZIO = { visitas: 0, total: 0, ultima: null, proximo: null, faltas: 0, agendamentos: 0 };
export const statsDe = (id) => statsClientes().get(id) || VAZIO;

// Ocupação: horários de 30 min ocupados sobre os disponíveis (seg a sáb da semana).
export function ocupacaoSemana(ref = new Date()) {
  return lembrar(`ocup:${isoDia(ref)}`, () => {
    const seg = segundaDaSemana(ref);
    const dias = Array.from({ length: 7 }, (_, i) => somarDias(seg, i));
    const porProf = Object.fromEntries(equipe.map((p) => [p.id, { total: 0, ocupados: 0 }]));
    const isos = new Set();
    for (const d of dias) {
      const turnos = horarios[d.getDay()] || [];
      if (!turnos.length) continue;
      isos.add(isoDia(d));
      const slots = turnos.reduce((t, [i, f]) => t + (minutos(f) - minutos(i)) / PASSO_MIN, 0);
      for (const p of equipe) porProf[p.id].total += slots;
    }
    for (const a of col('agendamentos')) {
      if (a.status === 'cancelado' || !isos.has(isoDia(a.inicio)) || !porProf[a.profissionalId]) continue;
      porProf[a.profissionalId].ocupados += Math.ceil((a.duracao || PASSO_MIN) / PASSO_MIN);
    }
    const total = Object.values(porProf).reduce((t, p) => t + p.total, 0);
    const ocupados = Object.values(porProf).reduce((t, p) => t + p.ocupados, 0);
    return { pct: total ? Math.round((ocupados / total) * 100) : 0, ocupados, total, porProf, seg };
  });
}

// ---------- Faturas ----------

export function proximoNumeroFatura() {
  const ano = new Date().getFullYear();
  let max = 0;
  for (const f of col('faturas')) {
    const m = /FR\s*(\d{4})\/(\d+)/.exec(f.numero || '');
    if (m && Number(m[1]) === ano) max = Math.max(max, Number(m[2]));
  }
  return `FR ${ano}/${String(max + 1).padStart(4, '0')}`;
}

// ---------- Marketing ----------

// Mesma regra de publicoCampanha (api.js), mas numa passada só, para mostrar
// a contagem de todos os públicos ao vivo sem travar a tela.
export function listaPublico(publico) {
  return lembrar(`pub:${publico}`, () => {
    const stats = statsClientes();
    const agora = Date.now();
    const dias = (d) => Math.floor((agora - new Date(d).getTime()) / 86400000);
    return col('clientes').filter((c) => {
      if (!c.marketing) return false;
      if (publico === 'todos') return true;
      const s = stats.get(c.id);
      const futuro = !!s?.proximo;
      const d = s?.ultima ? dias(s.ultima.inicio) : Infinity;
      if (publico === 'sem-horario') return !futuro;
      if (publico === 'inativos-30') return d >= 30 && !futuro;
      if (publico === 'inativos-60') return d >= 60 && !futuro;
      if (publico === 'novos') return dias(c.criadoEm) <= 30;
      return true;
    });
  });
}

export const inscritos = () => col('clientes').filter((c) => c.marketing);

export function metricasCampanha(id) {
  const lista = col('emails').filter((e) => e.campanhaId === id);
  const n = lista.length;
  const abertos = lista.filter((e) => e.aberto).length;
  const cliques = lista.filter((e) => e.clicado).length;
  return { envios: n, abertos, cliques, aberturaPct: n ? Math.round((abertos / n) * 100) : 0, cliquePct: n ? Math.round((cliques / n) * 100) : 0 };
}

// Imagens de campanha enviadas pelo painel ficam na própria campanha
// (campo imagemDados) e o e-mail guarda só a referência /dc-campanha/ID.
export const refImagemCampanha = (id) => `/dc-campanha/${id}`;

export function resolverAdmin(htmlEmail = '') {
  let saida = resolverEmailHtml(htmlEmail);
  if (saida.includes('/dc-campanha/')) {
    // Campanha excluída: some a imagem inteira em vez de mostrar um ícone quebrado.
    saida = saida.replace(/<img[^>]*src="(?:https?:\/\/[^"]*?)?\/dc-campanha\/([\w-]+)"[^>]*>/g, (tag, id) => {
      const dados = porId('campanhas', id)?.imagemDados;
      return dados ? tag.replace(/src="[^"]*"/, `src="${dados}"`) : '';
    });
  }
  return saida;
}

export const PRAZOS_LEMBRETE = [14, 21, 30, 45, 60];
