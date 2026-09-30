// A casa: o hexágono com o monograma fica parado, o endereço entra ao lado,
// e tudo segue para a esquerda com o hexágono rolando. No fim, a seção de serviços
// chega pelo mesmo lado, como o próximo item da faixa.
// Computador: a câmera dos serviços (seção seguinte, sobreposta) entra junto com a faixa.
// Celular: o título dos serviços e o Corte estão dentro da própria faixa.
const $ = (s, el = document) => el.querySelector(s);
const vw = (v) => (window.innerWidth * v) / 100;

// Parte final da cena da casa em que os serviços entram (tem de bater com o CSS:
// .cena--servicos { margin-top: -200vh } = 100vh de câmera + 100vh de entrada)
export const ENTRADA_SERVICOS_VH = 100;

export function cenaCasa({ gsap, mobile }) {
  const cena = $('[data-cena="casa"]');
  const camera = $('[data-casa-camera]');
  const faixa = $('[data-casa-faixa]');
  const fundo = $('[data-casa-fundo]');
  const emblema = $('[data-emblema-b]');

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: cena,
      start: 'top top',
      end: 'bottom bottom',
      scrub: mobile ? 0.7 : 1.2,
      invalidateOnRefresh: true,
    },
  });
  tl.set({}, {}, 1);

  if (mobile) {
    const delta = () => -(faixa.scrollWidth - window.innerWidth);
    tl.fromTo(camera, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0)
      .fromTo(faixa, { x: () => vw(100) }, { x: 0, duration: 0.22, ease: 'power2.out' }, 0.04)
      .to(faixa, { x: () => delta(), duration: 0.66 }, 0.28)
      .fromTo(emblema, { x: 0, rotation: 0 }, { x: () => delta(), rotation: () => (delta() / vw(90)) * 90, duration: 0.66 }, 0.28)
      .fromTo(fundo, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.2);
    return;
  }

  const servicos = $('[data-cena="servicos"] .camera');
  const gigante = $('.casa__gigante');
  const folga = () => vw(8);
  // fração da cena em que os serviços entram
  const fim = () => {
    const len = cena.offsetHeight - window.innerHeight;
    return len > 0 ? 1 - (ENTRADA_SERVICOS_VH * window.innerHeight) / 100 / len : 0.65;
  };
  const F = fim();
  // posição da faixa quando o fim do endereço encosta na borda direita (menos a folga)
  const xEncosta = () => window.innerWidth - folga() - (gigante.offsetLeft + gigante.offsetWidth);
  const giro = (x) => (x / vw(55)) * 90;

  tl.fromTo(camera, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0)
    .fromTo(faixa, { x: () => vw(62) }, { x: 0, duration: 0.22, ease: 'power2.out' }, 0.04)
    .to(faixa, { x: () => xEncosta(), duration: F - 0.28 }, 0.28)
    .fromTo(emblema, { x: 0, rotation: 0 }, { x: () => xEncosta(), rotation: () => giro(xEncosta()), duration: F - 0.28 }, 0.28)
    // o endereço sai pela esquerda enquanto os serviços entram pela direita, na mesma velocidade
    .to(faixa, { x: () => xEncosta() - window.innerWidth, duration: 1 - F }, F)
    .to(emblema, { x: () => xEncosta() - window.innerWidth, rotation: () => giro(xEncosta() - window.innerWidth), duration: 1 - F }, F)
    .fromTo(servicos, { x: () => window.innerWidth + folga() }, { x: 0, duration: 1 - F }, F)
    .fromTo(fundo, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.2)
    .to(fundo, { opacity: 0, duration: 1 - F - 0.05 }, F);
}
