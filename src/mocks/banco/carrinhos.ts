import Big from 'big.js';
import { carrinhoSchema, type Carrinho } from '@/contracts/compra/carrinho';
import { lerBanco } from './estado';

// ====================================================================
// 1. DONO DO CARRINHO
// Visitante e usuário usam o mesmo caminho de código; só muda o dono.
// ====================================================================
export function donoUsuario(usuarioId: string) {
  return `usuario:${usuarioId}`;
}

export function donoVisitante(visitanteId: string) {
  return `visitante:${visitanteId}`;
}

export function lerEdicao(nftId: string, edicaoId: string) {
  const nft = lerBanco().nfts.find((candidato) => candidato.id === nftId);
  const edicao = nft?.edicoes.find((candidata) => candidata.id === edicaoId);

  return nft && edicao ? { nft, edicao } : null;
}

// ====================================================================
// 2. CARRINHO COM VALORES ATUAIS
// O banco guarda só referência e quantidade. Preço e disponibilidade
// vêm do catálogo na hora, então a resposta nunca fica defasada.
// ====================================================================
export function montarCarrinho(dono: string): Carrinho {
  const itens = (lerBanco().carrinhos[dono] ?? []).flatMap((item) => {
    const encontrada = lerEdicao(item.nftId, item.edicaoId);

    if (!encontrada) {
      return [];
    }

    const { nft, edicao } = encontrada;

    return [
      {
        id: item.id,
        nftId: nft.id,
        edicaoId: edicao.id,
        nome: nft.nome,
        tokenId: nft.tokenId,
        imagemUrl: nft.imagem.url,
        rotuloEdicao: edicao.rotulo,
        precoUnitario: edicao.preco,
        quantidade: item.quantidade,
        disponivel: edicao.disponivel,
        subtotal: new Big(edicao.preco).times(item.quantidade).toFixed(),
        versaoNft: nft.versao,
      },
    ];
  });
  const subtotal = itens.reduce((soma, item) => soma.plus(item.subtotal), new Big(0));

  return carrinhoSchema.parse({ id: `carrinho-${dono}`, itens, subtotal: subtotal.toFixed() });
}
