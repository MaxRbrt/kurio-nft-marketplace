import { io } from 'socket.io-client';

// ====================================================================
// 1. CLIENTE SOCKET.IO
// Só WebSocket: polling viraria HTTP, sem handler no ambiente de mocks.
// A conexão começa manual para seguir o ciclo de vida de quem a usa.
// ====================================================================
export function criarSocket() {
  return io({ transports: ['websocket'], autoConnect: false });
}
