import {
  carteiraSchema,
  conexaoCarteiraSchema,
  type EntradaCarteira,
} from '@/contracts/conta/carteiras';
import { perfilSchema } from '@/contracts/conta/perfil';
import { clienteApi } from '@/lib/api/cliente';

export async function obterPerfil(signal?: AbortSignal) {
  const { data } = await clienteApi.get('/perfil', { signal });

  return perfilSchema.parse(data);
}

export async function listarCarteiras(signal?: AbortSignal) {
  const { data } = await clienteApi.get('/carteiras', { signal });

  return carteiraSchema.array().parse(data);
}

export async function criarCarteira(entrada: EntradaCarteira) {
  const { data } = await clienteApi.post('/carteiras', entrada);

  return carteiraSchema.parse(data);
}

export async function conectarCarteira(carteiraId: string) {
  const { data } = await clienteApi.post(`/carteiras/${carteiraId}/conexao`);

  return conexaoCarteiraSchema.parse(data);
}

export async function desconectarCarteira(carteiraId: string) {
  const { data } = await clienteApi.delete(`/carteiras/${carteiraId}/conexao`);

  return conexaoCarteiraSchema.parse(data);
}
