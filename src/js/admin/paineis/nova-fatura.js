// Modal "Nova fatura": cliente, atendimento, número, valor, arquivo e pré-visualização do e-mail.
import { html, raw, render, debounce, esperar } from '../dom.js';
import { icon } from '../icons.js';
import { col, porId, proximoNumeroFatura } from '../dados.js';
import { abrirCamada, topoCamada, toast, kb } from '../ui.js';
import { seletorCliente } from './seletor-cliente.js';
import { prepararAnexo } from '../arquivos.js';
import { srcdoc } from './email.js';
import { enviarFatura } from '../../data/api.js';
import { emailFatura } from '../../data/templates.js';
import { moeda, dataCurta, hhmm, primeiroNome } from '../../lib/format.js';

const PREVIA = 'previa-fatura';

const lerValor = (v) => {
  const n = Number(String(v).replace(/\s|€/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

export function abrirNovaFatura(pre = {}) {
  const agPre = porId('agendamentos', pre.agendamentoId);
  const st = {
    agendamentoId: pre.agendamentoId || null,
    numero: proximoNumeroFatura(),
    valor: agPre ? String(agPre.total).replace('.', ',') : '',
    anexo: null,
    lendo: false,
    erroArquivo: '',
    erro: '',
    mensagem: '',
    enviando: false,
    enviada: false,
  };
  const vindoDeConcluir = pre.origem === 'concluir';
  const c = abrirCamada({
    tipo: 'modal', classe: 'camada--largo camada--fatura', rotulo: 'Nova fatura',
    aoFechar: () => {
      if (vindoDeConcluir && !st.enviada && agPre) toast(`Atendimento de ${primeiroNome(agPre.clienteNome)} concluído. A fatura pode ser enviada depois pela agenda.`);
    },
  });
  c.painel.innerHTML = html`
    ${topoCamada({
      titulo: 'Nova fatura',
      sub: vindoDeConcluir ? 'Atendimento concluído. Envie a fatura agora ou feche para enviar depois.' : 'A fatura vai por e-mail e fica na conta do cliente',
    })}
    <div class="fatura-modal">
      <div class="fatura-modal__form">
        <section class="passo">
          <h3 class="passo__titulo">Cliente</h3>
          <div data-cliente></div>
        </section>
        <section class="passo" data-atendimento></section>
        <section class="passo">
          <div class="linha-campos linha-campos--2">
            <label class="campo"><span class="campo__rotulo">Número da fatura</span>
              <input class="entrada tnum" data-campo="numero" value="${st.numero}" autocomplete="off"></label>
            <label class="campo"><span class="campo__rotulo">Valor</span>
              <span class="entrada-sufixo"><input class="entrada tnum" data-campo="valor" inputmode="decimal" value="${st.valor}" placeholder="0,00" autocomplete="off"><span>€</span></span></label>
          </div>
        </section>
        <section class="passo">
          <h3 class="passo__titulo">Arquivo da fatura</h3>
          <div data-arquivo></div>
        </section>
        <section class="passo">
          <label class="campo"><span class="campo__rotulo">Mensagem <span class="fraco">(opcional)</span></span>
            <textarea class="texto texto--curto" data-campo="mensagem" placeholder="Olá. Segue a fatura do seu atendimento na DC Barbershop. Obrigado pela visita."></textarea></label>
        </section>
      </div>
      <div class="fatura-modal__previa">
        <div class="previa-cab" data-previa-cab></div>
        <div class="previa-quadro" data-previa></div>
      </div>
    </div>
    <footer class="camada__rodape">
      <div class="camada__rodape-info" data-rodape-info></div>
      <button type="button" class="btn a-btn a-btn--leve" data-act="fechar">${vindoDeConcluir ? 'Enviar depois' : 'Cancelar'}</button>
      <button type="button" class="btn a-btn a-btn--preto" data-enviar>${icon('email', 17)}Enviar por e-mail</button>
    </footer>`.toString();

  const q = (s) => c.painel.querySelector(s);
  const cli = seletorCliente(q('[data-cliente]'), {
    clienteId: pre.clienteId || null,
    aoMudar: (v) => {
      if (!v || (st.agendamentoId && porId('agendamentos', st.agendamentoId)?.clienteId !== v.id)) st.agendamentoId = null;
      desenharAtendimento();
      previa();
      rodape();
    },
  });

  function atendimentosDoCliente(id) {
    if (!id) return [];
    const limite = Date.now() - 120 * 86400000;
    return col('agendamentos')
      .filter((a) => a.clienteId === id && (a.status === 'concluido' || a.id === st.agendamentoId) && new Date(a.inicio).getTime() > limite)
      .sort((a, b) => b.inicio.localeCompare(a.inicio))
      .slice(0, 8);
  }

  function desenharAtendimento() {
    const v = cli.valor();
    const lista = atendimentosDoCliente(v?.id);
    render(q('[data-atendimento]'), v?.id ? html`
      <label class="campo"><span class="campo__rotulo">Atendimento <span class="fraco">(opcional, preenche o valor)</span></span>
        <select class="selecao" data-campo="agendamento">
          <option value="">Sem atendimento ligado</option>
          ${lista.map((a) => {
            const d = new Date(a.inicio);
            return html`<option value="${a.id}" ${a.id === st.agendamentoId ? raw('selected') : ''}>${dataCurta(d)} às ${hhmm(d)}, ${a.servicosNomes.join(' + ')}, ${moeda(a.total)}${a.faturaId ? ', já tem fatura' : ''}</option>`;
          })}
        </select>
        ${!lista.length ? html`<span class="campo__ajuda">Este cliente não tem atendimentos concluídos nos últimos 4 meses.</span>` : ''}
      </label>` : '');
  }

  function desenharArquivo() {
    const a = st.anexo;
    render(q('[data-arquivo]'), html`
      ${a ? html`
        <div class="anexo-escolhido">
          ${a.tipo.startsWith('image/') ? html`<img src="${a.dataUrl}" alt="">` : html`<span class="anexo-escolhido__doc">${icon('arquivo', 26)}</span>`}
          <span class="anexo-escolhido__info"><strong>${a.nome}</strong>
            <small>${a.tipo === 'application/pdf' ? 'PDF' : `JPG ${a.largura}x${a.altura}, comprimido`}, ${kb(a.bytes)}</small></span>
          <span class="anexo-escolhido__acoes">
            <button type="button" class="btn a-btn a-btn--linha a-btn--sm" data-arq="trocar">Trocar</button>
            <button type="button" class="icone-btn" data-arq="remover" aria-label="Remover arquivo">${icon('lixo', 18)}</button>
          </span>
        </div>` : html`
        <div class="soltar ${st.lendo ? 'is-lendo' : ''}" data-soltar tabindex="0" role="button" aria-describedby="soltar-ajuda">
          ${st.lendo ? html`<span class="giro"></span><p><strong>Preparando o arquivo</strong></p>` : html`
            <span class="soltar__ico">${icon('enviar', 22)}</span>
            <p><strong>Arraste a foto ou o PDF da fatura</strong> ou clique para escolher</p>
            <p class="soltar__ajuda" id="soltar-ajuda">Fotos são reduzidas para 1400 px. PDF até 1,5 MB.</p>`}
        </div>`}
      <input type="file" accept="image/*,application/pdf" data-input-arquivo hidden>
      ${st.erroArquivo ? html`<p class="erro-caixa soltar__erro" role="alert">${st.erroArquivo}</p>` : ''}`);
  }

  const dadosPrevia = () => {
    const v = cli.valor();
    const cliente = v?.cliente || { nome: 'Cliente', email: '' };
    const valor = lerValor(st.valor);
    const fatura = {
      id: PREVIA,
      numero: st.numero || 'FR',
      valor: Number.isFinite(valor) ? valor : 0,
      arquivoNome: st.anexo?.nome || 'fatura.jpg',
      arquivoTipo: st.anexo?.tipo || 'image/jpeg',
    };
    return { cliente, fatura };
  };

  function previaAgora() {
    const { cliente, fatura } = dadosPrevia();
    let corpo = emailFatura({ cliente, fatura, mensagem: st.mensagem.trim() });
    if (!st.anexo) corpo = corpo.replace(/<img src="dc-fatura:[^"]*"[^>]*>/, '');
    else corpo = corpo.replaceAll(`dc-fatura:${PREVIA}`, st.anexo.tipo.startsWith('image/') ? st.anexo.dataUrl : '');
    render(q('[data-previa-cab]'), html`
      <p class="previa-cab__titulo">Pré-visualização do e-mail</p>
      <dl class="previa-cab__meta"><dt>Para</dt><dd>${cliente.email || 'Escolha o cliente'}</dd><dt>Assunto</dt><dd>Fatura ${fatura.numero}: DC Barbershop</dd>
      ${st.anexo ? html`<dt>Anexo</dt><dd>${st.anexo.nome}</dd>` : ''}</dl>`);
    let frame = q('[data-previa] iframe');
    if (!frame) {
      q('[data-previa]').innerHTML = '<iframe class="email-quadro" title="Pré-visualização do e-mail da fatura" sandbox="allow-same-origin"></iframe>';
      frame = q('[data-previa] iframe');
    }
    frame.srcdoc = srcdoc(corpo);
  }
  const previa = debounce(previaAgora, 180);

  function rodape() {
    const v = cli.valor();
    render(q('[data-rodape-info]'), st.erro ? html`<span class="novo-ag__erro" role="alert">${st.erro}</span>`
      : v?.cliente ? html`Vai para <strong>${v.cliente.email}</strong>` : 'Escolha o cliente');
    const b = q('[data-enviar]');
    b.disabled = st.enviando;
    b.innerHTML = st.enviando ? html`<span class="giro"></span>Enviando`.toString() : html`${icon('email', 17)}Enviar por e-mail`.toString();
  }

  async function receberArquivo(file) {
    if (!file) return;
    st.erroArquivo = '';
    st.lendo = true;
    desenharArquivo();
    try {
      st.anexo = await prepararAnexo(file);
    } catch (e) {
      st.anexo = null;
      st.erroArquivo = e.message;
    }
    st.lendo = false;
    st.erro = '';
    desenharArquivo();
    previa();
    rodape();
  }

  // Eventos
  c.painel.addEventListener('click', (ev) => {
    const arq = ev.target.closest('[data-arq]');
    if (ev.target.closest('[data-soltar]') && !st.lendo) q('[data-input-arquivo]').click();
    else if (arq?.dataset.arq === 'trocar') q('[data-input-arquivo]').click();
    else if (arq?.dataset.arq === 'remover') {
      st.anexo = null;
      desenharArquivo();
      previa();
      q('[data-soltar]')?.focus();
    } else if (ev.target.closest('[data-enviar]')) enviar();
  });
  c.painel.addEventListener('keydown', (ev) => {
    if (ev.target.matches('[data-soltar]') && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      q('[data-input-arquivo]').click();
    }
  });
  c.painel.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.matches('[data-input-arquivo]')) {
      receberArquivo(t.files[0]);
      t.value = '';
    } else if (t.dataset.campo === 'agendamento') {
      st.agendamentoId = t.value || null;
      const ag = porId('agendamentos', st.agendamentoId);
      if (ag) {
        st.valor = String(ag.total).replace('.', ',');
        q('[data-campo="valor"]').value = st.valor;
      }
      previa();
    }
  });
  c.painel.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.dataset.campo === 'numero') st.numero = t.value;
    else if (t.dataset.campo === 'valor') st.valor = t.value;
    else if (t.dataset.campo === 'mensagem') st.mensagem = t.value;
    else return;
    if (st.erro) {
      st.erro = '';
      rodape();
    }
    previa();
  });
  const zona = () => q('[data-soltar]');
  c.painel.addEventListener('dragover', (ev) => {
    if (!ev.dataTransfer?.types?.includes('Files')) return;
    ev.preventDefault();
    zona()?.classList.add('is-sobre');
  });
  c.painel.addEventListener('dragleave', (ev) => {
    if (!c.painel.contains(ev.relatedTarget)) zona()?.classList.remove('is-sobre');
  });
  c.painel.addEventListener('drop', (ev) => {
    if (!ev.dataTransfer?.files?.length) return;
    ev.preventDefault();
    zona()?.classList.remove('is-sobre');
    receberArquivo(ev.dataTransfer.files[0]);
  });

  async function enviar() {
    const v = cli.valor();
    const valor = lerValor(st.valor);
    const numero = st.numero.trim();
    st.erro = '';
    if (!v?.cliente) st.erro = 'Escolha o cliente.';
    else if (!numero) st.erro = 'Preencha o número da fatura.';
    else if (col('faturas').some((f) => f.numero.trim().toLowerCase() === numero.toLowerCase())) st.erro = `Já existe a fatura ${numero}. Use o próximo número.`;
    else if (!Number.isFinite(valor) || valor < 0 || st.valor === '') st.erro = 'Digite o valor da fatura.';
    else if (!st.anexo) st.erro = 'Anexe a foto ou o PDF da fatura.';
    if (st.erro) {
      rodape();
      if (!st.anexo && st.erro.startsWith('Anexe')) zona()?.focus();
      return;
    }
    st.enviando = true;
    rodape();
    try {
      await esperar(900);
      const f = await enviarFatura({
        clienteId: v.id, agendamentoId: st.agendamentoId, numero, valor,
        arquivo: st.anexo.dataUrl, arquivoNome: st.anexo.nome, arquivoTipo: st.anexo.tipo, mensagem: st.mensagem.trim(),
      });
      st.enviada = true;
      c.fechar();
      toast(`Fatura ${f.numero} enviada para ${v.cliente.email}`, {
        acao: 'Ver e-mail',
        aoAgir: async () => {
          const fresca = porId('faturas', f.id);
          if (fresca?.emailId) (await import('./email.js')).abrirEmail(fresca.emailId);
        },
        duracao: 7000,
      });
    } catch (e) {
      st.enviando = false;
      st.erro = /espaço|quota/i.test(e.message || '') ? 'O armazenamento do navegador está cheio. Use um arquivo menor ou restaure os dados de demonstração em Configurações.' : e.message;
      rodape();
    }
  }

  c.atualizar = () => {
    if (st.enviando) return;
    cli.atualizar();
  };

  desenharAtendimento();
  desenharArquivo();
  previaAgora();
  rodape();
  if (pre.clienteId) c.focar('[data-soltar]');
  else cli.focar();
  return c;
}
