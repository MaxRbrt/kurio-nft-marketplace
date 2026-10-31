import { http, HttpResponse } from 'msw';
import { alterarNft, type MudancaNft } from '../banco/alteracoes';
import { lerBanco, resetarBanco, salvarBanco } from '../banco/estado';
import { responderErro } from '../rest/respostas';
import { derrubarConexoes, publicarEvento } from '../socket/conexoes';

// ====================================================================
// 1. CONTROLE DOS CENÁRIOS
// Testes e demonstração acionam o servidor simulado pela rede, sem
// tocar em estado da interface. O evento segue pelo socket real.
// ====================================================================
export const handlersControle = [
  http.post('/api/__mock/resetar', () => {
    resetarBanco();

    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/__mock/nfts/:id', async ({ params, request }) => {
    const nft = alterarNft(String(params.id), (await request.json()) as MudancaNft);

    if (!nft) {
      return responderErro(404, 'NAO_ENCONTRADO', 'NFT não encontrado');
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/__mock/sessoes/expirar', () => {
    const banco = lerBanco();

    for (const sessao of Object.values(banco.sessoes)) {
      sessao.expiraEm = new Date(0).toISOString();
    }

    salvarBanco();

    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/__mock/carteiras/recusar-conexao', async ({ request }) => {
    const { recusar } = (await request.json()) as { recusar: boolean };

    lerBanco().recusarConexaoCarteira = recusar;
    salvarBanco();

    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/__mock/eventos/nft-atualizado', async ({ request }) => {
    publicarEvento('nft.updated', await request.json());

    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/__mock/socket/derrubar', () => {
    derrubarConexoes();

    return new HttpResponse(null, { status: 204 });
  }),
];
