import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { clienteConsultas } from './lib/api/consultas';
import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// ====================================================================
// 1. MOCKS
// Ativados só por VITE_ENABLE_MOCKS. O worker sobe antes do React para
// a primeira requisição já ser interceptada.
// ====================================================================
async function ativarMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return;
  }

  const { worker } = await import('./mocks/browser');

  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

await ativarMocks();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={clienteConsultas}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
