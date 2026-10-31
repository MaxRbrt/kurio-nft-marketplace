import { z } from 'zod';

// ====================================================================
// 1. CUPOM NA URL
// Sobrevive a refresh e acompanha o carrinho até o pagamento. Valor fora
// do formato vira ausência de cupom, sem erro de rota.
// ====================================================================
export const buscaCompraSchema = z.object({
  cupom: z.string().trim().min(1).optional().catch(undefined),
});

export type BuscaCompra = z.infer<typeof buscaCompraSchema>;
