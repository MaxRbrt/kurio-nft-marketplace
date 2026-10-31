import { perfilSchema, type EntradaPerfil, type EntradaSenha } from '@/contracts/conta/perfil';
import { clienteApi } from '@/lib/api/cliente';

export async function obterPerfil(signal?: AbortSignal) {
  const { data } = await clienteApi.get('/perfil', { signal });

  return perfilSchema.parse(data);
}

export async function salvarPerfil(entrada: EntradaPerfil) {
  const { data } = await clienteApi.patch('/perfil', entrada);

  return perfilSchema.parse(data);
}

export async function salvarAvatar(avatarUrl: string | null) {
  const { data } = await clienteApi.put('/perfil/avatar', { avatarUrl });

  return perfilSchema.parse(data);
}

export async function alterarSenha(entrada: EntradaSenha) {
  await clienteApi.put('/perfil/senha', entrada);
}
