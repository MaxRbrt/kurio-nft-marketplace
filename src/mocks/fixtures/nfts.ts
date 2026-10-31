import Big from 'big.js';
import type { Rede } from '@/contracts/comum/valores';
import type { Categoria, Edicao, NftDetalhe } from '@/contracts/catalogo/nfts';

// ====================================================================
// 1. NFT DO BANCO
// O campo emAlta é interno e alimenta a aba "Em alta". A resposta da
// API passa pelo schema do contrato, que o remove antes de sair.
// ====================================================================
export type NftBanco = NftDetalhe & { emAlta: boolean };

const CATEGORIAS: Categoria[] = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
];
const REDES: Rede[] = ['ethereum', 'polygon', 'solana'];

// ====================================================================
// 2. NFTS DO FIGMA
// Nomes e preços dos frames vêm primeiro. Violet Nomad usa o token
// #0314: um NFT só tem um token, e os frames divergem nesse dado.
// ====================================================================
const NFTS_DO_LAYOUT: Array<[nome: string, tokenId: string, preco: string]> = [
  ['Emerald Ape #042', '#0042', '1.19'],
  ['Sage Nomad #009', '#0009', '1.69'],
  ['Neon Vessel #552', '#0552', '1.99'],
  ['Golden Frequency #071', '#0071', '0.59'],
  ['Cosmic Bloom #118', '#0118', '1.29'],
  ['Violet Nomad #314', '#0314', '1.39'],
  ['Ivory Baron #088', '#0088', '1.79'],
  ['Golden Beat #207', '#0207', '0.99'],
  ['Golden Signal #160', '#0160', '0.39'],
];

// ====================================================================
// 3. VARIEDADE PARA FILTROS E PAGINAÇÃO
// 48 NFTs dão as 4 páginas do layout com 12 por página. A geração é
// determinística: mesmo resultado em toda execução, com a faixa de
// preço do layout (0.02 a 12.30) coberta nas pontas.
// ====================================================================
const TOTAL_NFTS = 48;
const PRIMEIROS_NOMES = ['Amber', 'Onyx', 'Crimson', 'Azure', 'Jade', 'Silver', 'Copper', 'Indigo'];
const SEGUNDOS_NOMES = ['Echo', 'Relic', 'Mirage', 'Totem', 'Pulse', 'Atlas'];

function precoGerado(indice: number) {
  if (indice === TOTAL_NFTS - 1) {
    return '12.30';
  }

  if (indice === TOTAL_NFTS - 2) {
    return '0.02';
  }

  return new Big(indice).times('0.23').plus('0.11').toFixed(2);
}

function dataDeLancamento(indice: number) {
  return new Date(Date.UTC(2026, 9, 30 - indice, 12)).toISOString();
}

function criarEdicoes(id: string, preco: string, esgotadoTotal: boolean): Edicao[] {
  const estoques: Array<[Edicao['rotulo'], number]> = [
    ['1/1', 1],
    ['1/10', 10],
    ['1/50', 50],
    ['ABERTA', 500],
  ];

  return estoques.map(([rotulo, disponivel]) => ({
    id: `${id}-${rotulo.replace('/', '-').toLowerCase()}`,
    rotulo,
    preco,
    disponivel: esgotadoTotal ? 0 : disponivel,
  }));
}

function criarNft(indice: number): NftBanco {
  const doLayout = NFTS_DO_LAYOUT[indice];
  const primeiro = PRIMEIROS_NOMES[indice % PRIMEIROS_NOMES.length];
  const segundo = SEGUNDOS_NOMES[indice % SEGUNDOS_NOMES.length];
  const numero = String(100 + indice * 7);
  const nome = doLayout?.[0] ?? `${primeiro} ${segundo} #${numero}`;
  const tokenId = doLayout?.[1] ?? `#${numero.padStart(4, '0')}`;
  const preco = doLayout?.[2] ?? precoGerado(indice);
  const id = `nft-${String(indice + 1).padStart(2, '0')}`;
  const esgotado = indice === TOTAL_NFTS - 3;
  const edicoes = criarEdicoes(id, preco, esgotado);
  const imagem = { url: `/nfts/${id}.webp`, alt: nome };

  return {
    id,
    nome,
    tokenId,
    preco,
    imagem,
    imagens: [imagem],
    edicoes,
    disponivel: edicoes.reduce((total, edicao) => total + edicao.disponivel, 0),
    raro: indice % 5 === 0,
    categoria: CATEGORIAS[indice % CATEGORIAS.length],
    rede: REDES[(indice + Math.floor(indice / CATEGORIAS.length)) % REDES.length],
    nomeColecao: 'Kurio Apes',
    descricao: `Um colecionável digital finalizado à mão da coleção Kurio Editions.`,
    atributos: ['Óculos', 'Esmeralda', 'Raro'],
    avaliacoes: { total: 19, nota: 4.8 },
    contrato: '0x7A42...19E8',
    direitosAutorais: '5% nas vendas secundárias',
    lancadoEm: dataDeLancamento(indice),
    emAlta: indice % 4 === 0,
    versao: 1,
  };
}

export function criarNftsIniciais(): NftBanco[] {
  return Array.from({ length: TOTAL_NFTS }, (_, indice) => criarNft(indice));
}
