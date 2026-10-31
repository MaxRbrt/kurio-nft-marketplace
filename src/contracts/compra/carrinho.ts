import { z } from 'zod';
import { quantidadeSchema, valorEthSchema, versaoSchema } from '../comum/valores';

// ====================================================================
// 1. CARRINHO
// Vive na API, inclusive para visitante. Subtotais vêm prontos: a
// interface mostra os valores da resposta e não recalcula nada.
// ====================================================================
export const CABECALHO_VISITANTE = 'X-Visitante-Id';

export const itemCarrinhoSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  edicaoId: z.string(),
  nome: z.string(),
  tokenId: z.string(),
  imagemUrl: z.string(),
  rotuloEdicao: z.string(),
  precoUnitario: valorEthSchema,
  quantidade: quantidadeSchema,
  disponivel: z.number().int().nonnegative(),
  subtotal: valorEthSchema,
  versaoNft: versaoSchema,
});
export type ItemCarrinho = z.infer<typeof itemCarrinhoSchema>;

export const carrinhoSchema = z.object({
  id: z.string(),
  itens: z.array(itemCarrinhoSchema),
  subtotal: valorEthSchema,
});
export type Carrinho = z.infer<typeof carrinhoSchema>;

export const entradaItemCarrinhoSchema = z.object({
  nftId: z.string(),
  edicaoId: z.string(),
  quantidade: quantidadeSchema,
});
export type EntradaItemCarrinho = z.infer<typeof entradaItemCarrinhoSchema>;

export const entradaQuantidadeSchema = z.object({ quantidade: quantidadeSchema });
