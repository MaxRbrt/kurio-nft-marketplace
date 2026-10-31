import { favoritosSchema } from '@/contracts/catalogo/favoritos';
import { clienteApi } from '@/lib/api/cliente';

export async function listarFavoritos(signal?: AbortSignal) {
  const { data } = await clienteApi.get('/favoritos', { signal });

  return favoritosSchema.parse(data);
}

export async function salvarFavorito(nftId: string, favoritar: boolean) {
  const { data } = favoritar
    ? await clienteApi.put(`/favoritos/${nftId}`)
    : await clienteApi.delete(`/favoritos/${nftId}`);

  return favoritosSchema.parse(data);
}
