import { nftDetalheSchema } from '@/contracts/catalogo/nfts';
import { clienteApi } from '@/lib/api/cliente';

export async function obterNft(id: string, signal?: AbortSignal) {
  const { data } = await clienteApi.get(`/nfts/${id}`, { signal });

  return nftDetalheSchema.parse(data);
}
