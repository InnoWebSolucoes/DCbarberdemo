// Dados de demonstração. Rodam uma vez por navegador (ou quando o admin clica em "Restaurar demonstração").
import { db, novoId } from './store.js';
import { servicoPorId, profissionalPorId, horarios } from './catalog.js';
import { resumoServicos, processarFila } from './api.js';
import { emailConfirmacao, emailFatura, emailLivre, preencher } from './templates.js';
import { minutos, isoDia, primeiroNome } from '../lib/format.js';

const SEED_VERSAO = 5;

let rnd = mulberry32(20260930);
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const pesado = (pares) => {
  const total = pares.reduce((t, [, p]) => t + p, 0);
  let r = rnd() * total;
  for (const [v, p] of pares) if ((r -= p) <= 0) return v;
  return pares[0][0];
};

const PRIMEIROS = [
  'Rafael', 'Tiago', 'Gustavo', 'Diogo', 'Lucas', 'Mateus', 'André', 'Henrique', 'João Pedro', 'Kelvin', 'Samuel', 'Wesley',
  'Rúben', 'Nelson', 'Yuri', 'Caio', 'Vinícius', 'Leandro', 'Pedro', 'Igor', 'Hugo', 'Marcelo', 'Anderson', 'Edson',
  'Ivan', 'Délcio', 'Mauro', 'Felipe', 'Thiago', 'Renan', 'Gonçalo', 'Francisco', 'Ricardo', 'Otávio', 'Sérgio', 'Luan',
  'Nuno', 'Bernardo', 'Rodrigo', 'Fábio', 'Jefferson', 'Alex', 'Márcio', 'Vítor', 'Eduardo', 'Carlos', 'Wagner', 'Manuel',
  'Tomás', 'Afonso', 'Kaique', 'Ruan', 'Denilson', 'Aílton', 'Joel', 'Emerson', 'Leonardo', 'Fernando', 'Cristiano', 'Paulo',
];
const SOBRENOMES = [
  'Moreira', 'Ferreira', 'Almeida', 'Carvalho', 'Pereira', 'Rocha', 'Nogueira', 'Lopes', 'Santos', 'Mendes', 'Oliveira', 'Prates',
  'Costa', 'Baptista', 'Martins', 'Ribeiro', 'Araújo', 'Pinto', 'Monteiro', 'Fonseca', 'Sequeira', 'Duarte', 'Gomes', 'Quaresma',
  'Semedo', 'Fortes', 'Lima', 'Teixeira', 'Brandão', 'Vieira', 'Matos', 'Neves', 'Pacheco', 'Campos', 'Antunes', 'Batista',
  'Cabral', 'Lacerda', 'Tavares', 'Furtado', 'Borges', 'Queiroz', 'Andrade', 'Macedo', 'Sampaio', 'Freire', 'Varela', 'Coutinho',
];
const HOMENS = (() => {
  const r = mulberry32(7); const set = new Set();
  while (set.size < 150) set.add(`${PRIMEIROS[Math.floor(r() * PRIMEIROS.length)]} ${SOBRENOMES[Math.floor(r() * SOBRENOMES.length)]}`);
  return [...set];
})();
const CRIANCAS = ['Enzo Barros', 'Miguel Freitas', 'Davi Correia'];
const MULHERES = ['Beatriz Coelho', 'Larissa Moura', 'Inês Rocha', 'Camila Duarte', 'Marta Sousa', 'Juliana Prado'];
const DOMINIOS = ['gmail.com', 'gmail.com', 'hotmail.com', 'outlook.pt', 'sapo.pt', 'icloud.com'];

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const emailDe = (nome) => {
  const [a, ...r] = semAcento(nome).toLowerCase().split(' ');
  const b = r[r.length - 1];
  return `${a}${pick(['.', '', '_'])}${b}${rnd() < 0.3 ? Math.floor(rnd() * 90 + 10) : ''}@${pick(DOMINIOS)}`;
};
const telefone = () => `+351 9${pick(['1', '2', '3', '6'])}${Math.floor(rnd() * 10)} ${String(Math.floor(rnd() * 1000)).padStart(3, '0')} ${String(Math.floor(rnd() * 1000)).padStart(3, '0')}`;

