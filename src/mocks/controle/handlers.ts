import { http, HttpResponse } from 'msw';
import { alterarNft, type MudancaNft } from '../banco/alteracoes';
import { lerBanco, resetarBanco, salvarBanco, type ResolucaoPagamento } from '../banco/estado';
import { resolverPedido } from '../banco/pedidos';
import { cenarioSchema, definirCenario } from '../cenarios/cenarios';
import { lerCorpo, responderErro } from '../rest/respostas';
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

  http.post('/api/__mock/cenario', async ({ request }) => {
    const leitura = await lerCorpo(request, cenarioSchema);

    if ('erro' in leitura) {
      return leitura.erro;
    }

    definirCenario(leitura.dados);

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

  http.post('/api/__mock/pagamento', async ({ request }) => {
    const { resolucao } = (await request.json()) as { resolucao: ResolucaoPagamento };

    lerBanco().resolucaoPagamento = resolucao;
    salvarBanco();

    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/__mock/pedidos/timeout-no-proximo', () => {
    lerBanco().timeoutNoProximoPedido = true;
    salvarBanco();

    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/__mock/pedidos/:id/resolver', async ({ params, request }) => {
    const { estado } = (await request.json()) as { estado: 'confirmado' | 'recusado' };

    if (!resolverPedido(String(params.id), estado)) {
      return responderErro(404, 'NAO_ENCONTRADO', 'Pedido não encontrado');
    }

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
