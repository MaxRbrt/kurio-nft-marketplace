import { setupWorker } from 'msw/browser';
import { handlersControle } from './controle/handlers';
import { handlersSocket } from './socket/conexoes';

export const worker = setupWorker(...handlersControle, ...handlersSocket);
