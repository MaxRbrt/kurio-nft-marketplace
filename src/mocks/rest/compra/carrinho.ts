import { http, HttpResponse } from 'msw';
import {
  CABECALHO_VISITANTE,
  entradaItemCarrinhoSchema,
  entradaQuantidadeSchema,
} from '@/contracts/compra/carrinho';
import { donoUsuario, donoVisitante, lerEdicao, montarCarrinho } from '../../banco/carrinhos';
import { lerBanco, salvarBanco } from '../../banco/estado';
import { autenticar } from '../conta/autenticacao';
import { lerCorpo, responderErro } from '../respostas';
import { lerDono } from './dono';

// ====================================================================
// 1. ESTOQUE INSUFICIENTE
// Conflito com a quantidade disponível, para a interface mostrar o limite.
// ====================================================================
function responderIndisponivel(disponivel: number) {
  return HttpResponse.json(
    {
      erro: {
        codigo: 'EDICAO_INDISPONIVEL',
        mensagem: 'Quantidade maior que a disponível',
        detalhes: { disponivel },
      },
    },
    { status: 409 },
  );
}

// ====================================================================
// 2. HANDLERS
// Mesma edição soma quantidade em vez de duplicar a linha. Toda escrita
// respeita a disponibilidade por NFT e edição.
// ====================================================================
export const handlersCarrinho = [
  http.get('/api/carrinho', ({ request }) => {
    const leitura = lerDono(request);

    return 'erro' in leitura ? leitura.erro : HttpResponse.json(montarCarrinho(leitura.dono));
  }),

  http.post('/api/carrinho/itens', async ({ request }) => {
    const leitura = lerDono(request);

    if ('erro' in leitura) {
      return leitura.erro;
    }

    const entrada = await lerCorpo(request, entradaItemCarrinhoSchema);

    if ('erro' in entrada) {
      return entrada.erro;
    }

    const { nftId, edicaoId, quantidade } = entrada.dados;
    const encontrada = lerEdicao(nftId, edicaoId);

    if (!encontrada) {
      return responderErro(404, 'NAO_ENCONTRADO', 'Edição não encontrada');
    }

    const banco = lerBanco();
    const itens = banco.carrinhos[leitura.dono] ?? [];
    const existente = itens.find((item) => item.nftId === nftId && item.edicaoId === edicaoId);
    const total = (existente?.quantidade ?? 0) + quantidade;

    if (total > encontrada.edicao.disponivel) {
      return responderIndisponivel(encontrada.edicao.disponivel);
    }

    if (existente) {
      existente.quantidade = total;
    } else {
      itens.push({ id: `item-${crypto.randomUUID()}`, nftId, edicaoId, quantidade });
    }

    banco.carrinhos[leitura.dono] = itens;
    salvarBanco();

    return HttpResponse.json(montarCarrinho(leitura.dono), { status: 201 });
  }),

  http.patch('/api/carrinho/itens/:id', async ({ request, params }) => {
    const leitura = lerDono(request);

    if ('erro' in leitura) {
      return leitura.erro;
    }

    const entrada = await lerCorpo(request, entradaQuantidadeSchema);

    if ('erro' in entrada) {
      return entrada.erro;
    }

    const item = lerBanco().carrinhos[leitura.dono]?.find(
      (candidato) => candidato.id === params.id,
    );
    const encontrada = item && lerEdicao(item.nftId, item.edicaoId);

    if (!item || !encontrada) {
      return responderErro(404, 'NAO_ENCONTRADO', 'Item não encontrado');
    }

    if (entrada.dados.quantidade > encontrada.edicao.disponivel) {
      return responderIndisponivel(encontrada.edicao.disponivel);
    }

    item.quantidade = entrada.dados.quantidade;
    salvarBanco();

    return HttpResponse.json(montarCarrinho(leitura.dono));
  }),

  http.delete('/api/carrinho/itens/:id', ({ request, params }) => {
    const leitura = lerDono(request);

    if ('erro' in leitura) {
      return leitura.erro;
    }

    const banco = lerBanco();
    const itens = banco.carrinhos[leitura.dono] ?? [];

    if (!itens.some((item) => item.id === params.id)) {
      return responderErro(404, 'NAO_ENCONTRADO', 'Item não encontrado');
    }

    banco.carrinhos[leitura.dono] = itens.filter((item) => item.id !== params.id);
    salvarBanco();

    return HttpResponse.json(montarCarrinho(leitura.dono));
  }),

  // ==================================================================
  // 3. VISITANTE QUE ENTROU NA CONTA
  // Junta os carrinhos somando quantidades, limitadas ao disponível. O
  // carrinho de visitante deixa de existir, para não mesclar duas vezes.
  // ==================================================================
  http.post('/api/carrinho/mesclar', ({ request }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const banco = lerBanco();
    const dono = donoUsuario(sessao.usuario.id);
    const visitanteId = request.headers.get(CABECALHO_VISITANTE);
    const origem = visitanteId ? donoVisitante(visitanteId) : null;
    const itens = banco.carrinhos[dono] ?? [];

    for (const item of origem ? (banco.carrinhos[origem] ?? []) : []) {
      const encontrada = lerEdicao(item.nftId, item.edicaoId);
      const existente = itens.find(
        (candidato) => candidato.nftId === item.nftId && candidato.edicaoId === item.edicaoId,
      );
      const desejado = (existente?.quantidade ?? 0) + item.quantidade;
      const quantidade = Math.min(desejado, encontrada?.edicao.disponivel ?? 0);

      if (quantidade <= 0) {
        continue;
      }

      if (existente) {
        existente.quantidade = quantidade;
      } else {
        itens.push({ ...item, quantidade });
      }
    }

    banco.carrinhos[dono] = itens;

    if (origem) {
      delete banco.carrinhos[origem];
    }

    salvarBanco();

    return HttpResponse.json(montarCarrinho(dono));
  }),
];
