import { z } from 'zod';
import { dataIsoSchema, redeSchema, valorEthSchema } from '../comum/valores';
import { itemCarrinhoSchema } from './carrinho';

// ====================================================================
// 1. COTAÇÃO
// É a referência para finalizar: o pedido cita o id da cotação, e o
// servidor recusa se preço, estoque, cupom ou taxa tiverem mudado.
// ====================================================================
export const entradaCotacaoSchema = z.object({
  cupom: z.string().trim().min(1).optional(),
  rede: redeSchema.optional(),
});
export type EntradaCotacao = z.infer<typeof entradaCotacaoSchema>;

export const cotacaoSchema = z.object({
  id: z.string(),
  itens: z.array(itemCarrinhoSchema),
  subtotal: valorEthSchema,
  desconto: valorEthSchema,
  taxaRede: valorEthSchema,
  total: valorEthSchema,
  cupom: z.string().nullable(),
  expiraEm: dataIsoSchema,
});
export type Cotacao = z.infer<typeof cotacaoSchema>;
