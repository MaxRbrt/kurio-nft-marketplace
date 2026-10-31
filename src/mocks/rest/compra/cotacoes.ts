import Big from 'big.js';
import { http, HttpResponse } from 'msw';
import {
  cotacaoSchema,
  entradaCotacaoSchema,
  type EntradaCotacao,
} from '@/contracts/compra/cotacao';
import type { Rede } from '@/contracts/comum/valores';
import { donoUsuario, montarCarrinho } from '../../banco/carrinhos';
import { lerBanco, salvarBanco, type CotacaoBanco } from '../../banco/estado';
import { autenticar } from '../conta/autenticacao';
import { lerCorpo, responderErro } from '../respostas';

const VALIDADE_COTACAO_MS = 15 * 60 * 1000;
const TAXA_POR_REDE: Record<Rede, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
};

// ====================================================================
// 1. CÁLCULO DA COTAÇÃO
// Único lugar que soma valores da compra, sempre com decimal. Serve à
// cotação e à revalidação do pedido, então as duas nunca divergem.
// ====================================================================
export function calcularCotacao(
  dono: string,
  entrada: EntradaCotacao,
): { cotacao: CotacaoBanco } | { erro: Response } {
  const carrinho = montarCarrinho(dono);

  if (carrinho.itens.length === 0) {
    return { erro: responderErro(422, 'VALIDACAO', 'O carrinho está vazio') };
  }

  const semEstoque = carrinho.itens.find((item) => item.quantidade > item.disponivel);

  if (semEstoque) {
    return {
      erro: HttpResponse.json(
        {
          erro: {
            codigo: 'EDICAO_INDISPONIVEL',
            mensagem: `${semEstoque.nome} não tem a quantidade pedida`,
            detalhes: { itemId: semEstoque.id, disponivel: semEstoque.disponivel },
          },
        },
        { status: 409 },
      ),
    };
  }

  const codigo = entrada.cupom?.toUpperCase();
  const cupom = lerBanco().cupons.find((candidato) => candidato.codigo === codigo);

  if (codigo && !cupom) {
    return {
      erro: responderErro(422, 'CUPOM_INVALIDO', 'Código promocional inválido', {
        cupom: 'Código promocional inválido',
      }),
    };
  }

  if (cupom && new Date(cupom.expiraEm).getTime() <= Date.now()) {
    return {
      erro: responderErro(422, 'CUPOM_EXPIRADO', 'Código promocional expirado', {
        cupom: 'Código promocional expirado',
      }),
    };
  }

  const desconto = cupom ? new Big(carrinho.subtotal).times(cupom.percentual).div(100) : new Big(0);
  const taxaRede = TAXA_POR_REDE[entrada.rede ?? 'ethereum'];

  return {
    cotacao: {
      ...cotacaoSchema.parse({
        id: `cotacao-${crypto.randomUUID()}`,
        itens: carrinho.itens,
        subtotal: carrinho.subtotal,
        desconto: desconto.toFixed(),
        taxaRede,
        total: new Big(carrinho.subtotal).minus(desconto).plus(taxaRede).toFixed(),
        cupom: cupom?.codigo ?? null,
        expiraEm: new Date(Date.now() + VALIDADE_COTACAO_MS).toISOString(),
      }),
      dono,
      entrada,
    },
  };
}

export const handlersCotacoes = [
  http.post('/api/cotacoes', async ({ request }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const entrada = await lerCorpo(request, entradaCotacaoSchema);

    if ('erro' in entrada) {
      return entrada.erro;
    }

    const resultado = calcularCotacao(donoUsuario(sessao.usuario.id), entrada.dados);

    if ('erro' in resultado) {
      return resultado.erro;
    }

    lerBanco().cotacoes[resultado.cotacao.id] = resultado.cotacao;
    salvarBanco();

    return HttpResponse.json(cotacaoSchema.parse(resultado.cotacao), { status: 201 });
  }),
];
