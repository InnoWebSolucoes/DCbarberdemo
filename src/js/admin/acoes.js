// Ações sobre agendamentos usadas em várias telas (visão geral, agenda, gaveta).
import { db } from '../data/store.js';
import { mudarStatus, cancelarAgendamento } from '../data/api.js';
import { confirmar, toast } from './ui.js';
import { primeiroNome, hhmm, dataLonga } from '../lib/format.js';
import { abrirNovaFatura } from './paineis/nova-fatura.js';

export const CHAVE_FATURA = 'faturaAoConcluir';
export const pedirFaturaAoConcluir = () => db.getMeta(CHAVE_FATURA, true) !== false;
export const definirPedirFatura = (v) => db.setMeta(CHAVE_FATURA, !!v);

export async function concluir(ag) {
  const antes = ag.status;
  await mudarStatus(ag.id, 'concluido');
  const abrirFatura = pedirFaturaAoConcluir() && !ag.faturaId;
  if (abrirFatura) {
    abrirNovaFatura({ clienteId: ag.clienteId, agendamentoId: ag.id, origem: 'concluir' });
  } else {
    toast(`Atendimento de ${primeiroNome(ag.clienteNome)} concluído.`, {
      acao: 'Desfazer', aoAgir: () => mudarStatus(ag.id, antes),
    });
  }
}

export async function marcarFaltou(ag) {
  const antes = ag.status;
  await mudarStatus(ag.id, 'faltou');
  toast(`${primeiroNome(ag.clienteNome)} marcado como faltou.`, {
    acao: 'Desfazer', aoAgir: () => mudarStatus(ag.id, antes),
  });
}

export async function reabrir(ag) {
  await mudarStatus(ag.id, 'confirmado');
  toast(`O horário de ${primeiroNome(ag.clienteNome)} voltou para confirmado.`);
}

export async function cancelar(ag) {
  const d = new Date(ag.inicio);
  const ok = await confirmar({
    titulo: `Cancelar o horário de ${primeiroNome(ag.clienteNome)}?`,
    texto: `${dataLonga(d)} às ${hhmm(d)} com ${ag.profissionalNome}. O cliente recebe um e-mail avisando do cancelamento e o horário fica livre na agenda.`,
    ok: 'Cancelar horário',
    cancelar: 'Manter',
    perigo: true,
  });
  if (!ok) return false;
  await cancelarAgendamento(ag.id, 'barbearia');
  toast(`Horário ${ag.codigo} cancelado. E-mail enviado para ${ag.clienteEmail}.`);
  return true;
}
