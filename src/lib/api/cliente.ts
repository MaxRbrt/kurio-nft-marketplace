import axios from 'axios';
import { CABECALHO_VISITANTE } from '@/contracts/compra/carrinho';
import { converterErro, ErroApi } from './erros';
import { lerToken, lerVisitanteId } from './identidade';
import { avisarSessaoExpirada } from './sessao-expirada';

// ====================================================================
// 1. CLIENTE HTTP
// Única saída REST da aplicação. Lista repetida na URL, como o contrato
// espera. O timeout evita espera infinita quando a resposta se perde.
// ====================================================================
const TEMPO_LIMITE_MS = 10_000;

export const clienteApi = axios.create({
  baseURL: '/api',
  timeout: TEMPO_LIMITE_MS,
  paramsSerializer: { indexes: null },
});

// ====================================================================
// 2. INTERCEPTADORES
// Toda requisição leva sessão ou visitante. Toda falha sai como ErroApi.
// ====================================================================
clienteApi.interceptors.request.use((configuracao) => {
  const token = lerToken();

  if (token) {
    configuracao.headers.Authorization = `Bearer ${token}`;
  } else {
    configuracao.headers[CABECALHO_VISITANTE] = lerVisitanteId();
  }

  return configuracao;
});

clienteApi.interceptors.response.use(
  (resposta) => resposta,
  (erro: unknown) => {
    const convertido = converterErro(erro);
    const rota = axios.isAxiosError(erro) ? (erro.config?.url ?? '') : '';

    if (convertido instanceof ErroApi && convertido.status === 401 && !rota.startsWith('/auth/')) {
      avisarSessaoExpirada();
    }

    return Promise.reject(convertido);
  },
);
