// Modelos de e-mail em HTML (tabelas e estilos inline, como os clientes de e-mail exigem).
import { negocio } from './catalog.js';
import { escapeHtml, moeda, duracao, dataLonga, hhmm, primeiroNome } from '../lib/format.js';
import { raiz } from '../lib/base.js';

const origem = raiz;
const absoluto = (u) => (u && u.startsWith('/') && !u.startsWith('//') ? raiz() + u : u);

export const preencher = (texto = '', vars = {}) =>
  texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));

const paragrafos = (texto = '') =>
  escapeHtml(texto)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2b2b2b">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

const botao = (label, url) => `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 24px"><tr><td style="background:#000;border-radius:999px">
    <a href="${absoluto(url)}" style="display:inline-block;padding:14px 28px;font:600 15px/1 'Helvetica Neue',Arial,sans-serif;color:#E4CF80;text-decoration:none">${escapeHtml(label)}</a>
  </td></tr></table>`;

export function layout({ preheader = '', titulo = '', corpo = '', rodapeExtra = '' }) {
  const o = origem();
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(titulo)}</title></head>
<body style="margin:0;padding:0;background:#ecebe7;font-family:'Helvetica Neue',Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ecebe7;padding:32px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border-radius:18px;overflow:hidden">
    <tr><td style="background:#000;padding:28px 36px" align="left">
      <img src="${o}/brand/logo-gold.png" alt="DC Barbershop" width="92" style="display:block;width:92px;height:auto">
    </td></tr>
    <tr><td style="padding:36px 36px 12px">
      <h1 style="margin:0 0 20px;font:700 28px/1.15 'Helvetica Neue',Arial,sans-serif;letter-spacing:-0.02em;color:#000">${escapeHtml(titulo)}</h1>
      ${corpo}
    </td></tr>
    <tr><td style="padding:22px 36px 30px;border-top:1px solid #eee;font-size:13px;line-height:1.6;color:#777">
      <strong style="color:#000">${negocio.nome}</strong><br>
      ${negocio.endereco}, ${negocio.cidade}<br>
      ${negocio.telefone}<br>
      <a href="${negocio.instagram}" style="color:#916528">${negocio.instagramUser}</a>
      ${rodapeExtra}
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

const linhaTabela = (rotulo, valor) => `
  <tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;color:#777;width:40%">${rotulo}</td>
  <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:15px;color:#000;font-weight:600">${valor}</td></tr>`;

const cancelar = () =>
  `<br><br>Você recebe este e-mail porque aceitou lembretes da DC. <a href="${origem()}/conta/#preferencias" style="color:#777">Cancelar inscrição</a>`;

export function emailConfirmacao(ag) {
  const inicio = new Date(ag.inicio);
  const corpo = `
    ${paragrafos(`Olá, ${primeiroNome(ag.clienteNome)}. Seu horário está reservado. Guarde este e-mail ou consulte tudo na sua conta.`)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px">
      ${linhaTabela('Código', ag.codigo)}
      ${linhaTabela('Serviço', ag.servicosNomes.map(escapeHtml).join('<br>'))}
      ${linhaTabela('Profissional', escapeHtml(ag.profissionalNome))}
      ${linhaTabela('Dia', dataLonga(inicio))}
      ${linhaTabela('Hora', hhmm(inicio))}
      ${linhaTabela('Duração', duracao(ag.duracao))}
      ${linhaTabela('Total', ag.totalTexto || moeda(ag.total))}
    </table>
    ${botao('Ver na minha conta', `${origem()}/conta/`)}
    ${paragrafos(`Precisa remarcar? Faça isso pela sua conta ou responda a este e-mail até 2 horas antes.\n\nPagamento no local: dinheiro, MB Way ou Multibanco.`)}`;
  return layout({ preheader: `${dataLonga(inicio)} às ${hhmm(inicio)} com ${ag.profissionalNome}`, titulo: 'Horário confirmado', corpo });
}

export function emailCancelamento(ag) {
  const inicio = new Date(ag.inicio);
  const corpo = `
    ${paragrafos(`Olá, ${primeiroNome(ag.clienteNome)}. O horário ${ag.codigo} de ${dataLonga(inicio)} às ${hhmm(inicio)} foi cancelado.`)}
    ${botao('Escolher outro horário', `${origem()}/#agendar`)}`;
  return layout({ preheader: 'Seu horário foi cancelado', titulo: 'Horário cancelado', corpo });
}

export function emailFatura({ cliente, fatura, mensagem }) {
  const imagem = fatura.arquivoTipo?.startsWith('image/')
    ? `<img src="dc-fatura:${fatura.id}" alt="Fatura ${escapeHtml(fatura.numero)}" style="display:block;width:100%;height:auto;border:1px solid #eee;border-radius:10px;margin:0 0 24px">`
    : '';
  const corpo = `
    ${paragrafos(mensagem || `Olá, ${primeiroNome(cliente.nome)}. Segue a fatura do seu atendimento na DC Barbershop. Obrigado pela visita.`)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px">
      ${linhaTabela('Fatura', escapeHtml(fatura.numero))}
      ${linhaTabela('Valor', moeda(fatura.valor))}
      ${linhaTabela('Anexo', escapeHtml(fatura.arquivoNome))}
    </table>
    ${imagem}
    ${botao('Ver faturas na minha conta', `${origem()}/conta/#faturas`)}`;
  return layout({ preheader: `Fatura ${fatura.numero} em anexo`, titulo: 'Sua fatura', corpo });
}

export function emailBoasVindas(cliente) {
  const corpo = `
    ${paragrafos(`Olá, ${primeiroNome(cliente.nome)}. Sua conta na DC Barbershop está criada.\n\nPor ela você vê os próximos horários, remarca, baixa as faturas e escolhe de quanto em quanto tempo quer ser lembrado de voltar.`)}
    ${botao('Abrir minha conta', `${origem()}/conta/`)}`;
  return layout({ preheader: 'Sua conta está pronta', titulo: 'Bem-vindo à DC', corpo });
}

export function emailLivre({ titulo, texto, cta, ctaUrl, imagem, preheader, marketing = true }) {
  const img = imagem
    ? `<img src="${imagem.startsWith('http') || imagem.startsWith('data:') ? imagem : origem() + imagem}" alt="" style="display:block;width:100%;height:auto;border-radius:12px;margin:0 0 24px">`
    : '';
  const corpo = `${img}${paragrafos(texto)}${cta ? botao(cta, ctaUrl || `${origem()}/#agendar`) : ''}`;
  return layout({ preheader: preheader || titulo, titulo, corpo, rodapeExtra: marketing ? cancelar() : '' });
}
