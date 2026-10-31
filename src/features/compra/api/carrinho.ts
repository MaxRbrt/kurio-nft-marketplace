import { carrinhoSchema, type EntradaItemCarrinho } from '@/contracts/compra/carrinho';
import { clienteApi } from '@/lib/api/cliente';

export async function obterCarrinho(signal?: AbortSignal) {
  const { data } = await clienteApi.get('/carrinho', { signal });

  return carrinhoSchema.parse(data);
}

export async function adicionarItem(entrada: EntradaItemCarrinho) {
  const { data } = await clienteApi.post('/carrinho/itens', entrada);

  return carrinhoSchema.parse(data);
}
