const num0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const num2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Em Portugal o símbolo vem depois do valor: 15 €, 12,50 €
export const moeda = (v) => (v == null ? 'Sob consulta' : `${Number.isInteger(Number(v)) ? num0.format(v) : num2.format(v)} €`);

export const precoServico = (s) => {
  if (s.consultar || s.preco == null) return 'Sob consulta';
  return (s.aPartir ? 'A partir de ' : '') + moeda(s.preco);
};

export const duracao = (min) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

export const pad = (n) => String(n).padStart(2, '0');

export const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const dataCurta = (d) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export const dataLonga = (d) =>
  new Date(d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

export const dataMedia = (d) =>
  new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });

export const dataHora = (d) => {
  const x = new Date(d);
  return `${x.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às ${hhmm(x)}`;
};

export const isoDia = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

export const minutos = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

export const primeiroNome = (nome = '') => nome.trim().split(/\s+/)[0] || '';

export const iniciais = (nome = '') =>
  nome.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

export const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const tempoRelativo = (d) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'agora mesmo';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  const dias = Math.floor(diff / 86400);
  return dias === 1 ? 'ontem' : `há ${dias} dias`;
};
