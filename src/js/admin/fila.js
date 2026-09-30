// Roda as automações e campanhas agendadas que venceram (processarFila) e avisa o que saiu.
import { processarFila } from '../data/api.js';
import { toast } from './ui.js';

let rodando = false;

export function resumoFila(enviados) {
  const lembretes = enviados.filter((e) => e.tipo === 'automacao').length;
  const camps = enviados.filter((e) => e.tipo === 'campanha');
  const partes = [];
  if (lembretes) partes.push(`${lembretes} ${lembretes === 1 ? 'lembrete enviado' : 'lembretes enviados'} automaticamente`);
  camps.forEach((c) => partes.push(`Campanha ${c.nome} enviada automaticamente`));
  return partes.join('. ');
}

export async function rodarFila({ avisar = true } = {}) {
  if (rodando) return [];
  rodando = true;
  try {
    const enviados = await processarFila();
    if (enviados.length && avisar) {
      toast(resumoFila(enviados), { tipo: 'info', acao: 'Ver e-mails', aoAgir: () => (location.hash = '#/emails') });
    }
    return enviados;
  } finally {
    rodando = false;
  }
}
