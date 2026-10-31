import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ErroApi } from '@/lib/api/erros';
import { adicionarItem } from './api/carrinho';

const MENSAGEM_FALHA = 'Não foi possível adicionar ao carrinho.';

// ====================================================================
// 1. ADICIONAR AO CARRINHO
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
      toast.error(erro instanceof ErroApi && erro.status !== 0 ? erro.message : MENSAGEM_FALHA);
    },
  });
}
