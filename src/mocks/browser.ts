import { setupWorker } from 'msw/browser';
import { handlersControle } from './controle';
import { handlersSocket } from './socket';

export const worker = setupWorker(...handlersControle, ...handlersSocket);
