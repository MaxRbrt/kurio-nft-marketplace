import { listaNftsSchema, type ParametrosNfts } from '@/contracts/catalogo/nfts';
import { clienteApi } from '@/lib/api/cliente';

// ====================================================================
// 1. LISTAGEM DE NFTS
// O signal cancela a requisição obsoleta, e a resposta é validada pelo
// contrato antes de chegar à interface.
// ====================================================================
export async function listarNfts(parametros: ParametrosNfts, signal?: AbortSignal) {
  const { data } = await clienteApi.get('/nfts', { params: parametros, signal });

  return listaNftsSchema.parse(data);
}