const MIX_BARBEARIA = [
  [['corte'], 34], [['corte-barba'], 24], [['barba'], 7], [['barboterapia'], 5], [['alinhamento'], 4],
  [['corte-simples'], 5], [['corte-simples-barba'], 4], [['barba-alinhamento'], 3], [['corte-barbo-sobrancelha'], 4],
  [['combo-completo'], 3], [['pigmentacao'], 2], [['esfoliacao-mascara'], 2], [['corte', 'hidratacao'], 1],
  [['platinado'], 1], [['luzes'], 1],
];
const MIX_ESTUDIO = [
  [['design-sobrancelhas'], 40], [['design-henna'], 20], [['design-tintura'], 12], [['spa-sobrancelhas'], 10],
  [['spa-labios'], 6], [['brow-lamination'], 6], [['maquiagem'], 4], [['maquiagem-penteado'], 2],
];

function desenharFatura({ numero, cliente, itens, total, data }) {
  const c = document.createElement('canvas');
  c.width = 620; c.height = 820;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, 120);
  g.fillStyle = '#C29C47'; g.font = '700 34px Georgia, serif'; g.fillText('DC', 40, 70);
  g.font = '600 15px Georgia, serif'; g.fillText('BARBERSHOP', 40, 96);
  g.fillStyle = '#fff'; g.font = '14px Arial'; g.textAlign = 'right';
  g.fillText('Rua de Faria Guimarães, 214', 580, 58); g.fillText('4000-202 Porto', 580, 80);
  g.textAlign = 'left'; g.fillStyle = '#000';
  g.font = '700 26px Arial'; g.fillText('Fatura-recibo', 40, 180);
  g.font = '15px Arial'; g.fillStyle = '#555';
  g.fillText(`N.º ${numero}`, 40, 212); g.fillText(`Data: ${data}`, 40, 236); g.fillText(`Cliente: ${cliente}`, 40, 260);
  g.fillText('Contribuinte: consumidor final', 40, 284);
  g.strokeStyle = '#ddd'; g.beginPath(); g.moveTo(40, 318); g.lineTo(580, 318); g.stroke();
  g.fillStyle = '#888'; g.font = '13px Arial'; g.fillText('Descrição', 40, 344); g.textAlign = 'right'; g.fillText('Valor', 580, 344);
  let y = 384; g.font = '16px Arial'; g.fillStyle = '#111';
  for (const [nome, v] of itens) {
    g.textAlign = 'left'; g.fillText(nome, 40, y); g.textAlign = 'right'; g.fillText(`${v.toFixed(2).replace('.', ',')} €`, 580, y); y += 34;
  }
  g.beginPath(); g.moveTo(40, y); g.lineTo(580, y); g.stroke(); y += 44;
  g.font = '700 22px Arial'; g.textAlign = 'left'; g.fillText('Total', 40, y); g.textAlign = 'right'; g.fillText(`${total.toFixed(2).replace('.', ',')} €`, 580, y);
  y += 30; g.font = '13px Arial'; g.fillStyle = '#777'; g.fillText('IVA incluído à taxa legal em vigor', 580, y);
  g.textAlign = 'left'; g.fillText('Documento de demonstração gerado pelo sistema da DC.', 40, 770);
  return c.toDataURL('image/jpeg', 0.72);
}

