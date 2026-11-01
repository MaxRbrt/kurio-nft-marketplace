import { useCallback, useSyncExternalStore } from 'react';

const CONSULTA_DESKTOP = '(min-width: 1024px)';

// ====================================================================
// 1. CONSULTA DE TELA
// Acompanha uma media query e redesenha quando ela muda, por exemplo ao
// girar o celular ou redimensionar a janela.
// ====================================================================
export function useConsultaTela(consulta: string) {
  const assinar = useCallback(
    (ouvinte: () => void) => {
      const lista = window.matchMedia(consulta);

      lista.addEventListener('change', ouvinte);

      return () => lista.removeEventListener('change', ouvinte);
    },
    [consulta],
  );

  return useSyncExternalStore(assinar, () => window.matchMedia(consulta).matches);
}

// ====================================================================
// 2. TELA DESKTOP
// Para telas cujos frames têm estruturas diferentes: montar um só evita
// campos duplicados no mesmo formulário. Mesmo limite do Tailwind (lg).
// ====================================================================
export function useTelaDesktop() {
  return useConsultaTela(CONSULTA_DESKTOP);
}
