import './index.css';

const LIMITE_PARA_INICIAR_MS = 15_000;

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
  const registro = await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
  const { manterMocksAtivos } = await import('./mocks/manter-ativos');
  const { clienteApi } = await import('./lib/api/cliente');

  if (registro) {
    manterMocksAtivos(registro, clienteApi);
  }

  const { montarPainelSeSolicitado } = await import('./mocks/painel/montar-painel');

  montarPainelSeSolicitado();
}

async function iniciar() {
  await ativarMocks();

  const { montarAplicacao } = await import('./aplicacao');

  montarAplicacao();
}

// ====================================================================
// 2. FALHA AO INICIAR
// O worker.start() do MSW espera o service worker sem limite de tempo, e
// um pacote pode falhar ao baixar. Sem aplicação montada, a abertura vira
// um aviso com nova tentativa, em vez de ficar presa. Se a aplicação ainda
// montar depois do aviso, ela o substitui normalmente.
// ====================================================================
function avisarFalha() {
  const abertura = document.querySelector('.abertura');

  if (!abertura) {
    return;
  }

  const aviso = document.createElement('p');
  const botao = document.createElement('button');

  aviso.textContent = 'Não foi possível iniciar a aplicação.';
  botao.type = 'button';
  botao.textContent = 'Tentar de novo';
  botao.className = 'h-10 rounded-md bg-primary px-4 font-bold text-primary-foreground';
  botao.addEventListener('click', () => location.reload());
  abertura.setAttribute('role', 'alert');
  abertura.replaceChildren(aviso, botao);
}

const limite = setTimeout(avisarFalha, LIMITE_PARA_INICIAR_MS);

try {
  await iniciar();
} catch (erro) {
  console.error(erro);
  avisarFalha();
} finally {
  clearTimeout(limite);
}
