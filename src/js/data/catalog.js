// Dados reais da DC Barbershop (fonte: AppBarber, set/2026).
// Preços em euro. "aPartir" indica preço mínimo; "consultar" indica preço sob consulta.

export const negocio = {
  nome: 'DC Barbershop',
  lema: 'Mais do que um corte, uma experiência',
  endereco: 'Rua de Faria Guimarães, 214',
  cidade: '4000-202 Porto',
  referencia: 'Em frente ao hotel',
  telefone: '+351 933 583 777',
  telefoneLink: 'tel:+351933583777',
  whatsapp: 'https://wa.me/351933583777',
  instagram: 'https://www.instagram.com/dcbarbershop.porto/',
  instagramUser: '@dcbarbershop.porto',
  email: 'dcbarbershop.porto@gmail.com',
  abertura: '2025-12-04',
  mapa: 'https://www.google.com/maps/search/?api=1&query=Rua+de+Faria+Guimar%C3%A3es+214+Porto',
  coords: { lat: 41.1591835, lng: -8.6081543 },
  pagamento: ['Dinheiro', 'MB Way', 'Multibanco'],
  avaliacao: { nota: 5.0, total: 6, fonte: 'AppBarber' },
};

// 0 = domingo. Cada dia tem uma lista de turnos [inicio, fim] em "HH:MM".
export const horarios = {
  0: [],
  1: [['09:00', '13:00'], ['14:00', '19:00']],
  2: [['09:00', '13:00'], ['14:00', '19:00']],
  3: [['09:00', '13:00'], ['14:00', '18:30']],
  4: [['09:00', '13:00'], ['14:00', '19:00']],
  5: [['09:00', '13:00'], ['14:00', '19:00']],
  6: [['09:00', '13:00'], ['14:00', '19:00']],
};

export const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const equipe = [
  {
    id: 'david',
    nome: 'David',
    nomeCompleto: 'David Azevedo',
    funcao: 'Barbeiro',
    resumo: 'Degradê, barba na navalha, luzes e platinado.',
    foto: '/media/equipe/david.webp',
    grupo: 'barbearia',
  },
  {
    id: 'emmanuel',
    nome: 'Emmanuel',
    nomeCompleto: 'Emmanuel Teles',
    funcao: 'Barbeiro',
    resumo: 'Cortes com textura, cabelo cacheado e crespo, desenho e acabamento fino.',
    foto: '/media/equipe/emmanuel.webp',
    grupo: 'barbearia',
  },
  {
    id: 'clayre',
    nome: 'Clayre',
    nomeCompleto: 'Clayre de Freitas',
    funcao: 'Sobrancelhas e beleza',
    resumo: 'Design de sobrancelhas, brow lamination, spa dos lábios, maquiagem e penteado.',
    foto: '/media/equipe/clayre.webp',
    grupo: 'estudio',
  },
];

export const categorias = [
  { id: 'cortes', nome: 'Cortes' },
  { id: 'barba', nome: 'Barba' },
  { id: 'combos', nome: 'Combos' },
  { id: 'quimica', nome: 'Química e cor' },
  { id: 'cuidados', nome: 'Rosto e cuidados' },
  { id: 'estudio', nome: 'Sobrancelhas e beleza' },
];

const B = ['david', 'emmanuel'];
const C = ['clayre'];

