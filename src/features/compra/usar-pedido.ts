import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { EntradaPedido } from '@/contracts/compra/pedidos';
import { useSessao } from '@/features/conta/usar-sessao';
import { ErroApi } from '@/lib/api/erros';
import { useSocketConectado } from '@/lib/tempo-real/estado';
import { criarPedido, obterPedido } from './api/pedidos';
import { apagarTentativa, lerTentativa, salvarTentativa } from './tentativa-pedido';

const INTERVALO_SEM_SOCKET_MS = 5_000;
const TEMPO_FRESCO_TERMINAL_MS = Infinity;

// ====================================================================
// 1. RESPOSTA QUE ENCERRA A TENTATIVA
// Recusa do servidor (4xx) significa que nenhum pedido foi criado: a
// chave pode sair. Sessão vencida não encerra, pois a compra é retomada
// depois do login. Rede, timeout e 5xx podem ter criado o pedido.
// ====================================================================
function recusaDefinitiva(erro: unknown) {
  return erro instanceof ErroApi && erro.status >= 400 && erro.status < 500 && erro.status !== 401;
}

// ====================================================================
// 2. ENVIO IDEMPOTENTE
// Tentativa aberta tem prioridade sobre o que está na tela: é ela que
// precisa ser resolvida, com a mesma chave e o mesmo corpo. Clique repetido
// e reenvio após timeout recuperam o mesmo pedido, sem segunda compra.
// ====================================================================
export function useEnviarPedido() {
  const clienteConsultas = useQueryClient();
  const navigate = useNavigate();
  const usuarioId = useSessao()?.usuario.id ?? '';

  return useMutation({
    mutationFn: (entrada: EntradaPedido) => {
      const tentativa = lerTentativa(usuarioId) ?? {
        chave: crypto.randomUUID(),
        entrada,
        pedidoId: null,
      };

      salvarTentativa(usuarioId, tentativa);

      return criarPedido(tentativa.entrada, tentativa.chave).then((pedido) => {
        salvarTentativa(usuarioId, { ...tentativa, pedidoId: pedido.id });

        return pedido;
      });
    },
    onSuccess: async (pedido) => {
      clienteConsultas.setQueryData(['usuario', usuarioId, 'pedidos', pedido.id], pedido);
      await clienteConsultas.invalidateQueries({ queryKey: ['carrinho'] });
      await navigate({ to: '/pedidos/$pedidoId', params: { pedidoId: pedido.id }, replace: true });
    },
    onError: async (erro) => {
      if (recusaDefinitiva(erro)) {
        apagarTentativa(usuarioId);
        await clienteConsultas.invalidateQueries({ queryKey: ['carrinho'] });
      }
    },
  });
}

// ====================================================================
// 3. RETOMADA NO PAGAMENTO
// Voltar ao pagamento com uma tentativa aberta recupera o estado em vez
// de começar outra compra: com pedido conhecido vai direto a ele, e sem
// pedido reenvia a mesma chave.
// ====================================================================
export function useRetomadaPedido(enviar: (entrada: EntradaPedido) => void) {
  const navigate = useNavigate();
  const usuarioId = useSessao()?.usuario.id ?? '';
  const [tentativa] = useState(() => lerTentativa(usuarioId));
  const pedidoId = tentativa?.pedidoId;
  const entrada = tentativa?.entrada;

  useEffect(() => {
    if (pedidoId) {
      void navigate({ to: '/pedidos/$pedidoId', params: { pedidoId }, replace: true });

      return;
    }

    if (entrada) {
      enviar(entrada);
    }
  }, [entrada, enviar, navigate, pedidoId]);

  return Boolean(tentativa);
}

// ====================================================================
// 4. ESTADO DO PEDIDO
// Pendente: o socket avisa, e a consulta periódica só existe sem conexão.
// Terminal: nunca mais muda. Ao chegar nele, a tentativa é encerrada, e
// recusa permite uma compra nova, com outra chave.
// ====================================================================
export function useConsultaPedido(pedidoId: string) {
  const usuarioId = useSessao()?.usuario.id ?? '';
  const socketConectado = useSocketConectado();
  const consulta = useQuery({
    queryKey: ['usuario', usuarioId, 'pedidos', pedidoId],
    queryFn: ({ signal }) => obterPedido(pedidoId, signal),
    staleTime: (estado) =>
      estado.state.data && estado.state.data.estado !== 'pendente' ? TEMPO_FRESCO_TERMINAL_MS : 0,
    refetchInterval: (estado) =>
      estado.state.data?.estado === 'pendente' && !socketConectado
        ? INTERVALO_SEM_SOCKET_MS
        : false,
  });
  const estadoPedido = consulta.data?.estado;

  useEffect(() => {
    const terminal = estadoPedido === 'confirmado' || estadoPedido === 'recusado';

    if (terminal && lerTentativa(usuarioId)?.pedidoId === pedidoId) {
      apagarTentativa(usuarioId);
    }
  }, [estadoPedido, pedidoId, usuarioId]);

  return consulta;
}
