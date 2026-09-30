// Editor de campanha: conteúdo, imagem, público, envio (agora, agendado ou todo mês) e pré-visualização.
import { html, raw, render, debounce, esperar } from '../dom.js';
import { icon } from '../icons.js';
import { porId, listaPublico, refImagemCampanha } from '../dados.js';
import { abrirCamada, topoCamada, toast, confirmar, kb } from '../ui.js';
import { comprimirImagem } from '../arquivos.js';
import { srcdoc } from './email.js';
import { imagemOk } from '../imagens.js';
import { db } from '../../data/store.js';
import { PUBLICOS, enviarCampanha } from '../../data/api.js';
import { emailLivre, preencher } from '../../data/templates.js';
import { negocio } from '../../data/catalog.js';
import { hhmm, isoDia } from '../../lib/format.js';

export const PRESET_MENSAL = {
  nome: 'Lembrete mensal',
  assunto: '{{nome}}, sua agenda de {{mes}} já abriu',
  titulo: 'A agenda do mês já abriu',
  texto: 'Olá, {{nome}}. Os horários de sábado costumam ser os primeiros a acabar.\n\nGaranta o seu agora e receba a confirmação na hora.',
  cta: 'Agendar horário',
  ctaUrl: '/#agendar',
  publico: 'sem-horario',
  modo: 'mensal',
};

const LINKS = [
  { nome: 'Agendar no site', url: '/#agendar' },
  { nome: 'WhatsApp', url: negocio.whatsapp },
  { nome: 'Instagram', url: negocio.instagram },
];

export function proximaMensal(dia, hora) {
  const [h, m] = (hora || '10:00').split(':').map(Number);
  const agora = new Date();
  let d = new Date(agora.getFullYear(), agora.getMonth(), dia, h, m);
  if (d <= agora) d = new Date(agora.getFullYear(), agora.getMonth() + 1, dia, h, m);
  return d;
}

const mesAtual = () => new Date().toLocaleDateString('pt-BR', { month: 'long' });
const quandoLongo = (d) => `${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} às ${hhmm(d)}`;
const nomePublico = (id) => PUBLICOS.find((p) => p.id === id)?.nome || id;

