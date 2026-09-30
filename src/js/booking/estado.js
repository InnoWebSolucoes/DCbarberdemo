// Estado do fluxo de agendamento e valores derivados.
import { servicoPorId, profissionalPorId, profissionaisPara } from '../data/catalog.js';
import { resumoServicos } from '../data/api.js';

export const PASSOS = [
  { n: 1, nome: 'Serviços' },
  { n: 2, nome: 'Profissional' },
  { n: 3, nome: 'Dia e hora' },
  { n: 4, nome: 'Seus dados' },
];

export function estadoInicial() {
  return {
    modo: 'novo', // 'novo' | 'remarcar'
    passo: 1,
    servicos: [],
    profissionalId: null, // id da equipe ou 'qualquer'
    profPreset: false,
    dia: null, // 'AAAA-MM-DD'
    slot: null, // { hora, inicio (ISO), profissionais }
    remarcar: null, // agendamento original
    categoria: 'cortes',
    avisoServicos: '',
    avisoHorario: '',
    dados: {
      aba: 'sem-conta',
      nome: '', telefone: '', email: '', observacao: '',
      criarConta: false, senha: '', marketing: false,
      loginEmail: '', loginSenha: '',
    },
    resultado: null,
    contaCriada: false,
    mexeu: false,
  };
}

export const estado = estadoInicial();

export function resetar(parcial = {}) {
  Object.assign(estado, estadoInicial(), parcial);
}

export const resumo = () => resumoServicos(estado.servicos);

export const profissionaisPossiveis = (ids = estado.servicos) => (ids.length ? profissionaisPara(ids) : []);

export const combinam = (ids) => ids.length === 0 || profissionaisPara(ids).length > 0;

export function candidatos() {
  if (!estado.profissionalId) return [];
  if (estado.profissionalId === 'qualquer') return profissionaisPossiveis().map((p) => p.id);
  return [estado.profissionalId];
}

export function profissionalEscolhido() {
  if (!estado.profissionalId) return null;
  if (estado.profissionalId === 'qualquer') return { id: 'qualquer', nome: 'Sem preferência', funcao: 'O primeiro livre' };
  return profissionalPorId(estado.profissionalId);
}

export const servicosEscolhidos = () => estado.servicos.map(servicoPorId).filter(Boolean);

// Há escolhas feitas pela pessoa que se perdem ao fechar?
export const temProgresso = () => estado.passo < 5 && estado.mexeu && (estado.servicos.length > 0 || !!estado.slot);

export const marcarMexeu = () => { estado.mexeu = true; };
