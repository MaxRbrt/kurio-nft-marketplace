import { setupWorker } from 'msw/browser';
import { handlersControle } from './controle/handlers';
import { handlersCarteiras } from './rest/conta/carteiras';
import { handlersFavoritos } from './rest/catalogo/favoritos';
import { handlersNfts } from './rest/catalogo/nfts';
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
  ...handlersSocket,
);
