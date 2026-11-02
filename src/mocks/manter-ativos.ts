import type { AxiosInstance } from 'axios';

const LIMITE_CONFIRMACAO_MS = 1000;
const EVENTOS_DE_INTERACAO = ['pointerdown', 'keydown'];

// ====================================================================
// 1. CONFIRMAÇÃO DO WORKER
// MOCK_ACTIVATE registra a página no worker e não tem outro efeito. O
// limite evita prender a requisição se o worker não responder.
// ====================================================================
function confirmarAtivacao(registro: ServiceWorkerRegistration) {
  return new Promise<void>((pronto) => {
    const canal = navigator.serviceWorker;
    const aoResponder = (evento: MessageEvent) => {
      if (evento.data?.type === 'MOCKING_ENABLED') {
        encerrar();
      }
    };
    const limite = setTimeout(encerrar, LIMITE_CONFIRMACAO_MS);

    function encerrar() {
      clearTimeout(limite);
      canal.removeEventListener('message', aoResponder);
      pronto();
    }

    canal.addEventListener('message', aoResponder);
    registro.active?.postMessage('MOCK_ACTIVATE');
  });
}

// ====================================================================
// 2. MOCKS ATIVOS DEPOIS DE O NAVEGADOR DESLIGAR O SERVICE WORKER
// O navegador desliga service worker parado, como em aba em segundo plano.
// O worker do MSW guarda só em memória as páginas ativas: ao religar, ele
// não reconhece a página, e as chamadas à API iriam para a rede, onde não
// há API. Por isso cada chamada espera o worker confirmar o registro. Voltar
// à aba e interagir religam o worker antes, para a resposta sair mais rápido.
// ====================================================================
export function manterMocksAtivos(registro: ServiceWorkerRegistration, cliente: AxiosInstance) {
  const religar = () => registro.active?.postMessage('MOCK_ACTIVATE');

  document.addEventListener('visibilitychange', religar);

  for (const evento of EVENTOS_DE_INTERACAO) {
    window.addEventListener(evento, religar, { capture: true, passive: true });
  }

  cliente.interceptors.request.use(async (configuracao) => {
    await confirmarAtivacao(registro);

    return configuracao;
  });
}
