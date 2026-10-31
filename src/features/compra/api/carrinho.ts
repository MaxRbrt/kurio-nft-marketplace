import { carrinhoSchema } from '@/contracts/compra/carrinho';
import { clienteApi } from '@/lib/api/cliente';

export async function obterCarrinho(signal?: AbortSignal) {
  const { data } = await clienteApi.get('/carrinho', { signal });

  return carrinhoSchema.parse(data);
}
