import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useCallback } from 'react';
import { listarNfts } from './api/nfts';
import type { BuscaCatalogo } from './busca';

const rotaInicial = getRouteApi('/');

// ====================================================================
// 1. ALTERAÇÃO DOS FILTROS
// Regra em um lugar só: mudar qualquer filtro volta à primeira página.
// O campo de busca usa replace, para digitar não encher o histórico.
// ====================================================================
export function useFiltrosCatalogo() {
  const busca = rotaInicial.useSearch();
  const navigate = rotaInicial.useNavigate();

  const alterarFiltros = useCallback(
    (mudanca: Partial<BuscaCatalogo>, opcoes: { substituir?: boolean } = {}) => {
      void navigate({
        search: (anterior) => ({ ...anterior, ...mudanca, pagina: undefined }),
        replace: opcoes.substituir,
      });
    },
    [navigate],
  );

  const irParaPagina = useCallback(
    (pagina: number) => {
      void navigate({
        search: (anterior) => ({ ...anterior, pagina: pagina > 1 ? pagina : undefined }),
      });
    },
    [navigate],
  );

  return { busca, alterarFiltros, irParaPagina };
}

// ====================================================================
// 2. CONSULTA DA LISTAGEM
// A chave tem todos os parâmetros: resposta atrasada de outra busca não
// aparece aqui. A lista anterior fica na tela enquanto a nova chega.
// ====================================================================
export function useListaNfts() {
  const busca = rotaInicial.useSearch();

  return useQuery({
    queryKey: ['nfts', 'lista', busca],
    queryFn: ({ signal }) => listarNfts(busca, signal),
    placeholderData: keepPreviousData,
  });
}
