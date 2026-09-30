// Regras de negócio da DC: agenda, contas, faturas, e-mails e marketing.
// Hoje grava no navegador (store.js). Para ligar ao Supabase, troque as chamadas a `db`.
import { db } from './store.js';
import { horarios, servicoPorId, profissionalPorId, equipe } from './catalog.js';
import { minutos, pad, isoDia, moeda, primeiroNome } from '../lib/format.js';
import { emailConfirmacao, emailCancelamento, emailFatura, emailBoasVindas, emailLivre, preencher } from './templates.js';

export const PASSO_MIN = 30;
export const JANELA_DIAS = 45;
export const ANTECEDENCIA_MIN = 30;

const hash = async (texto) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dc::' + texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const normEmail = (e = '') => e.trim().toLowerCase();

// ---------- Serviços ----------

export function resumoServicos(ids) {
  const lista = ids.map(servicoPorId).filter(Boolean);
  const duracaoTotal = lista.reduce((t, s) => t + s.duracao, 0);
  const total = lista.reduce((t, s) => t + (s.preco || 0), 0);
  const aPartir = lista.some((s) => s.aPartir);
  const consultar = lista.some((s) => s.consultar);
  let totalTexto = moeda(total);
  if (consultar && total === 0) totalTexto = 'Sob consulta';
  else if (consultar) totalTexto = `${moeda(total)} + itens sob consulta`;
  else if (aPartir) totalTexto = `A partir de ${moeda(total)}`;
  return { lista, duracao: duracaoTotal, total, totalTexto, nomes: lista.map((s) => s.nome) };
}

// ---------- Disponibilidade ----------

const ativo = (a) => a.status !== 'cancelado';

export function turnosDoDia(dia) {
  return horarios[new Date(dia).getDay()] || [];
}

export function diaAberto(dia) {
  return turnosDoDia(dia).length > 0;
}

function ocupado(agendamentos, profId, inicio, fim) {
  return agendamentos.some((a) => {
    if (a.profissionalId !== profId || !ativo(a)) return false;
    const ai = new Date(a.inicio).getTime();
    const af = new Date(a.fim).getTime();
    return ai < fim && af > inicio;
  });
}

// Devolve [{ hora: '09:30', inicio: Date, profissionais: ['david', ...] }]
export function horariosLivres({ dia, duracaoMin, candidatos, ignorarId = null }) {
  const base = new Date(dia);
  base.setHours(0, 0, 0, 0);
  const agendamentos = db.listSync('agendamentos').filter((a) => a.id !== ignorarId && isoDia(a.inicio) === isoDia(base));
  const limite = Date.now() + ANTECEDENCIA_MIN * 60000;
  const saida = [];
  for (const [ini, fim] of turnosDoDia(base)) {
    for (let t = minutos(ini); t + duracaoMin <= minutos(fim); t += PASSO_MIN) {
      const inicio = new Date(base);
      inicio.setMinutes(t);
      const i = inicio.getTime();
      if (i < limite) continue;
      const f = i + duracaoMin * 60000;
      const livres = candidatos.filter((p) => !ocupado(agendamentos, p, i, f));
      if (livres.length) saida.push({ hora: `${pad(Math.floor(t / 60))}:${pad(t % 60)}`, inicio, profissionais: livres });
    }
  }
  return saida;
}

export function ocupacaoDoDia(dia, candidatos) {
  const total = horariosLivres({ dia, duracaoMin: PASSO_MIN, candidatos }).length;
  return total;
}

// ---------- Contas ----------

export function sessaoAtual() {
  const id = db.getMeta('sessao');
  if (!id) return null;
  return db.listSync('clientes').find((c) => c.id === id) || null;
}

