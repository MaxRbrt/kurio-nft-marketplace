import { http, HttpResponse } from 'msw';
import { derrubarConexoes, publicarEvento } from '../socket/conexoes';

// ====================================================================
// 1. CONTROLE DOS CENÁRIOS
// Testes e demonstração acionam o servidor simulado pela rede, sem
// tocar em estado da interface. O evento segue pelo socket real.
// ====================================================================
export const handlersControle = [
  http.post('/api/__mock/eventos/nft-atualizado', async ({ request }) => {
    publicarEvento('nft.updated', await request.json());

    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/__mock/socket/derrubar', () => {
    derrubarConexoes();

    return new HttpResponse(null, { status: 204 });
  }),
];
