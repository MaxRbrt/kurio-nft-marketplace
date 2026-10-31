import { setupWorker } from 'msw/browser';
import { handlersControle } from './controle/handlers';
import { handlersNfts } from './rest/nfts';
import { handlersSocket } from './socket/conexoes';

export const worker = setupWorker(...handlersControle, ...handlersNfts, ...handlersSocket);
