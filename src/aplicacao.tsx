import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import { clienteConsultas } from './lib/api/consultas';
import { apagarToken } from './lib/api/identidade';
import { aoExpirarSessao } from './lib/api/sessao-expirada';
import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree, context: { clienteConsultas } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// ====================================================================
// 1. SESSÃO EXPIRADA DURANTE O USO
// Dados privados saem do cache, e o login guarda onde o usuário estava.
// Quando chega a resposta de várias requisições, só a primeira age.
// ====================================================================
aoExpirarSessao(() => {
  apagarToken();
  clienteConsultas.removeQueries({ predicate: (consulta) => consulta.queryKey[0] !== 'sessao' });
  clienteConsultas.setQueryData(['sessao'], null);
  toast.error('Sua sessão expirou. Entre novamente.');

  const destino = router.state.location.href;

  if (!destino.startsWith('/login')) {
    void router.navigate({ to: '/login', search: { redirect: destino } });
  }
});

export function montarAplicacao() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={clienteConsultas}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
