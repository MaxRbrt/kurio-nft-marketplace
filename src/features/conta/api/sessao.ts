import { queryOptions } from '@tanstack/react-query';
import { CABECALHO_VISITANTE } from '@/contracts/compra/carrinho';
import {
  sessaoSchema,
  type EntradaCadastro,
  type EntradaLogin,
  type Sessao,
} from '@/contracts/conta/sessao';
import { clienteApi } from '@/lib/api/cliente';
import { ErroApi } from '@/lib/api/erros';
import { apagarToken, lerToken, lerVisitanteId } from '@/lib/api/identidade';

export async function entrar(entrada: EntradaLogin) {
  const { data } = await clienteApi.post('/auth/login', entrada);

  return sessaoSchema.parse(data);
}

export async function cadastrar(entrada: EntradaCadastro) {
  const { data } = await clienteApi.post('/auth/cadastro', entrada);

  return sessaoSchema.parse(data);
}

export async function encerrarSessao() {
  await clienteApi.post('/auth/logout');
}

export async function mesclarCarrinhoVisitante() {
  await clienteApi.post('/carrinho/mesclar', undefined, {
    headers: { [CABECALHO_VISITANTE]: lerVisitanteId() },
  });
}

// ====================================================================
// 1. RECUPERAÇÃO DA SESSÃO
// Sem token não há o que consultar. Token recusado é apagado e vira
// visitante, sem erro na tela: quem decide redirecionar é a rota.
// ====================================================================
async function lerSessao(signal?: AbortSignal): Promise<Sessao | null> {
  if (!lerToken()) {
    return null;
  }

  try {
    const { data } = await clienteApi.get('/auth/sessao', { signal });

    return sessaoSchema.parse(data);
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 401) {
      apagarToken();

      return null;
    }

    throw erro;
  }
}

export const CHAVE_SESSAO = ['sessao'];

export const consultaSessao = queryOptions({
  queryKey: CHAVE_SESSAO,
  queryFn: ({ signal }) => lerSessao(signal),
  staleTime: 5 * 60 * 1000,
});
