import Big from 'big.js';
import type { Categoria, Edicao, NftDetalhe } from '@/contracts/catalogo/nfts';
import type { Rede } from '@/contracts/comum/valores';

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
// Mesma ordem, preço e imagem da grade do frame. Violet Nomad usa o
// token #0314: um NFT só tem um token, e os frames divergem nesse dado.
// ====================================================================
type NftDoLayout = {
  nome: string;
  tokenId: string;
  preco: string;
  arte: number;
  precoAnterior?: string;
  raro?: boolean;
};

const NFTS_DO_LAYOUT: NftDoLayout[] = [
  { nome: 'Emerald Ape #042', tokenId: '#0042', preco: '1.19', arte: 1 },
  { nome: 'Sage Nomad #009', tokenId: '#0009', preco: '1.69', arte: 2 },
  {
    nome: 'Neon Vessel #552',
    tokenId: '#0552',
    preco: '1.99',
    arte: 3,
    precoAnterior: '2.29',
    raro: true,
  },
  { nome: 'Cosmic Bloom #118', tokenId: '#0118', preco: '1.29', arte: 2 },
  { nome: 'Violet Nomad #314', tokenId: '#0314', preco: '1.39', arte: 2 },
  { nome: 'Ivory Baron #088', tokenId: '#0088', preco: '1.79', arte: 3 },
  { nome: 'Golden Beat #207', tokenId: '#0207', preco: '0.99', arte: 4 },
  { nome: 'Golden Frequency #071', tokenId: '#0071', preco: '0.59', arte: 4 },
  { nome: 'Golden Signal #160', tokenId: '#0160', preco: '0.39', arte: 4 },
];

// ====================================================================
// 3. VARIEDADE PARA FILTROS E PAGINAÇÃO
// 36 NFTs dão as 4 páginas do layout com 9 por página. A geração é
// determinística, com a faixa de preço do layout (0.02 a 12.30) coberta
// nas pontas. Rede não acompanha a categoria, para os filtros combinarem.
// ====================================================================
const TOTAL_NFTS = 36;
const PRIMEIROS_NOMES = ['Amber', 'Onyx', 'Crimson', 'Azure', 'Jade', 'Silver', 'Copper', 'Indigo'];
const SEGUNDOS_NOMES = ['Echo', 'Relic', 'Mirage', 'Totem', 'Pulse', 'Atlas'];

function precoGerado(indice: number) {
  if (indice === TOTAL_NFTS - 1) {
    return '12.30';
  }

  if (indice === TOTAL_NFTS - 2) {
    return '0.02';
  }

  return new Big(indice).times('0.29').plus('0.11').toFixed(2);
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
  const doLayout = NFTS_DO_LAYOUT.at(indice);
  const primeiro = PRIMEIROS_NOMES[indice % PRIMEIROS_NOMES.length];
  const segundo = SEGUNDOS_NOMES[indice % SEGUNDOS_NOMES.length];
  const numero = String(100 + indice * 7);
  const nome = doLayout?.nome ?? `${primeiro} ${segundo} #${numero}`;
  const tokenId = doLayout?.tokenId ?? `#${numero.padStart(4, '0')}`;
  const preco = doLayout?.preco ?? precoGerado(indice);
  const arte = doLayout?.arte ?? (indice % 4) + 1;
  const id = `nft-${String(indice + 1).padStart(2, '0')}`;
  const esgotado = indice === TOTAL_NFTS - 3;
  const edicoes = criarEdicoes(id, preco, esgotado);
  const imagem = { url: `/nfts/arte-${arte}-640.webp`, alt: nome };

  return {
    id,
    nome,
    tokenId,
    preco,
    precoAnterior: doLayout?.precoAnterior ?? null,
    imagem,
    imagens: [imagem],
    edicoes,
    disponivel: edicoes.reduce((total, edicao) => total + edicao.disponivel, 0),
    raro: doLayout ? (doLayout.raro ?? false) : indice % 7 === 0,
    categoria: CATEGORIAS[indice % CATEGORIAS.length],
    rede: REDES[(indice + Math.floor(indice / CATEGORIAS.length)) % REDES.length],
    nomeColecao: 'Kurio Apes',
    descricao: 'Um colecionável digital finalizado à mão da coleção Kurio Editions.',
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