export async function cadastrar({ nome, email, telefone, senha, marketing = true }) {
  const e = normEmail(email);
  if (!nome?.trim() || !e || !senha) throw new Error('Preencha nome, e-mail e senha.');
  if (senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  const existente = db.listSync('clientes').find((c) => c.email === e);
  const senhaHash = await hash(senha);
  let cliente;
  if (existente) {
    if (existente.senhaHash) throw new Error('Já existe uma conta com este e-mail. Entre com a sua senha.');
    cliente = await db.update('clientes', existente.id, { nome: nome.trim(), telefone: telefone || existente.telefone, senhaHash, marketing });
  } else {
    cliente = await db.insert('clientes', {
      nome: nome.trim(), email: e, telefone: telefone || '', senhaHash, marketing,
      lembreteDias: 21, origem: 'site',
    });
  }
  db.setMeta('sessao', cliente.id);
  await registrarEmail({ para: cliente.email, nomePara: cliente.nome, clienteId: cliente.id, tipo: 'boas-vindas', assunto: 'Sua conta na DC Barbershop', html: emailBoasVindas(cliente) });
  return cliente;
}

export async function entrar(email, senha) {
  const e = normEmail(email);
  const c = db.listSync('clientes').find((x) => x.email === e);
  if (!c) throw new Error('Não encontramos uma conta com este e-mail.');
  if (!c.senhaHash) throw new Error('Este e-mail já agendou conosco, mas ainda não tem senha. Use "Criar conta" com o mesmo e-mail.');
  if (c.senhaHash !== (await hash(senha))) throw new Error('Senha incorreta. Tente de novo.');
  db.setMeta('sessao', c.id);
  return c;
}

export function sair() {
  db.setMeta('sessao', null);
}

export async function atualizarCliente(id, patch) {
  if (patch.email) patch.email = normEmail(patch.email);
  return db.update('clientes', id, patch);
}

async function garantirCliente({ nome, email, telefone, marketing }) {
  const e = normEmail(email);
  const existente = db.listSync('clientes').find((c) => c.email === e);
  if (existente) {
    const patch = {};
    if (telefone && !existente.telefone) patch.telefone = telefone;
    if (marketing && !existente.marketing) patch.marketing = true;
    return Object.keys(patch).length ? db.update('clientes', existente.id, patch) : existente;
  }
  return db.insert('clientes', { nome: nome.trim(), email: e, telefone: telefone || '', senhaHash: null, marketing: !!marketing, lembreteDias: 21, origem: 'agendamento' });
}

export async function assinarNewsletter({ email, nome = '' }) {
  const e = normEmail(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('Digite um e-mail válido.');
  const existente = db.listSync('clientes').find((c) => c.email === e);
  if (existente) {
    await db.update('clientes', existente.id, { marketing: true });
    return existente;
  }
  return db.insert('clientes', { nome: nome || e.split('@')[0], email: e, telefone: '', senhaHash: null, marketing: true, lembreteDias: 30, origem: 'newsletter' });
}

// ---------- Agendamentos ----------

const novoCodigo = () => {
  const usados = new Set(db.listSync('agendamentos').map((a) => a.codigo));
  let c;
  do c = 'DC' + Math.floor(1000 + Math.random() * 9000);
  while (usados.has(c));
  return c;
};

export async function criarAgendamento({ servicos, profissionalId, inicio, cliente, marketing = false, observacao = '', origem = 'site' }) {
  const r = resumoServicos(servicos);
  const candidatos = profissionalId === 'qualquer'
    ? equipe.filter((p) => servicos.every((id) => servicoPorId(id).prof.includes(p.id))).map((p) => p.id)
    : [profissionalId];
  const i = new Date(inicio).getTime();
  const f = i + r.duracao * 60000;
  const doDia = db.listSync('agendamentos').filter((a) => isoDia(a.inicio) === isoDia(inicio));
  const livres = candidatos.filter((p) => !ocupado(doDia, p, i, f));
  if (!livres.length) throw new Error('Esse horário acabou de ser reservado. Escolha outro.');
  const prof = profissionalPorId(livres[Math.floor(Math.random() * livres.length)]);
  const c = await garantirCliente({ ...cliente, marketing });
  const ag = await db.insert('agendamentos', {
    codigo: novoCodigo(),
    clienteId: c.id,
    clienteNome: c.nome,
    clienteEmail: c.email,
    clienteTelefone: cliente.telefone || c.telefone,
    servicos,
    servicosNomes: r.nomes,
    profissionalId: prof.id,
    profissionalNome: prof.nome,
    inicio: new Date(i).toISOString(),
    fim: new Date(f).toISOString(),
    duracao: r.duracao,
    total: r.total,
    totalTexto: r.totalTexto,
    status: 'confirmado',
    origem,
    observacao,
  });
  await registrarEmail({ para: c.email, nomePara: c.nome, clienteId: c.id, agendamentoId: ag.id, tipo: 'confirmacao', assunto: `Horário confirmado: ${ag.codigo}`, html: emailConfirmacao(ag) });
  return ag;
}

export async function cancelarAgendamento(id, por = 'cliente') {
  const ag = await db.update('agendamentos', id, { status: 'cancelado', canceladoPor: por, canceladoEm: new Date().toISOString() });
  if (ag) await registrarEmail({ para: ag.clienteEmail, nomePara: ag.clienteNome, clienteId: ag.clienteId, agendamentoId: ag.id, tipo: 'cancelamento', assunto: `Horário cancelado: ${ag.codigo}`, html: emailCancelamento(ag) });
  return ag;
}

export async function remarcarAgendamento(id, novoInicio, profissionalId) {
  const ag = await db.get('agendamentos', id);
  if (!ag) throw new Error('Agendamento não encontrado.');
  const pid = profissionalId || ag.profissionalId;
  const i = new Date(novoInicio).getTime();
  const f = i + ag.duracao * 60000;
  const doDia = db.listSync('agendamentos').filter((a) => a.id !== id && isoDia(a.inicio) === isoDia(novoInicio));
  if (ocupado(doDia, pid, i, f)) throw new Error('Esse horário não está mais livre.');
  const atualizado = await db.update('agendamentos', id, {
    inicio: new Date(i).toISOString(), fim: new Date(f).toISOString(), profissionalId: pid, profissionalNome: profissionalPorId(pid).nome, status: 'confirmado',
  });
  await registrarEmail({ para: ag.clienteEmail, nomePara: ag.clienteNome, clienteId: ag.clienteId, agendamentoId: id, tipo: 'confirmacao', assunto: `Horário remarcado: ${ag.codigo}`, html: emailConfirmacao(atualizado) });
  return atualizado;
}

export async function mudarStatus(id, status) {
  const ag = await db.update('agendamentos', id, { status });
  if (status === 'concluido') {
    const auto = db.listSync('automacoes').find((a) => a.id === 'pos-atendimento');
    const cli = await db.get('clientes', ag.clienteId);
    if (auto?.ativo && cli) {
      const vars = { nome: primeiroNome(cli.nome), barbeiro: ag.profissionalNome };
      await registrarEmail({
        para: cli.email, nomePara: cli.nome, clienteId: cli.id, tipo: 'automacao', automacaoId: auto.id,
        assunto: preencher(auto.assunto, vars),
        html: emailLivre({ titulo: preencher(auto.titulo, vars), texto: preencher(auto.texto, vars), cta: auto.cta, ctaUrl: auto.ctaUrl }),
      });
    }
  }
  return ag;
}

// ---------- E-mails (caixa de saída) ----------

export async function registrarEmail({ para, nomePara = '', assunto, tipo, html, anexos = [], clienteId = null, agendamentoId = null, campanhaId = null, automacaoId = null, enviadoEm = null }) {
  return db.insert('emails', {
    para, nomePara, assunto, tipo, html, anexos, clienteId, agendamentoId, campanhaId, automacaoId,
    de: 'DC Barbershop <dcbarbershop.porto@gmail.com>',
    status: 'enviado',
    enviadoEm: enviadoEm || new Date().toISOString(),
    aberto: false,
  });
}

// Troca as referências "dc-fatura:ID" pela imagem real antes de mostrar um e-mail.
export function resolverEmailHtml(html = '') {
  if (!html.includes('dc-fatura:')) return html;
  const faturas = db.listSync('faturas');
  return html.replace(/dc-fatura:([\w-]+)/g, (_, id) => faturas.find((f) => f.id === id)?.arquivo || '');
}

// ---------- Faturas ----------

export async function enviarFatura({ clienteId, agendamentoId = null, numero, valor, arquivo, arquivoNome, arquivoTipo, mensagem = '' }) {
  const cliente = await db.get('clientes', clienteId);
  if (!cliente) throw new Error('Escolha o cliente.');
  if (!arquivo) throw new Error('Anexe a imagem ou o PDF da fatura.');
  const fatura = await db.insert('faturas', {
    clienteId, clienteNome: cliente.nome, clienteEmail: cliente.email, agendamentoId,
    numero, valor: Number(valor) || 0, arquivo, arquivoNome, arquivoTipo, enviadaEm: new Date().toISOString(),
  });
  const email = await registrarEmail({
    para: cliente.email, nomePara: cliente.nome, clienteId, agendamentoId, tipo: 'fatura',
    assunto: `Fatura ${numero}: DC Barbershop`,
    html: emailFatura({ cliente, fatura, mensagem }),
    anexos: [{ nome: arquivoNome, tipo: arquivoTipo, faturaId: fatura.id }],
  });
  await db.update('faturas', fatura.id, { emailId: email.id });
  if (agendamentoId) await db.update('agendamentos', agendamentoId, { faturaId: fatura.id });
  return fatura;
}

// ---------- Marketing ----------

export function ultimaVisita(clienteId) {
  const feitos = db.listSync('agendamentos', (a) => a.clienteId === clienteId && a.status === 'concluido')
    .sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
  return feitos[0] || null;
}

export function diasDesde(data) {
  return Math.floor((Date.now() - new Date(data).getTime()) / 86400000);
}

export function publicoCampanha(publico) {
  const clientes = db.listSync('clientes', (c) => c.marketing);
  const futuros = new Set(db.listSync('agendamentos', (a) => a.status === 'confirmado' && new Date(a.inicio) > new Date()).map((a) => a.clienteId));
  return clientes.filter((c) => {
    if (publico === 'todos') return true;
    const u = ultimaVisita(c.id);
    const dias = u ? diasDesde(u.inicio) : Infinity;
    if (publico === 'sem-horario') return !futuros.has(c.id);
    if (publico === 'inativos-30') return dias >= 30 && !futuros.has(c.id);
    if (publico === 'inativos-60') return dias >= 60 && !futuros.has(c.id);
    if (publico === 'novos') return diasDesde(c.criadoEm) <= 30;
    return true;
  });
}

export const PUBLICOS = [
  { id: 'todos', nome: 'Todos os inscritos' },
  { id: 'sem-horario', nome: 'Inscritos sem horário marcado' },
  { id: 'inativos-30', nome: 'Sem visita há 30 dias ou mais' },
  { id: 'inativos-60', nome: 'Sem visita há 60 dias ou mais' },
  { id: 'novos', nome: 'Inscritos nos últimos 30 dias' },
];

export async function enviarCampanha(id) {
  const camp = await db.get('campanhas', id);
  if (!camp) throw new Error('Campanha não encontrada.');
  const destinatarios = publicoCampanha(camp.publico);
  if (!destinatarios.length) throw new Error('Nenhum inscrito neste público.');
  const agora = new Date().toISOString();
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const emails = destinatarios.map((c) => {
    const vars = { nome: primeiroNome(c.nome), mes };
    return {
      para: c.email, nomePara: c.nome, clienteId: c.id, campanhaId: camp.id, tipo: 'campanha',
      assunto: preencher(camp.assunto, vars),
      html: emailLivre({ titulo: preencher(camp.titulo, vars), texto: preencher(camp.texto, vars), cta: camp.cta, ctaUrl: camp.ctaUrl, imagem: camp.imagem }),
      anexos: [], agendamentoId: null, automacaoId: null,
      de: 'DC Barbershop <dcbarbershop.porto@gmail.com>', status: 'enviado', enviadoEm: agora, aberto: false,
    };
  });
  await db.insertMany('emails', emails);
  const proxima = camp.recorrencia === 'mensal' ? (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString(); })() : null;
  return db.update('campanhas', id, {
    status: camp.recorrencia === 'mensal' ? 'agendada' : 'enviada',
    enviadaEm: agora,
    agendadaPara: proxima,
    envios: (camp.envios || 0) + emails.length,
    historico: [...(camp.historico || []), { em: agora, total: emails.length }],
  });
}

// Corre as automações e as campanhas agendadas que já venceram.
export async function processarFila() {
  const enviados = [];
  const agora = Date.now();
  for (const camp of db.listSync('campanhas', (c) => c.status === 'agendada' && c.agendadaPara && new Date(c.agendadaPara).getTime() <= agora)) {
    try {
      await enviarCampanha(camp.id);
      enviados.push({ tipo: 'campanha', nome: camp.nome });
    } catch { /* público vazio */ }
  }
  const autos = db.listSync('automacoes', (a) => a.ativo && a.id !== 'pos-atendimento');
  const futuros = new Set(db.listSync('agendamentos', (a) => a.status === 'confirmado' && new Date(a.inicio) > new Date()).map((a) => a.clienteId));
  const jaEnviados = db.listSync('emails', (e) => e.tipo === 'automacao');
  for (const auto of autos) {
    for (const c of db.listSync('clientes', (x) => x.marketing)) {
      if (futuros.has(c.id)) continue;
      const u = ultimaVisita(c.id);
      if (!u) continue;
      const alvo = auto.id === 'lembrete-corte' ? (c.lembreteDias || auto.dias) : auto.dias;
      const dias = diasDesde(u.inicio);
      if (dias < alvo) continue;
      const repetido = jaEnviados.some((e) => e.clienteId === c.id && e.automacaoId === auto.id && new Date(e.enviadoEm) > new Date(u.inicio));
      if (repetido) continue;
      const vars = { nome: primeiroNome(c.nome), dias, semanas: Math.round(dias / 7), barbeiro: u.profissionalNome };
      await registrarEmail({
        para: c.email, nomePara: c.nome, clienteId: c.id, tipo: 'automacao', automacaoId: auto.id,
        assunto: preencher(auto.assunto, vars),
        html: emailLivre({ titulo: preencher(auto.titulo, vars), texto: preencher(auto.texto, vars), cta: auto.cta, ctaUrl: auto.ctaUrl }),
      });
      enviados.push({ tipo: 'automacao', nome: auto.nome, para: c.nome });
    }
  }
  db.setMeta('filaProcessadaEm', new Date().toISOString());
  return enviados;
}
