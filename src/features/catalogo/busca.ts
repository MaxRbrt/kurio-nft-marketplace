import { z } from 'zod';
import { abaSchema, categoriaSchema, ordemSchema } from '@/contracts/catalogo/nfts';
import { redeSchema, valorEthSchema } from '@/contracts/comum/valores';

// ====================================================================
// 1. ESTADO DO CATÁLOGO NA URL
// Busca, filtros, ordem e página ficam na URL e sobrevivem a refresh e
// histórico. Valor inválido digitado na URL vira padrão, sem erro.
// ====================================================================
export const buscaCatalogoSchema = z.object({
  busca: z.string().optional().catch(undefined),
  categorias: z.array(categoriaSchema).optional().catch(undefined),
  redes: z.array(redeSchema).optional().catch(undefined),
  precoMinimo: valorEthSchema.optional().catch(undefined),
  precoMaximo: valorEthSchema.optional().catch(undefined),
  aba: abaSchema.optional().catch(undefined),
  ordem: ordemSchema.optional().catch(undefined),
  pagina: z.number().int().positive().optional().catch(undefined),
});
export type BuscaCatalogo = z.infer<typeof buscaCatalogoSchema>;

// ====================================================================
// 2. TEXTOS DO LAYOUT
// Rótulos exatos do frame. O frame só desenha "Listados recentemente";
// as outras ordens seguem o mesmo padrão porque o enunciado as exige.
// ====================================================================
export const ROTULOS_CATEGORIA = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
} as const;

export const ROTULOS_REDE = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const;

export const ROTULOS_ABA = {
  todos: 'Todos os NFTs',
  novos: 'Novos lançamentos',
  'em-alta': 'Em alta',
} as const;

export const ROTULOS_ORDEM = {
  recentes: 'Listados recentemente',
  'menor-preco': 'Menor preço',
  'maior-preco': 'Maior preço',
  nome: 'Nome',
} as const;

export const PRECO_MINIMO_LAYOUT = '0.02';
export const PRECO_MAXIMO_LAYOUT = '12.30';
