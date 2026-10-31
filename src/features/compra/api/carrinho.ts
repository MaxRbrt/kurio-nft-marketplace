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

export async function alterarQuantidade(itemId: string, quantidade: number) {
  const { data } = await clienteApi.patch(`/carrinho/itens/${itemId}`, { quantidade });

  return carrinhoSchema.parse(data);
}

export async function removerItem(itemId: string) {
  const { data } = await clienteApi.delete(`/carrinho/itens/${itemId}`);

  return carrinhoSchema.parse(data);
}
