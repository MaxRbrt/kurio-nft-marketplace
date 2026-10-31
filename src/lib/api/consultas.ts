import { QueryClient } from '@tanstack/react-query';
import { ErroApi } from './erros';

const MAXIMO_TENTATIVAS = 2;
const TEMPO_FRESCO_PADRAO_MS = 30_000;

// ====================================================================
// 1. POLÍTICA DE CACHE E RETRY
// Repete só falha transitória: 4xx daria o mesmo resultado. Mutation
// não repete sozinha, pois repetir escrita pode duplicar a operação.
// ====================================================================
export const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: TEMPO_FRESCO_PADRAO_MS,
      retry: (tentativas, erro) =>
        erro instanceof ErroApi && erro.transitorio && tentativas < MAXIMO_TENTATIVAS,
    },
    mutations: { retry: false },
  },
});
