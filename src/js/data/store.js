// Armazenamento local (localStorage) com API assíncrona.
// Todas as funções devolvem Promises para que a troca por Supabase
// mais tarde mexa só neste arquivo e em api.js.

const PREFIX = 'dc:';
const COLECOES = ['clientes', 'agendamentos', 'faturas', 'emails', 'campanhas', 'automacoes', 'assinantes'];
const canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dc-store') : null;
const ouvintes = new Set();

const ler = (col) => {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + col) || '[]');
  } catch {
    return [];
  }
};

const gravar = (col, linhas) => {
  try {
    localStorage.setItem(PREFIX + col, JSON.stringify(linhas));
  } catch (e) {
    const erro = new Error('Sem espaço no armazenamento do navegador. Remova faturas antigas ou use arquivos menores.');
    erro.cause = e;
    throw erro;
  }
  avisar(col);
};

const avisar = (col) => {
  ouvintes.forEach((fn) => fn(col));
  canal?.postMessage({ col });
};

canal?.addEventListener('message', (e) => ouvintes.forEach((fn) => fn(e.data.col)));
window.addEventListener('storage', (e) => {
  if (e.key?.startsWith(PREFIX)) ouvintes.forEach((fn) => fn(e.key.slice(PREFIX.length)));
});

export const novoId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export const db = {
  async list(col, filtro) {
    const linhas = ler(col);
    return filtro ? linhas.filter(filtro) : linhas;
  },
  listSync(col, filtro) {
    const linhas = ler(col);
    return filtro ? linhas.filter(filtro) : linhas;
  },
  async get(col, id) {
    return ler(col).find((l) => l.id === id) || null;
  },
  async insert(col, obj) {
    const linhas = ler(col);
    const linha = { id: novoId(), criadoEm: new Date().toISOString(), ...obj };
    linhas.push(linha);
    gravar(col, linhas);
    return linha;
  },
  async insertMany(col, objs) {
    const linhas = ler(col);
    const novas = objs.map((o) => ({ id: novoId(), criadoEm: new Date().toISOString(), ...o }));
    gravar(col, linhas.concat(novas));
    return novas;
  },
  async update(col, id, patch) {
    const linhas = ler(col);
    const i = linhas.findIndex((l) => l.id === id);
    if (i < 0) return null;
    linhas[i] = { ...linhas[i], ...patch, atualizadoEm: new Date().toISOString() };
    gravar(col, linhas);
    return linhas[i];
  },
  async remove(col, id) {
    gravar(col, ler(col).filter((l) => l.id !== id));
  },
  async replaceAll(col, linhas) {
    gravar(col, linhas);
  },
  onChange(fn) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },
  getMeta(chave, padrao = null) {
    try {
      const v = localStorage.getItem(PREFIX + 'meta:' + chave);
      return v == null ? padrao : JSON.parse(v);
    } catch {
      return padrao;
    }
  },
  setMeta(chave, valor) {
    try {
      if (valor == null) localStorage.removeItem(PREFIX + 'meta:' + chave);
      else localStorage.setItem(PREFIX + 'meta:' + chave, JSON.stringify(valor));
    } catch {
      /* armazenamento indisponível */
    }
    avisar('meta');
  },
  wipe() {
    COLECOES.forEach((c) => localStorage.removeItem(PREFIX + c));
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX + 'meta:'))
      .forEach((k) => localStorage.removeItem(k));
    avisar('*');
  },
  usoBytes() {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .reduce((t, k) => t + (localStorage.getItem(k)?.length || 0) * 2, 0);
  },
};
