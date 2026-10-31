import { setupWorker } from 'msw/browser';
import { handlersControle } from './controle/handlers';
import { handlersCarteiras } from './rest/carteiras';
import { handlersFavoritos } from './rest/favoritos';
import { handlersNfts } from './rest/nfts';
import { handlersPerfil } from './rest/perfil';
import { handlersSessao } from './rest/sessao';
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
