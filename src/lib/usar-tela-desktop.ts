import { useSyncExternalStore } from 'react';

const CONSULTA_DESKTOP = '(min-width: 1024px)';

function assinar(ouvinte: () => void) {
  const consulta = window.matchMedia(CONSULTA_DESKTOP);

  consulta.addEventListener('change', ouvinte);

  return () => consulta.removeEventListener('change', ouvinte);
}

// ====================================================================
// 1. TELA DESKTOP
// Para telas cujos frames têm estruturas diferentes: montar um só evita
// campos duplicados no mesmo formulário. Mesmo limite do Tailwind (lg).
// ====================================================================
export function useTelaDesktop() {
  return useSyncExternalStore(assinar, () => window.matchMedia(CONSULTA_DESKTOP).matches);
}
