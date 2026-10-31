import { http, HttpResponse } from 'msw';
import {
  carteiraSchema,
  conexaoCarteiraSchema,
  entradaCarteiraSchema,
} from '@/contracts/conta/carteiras';
import { lerBanco, salvarBanco } from '../banco/estado';
import type { CarteiraBanco } from '../fixtures/carteiras';
import type { UsuarioBanco } from '../fixtures/usuarios';
import { autenticar } from './autenticacao';
import { lerCorpo, responderErro } from './respostas';

// ====================================================================
// 1. POSSE DA CARTEIRA
// Inexistente é 404. Carteira de outra pessoa é 403: um usuário nunca
// lê nem altera a carteira de outro.
// ====================================================================
function buscarCarteira(id: unknown, usuario: UsuarioBanco): CarteiraBanco | Response {
  const carteira = lerBanco().carteiras.find((candidata) => candidata.id === id);

  if (!carteira) {
    return responderErro(404, 'NAO_ENCONTRADO', 'Carteira não encontrada');
  }

  if (carteira.usuarioId !== usuario.id) {
    return responderErro(403, 'SEM_PERMISSAO', 'Sem permissão para esta carteira');
  }

  return carteira;
}

function papelOcupado(usuario: UsuarioBanco, papel: CarteiraBanco['papel'], ignorarId?: string) {
  return lerBanco().carteiras.some(
    (carteira) =>
      carteira.usuarioId === usuario.id && carteira.papel === papel && carteira.id !== ignorarId,
  );
}

function responderPapelOcupado() {
  return responderErro(422, 'VALIDACAO', 'Papel de carteira já ocupado', {
    papel: 'Você já tem uma carteira neste papel',
  });
}

// ====================================================================
// 2. CADASTRO E EDIÇÃO
// Cada usuário tem no máximo uma principal e uma secundária, como no
// frame de carteiras.
// ====================================================================
export const handlersCarteiras = [
  http.get('/api/carteiras', ({ request }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const carteiras = lerBanco().carteiras.filter(
      (carteira) => carteira.usuarioId === sessao.usuario.id,
    );

    return HttpResponse.json(carteiraSchema.array().parse(carteiras));
  }),

  http.post('/api/carteiras', async ({ request }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const leitura = await lerCorpo(request, entradaCarteiraSchema);

    if ('erro' in leitura) {
      return leitura.erro;
    }

    if (papelOcupado(sessao.usuario, leitura.dados.papel)) {
      return responderPapelOcupado();
    }

    const carteira: CarteiraBanco = {
      ...leitura.dados,
      id: `carteira-${crypto.randomUUID()}`,
      usuarioId: sessao.usuario.id,
    };

    lerBanco().carteiras.push(carteira);
    salvarBanco();

    return HttpResponse.json(carteiraSchema.parse(carteira), { status: 201 });
  }),

  http.patch('/api/carteiras/:id', async ({ request, params }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const carteira = buscarCarteira(params.id, sessao.usuario);

    if (carteira instanceof Response) {
      return carteira;
    }

    const leitura = await lerCorpo(request, entradaCarteiraSchema);

    if ('erro' in leitura) {
      return leitura.erro;
    }

    if (papelOcupado(sessao.usuario, leitura.dados.papel, carteira.id)) {
      return responderPapelOcupado();
    }

    Object.assign(carteira, leitura.dados);
    salvarBanco();

    return HttpResponse.json(carteiraSchema.parse(carteira));
  }),

  // ==================================================================
  // 3. CONEXÃO SIMULADA
  // Sem extensão real: o cenário decide entre conexão e recusa, e a
  // desconexão pode acontecer a qualquer momento.
  // ==================================================================
  http.post('/api/carteiras/:id/conexao', ({ request, params }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const carteira = buscarCarteira(params.id, sessao.usuario);

    if (carteira instanceof Response) {
      return carteira;
    }

    const banco = lerBanco();

    if (banco.recusarConexaoCarteira) {
      return responderErro(409, 'CONEXAO_CARTEIRA_RECUSADA', 'Conexão recusada pela carteira');
    }

    if (!banco.carteirasConectadas.includes(carteira.id)) {
      banco.carteirasConectadas.push(carteira.id);
      salvarBanco();
    }

    return HttpResponse.json(
      conexaoCarteiraSchema.parse({ carteiraId: carteira.id, estado: 'conectada' }),
    );
  }),

  http.delete('/api/carteiras/:id/conexao', ({ request, params }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const carteira = buscarCarteira(params.id, sessao.usuario);

    if (carteira instanceof Response) {
      return carteira;
    }

    const banco = lerBanco();
    banco.carteirasConectadas = banco.carteirasConectadas.filter((id) => id !== carteira.id);
    salvarBanco();

    return HttpResponse.json(
      conexaoCarteiraSchema.parse({ carteiraId: carteira.id, estado: 'desconectada' }),
    );
  }),
];
