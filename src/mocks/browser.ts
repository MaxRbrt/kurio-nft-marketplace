import { setupWorker } from 'msw/browser';
import { retomarPedidosPendentes } from './banco/pedidos';
import { handlersControle } from './controle/handlers';
import { handlersFavoritos } from './rest/catalogo/favoritos';
import { handlersNfts } from './rest/catalogo/nfts';
import { handlersCarrinho } from './rest/compra/carrinho';
import { handlersCotacoes } from './rest/compra/cotacoes';
import { handlersPedidos } from './rest/compra/pedidos';
import { handlersCarteiras } from './rest/conta/carteiras';
import { handlersPerfil } from './rest/conta/perfil';
import { handlersSessao } from './rest/conta/sessao';
import { handlersSocket } from './socket/conexoes';

export const worker = setupWorker(
  ...handlersControle,
  ...handlersSessao,
  ...handlersPerfil,
  ...handlersCarteiras,
  ...handlersFavoritos,
  ...handlersNfts,
  ...handlersCarrinho,
  ...handlersCotacoes,
  ...handlersPedidos,
  ...handlersSocket,
);

retomarPedidosPendentes();
