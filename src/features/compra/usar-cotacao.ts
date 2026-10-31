import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Rede } from '@/contracts/comum/valores';
import { ErroApi } from '@/lib/api/erros';
import { cotar } from './api/cotacoes';
import { useChaveCarrinho } from './usar-carrinho';

const CODIGOS_DE_CUPOM = ['CUPOM_INVALIDO', 'CUPOM_EXPIRADO'];

function erroDeCupom(erro: unknown): erro is ErroApi {
  return erro instanceof ErroApi && CODIGOS_DE_CUPOM.includes(erro.codigo);
}

// ====================================================================
// 1. COTAÇÃO DO RESUMO
// Nunca fica fresca: os valores vêm sempre do servidor. A chave leva o
// cupom e a rede, com o carrinho como prefixo: mudá-lo recalcula tudo.
// ====================================================================
function useConsultaCotacao(
  cupom: string | undefined,
  rede: Rede | undefined,
  habilitada: boolean,
) {
  const queryKey = [...useChaveCarrinho(), 'cotacao', cupom ?? null, rede ?? null];

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => cotar({ cupom, rede }, signal),
    enabled: habilitada,
    staleTime: 0,
  });
}

type ParametrosResumo = {
  cupom: string | undefined;
  rede?: Rede;
  habilitada: boolean;
  trocarCupom: (codigo: string | undefined) => void;
};

// ====================================================================
// 2. RESUMO COM CUPOM
// Aplicar testa o código antes de gravar na URL: código recusado mostra o
// erro e mantém o resumo. Cupom recusado vindo da URL (acesso direto ou
// vencido depois): mesmo aviso, com o resumo calculado sem ele.
// ====================================================================
export function useResumoCompra({ cupom, rede, habilitada, trocarCupom }: ParametrosResumo) {
  const clienteConsultas = useQueryClient();
  const chave = useChaveCarrinho();
  const comCupom = useConsultaCotacao(cupom, rede, habilitada && Boolean(cupom));
  const cupomRecusado = erroDeCupom(comCupom.error);
  const semCupom = useConsultaCotacao(undefined, rede, habilitada && (!cupom || cupomRecusado));
  const cotacao = cupom && !cupomRecusado ? comCupom : semCupom;

  const aplicacao = useMutation({
    mutationFn: (codigo: string) => cotar({ cupom: codigo, rede }),
    onSuccess: (resposta) => {
      clienteConsultas.setQueryData([...chave, 'cotacao', resposta.cupom, rede ?? null], resposta);
      trocarCupom(resposta.cupom ?? undefined);
    },
    onError: (erro) => {
      if (!erroDeCupom(erro)) {
        toast.error(erro instanceof ErroApi ? erro.message : 'Não foi possível aplicar o código.');
      }
    },
  });

  const erroAplicacao = erroDeCupom(aplicacao.error) ? aplicacao.error.message : null;
  const erroUrl = erroDeCupom(comCupom.error) ? comCupom.error.message : null;

  return {
    cotacao,
    cupomAplicado: cotacao.data?.cupom ?? null,
    erroCupom: erroAplicacao ?? erroUrl,
    aplicandoCupom: aplicacao.isPending,
    aplicarCupom: (codigo: string) => aplicacao.mutate(codigo.trim()),
    removerCupom: () => {
      aplicacao.reset();
      trocarCupom(undefined);
    },
  };
}

export type ResumoCompra = ReturnType<typeof useResumoCompra>;
