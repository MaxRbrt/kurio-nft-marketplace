import Big from 'big.js';
import { http, HttpResponse } from 'msw';
import {
  categoriaSchema,
  listaNftsSchema,
  nftDetalheSchema,
  nftResumoSchema,
  parametrosNftsSchema,
  type ParametrosNfts,
} from '@/contracts/catalogo/nfts';
import { redeSchema } from '@/contracts/comum/valores';
import { lerBanco } from '../../banco/estado';
import type { NftBanco } from '../../fixtures/nfts';
import { responderErro } from '../respostas';

const TAMANHO_PAGINA_PADRAO = 9;
const INICIO_NOVOS_LANCAMENTOS = '2026-10-01T00:00:00.000Z';

// ====================================================================
// 1. LEITURA DOS PARÂMETROS
// Lista repetida na URL vira array, e número vem como texto. Valor que
// não respeita o contrato cai no erro de validação do handler.
// ====================================================================
function lerParametros(url: URL) {
  const parametros = url.searchParams;
  const numero = (nome: string) => {
    const valor = parametros.get(nome);

    return valor === null ? undefined : Number(valor);
  };
  const lista = (nome: string) => {
    const valores = parametros.getAll(nome);

    return valores.length > 0 ? valores : undefined;
  };

  return parametrosNftsSchema.safeParse({
    busca: parametros.get('busca') ?? undefined,
    categorias: lista('categorias'),
    redes: lista('redes'),
    precoMinimo: parametros.get('precoMinimo') ?? undefined,
    precoMaximo: parametros.get('precoMaximo') ?? undefined,
    aba: parametros.get('aba') ?? undefined,
    ordem: parametros.get('ordem') ?? undefined,
    pagina: numero('pagina'),
    tamanhoPagina: numero('tamanhoPagina'),
  });
}

// ====================================================================
// 2. FILTROS
// Combinam entre si. As facetas ignoram categoria e rede: mostram as
// opções disponíveis dentro da busca, do preço e da aba atuais.
// ====================================================================
function passaNaBase(nft: NftBanco, parametros: ParametrosNfts) {
  const busca = parametros.busca?.trim().toLowerCase();
  const preco = new Big(nft.preco);

  if (busca && !nft.nome.toLowerCase().includes(busca)) {
    return false;
  }

  if (parametros.precoMinimo && preco.lt(parametros.precoMinimo)) {
    return false;
  }

  if (parametros.precoMaximo && preco.gt(parametros.precoMaximo)) {
    return false;
  }

  if (parametros.aba === 'novos') {
    return nft.lancadoEm >= INICIO_NOVOS_LANCAMENTOS;
  }

  if (parametros.aba === 'em-alta') {
    return nft.emAlta;
  }

  return true;
}

function passaNosFiltros(nft: NftBanco, parametros: ParametrosNfts) {
  const categoriaAceita = !parametros.categorias || parametros.categorias.includes(nft.categoria);
  const redeAceita = !parametros.redes || parametros.redes.includes(nft.rede);

  return categoriaAceita && redeAceita;
}

function contarFacetas(nfts: NftBanco[]) {
  const categorias = Object.fromEntries(categoriaSchema.options.map((opcao) => [opcao, 0]));
  const redes = Object.fromEntries(redeSchema.options.map((opcao) => [opcao, 0]));

  for (const nft of nfts) {
    categorias[nft.categoria] += 1;
    redes[nft.rede] += 1;
  }

  return { categorias, redes };
}

// ====================================================================
// 3. ORDENAÇÃO
// Preço compara como decimal, não como texto nem ponto flutuante.
// Empate cai no id, para a ordem ser sempre a mesma.
// ====================================================================
function ordenar(nfts: NftBanco[], ordem: ParametrosNfts['ordem']) {
  const comparar = (a: NftBanco, b: NftBanco) => {
    if (ordem === 'menor-preco') {
      return new Big(a.preco).cmp(b.preco);
    }

    if (ordem === 'maior-preco') {
      return new Big(b.preco).cmp(a.preco);
    }

    if (ordem === 'nome') {
      return a.nome.localeCompare(b.nome);
    }

    return b.lancadoEm.localeCompare(a.lancadoEm);
  };

  return [...nfts].sort((a, b) => comparar(a, b) || a.id.localeCompare(b.id));
}

// ====================================================================
// 4. HANDLERS
// Toda resposta passa pelo schema do contrato: campo interno não sai,
// e dado fora do formato falha aqui, antes de chegar à interface.
// ====================================================================
export const handlersNfts = [
  http.get('/api/nfts', ({ request }) => {
    const leitura = lerParametros(new URL(request.url));

    if (!leitura.success) {
      return responderErro(400, 'VALIDACAO', 'Parâmetros de listagem inválidos');
    }

    const parametros = leitura.data;
    const base = lerBanco().nfts.filter((nft) => passaNaBase(nft, parametros));
    const filtrados = ordenar(
      base.filter((nft) => passaNosFiltros(nft, parametros)),
      parametros.ordem,
    );
    const pagina = parametros.pagina ?? 1;
    const tamanhoPagina = parametros.tamanhoPagina ?? TAMANHO_PAGINA_PADRAO;
    const inicio = (pagina - 1) * tamanhoPagina;

    return HttpResponse.json(
      listaNftsSchema.parse({
        itens: filtrados
          .slice(inicio, inicio + tamanhoPagina)
          .map((nft) => nftResumoSchema.parse(nft)),
        paginacao: {
          pagina,
          tamanhoPagina,
          totalItens: filtrados.length,
          totalPaginas: Math.ceil(filtrados.length / tamanhoPagina),
        },
        facetas: contarFacetas(base),
      }),
    );
  }),

  http.get('/api/nfts/:id', ({ params }) => {
    const nft = lerBanco().nfts.find((candidato) => candidato.id === params.id);

    if (!nft) {
      return responderErro(404, 'NAO_ENCONTRADO', 'NFT não encontrado');
    }

    const relacionados = lerBanco().nfts.filter((candidato) =>
      nft.relacionadosIds.includes(candidato.id),
    );

    return HttpResponse.json(nftDetalheSchema.parse({ ...nft, relacionados }));
  }),
];