export const servicos = [
  // Cortes
  { id: 'corte', cat: 'cortes', nome: 'Corte', preco: 15, duracao: 30, prof: B, destaque: true,
    desc: 'Degradê, social, tesoura ou máquina, com finalização no produto certo para o seu cabelo.' },
  { id: 'corte-simples', cat: 'cortes', nome: 'Corte simples (pente único)', preco: 13, duracao: 30, prof: B,
    desc: 'Máquina em um só pente, do topo à nuca. Rápido e uniforme.' },
  { id: 'corte-infantil', cat: 'cortes', nome: 'Corte infantil', preco: 15, duracao: 30, prof: B,
    desc: 'Para os pequenos, com calma e paciência. O acompanhante fica ao lado da cadeira.' },
  { id: 'lavagem', cat: 'cortes', nome: 'Lavagem', preco: 2, duracao: 30, prof: B,
    desc: 'Lavagem com shampoo e massagem no couro cabeludo.' },

  // Barba
  { id: 'barba', cat: 'barba', nome: 'Barba', preco: 8, duracao: 30, prof: B,
    desc: 'Aparo, desenho e contorno na navalha.' },
  { id: 'alinhamento', cat: 'barba', nome: 'Alinhamento', preco: 6, duracao: 30, prof: B,
    desc: 'Pezinho e contornos refeitos na navalha para manter o corte limpo entre uma visita e outra.' },
  { id: 'barba-alinhamento', cat: 'barba', nome: 'Barba + alinhamento', preco: 10, duracao: 30, prof: B,
    desc: 'Barba feita e contornos do cabelo alinhados na mesma cadeira.' },
  { id: 'barboterapia', cat: 'barba', nome: 'Barboterapia', preco: 15, duracao: 30, prof: B, destaque: true,
    desc: 'Toalha quente, óleo pré-barba, navalha e bálsamo. A barba sai macia e a pele sem irritação.' },

  // Combos
  { id: 'corte-barba', cat: 'combos', nome: 'Corte + barba', preco: 20, duracao: 60, prof: B, destaque: true,
    desc: 'O pedido mais comum da casa. Cabelo e barba feitos pelo mesmo barbeiro.' },
  { id: 'corte-simples-barba', cat: 'combos', nome: 'Corte simples + barba', preco: 16, duracao: 30, prof: B,
    desc: 'Pente único e barba, para quem quer resolver tudo em meia hora.' },
  { id: 'corte-barbo-sobrancelha', cat: 'combos', nome: 'Corte + barboterapia + sobrancelha', preco: 26, duracao: 60, prof: B,
    desc: 'Corte, barba com toalha quente e sobrancelha limpa na navalha.' },
  { id: 'combo-completo', cat: 'combos', nome: 'Combo completo', preco: 40, duracao: 120, prof: B, destaque: true,
    desc: 'Corte, barboterapia, sobrancelha, esfoliação facial e máscara black. Duas horas na cadeira.' },

  // Química e cor
  { id: 'pigmentacao', cat: 'quimica', nome: 'Pigmentação capilar', preco: 12, aPartir: true, duracao: 30, prof: B,
    desc: 'Pigmento para disfarçar falhas no cabelo ou na barba e deixar o degradê mais cheio.' },
  { id: 'luzes', cat: 'quimica', nome: 'Luzes e madeixas', preco: 45, aPartir: true, duracao: 150, prof: B,
    desc: 'Mechas clareadas com descoloração controlada e matização no final.' },
  { id: 'platinado', cat: 'quimica', nome: 'Platinado nevou', preco: 60, duracao: 150, prof: B, destaque: true,
    desc: 'Descoloração total até o branco, com matizador. Pede duas horas e meia e cabelo sem química recente.' },
  { id: 'hidratacao', cat: 'quimica', nome: 'Hidratação capilar', preco: 10, aPartir: true, duracao: 30, prof: B,
    desc: 'Máscara de tratamento para cabelo ressecado ou depois da química.' },

  // Rosto e cuidados
  { id: 'esfoliacao-mascara', cat: 'cuidados', nome: 'Esfoliação facial + máscara black', preco: 15, duracao: 30, prof: B,
    desc: 'Limpeza com esfoliante e máscara preta que remove cravos do nariz e da testa.' },
  { id: 'sobrancelha', cat: 'cuidados', nome: 'Sobrancelha', preco: 1, duracao: 30, prof: B,
    desc: 'Limpeza dos fios soltos na navalha, sem mudar o desenho natural.' },
  { id: 'depilacao-cera', cat: 'cuidados', nome: 'Depilação com cera (nariz e orelha)', preco: 5, duracao: 30, prof: B,
    desc: 'Remoção rápida dos pelos do nariz e das orelhas com cera.' },

  // Sobrancelhas e beleza (Clayre)
  { id: 'design-sobrancelhas', cat: 'estudio', nome: 'Design de sobrancelhas', preco: 15, duracao: 30, prof: C,
    desc: 'Modelagem de acordo com o formato do rosto, removendo excessos e criando um desenho natural e simétrico.' },
  { id: 'design-henna', cat: 'estudio', nome: 'Design de sobrancelhas com henna', preco: 18, duracao: 60, prof: C,
    desc: 'Além do design, a henna preenche falhas e realça o formato por vários dias.' },
  { id: 'design-tintura', cat: 'estudio', nome: 'Design de sobrancelhas com tintura', preco: 18, duracao: 60, prof: C,
    desc: 'Design com coloração dos fios, intensificando a cor com resultado duradouro.' },
  { id: 'brow-lamination', cat: 'estudio', nome: 'Brow lamination', preco: null, consultar: true, duracao: 90, prof: C,
    desc: 'Fios mais disciplinados, com aspecto natural e um olhar mais marcante.' },
  { id: 'brow-lamination-tintura', cat: 'estudio', nome: 'Brow lamination com tintura', preco: null, consultar: true, duracao: 90, prof: C,
    desc: 'Alinhamento e modelagem dos fios com tintura profissional para um efeito definido e uniforme.' },
  { id: 'spa-sobrancelhas', cat: 'estudio', nome: 'Spa de sobrancelhas', preco: 25, duracao: 30, prof: C,
    desc: 'Hidratação dos fios e da pele da região para nutrir e fortalecer as sobrancelhas.' },
  { id: 'spa-labios', cat: 'estudio', nome: 'Spa dos lábios', preco: 25, duracao: 30, prof: C,
    desc: 'Esfoliação, hidratação e renovação dos lábios.' },
  { id: 'maquiagem', cat: 'estudio', nome: 'Maquiagem profissional', preco: 45, aPartir: true, duracao: 60, prof: C,
    desc: 'Maquiagem pensada para a ocasião e para o seu tom de pele.' },
  { id: 'penteado', cat: 'estudio', nome: 'Penteado', preco: null, consultar: true, duracao: 60, prof: C,
    desc: 'Ondas, liso, semipreso ou coque.' },
  { id: 'maquiagem-penteado', cat: 'estudio', nome: 'Maquiagem e penteado', preco: 80, duracao: 120, prof: C,
    desc: 'Maquiagem personalizada e penteado simples, pensados para o seu estilo e a ocasião.' },
  { id: 'diamond', cat: 'estudio', nome: 'Diamond: maquiagem e penteado', preco: 80, duracao: 120, prof: C,
    desc: 'O pacote completo de maquiagem e penteado para eventos.' },
];

