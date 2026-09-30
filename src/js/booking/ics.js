// Gera e baixa um arquivo .ics (iCalendar) para um agendamento.
import { negocio } from '../data/catalog.js';
import { duracao as fmtDuracao } from '../lib/format.js';

const p2 = (n) => String(n).padStart(2, '0');

// Data em UTC no formato 20261002T090000Z
const utc = (d) => {
  const x = new Date(d);
  return `${x.getUTCFullYear()}${p2(x.getUTCMonth() + 1)}${p2(x.getUTCDate())}T${p2(x.getUTCHours())}${p2(x.getUTCMinutes())}${p2(x.getUTCSeconds())}Z`;
};

// Escapa texto conforme RFC 5545
const txt = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Dobra linhas com mais de 75 octetos (UTF-8)
function dobrar(linha) {
  const enc = new TextEncoder();
  if (enc.encode(linha).length <= 75) return linha;
  const partes = [];
  let atual = '';
  let limite = 75;
  for (const ch of linha) {
    if (enc.encode(atual + ch).length > limite) {
      partes.push(atual);
      atual = ch;
      limite = 74; // linhas seguintes começam com um espaço
    } else atual += ch;
  }
  partes.push(atual);
  return partes.join('\r\n ');
}

export function gerarIcs(ag) {
  const inicio = new Date(ag.inicio);
  const fim = ag.fim ? new Date(ag.fim) : new Date(inicio.getTime() + (ag.duracao || 30) * 60000);
  const servicos = (ag.servicosNomes || []).join(', ');
  const descricao = [
    `Serviços: ${servicos}`,
    `Profissional: ${ag.profissionalNome}`,
    `Duração: ${fmtDuracao(ag.duracao || Math.round((fim - inicio) / 60000))}`,
    ag.totalTexto ? `Total: ${ag.totalTexto}` : '',
    `Código: ${ag.codigo}`,
    '',
    `${negocio.endereco}, ${negocio.cidade}`,
    `Telefone: ${negocio.telefone}`,
    'Para remarcar, abra a sua conta no site da DC.',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');

  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DC Barbershop//Agendamento//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ag.id || ag.codigo}@dcbarbershop.pt`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(inicio)}`,
    `DTEND:${utc(fim)}`,
    `SUMMARY:${txt(`${servicos} na DC Barbershop`)}`,
    `LOCATION:${txt(`${negocio.nome}, ${negocio.endereco}, ${negocio.cidade}`)}`,
    `DESCRIPTION:${txt(descricao)}`,
    `GEO:${negocio.coords.lat};${negocio.coords.lng}`,
    `URL:${typeof location !== 'undefined' ? location.origin : ''}/conta/`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${txt(`${servicos} com ${ag.profissionalNome} daqui a 2 horas`)}`,
    'TRIGGER:-PT2H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return linhas.map(dobrar).join('\r\n') + '\r\n';
}

export function baixarIcs(ag) {
  const blob = new Blob([gerarIcs(ag)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dc-barbershop-${(ag.codigo || 'horario').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
