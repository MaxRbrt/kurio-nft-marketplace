import axios from 'axios';
import { CABECALHO_VISITANTE } from '@/contracts/compra/carrinho';
import { converterErro } from './erros';
import { lerToken, lerVisitanteId } from './identidade';

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
  (erro: unknown) => Promise.reject(converterErro(erro)),
);
