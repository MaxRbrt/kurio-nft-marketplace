import type { QueryClient } from '@tanstack/react-query';
import type { ListaNfts, NftDetalhe } from '@/contracts/catalogo/nfts';
import type { Carrinho } from '@/contracts/compra/carrinho';
import type { Pedido } from '@/contracts/compra/pedidos';
import {
  eventoNftAtualizadoSchema,
  eventoPedidoAtualizadoSchema,
  type EventoNftAtualizado,
  type EventoPedidoAtualizado,
} from '@/contracts/tempo-real/eventos';

type Anunciar = (mensagem: string) => void;

// ====================================================================
// 1. MENSAGENS DO CARRINHO
// O que muda para quem está comprando: preço diferente ou estoque abaixo
// do pedido. Compara com o carrinho em cache, antes da invalidação.
// ====================================================================
function mensagensDoCarrinho(carrinho: Carrinho | undefined, evento: EventoNftAtualizado) {
  return (carrinho?.itens ?? []).flatMap((item) => {
    const edicao = evento.dados.edicoes.find((candidata) => candidata.id === item.edicaoId);

    if (item.nftId !== evento.recurso.id || !edicao) {
      return [];
    }

    if (edicao.preco !== item.precoUnitario) {
      return [`Preço de ${item.nome} mudou de ${item.precoUnitario} para ${edicao.preco} ETH.`];
    }

    if (edicao.disponivel < item.quantidade) {
      return [`${item.nome} agora tem só ${edicao.disponivel} disponível.`];
    }

    return [];
  });
}

// ====================================================================
// 2. PROCESSADOR DE EVENTOS
// Ordem fixa: valida, descarta duplicata pela identidade, descarta antigo
// pela versão, cancela consulta em andamento (a resposta seria anterior
// à mudança), atualiza o cache e só então invalida e anuncia. Listas são
// buscadas de novo, pois o preço novo muda ordem, filtros e contagens; o
// cache já mostra o valor novo enquanto isso. Consulta cancelada antes de
// ter dados (primeira carga) também, senão a tela ficaria carregando para
// sempre. Catálogo e carrinho são revalidados em paralelo. Um por sessão:
// trocar de usuário começa do zero.
// ====================================================================
export function criarProcessadorEventos(
  clienteConsultas: QueryClient,
  usuarioId: string | undefined,
  anunciar: Anunciar,
) {
  const idsVistos = new Set<string>();
  const versoes = new Map<string, number>();
  const chaveCarrinho = ['carrinho', usuarioId ?? 'visitante'];

  function eventoNovo(evento: { idEvento: string; versao: number; recurso: { id: string } }) {
    const chaveRecurso = evento.recurso.id;

    if (idsVistos.has(evento.idEvento)) {
      return false;
    }

    idsVistos.add(evento.idEvento);

    if (evento.versao <= (versoes.get(chaveRecurso) ?? 0)) {
      return false;
    }

    versoes.set(chaveRecurso, evento.versao);

    return true;
  }

  async function aplicarNft(evento: EventoNftAtualizado) {
    const { id } = evento.recurso;
    const { preco, disponivel, edicoes } = evento.dados;
    const chaveDetalhe = ['nfts', 'detalhe', id];
    const detalhe = clienteConsultas.getQueryData<NftDetalhe>(chaveDetalhe);

    if (detalhe && detalhe.versao >= evento.versao) {
      return;
    }

    const mensagens = mensagensDoCarrinho(
      clienteConsultas.getQueryData<Carrinho>(chaveCarrinho),
      evento,
    );

    await clienteConsultas.cancelQueries({ queryKey: ['nfts'] });
    clienteConsultas.setQueryData<NftDetalhe>(
      chaveDetalhe,
      (atual) => atual && { ...atual, preco, disponivel, edicoes, versao: evento.versao },
    );
    clienteConsultas.setQueriesData<ListaNfts>(
      { queryKey: ['nfts', 'lista'] },
      (lista) =>
        lista && {
          ...lista,
          itens: lista.itens.map((nft) =>
            nft.id === id && nft.versao < evento.versao
              ? { ...nft, preco, disponivel, versao: evento.versao }
              : nft,
          ),
        },
    );
    const listaOuSemDados = (consulta: {
      queryKey: readonly unknown[];
      state: { data: unknown };
    }) => consulta.queryKey[1] === 'lista' || consulta.state.data === undefined;

    await Promise.all([
      clienteConsultas.invalidateQueries({ queryKey: ['nfts'], predicate: listaOuSemDados }),
      clienteConsultas.invalidateQueries({ queryKey: ['carrinho'] }),
    ]);
    mensagens.forEach(anunciar);
  }

  // ==================================================================
  // 3. EVENTO DE PEDIDO
  // Evento de outro usuário nunca é aplicado, e pedido terminal não muda.
  // O evento só avisa: o recibo vem da API, que é a referência.
  // ==================================================================
  async function aplicarPedido(evento: EventoPedidoAtualizado) {
    if (!usuarioId || evento.dados.usuarioId !== usuarioId) {
      return;
    }

    const chavePedido = ['usuario', usuarioId, 'pedidos', evento.recurso.id];
    const atual = clienteConsultas.getQueryData<Pedido>(chavePedido);

    if (atual && atual.estado !== 'pendente') {
      return;
    }

    await clienteConsultas.cancelQueries({ queryKey: chavePedido });
    await clienteConsultas.invalidateQueries({ queryKey: chavePedido });
    await clienteConsultas.invalidateQueries({ queryKey: ['carrinho'] });

    if (evento.dados.estado === 'confirmado') {
      anunciar('Pagamento confirmado.');
    }

    if (evento.dados.estado === 'recusado') {
      anunciar('Pagamento recusado. Seus itens continuam no carrinho.');
    }
  }

  return {
    nftAtualizado(bruto: unknown) {
      const leitura = eventoNftAtualizadoSchema.safeParse(bruto);

      if (leitura.success && eventoNovo(leitura.data)) {
        void aplicarNft(leitura.data);
      }
    },
    pedidoAtualizado(bruto: unknown) {
      const leitura = eventoPedidoAtualizadoSchema.safeParse(bruto);

      if (leitura.success && eventoNovo(leitura.data)) {
        void aplicarPedido(leitura.data);
      }
    },
    // ================================================================
    // 4. RECONCILIAÇÃO
    // Eventos perdidos na queda não voltam: REST é a verdade, e os recursos
    // ativos são relidos ao reconectar. Pedido terminal não é refeito.
    // ================================================================
    reconciliar() {
      void clienteConsultas.invalidateQueries({ queryKey: ['nfts'] });
      void clienteConsultas.invalidateQueries({ queryKey: ['carrinho'] });

      if (usuarioId) {
        void clienteConsultas.invalidateQueries({ queryKey: ['usuario', usuarioId, 'pedidos'] });
      }
    },
  };
}
