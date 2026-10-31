import './index.css';

// ====================================================================
// 1. ORDEM DE INICIALIZAÇÃO
// Os mocks sobem antes da aplicação ser importada. O socket.io-client
// guarda o WebSocket global ao carregar: importado antes, ele ficaria
// com o original e nunca passaria pela interceptação do MSW.
// ====================================================================
async function ativarMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return;
  }

  const { worker } = await import('./mocks/browser');

  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });

  const { montarPainelSeSolicitado } = await import('./mocks/painel/montar-painel');

  montarPainelSeSolicitado();
}

await ativarMocks();

const { montarAplicacao } = await import('./aplicacao');

montarAplicacao();
