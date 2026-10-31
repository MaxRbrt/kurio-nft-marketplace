import type { Pedido } from '@/contracts/compra/pedidos';
import { pedidoSchema } from '@/contracts/compra/pedidos';
import { eventoPedidoAtualizadoSchema } from '@/contracts/tempo-real/eventos';
import { publicarParaUsuario } from '../socket/conexoes';
import { alterarNft, gerarIdEvento } from './alteracoes';
import { donoUsuario, lerEdicao } from './carrinhos';
import { lerBanco, salvarBanco } from './estado';

const ESPERA_PAGAMENTO_MS = 1_500;

// ====================================================================
// 1. EFEITOS DA CONFIRMAÇÃO
// Só agora o estoque baixa e o carrinho perde o que foi comprado: item
// ou quantidade acrescentados durante a compra continuam no carrinho.
// ====================================================================
function temEstoque(pedido: Pedido) {
  return pedido.itens.every((item) => {
    const encontrada = lerEdicao(item.nftId, item.edicaoId);

    return encontrada && encontrada.edicao.disponivel >= item.quantidade;
  });
}

function aplicarCompra(pedido: Pedido) {
  const banco = lerBanco();
  const dono = donoUsuario(pedido.usuarioId);

  for (const comprado of pedido.itens) {
    const encontrada = lerEdicao(comprado.nftId, comprado.edicaoId);

    if (encontrada) {
      alterarNft(comprado.nftId, {
        edicaoId: comprado.edicaoId,
        disponivel: encontrada.edicao.disponivel - comprado.quantidade,
      });
    }

    banco.carrinhos[dono] = (banco.carrinhos[dono] ?? []).flatMap((item) => {
      if (item.nftId !== comprado.nftId || item.edicaoId !== comprado.edicaoId) {
        return [item];
      }

      const restante = item.quantidade - comprado.quantidade;

      return restante > 0 ? [{ ...item, quantidade: restante }] : [];
    });
  }
}

// ====================================================================
// 2. RESOLUÇÃO DO PEDIDO
// Confirmado e recusado são terminais: pedido já resolvido não muda.
// Estoque que acabou no meio do caminho recusa em vez de vender demais.
// ====================================================================
export function resolverPedido(id: string, resultado: 'confirmado' | 'recusado') {
  const banco = lerBanco();
  const pedido = banco.pedidos[id];

  if (!pedido || pedido.estado !== 'pendente') {
    return pedido ?? null;
  }

  const agora = new Date().toISOString();
  const versao = pedido.versao + 1;
  const confirmar = resultado === 'confirmado' && temEstoque(pedido);
  const idTransacao = `0x${id.replace(/\D/g, '').padStart(64, 'a')}`;
  const resolvido = pedidoSchema.parse(
    confirmar
      ? {
          ...pedido,
          estado: 'confirmado',
          versao,
          idTransacao,
          urlExplorador: `https://etherscan.io/tx/${idTransacao}`,
          confirmadoEm: agora,
        }
      : {
          ...pedido,
          estado: 'recusado',
          versao,
          motivoRecusa:
            resultado === 'recusado' ? 'Pagamento recusado pela carteira' : 'Edição esgotada',
          recusadoEm: agora,
        },
  );

  if (confirmar) {
    aplicarCompra(pedido);
  }

  banco.pedidos[id] = resolvido;
  const idEvento = gerarIdEvento();
  salvarBanco();

  publicarParaUsuario(
    pedido.usuarioId,
    'order.updated',
    eventoPedidoAtualizadoSchema.parse({
      idEvento,
      tipo: 'order.updated',
      recurso: { tipo: 'pedido', id },
      versao,
      ocorridoEm: agora,
      dados: { usuarioId: pedido.usuarioId, estado: resolvido.estado },
    }),
  );

  return resolvido;
}

// ====================================================================
// 3. PAGAMENTO SIMULADO
// O cenário decide o resultado. Timer não sobrevive ao refresh, então
// pedidos pendentes são retomados ao carregar a página.
// ====================================================================
export function agendarResolucao(id: string) {
  const { resolucaoPagamento } = lerBanco();

  if (resolucaoPagamento === 'manual') {
    return;
  }

  const resultado = resolucaoPagamento === 'confirmar' ? 'confirmado' : 'recusado';

  setTimeout(() => {
    resolverPedido(id, resultado);
  }, ESPERA_PAGAMENTO_MS);
}

export function retomarPedidosPendentes() {
  for (const pedido of Object.values(lerBanco().pedidos)) {
    if (pedido.estado === 'pendente') {
      agendarResolucao(pedido.id);
    }
  }
}
