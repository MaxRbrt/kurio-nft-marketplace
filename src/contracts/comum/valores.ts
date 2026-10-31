import { z } from 'zod';

// ====================================================================
// 1. VALORES EM ETH
// Trafegam como string decimal, sem sinal e com até 18 casas. Número
// em ponto flutuante perde precisão, então é rejeitado no contrato.
// ====================================================================
export const valorEthSchema = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido');

// ====================================================================
// 2. TIPOS COMPARTILHADOS
// Quantidade é inteira e positiva. A versão cresce a cada mudança do
// recurso e decide qual dado é o mais recente entre REST e eventos.
// ====================================================================
export const quantidadeSchema = z.number().int().positive();
export const versaoSchema = z.number().int().nonnegative();
export const dataIsoSchema = z.iso.datetime();

export const redeSchema = z.enum(['ethereum', 'polygon', 'solana']);
export type Rede = z.infer<typeof redeSchema>;

// ====================================================================
// 3. PAGINAÇÃO
// Toda listagem devolve os itens junto com os totais para a interface
// montar a navegação sem calcular nada por conta própria.
// ====================================================================
export const paginacaoSchema = z.object({
  pagina: z.number().int().positive(),
  tamanhoPagina: z.number().int().positive(),
  totalItens: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
});
