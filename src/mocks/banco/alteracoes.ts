import { eventoNftAtualizadoSchema } from '@/contracts/tempo-real/eventos';
import { publicarEvento } from '../socket/conexoes';
import type { NftBanco } from '../fixtures/nfts';
import { lerBanco, salvarBanco } from './estado';

// ====================================================================
// 1. ALTERAÇÃO CENTRAL DE NFT
// Toda mudança passa por aqui: altera o dado, sobe a versão, salva e
// publica o evento. Assim REST e Socket.IO nunca discordam.
// ====================================================================
export type MudancaNft = {
  edicaoId?: string;
  preco?: string;
  disponivel?: number;
};

export function alterarNft(id: string, mudanca: MudancaNft): NftBanco | null {
  const banco = lerBanco();
  const nft = banco.nfts.find((candidato) => candidato.id === id);

  if (!nft) {
    return null;
  }

  for (const edicao of nft.edicoes) {
    if (mudanca.edicaoId && edicao.id !== mudanca.edicaoId) {
      continue;
    }

    edicao.preco = mudanca.preco ?? edicao.preco;
    edicao.disponivel = mudanca.disponivel ?? edicao.disponivel;
  }

  nft.preco = nft.edicoes[0].preco;
  nft.disponivel = nft.edicoes.reduce((total, edicao) => total + edicao.disponivel, 0);
  nft.versao += 1;

  const idEvento = `evt-${banco.proximoEvento}`;
  banco.proximoEvento += 1;
  salvarBanco();

  publicarEvento(
    'nft.updated',
    eventoNftAtualizadoSchema.parse({
      idEvento,
      tipo: 'nft.updated',
      recurso: { tipo: 'nft', id: nft.id },
      versao: nft.versao,
      ocorridoEm: new Date().toISOString(),
      dados: { preco: nft.preco, disponivel: nft.disponivel, edicoes: nft.edicoes },
    }),
  );

  return nft;
}
