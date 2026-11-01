import { delay, http, HttpResponse } from 'msw';
import { cotacaoSchema } from '@/contracts/compra/cotacao';
import {
  CABECALHO_IDEMPOTENCIA,
  entradaPedidoSchema,
  pedidoSchema,
  type EntradaPedido,
} from '@/contracts/compra/pedidos';
import { donoUsuario } from '../../banco/carrinhos';
import { lerBanco, salvarBanco, type CotacaoBanco } from '../../banco/estado';
import { agendarResolucao } from '../../banco/pedidos';
import { autenticar } from '../conta/autenticacao';
import { lerCorpo, responderErro } from '../respostas';
import { calcularCotacao } from './cotacoes';

// ====================================================================
// 1. COTAÇÃO DESATUALIZADA
// Compara só o que afeta a compra. Estoque que mudou sem faltar não
// invalida a cotação, e a data de validade é tratada à parte.
// ====================================================================
function resumirCotacao(cotacao: CotacaoBanco) {
  return JSON.stringify({
    itens: cotacao.itens.map((item) => [
      item.nftId,
      item.edicaoId,
      item.precoUnitario,
      item.quantidade,
    ]),
    subtotal: cotacao.subtotal,
    desconto: cotacao.desconto,
    taxaRede: cotacao.taxaRede,
    total: cotacao.total,
  });
}

function revalidarCotacao(entrada: EntradaPedido, dono: string) {
  const banco = lerBanco();
  const original = banco.cotacoes[entrada.cotacaoId];
  const atual = calcularCotacao(dono, original?.entrada ?? { rede: entrada.rede });

  if ('erro' in atual) {
    return atual;
  }

  const valida =
    original?.dono === dono &&
    new Date(original.expiraEm).getTime() > Date.now() &&
    resumirCotacao(original) === resumirCotacao(atual.cotacao);

  if (valida) {
    return { cotacao: original };
  }

  banco.cotacoes[atual.cotacao.id] = atual.cotacao;
  salvarBanco();

  return {
    erro: HttpResponse.json(
      {
        erro: {
          codigo: 'COTACAO_DESATUALIZADA',
          mensagem: 'Os valores da compra mudaram. Confirme novamente.',
          detalhes: { cotacao: cotacaoSchema.parse(atual.cotacao) },
        },
      },
      { status: 409 },
    ),
  };
}

// ====================================================================
// 2. CRIAÇÃO IDEMPOTENTE
// A chave é conferida antes de tudo: repetir a mesma tentativa recupera
// o pedido mesmo que os valores tenham mudado depois. Conteúdo diferente
// com a mesma chave é conflito.
// ====================================================================
export const handlersPedidos = [
  http.post('/api/pedidos', async ({ request }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const chave = request.headers.get(CABECALHO_IDEMPOTENCIA);

    if (!chave) {
      return responderErro(422, 'VALIDACAO', 'Chave de idempotência obrigatória');
    }

    const entrada = await lerCorpo(request, entradaPedidoSchema);

    if ('erro' in entrada) {
      return entrada.erro;
    }

    const banco = lerBanco();
    const usuarioId = sessao.usuario.id;
    const conteudo = JSON.stringify(entrada.dados);
    const registroChave = `${usuarioId}:${chave}`;
    const tentativa = banco.idempotencia[registroChave];

    if (tentativa && tentativa.conteudo !== conteudo) {
      return responderErro(409, 'CONFLITO_IDEMPOTENCIA', 'Chave usada com outro conteúdo');
    }

    if (tentativa) {
      return HttpResponse.json(banco.pedidos[tentativa.pedidoId]);
    }

    const carteira = banco.carteiras.find((candidata) => candidata.id === entrada.dados.carteiraId);

    if (!carteira) {
      return responderErro(404, 'NAO_ENCONTRADO', 'Carteira não encontrada');
    }

    if (carteira.usuarioId !== usuarioId) {
      return responderErro(403, 'SEM_PERMISSAO', 'Sem permissão para esta carteira');
    }

    const revalidada = revalidarCotacao(entrada.dados, donoUsuario(usuarioId));

    if ('erro' in revalidada) {
      return revalidada.erro;
    }

    // ================================================================
    // 3. RECIBO COMO SNAPSHOT
    // Valores são copiados da cotação para o pedido. Depois disso, mudar
    // o catálogo não altera nada do que foi comprado.
    // ================================================================
    const { cotacao } = revalidada;
    const id = `pedido-${banco.proximoPedido}`;
    const pedido = pedidoSchema.parse({
      id,
      usuarioId,
      estado: 'pendente',
      versao: 1,
      itens: cotacao.itens,
      subtotal: cotacao.subtotal,
      desconto: cotacao.desconto,
      taxaRede: cotacao.taxaRede,
      total: cotacao.total,
      cupom: cotacao.cupom,
      rede: entrada.dados.rede,
      carteira: { endereco: carteira.endereco, tipo: carteira.tipo },
      criadoEm: new Date().toISOString(),
    });

    banco.proximoPedido += 1;
    banco.pedidos[id] = pedido;
    banco.idempotencia[registroChave] = { conteudo, pedidoId: id };

    const simularTimeout = banco.timeoutNoProximoPedido;
    banco.timeoutNoProximoPedido = false;
    salvarBanco();
    agendarResolucao(id);

    if (simularTimeout) {
      await delay('infinite');
    }

    return HttpResponse.json(pedido, { status: 201 });
  }),

  http.get('/api/pedidos/:id', ({ request, params }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const pedido = lerBanco().pedidos[String(params.id)];

    if (!pedido) {
      return responderErro(404, 'NAO_ENCONTRADO', 'Pedido não encontrado');
    }

    if (pedido.usuarioId !== sessao.usuario.id) {
      return responderErro(403, 'SEM_PERMISSAO', 'Sem permissão para este pedido');
    }

    return HttpResponse.json(pedido);
  }),
];
