// Arquivos: compressão de imagem, leitura de PDF, downloads e CSV.

export const LIMITE_PDF = 1.5 * 1024 * 1024;
const TIPOS_IMAGEM = /^image\/(jpeg|png|webp|gif|bmp|avif)$/;

const lerComoDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    r.readAsDataURL(blob);
  });

async function carregarImagem(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch { /* tenta pelo <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// Reduz para no máximo `max` px no lado maior e grava em JPEG.
export async function comprimirImagem(file, { max = 1400, qualidade = 0.8 } = {}) {
  let img;
  try {
    img = await carregarImagem(file);
  } catch {
    throw new Error('Não conseguimos abrir esta imagem. Envie um JPG, PNG ou WEBP.');
  }
  const w = img.width || img.naturalWidth;
  const h = img.height || img.naturalHeight;
  const escala = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * escala));
  const ch = Math.max(1, Math.round(h * escala));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, cw, ch);
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, cw, ch);
  img.close?.();
  const dataUrl = canvas.toDataURL('image/jpeg', qualidade);
  return { dataUrl, largura: cw, altura: ch, bytes: Math.round((dataUrl.length - 23) * 0.75), tipo: 'image/jpeg' };
}

const trocarExtensao = (nome, ext) => (nome.replace(/\.[^.]+$/, '') || 'arquivo') + ext;

// Prepara um anexo de fatura: imagem comprimida ou PDF até 1,5 MB.
export async function prepararAnexo(file) {
  if (!file) throw new Error('Nenhum arquivo escolhido.');
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    if (file.size > LIMITE_PDF) {
      throw new Error(`Este PDF tem ${(file.size / 1048576).toFixed(1).replace('.', ',')} MB. O limite é 1,5 MB. Exporte com qualidade menor ou envie uma foto da fatura.`);
    }
    const dataUrl = await lerComoDataUrl(file);
    return { dataUrl, nome: file.name, tipo: 'application/pdf', bytes: file.size };
  }
  if (TIPOS_IMAGEM.test(file.type) || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name)) {
    const r = await comprimirImagem(file, { max: 1400, qualidade: 0.8 });
    return { dataUrl: r.dataUrl, nome: trocarExtensao(file.name, '.jpg'), tipo: 'image/jpeg', bytes: r.bytes, largura: r.largura, altura: r.altura };
  }
  throw new Error('Formato não aceito. Envie uma imagem (JPG, PNG, WEBP) ou um PDF.');
}

export function baixar(conteudo, nome, tipo = 'application/octet-stream') {
  const url = typeof conteudo === 'string' && conteudo.startsWith('data:') ? conteudo : URL.createObjectURL(conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  if (url.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// CSV com ";" e BOM para o Excel em português abrir com acentos certos.
export function csv(linhas, colunas) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cab = colunas.map((c) => esc(c.rotulo)).join(';');
  const corpo = linhas.map((l) => colunas.map((c) => esc(c.valor(l))).join(';')).join('\r\n');
  return '﻿' + cab + '\r\n' + corpo + '\r\n';
}

export const numeroCsv = (n) => (n == null ? '' : String(Math.round(n * 100) / 100).replace('.', ','));