export function abrirCampanha(id = null, preset = null) {
  const camp = id ? porId('campanhas', id) : null;
  const base = camp || preset || {};
  const quando = camp?.agendadaPara ? new Date(camp.agendadaPara) : null;
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(10, 0, 0, 0);
  const st = {
    id: camp?.id || null,
    nome: base.nome || '',
    assunto: base.assunto || '',
    titulo: base.titulo || '',
    texto: base.texto ?? 'Olá, {{nome}}. ',
    cta: base.cta ?? 'Agendar horário',
    ctaUrl: base.ctaUrl ?? '/#agendar',
    imagem: base.imagemDados ? '' : base.imagem || '',
    imagemDados: base.imagemDados || '',
    imagemInfo: null,
    publico: base.publico || 'todos',
    modo: preset?.modo || (camp?.recorrencia === 'mensal' ? 'mensal' : camp?.status === 'agendada' && quando ? 'agendar' : 'agora'),
    quando: quando && camp?.recorrencia !== 'mensal' ? `${isoDia(quando)}T${hhmm(quando)}` : `${isoDia(amanha)}T10:00`,
    diaMes: camp?.diaMes || (camp?.recorrencia === 'mensal' && quando ? quando.getDate() : 1),
    horaMes: camp?.horaMes || (camp?.recorrencia === 'mensal' && quando ? hhmm(quando) : '10:00'),
    largura: 'desktop',
    erro: '',
    ocupado: '',
    lendoImagem: false,
  };
  // Imagem de exemplo que não existe no site: trata como sem imagem.
  if (st.imagem && !imagemOk(st.imagem)) st.imagem = '';
  const inicial = JSON.stringify(st);

  const c = abrirCamada({ tipo: 'modal', classe: 'camada--largo camada--campanha', rotulo: camp ? `Editar ${camp.nome}` : 'Nova campanha' });
  c.antesDeFechar = () => {
    if (st.ocupado || JSON.stringify(st) === inicial || c.podeFechar) return true;
    confirmar({ titulo: 'Sair sem salvar?', texto: 'As alterações desta campanha serão perdidas.', ok: 'Sair sem salvar', cancelar: 'Continuar editando', perigo: true }).then((ok) => {
      if (ok) {
        c.podeFechar = true;
        c.fechar();
      }
    });
    return false;
  };

  c.painel.innerHTML = html`
    ${topoCamada({ titulo: camp ? camp.nome : preset ? 'Novo lembrete mensal' : 'Nova campanha', sub: camp ? 'Editar campanha' : 'Campanha de e-mail' })}
    <div class="camp-modal">
      <div class="camp-modal__form" data-form></div>
      <div class="camp-modal__previa">
        <div class="previa-cab previa-cab--camp">
          <div>
            <p class="previa-cab__titulo">Pré-visualização</p>
            <dl class="previa-cab__meta"><dt>Assunto</dt><dd data-previa-assunto></dd></dl>
          </div>
          <div class="seg" role="group" aria-label="Largura da pré-visualização">
            <button type="button" class="seg__op" data-largura="desktop" aria-pressed="true">${icon('desktop', 16)}Computador</button>
            <button type="button" class="seg__op" data-largura="celular" aria-pressed="false">${icon('celular', 16)}Celular</button>
          </div>
        </div>
        <div class="camp-modal__quadro" data-quadro>
          <iframe class="email-quadro" title="Pré-visualização da campanha" sandbox="allow-same-origin" data-previa></iframe>
        </div>
      </div>
    </div>
    <footer class="camada__rodape" data-rodape></footer>`.toString();
  const q = (s) => c.painel.querySelector(s);

  function formulario() {
    const contagens = Object.fromEntries(PUBLICOS.map((p) => [p.id, listaPublico(p.id).length]));
    render(q('[data-form]'), html`
      <section class="passo">
        <label class="campo"><span class="campo__rotulo">Nome da campanha <span class="fraco">(só aparece aqui no painel)</span></span>
          <input class="entrada" data-c="nome" value="${st.nome}" placeholder="Ex.: Lembrete mensal, Promoção de platinado" autocomplete="off"></label>
      </section>
      <section class="passo">
        <h3 class="passo__titulo">Conteúdo</h3>
        <div class="campos-pilha">
          <label class="campo"><span class="campo__rotulo">Assunto</span><input class="entrada" data-c="assunto" value="${st.assunto}" placeholder="Ex.: {{nome}}, sua agenda de {{mes}} já abriu" autocomplete="off"></label>
          <label class="campo"><span class="campo__rotulo">Título</span><input class="entrada" data-c="titulo" value="${st.titulo}" placeholder="Ex.: A agenda do mês já abriu" autocomplete="off"></label>
          <label class="campo"><span class="campo__rotulo">Texto</span><textarea class="texto" data-c="texto" rows="6">${st.texto}</textarea>
            <span class="campo__ajuda">Deixe uma linha em branco para começar outro parágrafo.</span></label>
          <div class="variaveis" role="group" aria-label="Inserir variável">
            <span class="variaveis__rotulo">Inserir no campo:</span>
            <button type="button" class="var-chip" data-var="nome" title="Primeiro nome do cliente">{{nome}}</button>
            <button type="button" class="var-chip" data-var="mes" title="Mês do envio, por extenso">{{mes}}</button>
          </div>
        </div>
      </section>
      <section class="passo">
        <h3 class="passo__titulo">Imagem <span class="fraco passo__opc">opcional</span></h3>
        <div data-imagem>${blocoImagem()}</div>
      </section>
      <section class="passo">
        <h3 class="passo__titulo">Botão</h3>
        <div class="linha-campos">
          <label class="campo"><span class="campo__rotulo">Texto do botão</span><input class="entrada" data-c="cta" value="${st.cta}" placeholder="Deixe vazio para não ter botão" autocomplete="off"></label>
          <label class="campo"><span class="campo__rotulo">Link</span><input class="entrada" data-c="ctaUrl" value="${st.ctaUrl}" autocomplete="off"></label>
        </div>
        <div class="pilulas pilulas--sm">${LINKS.map((l) => html`<button type="button" class="pilula" data-link="${l.url}" aria-pressed="${st.ctaUrl === l.url}">${l.nome}</button>`)}</div>
      </section>
      <section class="passo">
        <h3 class="passo__titulo">Público</h3>
        <div class="opcoes" role="radiogroup" aria-label="Público">
          ${PUBLICOS.map((p) => html`<label class="opcao">
            <input type="radio" name="camp-publico" value="${p.id}" ${st.publico === p.id ? raw('checked') : ''}>
            <span class="opcao__nome">${p.nome}</span><span class="opcao__n tnum">${contagens[p.id]}</span>
          </label>`)}
        </div>
      </section>
      <section class="passo">
        <h3 class="passo__titulo">Envio</h3>
        <div class="envios" role="radiogroup" aria-label="Quando enviar">
          <label class="envio ${st.modo === 'agora' ? 'is-ativo' : ''}"><input type="radio" name="camp-modo" value="agora" ${st.modo === 'agora' ? raw('checked') : ''}>
            <span class="envio__nome">Enviar agora</span><span class="envio__desc">Sai assim que você confirmar.</span></label>
          <label class="envio ${st.modo === 'agendar' ? 'is-ativo' : ''}"><input type="radio" name="camp-modo" value="agendar" ${st.modo === 'agendar' ? raw('checked') : ''}>
            <span class="envio__nome">Agendar</span><span class="envio__desc">Escolha o dia e a hora.</span></label>
          <label class="envio envio--mensal ${st.modo === 'mensal' ? 'is-ativo' : ''}"><input type="radio" name="camp-modo" value="mensal" ${st.modo === 'mensal' ? raw('checked') : ''}>
            <span class="envio__nome">${icon('repetir', 16)}Repetir todo mês</span><span class="envio__desc">O lembrete que traz o cliente de volta todo mês.</span></label>
        </div>
        <div data-envio-detalhe>${detalheEnvio()}</div>
      </section>`);
  }

  function blocoImagem() {
    const src = st.imagemDados || st.imagem;
    if (st.lendoImagem) return html`<div class="soltar is-lendo"><span class="giro"></span><p><strong>Preparando a imagem</strong></p></div>`;
    if (src) {
      return html`<div class="anexo-escolhido anexo-escolhido--larga">
        <img src="${src}" alt="">
        <span class="anexo-escolhido__info"><strong>${st.imagemDados ? 'Imagem enviada' : src.split('/').pop()}</strong>
          <small>${st.imagemInfo ? `JPG ${st.imagemInfo.largura}x${st.imagemInfo.altura}, ${kb(st.imagemInfo.bytes)}` : 'Aparece no topo do e-mail'}</small></span>
        <span class="anexo-escolhido__acoes">
          <button type="button" class="btn a-btn a-btn--linha a-btn--sm" data-img="trocar">Trocar</button>
          <button type="button" class="icone-btn" data-img="remover" aria-label="Remover imagem">${icon('lixo', 18)}</button>
        </span>
      </div><input type="file" accept="image/*" data-img-input hidden>`;
    }
    return html`<div class="soltar soltar--baixo" data-img-zona tabindex="0" role="button">
      <p><strong>Adicionar uma imagem</strong> ou arraste aqui</p>
      <p class="soltar__ajuda">Fica no topo do e-mail. Reduzimos para 1200 px.</p>
    </div><input type="file" accept="image/*" data-img-input hidden>`;
  }

  function detalheEnvio() {
    if (st.modo === 'agendar') {
      return html`<label class="campo envio__campo"><span class="campo__rotulo">Dia e hora do envio</span>
        <input class="entrada" type="datetime-local" data-c="quando" value="${st.quando}" min="${isoDia(new Date())}T00:00"></label>`;
    }
    if (st.modo === 'mensal') {
      const prox = proximaMensal(st.diaMes, st.horaMes);
      return html`<div class="envio__mensal">
        <div class="linha-campos">
          <label class="campo"><span class="campo__rotulo">Dia do mês</span>
            <select class="selecao" data-c="diaMes">${Array.from({ length: 28 }, (_, i) => i + 1).map((d) => html`<option value="${d}" ${d === Number(st.diaMes) ? raw('selected') : ''}>Dia ${d}</option>`)}</select></label>
          <label class="campo"><span class="campo__rotulo">Hora</span><input class="entrada" type="time" data-c="horaMes" value="${st.horaMes}" step="900"></label>
        </div>
        <p class="nota nota--fina">${icon('calendario', 16)}<span>Próximo envio em ${quandoLongo(prox)}. Depois, todo dia ${st.diaMes}. Cada envio usa o público do momento, então quem já marcou horário não recebe.</span></p>
      </div>`;
    }
    return '';
  }

  const previaAgora = () => {
    const vars = { nome: 'Rafael', mes: mesAtual() };
    const img = st.imagemDados || (st.imagem && imagemOk(st.imagem) ? st.imagem : '');
    const corpo = emailLivre({ titulo: preencher(st.titulo || 'Título do e-mail', vars), texto: preencher(st.texto, vars), cta: st.cta, ctaUrl: st.ctaUrl, imagem: img });
    q('[data-previa]').srcdoc = srcdoc(corpo);
    q('[data-previa-assunto]').textContent = preencher(st.assunto, vars) || 'Sem assunto';
  };
  const previa = debounce(previaAgora, 160);

  function rodape() {
    const n = listaPublico(st.publico).length;
    const principal = st.modo === 'agora' ? 'Enviar agora' : st.modo === 'agendar' ? 'Agendar envio' : camp?.recorrencia === 'mensal' && camp?.status === 'agendada' ? 'Salvar lembrete mensal' : 'Ativar envio mensal';
    render(q('[data-rodape]'), html`
      <div class="camada__rodape-info">${st.erro ? html`<span class="novo-ag__erro" role="alert">${st.erro}</span>`
        : html`Vai para <strong class="tnum">${n}</strong> ${n === 1 ? 'inscrito' : 'inscritos'} (${nomePublico(st.publico)})`}</div>
      <button type="button" class="btn a-btn a-btn--leve" data-salvar="rascunho" ${st.ocupado ? raw('disabled') : ''}>${st.ocupado === 'rascunho' ? html`<span class="giro"></span>Salvando` : 'Salvar rascunho'}</button>
      <button type="button" class="btn a-btn a-btn--preto" data-salvar="${st.modo}" ${st.ocupado ? raw('disabled') : ''}>
        ${st.ocupado && st.ocupado !== 'rascunho' ? html`<span class="giro"></span>${st.ocupado === 'agora' ? `Enviando para ${n}` : 'Salvando'}` : html`${st.modo === 'agora' ? icon('email', 16) : ''}${principal}`}</button>`);
  }

  function validar(enviar) {
    if (!st.nome.trim()) return 'Dê um nome à campanha.';
    if (!st.assunto.trim()) return 'Escreva o assunto do e-mail.';
    if (!st.titulo.trim()) return 'Escreva o título do e-mail.';
    if (!st.texto.trim()) return 'Escreva o texto do e-mail.';
    if (st.cta.trim() && !st.ctaUrl.trim()) return 'Coloque o link do botão.';
    if (enviar && !listaPublico(st.publico).length) return 'Ninguém neste público. Escolha outro.';
    if (st.modo === 'agendar' && enviar && !(new Date(st.quando) > new Date())) return 'Escolha um dia e hora no futuro.';
    return '';
  }

  async function gravar(status, extra = {}) {
    const dados = {
      nome: st.nome.trim(), assunto: st.assunto.trim(), titulo: st.titulo.trim(), texto: st.texto.trim(),
      cta: st.cta.trim(), ctaUrl: st.ctaUrl.trim(), publico: st.publico,
      imagemDados: st.imagemDados || null,
      imagem: st.imagemDados ? '' : st.imagem,
      recorrencia: st.modo === 'mensal' ? 'mensal' : 'nenhuma',
      diaMes: st.modo === 'mensal' ? Number(st.diaMes) : null,
      horaMes: st.modo === 'mensal' ? st.horaMes : null,
      status, ...extra,
    };
    let reg;
    if (st.id) reg = await db.update('campanhas', st.id, dados);
    else {
      reg = await db.insert('campanhas', { ...dados, envios: 0, historico: [] });
      st.id = reg.id;
    }
    if (st.imagemDados && reg.imagem !== refImagemCampanha(reg.id)) reg = await db.update('campanhas', reg.id, { imagem: refImagemCampanha(reg.id) });
    return reg;
  }

  async function acao(tipo) {
    st.erro = validar(tipo !== 'rascunho');
    if (st.erro) return rodape();
    const n = listaPublico(st.publico).length;
    if (tipo === 'agora') {
      const ok = await confirmar({
        titulo: `Enviar para ${n} ${n === 1 ? 'inscrito' : 'inscritos'}?`,
        texto: `A campanha "${st.nome.trim()}" sai agora para o público ${nomePublico(st.publico)}. Não dá para desfazer.`,
        ok: 'Enviar agora',
        cancelar: 'Voltar',
      });
      if (!ok) return;
    }
    st.ocupado = tipo;
    rodape();
    try {
      if (tipo === 'rascunho') {
        await gravar('rascunho', { agendadaPara: null });
        toast(`Rascunho "${st.nome.trim()}" salvo.`);
      } else if (tipo === 'agendar') {
        const d = new Date(st.quando);
        await gravar('agendada', { agendadaPara: d.toISOString() });
        toast(`Campanha agendada para ${quandoLongo(d)}.`);
      } else if (tipo === 'mensal') {
        const d = proximaMensal(st.diaMes, st.horaMes);
        await gravar('agendada', { agendadaPara: d.toISOString() });
        toast(`Envio mensal ativo. O próximo sai em ${quandoLongo(d)}.`);
      } else {
        const reg = await gravar(camp?.status === 'enviada' ? 'enviada' : 'rascunho', { agendadaPara: null });
        await esperar(700);
        const antes = reg.envios || 0;
        const fim = await enviarCampanha(reg.id);
        toast(`Campanha enviada para ${(fim.envios || 0) - antes} inscritos.`, { acao: 'Ver e-mails', aoAgir: () => (location.hash = '#/emails') });
      }
      c.podeFechar = true;
      c.fechar();
    } catch (e) {
      st.ocupado = '';
      st.erro = /espaço|quota/i.test(e.message || '') ? 'O armazenamento do navegador está cheio. Use uma imagem menor.' : e.message;
      rodape();
    }
  }

  async function receberImagem(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast('Escolha um arquivo de imagem (JPG, PNG ou WEBP).', { tipo: 'erro' });
      return;
    }
    st.lendoImagem = true;
    render(q('[data-imagem]'), blocoImagem());
    try {
      const r = await comprimirImagem(file, { max: 1200, qualidade: 0.78 });
      st.imagemDados = r.dataUrl;
      st.imagem = '';
      st.imagemInfo = r;
    } catch (e) {
      toast(e.message, { tipo: 'erro' });
    }
    st.lendoImagem = false;
    render(q('[data-imagem]'), blocoImagem());
    previa();
  }

  // Eventos
  c.painel.addEventListener('input', (ev) => {
    const k = ev.target.dataset.c;
    if (!k) return;
    st[k] = ev.target.value;
    if (st.erro) st.erro = '';
    if (k === 'ctaUrl') c.painel.querySelectorAll('[data-link]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.link === st.ctaUrl)));
    if (k === 'diaMes' || k === 'horaMes') render(q('[data-envio-detalhe]'), detalheEnvio());
    previa();
    rodape();
  });
  c.painel.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.name === 'camp-publico') {
      st.publico = t.value;
      rodape();
    } else if (t.name === 'camp-modo') {
      st.modo = t.value;
      c.painel.querySelectorAll('.envio').forEach((l) => l.classList.toggle('is-ativo', l.querySelector('input').checked));
      render(q('[data-envio-detalhe]'), detalheEnvio());
      st.erro = '';
      rodape();
    } else if (t.dataset.c === 'diaMes' || t.dataset.c === 'horaMes') {
      st[t.dataset.c] = t.value;
      render(q('[data-envio-detalhe]'), detalheEnvio());
    } else if (t.matches('[data-img-input]')) {
      receberImagem(t.files[0]);
      t.value = '';
    }
  });
  c.painel.addEventListener('mousedown', (ev) => {
    if (ev.target.closest('.var-chip')) ev.preventDefault();
  });
  let ultimo = 'texto';
  c.painel.addEventListener('focusin', (ev) => {
    const k = ev.target.dataset?.c;
    if (k === 'assunto' || k === 'titulo' || k === 'texto') ultimo = k;
  });
  c.painel.addEventListener('click', (ev) => {
    const chip = ev.target.closest('[data-var]');
    const img = ev.target.closest('[data-img]');
    const link = ev.target.closest('[data-link]');
    const larg = ev.target.closest('[data-largura]');
    const salvar = ev.target.closest('[data-salvar]');
    if (chip) {
      const alvo = q(`[data-c="${ultimo}"]`);
      alvo.setRangeText(`{{${chip.dataset.var}}}`, alvo.selectionStart ?? alvo.value.length, alvo.selectionEnd ?? alvo.value.length, 'end');
      alvo.focus();
      alvo.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (ev.target.closest('[data-img-zona]') || img?.dataset.img === 'trocar') {
      q('[data-img-input]').click();
    } else if (img?.dataset.img === 'remover') {
      st.imagem = '';
      st.imagemDados = '';
      st.imagemInfo = null;
      render(q('[data-imagem]'), blocoImagem());
      previa();
    } else if (link) {
      st.ctaUrl = link.dataset.link;
      q('[data-c="ctaUrl"]').value = st.ctaUrl;
      c.painel.querySelectorAll('[data-link]').forEach((b) => b.setAttribute('aria-pressed', String(b === link)));
      previa();
    } else if (larg) {
      st.largura = larg.dataset.largura;
      c.painel.querySelectorAll('[data-largura]').forEach((b) => b.setAttribute('aria-pressed', String(b === larg)));
      q('[data-quadro]').classList.toggle('is-celular', st.largura === 'celular');
    } else if (salvar) {
      acao(salvar.dataset.salvar);
    }
  });
  c.painel.addEventListener('keydown', (ev) => {
    if (ev.target.matches('[data-img-zona]') && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      q('[data-img-input]').click();
    }
  });
  c.painel.addEventListener('dragover', (ev) => {
    if (ev.dataTransfer?.types?.includes('Files')) ev.preventDefault();
  });
  c.painel.addEventListener('drop', (ev) => {
    if (!ev.dataTransfer?.files?.length) return;
    ev.preventDefault();
    receberImagem(ev.dataTransfer.files[0]);
  });

  c.atualizar = () => {
    if (!st.ocupado) rodape();
  };

  formulario();
  previaAgora();
  rodape();
  c.focar('[data-c="nome"]');
  return c;
}
