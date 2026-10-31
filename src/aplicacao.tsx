import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { clienteConsultas } from './lib/api/consultas';
import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree, context: { clienteConsultas } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function montarAplicacao() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={clienteConsultas}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
