import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ItemCarrinho } from '@/contracts/compra/carrinho';
import { useSessao } from '@/features/conta/usar-sessao';
import { ErroApi } from '@/lib/api/erros';
import { adicionarItem, alterarQuantidade, obterCarrinho, removerItem } from './api/carrinho';

const QUANTIDADE_MINIMA = 1;

function mensagemDeFalha(erro: unknown, padrao: string) {
  return erro instanceof ErroApi && erro.status !== 0 ? erro.message : padrao;
}

// ====================================================================
// 1. CONSULTA DO CARRINHO
// A chave separa usuário e visitante. A cotação fica sob o mesmo prefixo
// e é invalidada junto: mudar o carrinho sempre recalcula o resumo.
// ====================================================================
export function useChaveCarrinho() {
  return ['carrinho', useSessao()?.usuario.id ?? 'visitante'] as const;
}

export function useCarrinho() {
  const queryKey = useChaveCarrinho();

  return useQuery({ queryKey, queryFn: ({ signal }) => obterCarrinho(signal) });
}

// ====================================================================
// 2. ADICIONAR AO CARRINHO
// Mutation sem otimismo: quantidade e estoque só o servidor confirma. A
// contagem do cabeçalho vem da consulta invalidada ao final.
// ====================================================================
export function useAdicionarAoCarrinho() {
  const clienteConsultas = useQueryClient();

  return useMutation({
    mutationFn: adicionarItem,
    onSuccess: async () => {
      await clienteConsultas.invalidateQueries({ queryKey: ['carrinho'] });
      toast.success('Adicionado ao carrinho.');
    },
    onError: (erro) => {
      toast.error(mensagemDeFalha(erro, 'Não foi possível adicionar ao carrinho.'));
    },
  });
}

// ====================================================================
// 3. EDITAR UM ITEM
// Também sem otimismo. Na falha o carrinho é relido, pois o conflito pode
// significar que o estoque mudou. Estoque abaixo do pedido: diminuir leva
// direto ao limite; sem estoque, só resta remover.
// ====================================================================
export function useItemCarrinho(item: ItemCarrinho, aoRemover?: () => void) {
  const clienteConsultas = useQueryClient();
  const reler = () => clienteConsultas.invalidateQueries({ queryKey: ['carrinho'] });

  const alterar = useMutation({
    mutationFn: (quantidade: number) => alterarQuantidade(item.id, quantidade),
    onSuccess: reler,
    onError: async (erro) => {
      toast.error(mensagemDeFalha(erro, 'Não foi possível alterar a quantidade.'));
      await reler();
    },
  });
  const remover = useMutation({
    mutationFn: () => removerItem(item.id),
    onSuccess: async () => {
      await reler();
      toast.success(`${item.nome} removido do carrinho.`);
      aoRemover?.();
    },
    onError: async (erro) => {
      toast.error(mensagemDeFalha(erro, 'Não foi possível remover o item.'));
      await reler();
    },
  });

  const ocupado = alterar.isPending || remover.isPending;
  const acimaDoEstoque = item.quantidade > item.disponivel;
  const anterior = acimaDoEstoque ? item.disponivel : item.quantidade - 1;

  return {
    ocupado,
    podeDiminuir: !ocupado && anterior >= QUANTIDADE_MINIMA,
    podeAumentar: !ocupado && item.quantidade < item.disponivel,
    acimaDoEstoque,
    diminuir: () => alterar.mutate(anterior),
    aumentar: () => alterar.mutate(item.quantidade + 1),
    remover: () => remover.mutate(),
  };
}
