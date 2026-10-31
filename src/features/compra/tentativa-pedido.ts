import { z } from 'zod';
import { entradaPedidoSchema } from '@/contracts/compra/pedidos';

const tentativaSchema = z.object({
  chave: z.string(),
  entrada: entradaPedidoSchema,
  pedidoId: z.string().nullable(),
});
export type TentativaPedido = z.infer<typeof tentativaSchema>;

const chaveLocal = (usuarioId: string) => `kurio:tentativa-pedido:${usuarioId}`;

// ====================================================================
// 1. TENTATIVA DE COMPRA
// Gravada antes do envio e por usuário: refresh ou timeout no meio da
// requisição não perdem a chave, e repetir recupera o mesmo pedido. O
// corpo é guardado junto, pois uma nova cotação mudaria o conteúdo. Só
// sai em estado terminal ou quando o servidor recusa sem criar pedido.
// ====================================================================
export function lerTentativa(usuarioId: string): TentativaPedido | null {
  const salva = localStorage.getItem(chaveLocal(usuarioId));

  if (!salva) {
    return null;
  }

  try {
    return tentativaSchema.parse(JSON.parse(salva));
  } catch {
    localStorage.removeItem(chaveLocal(usuarioId));

    return null;
  }
}

export function salvarTentativa(usuarioId: string, tentativa: TentativaPedido) {
  localStorage.setItem(chaveLocal(usuarioId), JSON.stringify(tentativa));
}

export function apagarTentativa(usuarioId: string) {
  localStorage.removeItem(chaveLocal(usuarioId));
}
