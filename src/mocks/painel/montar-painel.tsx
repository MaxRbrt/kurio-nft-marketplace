import { createRoot } from 'react-dom/client';
import { PainelCenarios } from './painel-cenarios';

const CHAVE_PAINEL = 'kurio:painel-cenarios';

// ====================================================================
// 1. MONTAGEM
// Raiz própria, separada da aplicação. A escolha fica na aba, para o
// painel seguir aberto ao navegar; ?painel=0 desliga.
// ====================================================================
export function montarPainelSeSolicitado() {
  const pedido = new URLSearchParams(location.search).get('painel');

  if (pedido !== null) {
    sessionStorage.setItem(CHAVE_PAINEL, pedido);
  }

  if (sessionStorage.getItem(CHAVE_PAINEL) !== '1') {
    return;
  }

  const raiz = document.createElement('div');

  document.body.append(raiz);
  createRoot(raiz).render(<PainelCenarios />);
}
