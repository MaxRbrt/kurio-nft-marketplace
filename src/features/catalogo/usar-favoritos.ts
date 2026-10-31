import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { Favoritos } from '@/contracts/catalogo/favoritos';
import { useSessao } from '@/features/conta/usar-sessao';
import { ErroApi } from '@/lib/api/erros';
import { listarFavoritos, salvarFavorito } from './api/favoritos';

// ====================================================================
// 1. FAVORITO COM ATUALIZAÇÃO OTIMISTA
// A tela muda antes da resposta. Consultas em andamento são canceladas,
// para não sobrescrever a mudança; se o servidor recusar, o estado
// anterior volta e o usuário é avisado. Sem sessão, vai ao login e volta.
// ====================================================================
export function useFavorito(nftId: string) {
  const sessao = useSessao();
  const clienteConsultas = useQueryClient();
  const navigate = useNavigate();
  const { href } = useLocation();
  const chave = ['usuario', sessao?.usuario.id, 'favoritos'];

  const { data } = useQuery({
    queryKey: chave,
    queryFn: ({ signal }) => listarFavoritos(signal),
    enabled: Boolean(sessao),
    staleTime: 60_000,
  });
  const favorito = data?.nftIds.includes(nftId) ?? false;

  const mutacao = useMutation({
    mutationFn: (favoritar: boolean) => salvarFavorito(nftId, favoritar),
    onMutate: async (favoritar) => {
      await clienteConsultas.cancelQueries({ queryKey: chave });

      const anterior = clienteConsultas.getQueryData<Favoritos>(chave);
      const atuais = anterior?.nftIds ?? [];

      clienteConsultas.setQueryData<Favoritos>(chave, {
        nftIds: favoritar ? [...atuais, nftId] : atuais.filter((id) => id !== nftId),
      });

      return { anterior };
    },
    onError: (erro, _favoritar, contexto) => {
      clienteConsultas.setQueryData(chave, contexto?.anterior);

      if (!(erro instanceof ErroApi && erro.status === 401)) {
        toast.error('Não foi possível atualizar o favorito.');
      }
    },
    onSettled: () => clienteConsultas.invalidateQueries({ queryKey: chave }),
  });

  function alternar() {
    if (!sessao) {
      void navigate({ to: '/login', search: { redirect: href } });

      return;
    }

    mutacao.mutate(!favorito);
  }

  return { favorito, alternar };
}
