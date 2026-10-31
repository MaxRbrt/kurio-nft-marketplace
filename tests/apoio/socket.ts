import type { Page } from '@playwright/test';

// ====================================================================
// 1. OUVINTE DE EVENTOS PRIVADOS
// Abre uma conexão no protocolo do Socket.IO e se identifica com o
// token, para provar quem recebe cada evento. O fluxo completo com o
// socket.io-client fica nos testes de interface.
// ====================================================================
export function abrirOuvinte(pagina: Page, nome: string, token: string) {
  return pagina.evaluate(
    ({ nome, token }) =>
      new Promise<void>((resolve) => {
        const janela = window as unknown as { __eventos?: Record<string, string[]> };
        const eventos = (janela.__eventos ??= {});
        const socket = new WebSocket(
          `${location.origin.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`,
        );

        eventos[nome] = [];
        socket.addEventListener('message', (mensagem) => {
          const dados = String(mensagem.data);

          if (dados.startsWith('40')) {
            socket.send(`42${JSON.stringify(['session.subscribe', token])}`);
            setTimeout(resolve, 100);
          } else if (dados.startsWith('42')) {
            eventos[nome].push(dados.slice(2));
          }
        });
      }),
    { nome, token },
  );
}

export function lerEventos(pagina: Page, nome: string) {
  return pagina.evaluate((nome) => {
    const janela = window as unknown as { __eventos: Record<string, string[]> };

    return janela.__eventos[nome];
  }, nome);
}
