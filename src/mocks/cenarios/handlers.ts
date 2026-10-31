import Big from 'big.js';
import { delay, http, HttpResponse } from 'msw';
import { categoriaSchema, listaNftsSchema } from '@/contracts/catalogo/nfts';
import { redeSchema } from '@/contracts/comum/valores';
import { alterarNft } from '../banco/alteracoes';
import { lerBanco, salvarBanco } from '../banco/estado';
import { responderErro } from '../rest/respostas';
import { consumirUso } from './cenarios';

// ====================================================================
// 1. LATÊNCIAS DETERMINÍSTICAS
// Sequência fixa em vez de sorteio: toda execução vê os mesmos tempos.
// Em fora-de-ordem, a requisição ímpar demora e a par responde rápido.
// ====================================================================
const ATRASO_LENTO_MS = 2_500;
const SEQUENCIA_LATENCIA_MS = [100, 900, 300, 1_500, 600];
const ATRASO_FORA_DE_ORDEM_MS = { lenta: 2_000, rapida: 100 };

let contadorRequisicoes = 0;

function zerarFacetas() {
  return {
    categorias: Object.fromEntries(categoriaSchema.options.map((opcao) => [opcao, 0])),
    redes: Object.fromEntries(redeSchema.options.map((opcao) => [opcao, 0])),
  };
}

// ====================================================================
// 2. MUDANÇA DURANTE A COMPRA
// Altera o primeiro item da cotação logo antes do pedido ser avaliado:
// o servidor recusa pelo caminho normal, e o evento sai pelo socket.
// ====================================================================
async function mudarItemDaCotacao(request: Request, nome: 'preco-alterado' | 'edicao-esgotada') {
  const { cotacaoId } = (await request.clone().json()) as { cotacaoId?: string };
  const item = cotacaoId ? lerBanco().cotacoes[cotacaoId]?.itens[0] : undefined;

  if (!item) {
    return;
  }

  alterarNft(
    item.nftId,
    nome === 'preco-alterado'
      ? { edicaoId: item.edicaoId, preco: new Big(item.precoUnitario).plus('0.5').toFixed() }
      : { edicaoId: item.edicaoId, disponivel: 0 },
  );
}

// ====================================================================
// 3. INTERCEPTADOR DE CENÁRIOS
// Roda antes dos demais handlers. Sem retorno, a requisição segue para
// a API normal. Rotas de controle nunca são afetadas, para o teste
// conseguir sair de qualquer cenário.
// ====================================================================
export const handlersCenarios = [
  http.all('/api/*', async ({ request }) => {
    const { pathname } = new URL(request.url);
    const { cenario } = { cenario: lerBanco().cenario };

    if (pathname.startsWith('/api/__mock') || (cenario.rota && !pathname.includes(cenario.rota))) {
      return undefined;
    }

    const criandoPedido = request.method === 'POST' && pathname === '/api/pedidos';

    switch (cenario.nome) {
      case 'lento':
        await delay(ATRASO_LENTO_MS);
        return undefined;

      case 'latencia-variavel':
        await delay(SEQUENCIA_LATENCIA_MS[contadorRequisicoes++ % SEQUENCIA_LATENCIA_MS.length]);
        return undefined;

      case 'fora-de-ordem':
        if (pathname === '/api/nfts') {
          contadorRequisicoes += 1;
          await delay(
            contadorRequisicoes % 2 === 1
              ? ATRASO_FORA_DE_ORDEM_MS.lenta
              : ATRASO_FORA_DE_ORDEM_MS.rapida,
          );
        }
        return undefined;

      case 'timeout':
        await delay('infinite');
        return undefined;

      case 'offline':
        consumirUso();
        return HttpResponse.error();

      case 'erro-500':
        consumirUso();
        return responderErro(500, 'FALHA_TRANSITORIA', 'Falha temporária no servidor');

      case 'erro-403':
        consumirUso();
        return responderErro(403, 'SEM_PERMISSAO', 'Sem permissão para esta ação');

      case 'vazio':
        if (pathname === '/api/nfts') {
          return HttpResponse.json(
            listaNftsSchema.parse({
              itens: [],
              paginacao: { pagina: 1, tamanhoPagina: 9, totalItens: 0, totalPaginas: 0 },
              facetas: zerarFacetas(),
            }),
          );
        }
        return undefined;

      case 'sessao-expirada':
        for (const sessao of Object.values(lerBanco().sessoes)) {
          sessao.expiraEm = new Date(0).toISOString();
        }
        salvarBanco();
        return undefined;

      case 'preco-alterado':
      case 'edicao-esgotada':
        if (criandoPedido) {
          consumirUso();
          await mudarItemDaCotacao(request, cenario.nome);
        }
        return undefined;

      default:
        return undefined;
    }
  }),
];
