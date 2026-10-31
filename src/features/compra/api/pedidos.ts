import {
  CABECALHO_IDEMPOTENCIA,
  pedidoSchema,
  type EntradaPedido,
} from '@/contracts/compra/pedidos';
import { clienteApi } from '@/lib/api/cliente';

export async function criarPedido(entrada: EntradaPedido, chave: string) {
  const { data } = await clienteApi.post('/pedidos', entrada, {
    headers: { [CABECALHO_IDEMPOTENCIA]: chave },
  });

  return pedidoSchema.parse(data);
}

export async function obterPedido(pedidoId: string, signal?: AbortSignal) {
  const { data } = await clienteApi.get(`/pedidos/${pedidoId}`, { signal });

  return pedidoSchema.parse(data);
}
