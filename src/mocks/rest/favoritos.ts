import { http, HttpResponse } from 'msw';
import { favoritosSchema } from '@/contracts/catalogo/favoritos';
import { lerBanco, salvarBanco } from '../banco/estado';
import { autenticar } from './autenticacao';
import { responderErro } from './respostas';

// ====================================================================
// 1. FAVORITOS POR USUÁRIO
// Inclusão e remoção são idempotentes e devolvem a lista completa, que
// a interface usa para reconciliar depois da atualização otimista.
// ====================================================================
function responderLista(usuarioId: string) {
  return HttpResponse.json(
    favoritosSchema.parse({ nftIds: lerBanco().favoritos[usuarioId] ?? [] }),
  );
}

export const handlersFavoritos = [
  http.get('/api/favoritos', ({ request }) => {
    const sessao = autenticar(request);

    return 'erro' in sessao ? sessao.erro : responderLista(sessao.usuario.id);
  }),

  http.put('/api/favoritos/:nftId', ({ request, params }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const banco = lerBanco();
    const nftId = String(params.nftId);

    if (!banco.nfts.some((nft) => nft.id === nftId)) {
      return responderErro(404, 'NAO_ENCONTRADO', 'NFT não encontrado');
    }

    const atuais = banco.favoritos[sessao.usuario.id] ?? [];
    banco.favoritos[sessao.usuario.id] = atuais.includes(nftId) ? atuais : [...atuais, nftId];
    salvarBanco();

    return responderLista(sessao.usuario.id);
  }),

  http.delete('/api/favoritos/:nftId', ({ request, params }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const banco = lerBanco();
    const atuais = banco.favoritos[sessao.usuario.id] ?? [];
    banco.favoritos[sessao.usuario.id] = atuais.filter((nftId) => nftId !== params.nftId);
    salvarBanco();

    return responderLista(sessao.usuario.id);
  }),
];
