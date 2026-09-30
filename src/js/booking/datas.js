// Textos de data em pt-BR para o agendamento e a conta.
import { diasSemana } from '../data/catalog.js';
import { hhmm, isoDia } from '../lib/format.js';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const mesCurto = (d) => MESES[new Date(d).getMonth()].slice(0, 3);
export const mesLongo = (d) => MESES[new Date(d).getMonth()];
export const semanaCurta = (d) => diasSemana[new Date(d).getDay()].slice(0, 3);

// "Quinta, 2 de outubro"
export const diaLongo = (d) => {
  const x = new Date(d);
  return `${diasSemana[x.getDay()]}, ${x.getDate()} de ${MESES[x.getMonth()]}`;
};

// "Qui, 2 out"
export const diaCurto = (d) => {
  const x = new Date(d);
  return `${semanaCurta(x)}, ${x.getDate()} ${mesCurto(x)}`;
};

// "10:00 às 10:30"
export const faixaHora = (inicio, minutos) => {
  const i = new Date(inicio);
  const f = new Date(i.getTime() + minutos * 60000);
  return `${hhmm(i)} às ${hhmm(f)}`;
};

// Dia (Date à meia-noite) a partir de 'AAAA-MM-DD'
export const deIso = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};

export const hojeIso = () => isoDia(new Date());

// Diferença em dias de calendário entre duas datas
export const diasEntre = (a, b) => {
  const x = new Date(a); x.setHours(0, 0, 0, 0);
  const y = new Date(b); y.setHours(0, 0, 0, 0);
  return Math.round((y - x) / 86400000);
};

// "29 set" (ano atual) ou "29 set 2025"
export const dataCompacta = (d) => {
  const x = new Date(d);
  const ano = x.getFullYear() === new Date().getFullYear() ? '' : ` ${x.getFullYear()}`;
  return `${x.getDate()} ${mesCurto(x)}${ano}`;
};

// "hoje", "amanhã", "daqui a 3 dias", "daqui a 40 min"
export function contagem(inicio) {
  const i = new Date(inicio);
  const min = Math.round((i - Date.now()) / 60000);
  if (min <= 0) return 'agora';
  if (min < 60) return `daqui a ${min} min`;
  const dias = diasEntre(new Date(), i);
  if (dias === 0) {
    const h = Math.round(min / 60);
    return h <= 1 ? 'daqui a 1 hora' : `daqui a ${h} horas`;
  }
  if (dias === 1) return 'amanhã';
  if (dias < 14) return `daqui a ${dias} dias`;
  const sem = Math.round(dias / 7);
  return `daqui a ${sem} semanas`;
}
