import { z } from 'zod';
import { dataIsoSchema, valorEthSchema, versaoSchema } from '../comum/valores';
import { edicaoSchema } from '../catalogo/nfts';

// ====================================================================
// 1. ENVELOPE DOS EVENTOS
// Identidade estável barra duplicata e versão barra evento antigo. Os
// nomes nft.updated e order.updated são os exigidos pelo enunciado.
// ====================================================================
const envelopeSchema = z.object({
  idEvento: z.string(),
  recurso: z.object({ tipo: z.enum(['nft', 'pedido']), id: z.string() }),
  versao: versaoSchema,
  ocorridoEm: dataIsoSchema,
});

export const eventoNftAtualizadoSchema = envelopeSchema.extend({
  tipo: z.literal('nft.updated'),
  dados: z.object({
    preco: valorEthSchema,
    disponivel: z.number().int().nonnegative(),
    edicoes: z.array(edicaoSchema),
  }),
});
export type EventoNftAtualizado = z.infer<typeof eventoNftAtualizadoSchema>;

// ====================================================================
// 2. EVENTO DE PEDIDO
// Carrega o dono para o cliente conferir contra a sessão atual: evento
// de outra sessão nunca atualiza dados de outro usuário.
// ====================================================================
export const eventoPedidoAtualizadoSchema = envelopeSchema.extend({
  tipo: z.literal('order.updated'),
  dados: z.object({
    usuarioId: z.string(),
    estado: z.enum(['pendente', 'confirmado', 'recusado']),
  }),
});
export type EventoPedidoAtualizado = z.infer<typeof eventoPedidoAtualizadoSchema>;
