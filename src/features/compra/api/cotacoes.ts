import { cotacaoSchema, type EntradaCotacao } from '@/contracts/compra/cotacao';
import { clienteApi } from '@/lib/api/cliente';

export async function cotar(entrada: EntradaCotacao, signal?: AbortSignal) {
  const { data } = await clienteApi.post('/cotacoes', entrada, { signal });

  return cotacaoSchema.parse(data);
}
