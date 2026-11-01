import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback } from 'react';
import { listarNfts } from './api/nfts';
import { buscaCatalogoSchema, type BuscaCatalogo } from './busca';

// A tela inicial também fica atrás do modal de login, em outra rota.
function useBuscaCatalogo() {
  return buscaCatalogoSchema.parse(useSearch({ strict: false }));
}

// ====================================================================
// 1. ALTERAÇÃO DOS FILTROS
// Regra em um lugar só: mudar qualquer filtro volta à primeira página.
// O campo de busca usa replace, para digitar não encher o histórico.
// Filtrar não tira o usuário do lugar; trocar de página volta ao início
// do catálogo, para os novos cartões aparecerem na tela.
// ====================================================================
export function useFiltrosCatalogo() {
  const busca = useBuscaCatalogo();
  const navigate = useNavigate();

  const alterarFiltros = useCallback(
    (mudanca: Partial<BuscaCatalogo>, opcoes: { substituir?: boolean } = {}) => {
      void navigate({
        to: '/',
        search: (anterior) => ({ ...anterior, ...mudanca, pagina: undefined }),
        replace: opcoes.substituir,
        resetScroll: false,
      });
    },
    [navigate],
  );

  const irParaPagina = useCallback(
    (pagina: number) => {
      void navigate({
        to: '/',
        search: (anterior) => ({ ...anterior, pagina: pagina > 1 ? pagina : undefined }),
        resetScroll: false,
      }).then(() => document.getElementById('catalogo')?.scrollIntoView());
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
  const busca = useBuscaCatalogo();

  return useQuery({
    queryKey: ['nfts', 'lista', busca],
    queryFn: ({ signal }) => listarNfts(busca, signal),
    placeholderData: keepPreviousData,
  });
}
