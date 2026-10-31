import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { Sessao } from '@/contracts/conta/sessao';
import { apagarToken, salvarToken } from '@/lib/api/identidade';
import { liberarAvisoDeSessao } from '@/lib/api/sessao-expirada';
import {
  CHAVE_SESSAO,
  consultaSessao,
  encerrarSessao,
  mesclarCarrinhoVisitante,
} from './api/sessao';

export function useSessao() {
  return useQuery(consultaSessao).data ?? null;
}

// ====================================================================
// 1. ABERTURA DE SESSÃO
// O token é salvo antes de mesclar, porque a mescla exige autenticação.
// Falha ao mesclar não impede a entrada: o carrinho do visitante continua
// guardado e o usuário já está dentro.
// ====================================================================
export function useAbrirSessao() {
  const clienteConsultas = useQueryClient();

  return async (sessao: Sessao) => {
    salvarToken(sessao.token);
    liberarAvisoDeSessao();
    clienteConsultas.setQueryData(CHAVE_SESSAO, sessao);
    await mesclarCarrinhoVisitante().catch(() => undefined);
    await clienteConsultas.invalidateQueries({ queryKey: ['carrinho'] });
  };
}

// ====================================================================
// 2. ENCERRAMENTO DE SESSÃO
// Consultas em andamento são canceladas antes de limpar o cache, para
// resposta atrasada do usuário anterior não entrar no cache novo. A sessão
// vira null em vez de sumir: clear() não avisaria os componentes na tela.
// A conexão de socket é encerrada quando a sessão deixa de existir.
// ====================================================================
export function useSair() {
  const clienteConsultas = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => encerrarSessao().catch(() => undefined),
    onSuccess: async () => {
      await clienteConsultas.cancelQueries();
      apagarToken();
      clienteConsultas.removeQueries({
        predicate: (consulta) => consulta.queryKey[0] !== CHAVE_SESSAO[0],
      });
      clienteConsultas.setQueryData(CHAVE_SESSAO, null);
      await navigate({ to: '/' });
    },
  });
}