export const produtos = [
  { nome: 'After shave', preco: 15 },
  { nome: 'Creme para cachos', preco: 18 },
  { nome: 'Cera efeito brilho', preco: 15 },
  { nome: 'Cera efeito matte', preco: 15 },
  { nome: 'Cera em pó', preco: 16 },
  { nome: 'Dureg', preco: 10 },
  { nome: 'Esponja nudred', preco: 8 },
  { nome: 'Gel', preco: 12 },
  { nome: 'Óleo para barba', preco: 16 },
];

export const avaliacoes = [
  { autor: 'Nuno Marinho', data: '2026-09-19', nota: 5, texto: 'Atendimento impecável.' },
  { autor: 'Marcos Aurélio', data: '2026-05-21', nota: 5, texto: 'Serviço excelente. Top demais!' },
  { autor: 'Bruno Silva', data: '2026-02-16', nota: 5, texto: 'Excelente profissional e espaço muito acolhedor. Recomendo a 100%.' },
];

export const servicoPorId = (id) => servicos.find((s) => s.id === id);
export const profissionalPorId = (id) => equipe.find((p) => p.id === id);
export const servicosDaCategoria = (cat) => servicos.filter((s) => s.cat === cat);
export const profissionaisPara = (ids) =>
  equipe.filter((p) => ids.every((id) => servicoPorId(id)?.prof.includes(p.id)));