export async function semear() {
  rnd = mulberry32(20260930);
  db.wipe();
  const agora = new Date();
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  // Clientes
  const clientes = [];
  const criarCliente = (nome, extra = {}) => {
    const criado = new Date(hoje.getTime() - Math.floor(80 + rnd() * 300) * 86400000);
    const c = {
      id: novoId(), nome, email: emailDe(nome), telefone: telefone(), senhaHash: null,
      marketing: rnd() < 0.72, lembreteDias: pick([21, 21, 30, 30, 45]), origem: pick(['agendamento', 'agendamento', 'site', 'balcao']),
      criadoEm: criado.toISOString(), ...extra,
    };
    clientes.push(c);
    return c;
  };
  HOMENS.forEach((n) => criarCliente(n));
  CRIANCAS.forEach((n) => criarCliente(n, { observacao: 'Vem com o pai ou a mãe' }));
  MULHERES.forEach((n) => criarCliente(n));
  // Alguns inscritos recentes que ainda não vieram (vieram pelo formulário do site)
  ['Artur Magalhães', 'Cauã Nunes', 'Daniel Faria', 'Moisés Tavares'].forEach((n) =>
    criarCliente(n, { origem: 'newsletter', marketing: true, criadoEm: new Date(hoje.getTime() - Math.floor(rnd() * 20) * 86400000).toISOString() }));

  const homens = clientes.filter((c) => HOMENS.includes(c.nome));
  const criancas = clientes.filter((c) => CRIANCAS.includes(c.nome));
  const mulheres = clientes.filter((c) => MULHERES.includes(c.nome));
  const regulares = homens.slice(0, 45);

  // Agendamentos
  const ags = [];
  let codigo = 4100;
  for (let d = -75; d <= 16; d++) {
    const dia = new Date(hoje.getTime() + d * 86400000);
    const turnos = horarios[dia.getDay()];
    if (!turnos.length) continue;
    const futuro = d > 0;
    for (const prof of ['david', 'emmanuel', 'clayre']) {
      if (prof === 'clayre' && d < -20) continue;
      let dens = prof === 'clayre' ? 0.22 : 0.62;
      if (d === 0) dens = prof === 'clayre' ? 0.3 : 0.74;
      if (futuro) dens *= Math.max(0.08, 0.8 - d / 10);
      if (dia.getDay() === 6 && prof !== 'clayre') dens = Math.min(0.9, dens + 0.18);
      for (const [ini, fim] of turnos) {
        let t = minutos(ini);
        while (t < minutos(fim)) {
          if (rnd() > dens) { t += 30; continue; }
          const servs = pesado(prof === 'clayre' ? MIX_ESTUDIO : MIX_BARBEARIA);
          const r = resumoServicos(servs);
          if (t + r.duracao > minutos(fim)) { t += 30; continue; }
          let cli;
          if (prof === 'clayre') cli = pick(mulheres);
          else if (servs[0] === 'corte-infantil') cli = pick(criancas);
          else cli = rnd() < 0.5 ? pick(regulares) : pick(homens);
          const inicio = new Date(dia); inicio.setMinutes(t);
          const fimD = new Date(inicio.getTime() + r.duracao * 60000);
          let status = 'confirmado';
          if (fimD < agora) status = pesado([['concluido', 90], ['faltou', 4], ['cancelado', 6]]);
          else if (futuro && rnd() < 0.05) status = 'cancelado';
          const p = profissionalPorId(prof);
          const criadoEm = new Date(Math.min(inicio.getTime() - Math.floor(1 + rnd() * 9) * 86400000, agora.getTime() - Math.floor(1 + rnd() * 48) * 3600000));
          ags.push({
            id: novoId(), codigo: 'DC' + codigo++, clienteId: cli.id, clienteNome: cli.nome, clienteEmail: cli.email, clienteTelefone: cli.telefone,
            servicos: servs, servicosNomes: r.nomes, profissionalId: prof, profissionalNome: p.nome,
            inicio: inicio.toISOString(), fim: fimD.toISOString(), duracao: r.duracao, total: r.total, totalTexto: r.totalTexto,
            status, origem: d > -14 ? pesado([['site', 45], ['appbarber', 30], ['balcao', 25]]) : pesado([['appbarber', 60], ['balcao', 40]]),
            observacao: '', criadoEm: criadoEm.toISOString(),
          });
          t += r.duracao;
        }
      }
    }
  }
  // Corte infantil aparece nos sábados de manhã
  ags.filter((a) => new Date(a.inicio).getDay() === 6 && a.servicos[0] === 'corte' && rnd() < 0.3).forEach((a) => {
    const k = pick(criancas);
    Object.assign(a, { servicos: ['corte-infantil'], servicosNomes: ['Corte infantil'], clienteId: k.id, clienteNome: k.nome, clienteEmail: k.email, clienteTelefone: k.telefone });
  });

  await db.replaceAll('clientes', clientes);
  await db.replaceAll('agendamentos', ags);

  // Automações
  const automacoes = [
    {
      id: 'lembrete-corte', nome: 'Lembrete de corte', ativo: true, dias: 21, gatilho: 'dias-apos-visita',
      descricao: 'Vai para quem não tem horário marcado depois de X dias do último atendimento. Cada cliente pode mudar o prazo na conta.',
      assunto: '{{nome}}, já faz {{semanas}} semanas', titulo: 'Hora de passar na DC?',
      texto: 'Olá, {{nome}}. Seu último atendimento com o {{barbeiro}} foi há {{dias}} dias.\n\nUm degradê costuma pedir retoque entre a terceira e a quarta semana. Escolha o horário pelo site em menos de um minuto.',
      cta: 'Agendar horário', ctaUrl: '/#agendar',
    },
    {
      id: 'sentimos-falta', nome: 'Cliente sumido', ativo: true, dias: 60, gatilho: 'dias-apos-visita',
      descricao: 'Um lembrete mais direto para quem não aparece há dois meses.',
      assunto: 'Faz tempo, {{nome}}', titulo: 'A cadeira continua aqui',
      texto: 'Olá, {{nome}}. Faz {{dias}} dias desde a sua última visita.\n\nSe mudou de cidade, boa sorte por aí. Se ainda está no Porto, a agenda desta semana tem horários livres de manhã.',
      cta: 'Ver horários livres', ctaUrl: '/#agendar',
    },
    {
      id: 'pos-atendimento', nome: 'Obrigado pela visita', ativo: false, dias: 0, gatilho: 'ao-concluir',
      descricao: 'Sai quando o atendimento é marcado como concluído na agenda.',
      assunto: 'Obrigado pela visita, {{nome}}', titulo: 'Obrigado pela visita',
      texto: 'Olá, {{nome}}. Obrigado por escolher a DC hoje.\n\nSe gostou do trabalho do {{barbeiro}}, uma avaliação no AppBarber ajuda muito a casa.',
      cta: 'Deixar avaliação', ctaUrl: 'https://sites.appbarber.com.br/dcbarbershop-r35k',
    },
  ];
  await db.replaceAll('automacoes', automacoes);

  // Campanhas
  const d = (n) => new Date(hoje.getTime() + n * 86400000);
  const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1, 10, 0);
  const campanhas = [
    {
      id: novoId(), nome: 'Lembrete mensal', status: 'agendada', recorrencia: 'mensal', publico: 'sem-horario',
      assunto: '{{nome}}, sua agenda de {{mes}} já abriu', titulo: 'A agenda do mês já abriu',
      texto: 'Olá, {{nome}}. Os horários de sábado costumam ser os primeiros a acabar.\n\nGaranta o seu agora e receba a confirmação na hora.',
      cta: 'Agendar horário', ctaUrl: '/#agendar', imagem: '/media/site/email-agenda.jpg',
      agendadaPara: proxMes.toISOString(), envios: 0, historico: [], criadoEm: d(-40).toISOString(),
    },
    {
      id: novoId(), nome: 'Platinado nevou', status: 'enviada', recorrencia: 'nenhuma', publico: 'todos',
      assunto: 'Platinado nevou: vagas para outubro', titulo: 'Platinado nevou',
      texto: 'Olá, {{nome}}. O platinado leva duas horas e meia e só atendemos dois por semana.\n\nSe estava pensando em mudar o visual, as vagas de outubro abriram hoje.',
      cta: 'Reservar platinado', ctaUrl: '/#agendar', imagem: '/media/site/email-platinado.jpg',
      agendadaPara: null, enviadaEm: d(-12).toISOString(), envios: 0, historico: [], criadoEm: d(-14).toISOString(),
    },
    {
      id: novoId(), nome: 'Vale-presente de Natal', status: 'rascunho', recorrencia: 'nenhuma', publico: 'todos',
      assunto: 'Presente de Natal resolvido', titulo: 'Um corte de presente',
      texto: 'Olá, {{nome}}. Este ano a DC tem vale-presente para corte, barba ou combo completo.\n\nPeça no balcão ou pelo WhatsApp.',
      cta: 'Falar no WhatsApp', ctaUrl: 'https://wa.me/351933583777', imagem: '',
      agendadaPara: null, envios: 0, historico: [], criadoEm: d(-2).toISOString(),
    },
  ];
  await db.replaceAll('campanhas', campanhas);

  // E-mails já enviados
  const emails = [];
  const assinantes = clientes.filter((c) => c.marketing);
  const enviada = campanhas[1];
  const emEnviada = new Date(enviada.enviadaEm); emEnviada.setHours(10, 2);
  enviada.enviadaEm = emEnviada.toISOString();
  assinantes.forEach((c) => {
    const vars = { nome: primeiroNome(c.nome) };
    emails.push({
      id: novoId(), para: c.email, nomePara: c.nome, clienteId: c.id, campanhaId: enviada.id, tipo: 'campanha',
      assunto: preencher(enviada.assunto, vars),
      html: emailLivre({ titulo: enviada.titulo, texto: preencher(enviada.texto, vars), cta: enviada.cta, ctaUrl: enviada.ctaUrl, imagem: enviada.imagem }),
      anexos: [], de: 'DC Barbershop <dcbarbershop.porto@gmail.com>', status: 'enviado', enviadoEm: emEnviada.toISOString(),
      aberto: rnd() < 0.58, clicado: rnd() < 0.19, criadoEm: emEnviada.toISOString(),
    });
  });
  enviada.envios = assinantes.length;
  enviada.historico = [{ em: emEnviada.toISOString(), total: assinantes.length }];
  await db.replaceAll('campanhas', campanhas);

  ags.filter((a) => a.origem === 'site' && new Date(a.criadoEm) > d(-10)).slice(-14).forEach((a) => {
    emails.push({
      id: novoId(), para: a.clienteEmail, nomePara: a.clienteNome, clienteId: a.clienteId, agendamentoId: a.id, tipo: 'confirmacao',
      assunto: `Horário confirmado: ${a.codigo}`, html: emailConfirmacao(a), anexos: [], de: 'DC Barbershop <dcbarbershop.porto@gmail.com>',
      status: 'enviado', enviadoEm: a.criadoEm, aberto: rnd() < 0.9, criadoEm: a.criadoEm,
    });
  });

  // Faturas das últimas visitas
  const faturas = [];
  const feitos = ags.filter((a) => a.status === 'concluido' && new Date(a.inicio) > d(-6) && a.total > 0).slice(-4);
  let nf = 138;
  for (const a of feitos) {
    const cli = clientes.find((c) => c.id === a.clienteId);
    const numero = `FR 2026/0${nf++}`;
    const itens = a.servicos.map((id) => [servicoPorId(id).nome, servicoPorId(id).preco || 0]);
    const arquivo = desenharFatura({ numero, cliente: cli.nome, itens, total: a.total, data: new Date(a.inicio).toLocaleDateString('pt-BR') });
    const enviadaEm = new Date(new Date(a.fim).getTime() + 20 * 60000).toISOString();
    const fatura = {
      id: novoId(), clienteId: cli.id, clienteNome: cli.nome, clienteEmail: cli.email, agendamentoId: a.id, numero, valor: a.total,
      arquivo, arquivoNome: `${numero.replace(/[ /]/g, '-')}.jpg`, arquivoTipo: 'image/jpeg', enviadaEm, criadoEm: enviadaEm,
    };
    const email = {
      id: novoId(), para: cli.email, nomePara: cli.nome, clienteId: cli.id, agendamentoId: a.id, tipo: 'fatura',
      assunto: `Fatura ${numero}: DC Barbershop`, html: emailFatura({ cliente: cli, fatura }),
      anexos: [{ nome: fatura.arquivoNome, tipo: 'image/jpeg', faturaId: fatura.id }], de: 'DC Barbershop <dcbarbershop.porto@gmail.com>',
      status: 'enviado', enviadoEm: enviadaEm, aberto: true, criadoEm: enviadaEm,
    };
    fatura.emailId = email.id;
    a.faturaId = fatura.id;
    faturas.push(fatura);
    emails.push(email);
  }
  await db.replaceAll('agendamentos', ags);
  await db.replaceAll('faturas', faturas);
  await db.replaceAll('emails', emails);

  // Automações que já teriam saído nos últimos dias
  db.setMeta('seed', SEED_VERSAO);
  await processarFila();
  const auto = (await db.list('emails')).map((e) => {
    if (e.tipo !== 'automacao') return e;
    const quando = new Date(agora.getTime() - Math.floor(rnd() * 9 * 86400000) - 3600000);
    quando.setHours(9, 15 + Math.floor(rnd() * 30));
    return { ...e, enviadoEm: quando.toISOString(), criadoEm: quando.toISOString(), aberto: rnd() < 0.5 };
  });
  await db.replaceAll('emails', auto);
  db.setMeta('filaProcessadaEm', new Date().toISOString());
  db.setMeta('seed', SEED_VERSAO);
}

export async function garantirDados() {
  if (db.getMeta('seed') !== SEED_VERSAO) await semear();
}

export { isoDia };
