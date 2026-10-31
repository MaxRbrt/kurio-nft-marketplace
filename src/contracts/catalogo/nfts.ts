import { z } from 'zod';
import {
  dataIsoSchema,
  paginacaoSchema,
  redeSchema,
  valorEthSchema,
  versaoSchema,
} from '../comum/valores';

// ====================================================================
// 1. VALORES DO LAYOUT
// Coleções, abas e edições são as do Figma. O frame só desenha
// "Listados recentemente"; as demais ordens atendem ao enunciado.
// ====================================================================
export const categoriaSchema = z.enum([
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
]);
export type Categoria = z.infer<typeof categoriaSchema>;

export const abaSchema = z.enum(['todos', 'novos', 'em-alta']);
export const ordemSchema = z.enum(['recentes', 'menor-preco', 'maior-preco', 'nome']);

// ====================================================================
// 2. NFT
// Cada edição tem preço e disponibilidade próprios. A listagem usa o
// resumo; o detalhe acrescenta galeria, edições e dados da coleção.
// ====================================================================
export const edicaoSchema = z.object({
  id: z.string(),
  rotulo: z.enum(['1/1', '1/10', '1/50', 'ABERTA']),
  preco: valorEthSchema,
  disponivel: z.number().int().nonnegative(),
});
export type Edicao = z.infer<typeof edicaoSchema>;

export const imagemSchema = z.object({ url: z.string(), alt: z.string() });

export const nftResumoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  imagem: imagemSchema,
  preco: valorEthSchema,
  precoAnterior: valorEthSchema.nullable(),
  disponivel: z.number().int().nonnegative(),
  raro: z.boolean(),
  categoria: categoriaSchema,
  rede: redeSchema,
  versao: versaoSchema,
});
export type NftResumo = z.infer<typeof nftResumoSchema>;

export const nftDetalheSchema = nftResumoSchema.extend({
  tokenId: z.string(),
  nomeColecao: z.string(),
  descricao: z.string(),
  atributos: z.array(z.string()),
  imagens: z.array(imagemSchema).min(1),
  edicoes: z.array(edicaoSchema).min(1),
  avaliacoes: z.object({ total: z.number().int().nonnegative(), nota: z.number() }),
  contrato: z.string(),
  direitosAutorais: z.string(),
  lancadoEm: dataIsoSchema,
});
export type NftDetalhe = z.infer<typeof nftDetalheSchema>;

// ====================================================================
// 3. LISTAGEM
// Os mesmos parâmetros servem à URL e à API. Filtros combinam entre
// si, e as facetas alimentam as contagens ao lado de cada filtro.
// ====================================================================
export const parametrosNftsSchema = z.object({
  busca: z.string().optional(),
  categorias: z.array(categoriaSchema).optional(),
  redes: z.array(redeSchema).optional(),
  precoMinimo: valorEthSchema.optional(),
  precoMaximo: valorEthSchema.optional(),
  aba: abaSchema.optional(),
  ordem: ordemSchema.optional(),
  pagina: z.number().int().positive().optional(),
  tamanhoPagina: z.number().int().positive().optional(),
});
export type ParametrosNfts = z.infer<typeof parametrosNftsSchema>;

export const listaNftsSchema = z.object({
  itens: z.array(nftResumoSchema),
  paginacao: paginacaoSchema,
  facetas: z.object({
    categorias: z.record(categoriaSchema, z.number().int().nonnegative()),
    redes: z.record(redeSchema, z.number().int().nonnegative()),
  }),
});
export type ListaNfts = z.infer<typeof listaNftsSchema>;
