import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { BarraNavegacao } from '@/components/layout/barra-navegacao';
import { Cabecalho } from '@/components/layout/cabecalho';
import { Toaster } from '@/components/ui/sonner';
import { ProvedorTempoReal } from '@/lib/tempo-real/provedor';

export const Route = createRootRouteWithContext<{ clienteConsultas: QueryClient }>()({
  component: LayoutRaiz,
  notFoundComponent: PaginaNaoEncontrada,
  errorComponent: PaginaErro,
});

function LayoutRaiz() {
  return (
    <>
      <Cabecalho />
      <Outlet />
      <BarraNavegacao />
      <Toaster />
      <ProvedorTempoReal />
    </>
  );
}

function PaginaNaoEncontrada() {
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <Link to="/" className="text-texto-destaque underline">
        Voltar para o início
      </Link>
    </main>
  );
}

// ====================================================================
// 1. ERRO INESPERADO
// Falha de renderização fica em português e no padrão visual, com nova
// tentativa e caminho de volta, em vez da tela padrão do roteador. Tentar
// de novo recarrega a rota inteira, inclusive a checagem de sessão.
// ====================================================================
function PaginaErro({ reset }: ErrorComponentProps) {
  const router = useRouter();

  function tentarDeNovo() {
    reset();
    void router.invalidate();
  }

  return (
    <main
      role="alert"
      className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="text-sm text-muted-foreground">Tente de novo ou volte para o início.</p>
      <div className="flex gap-4">
        <button type="button" onClick={tentarDeNovo} className="text-texto-destaque underline">
          Tentar de novo
        </button>
        <Link to="/" className="text-texto-destaque underline">
          Voltar para o início
        </Link>
      </div>
    </main>
  );
}
