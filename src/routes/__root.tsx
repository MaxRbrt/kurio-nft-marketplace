import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { BarraNavegacao } from '@/components/layout/barra-navegacao';
import { Cabecalho } from '@/components/layout/cabecalho';
import { Toaster } from '@/components/ui/sonner';
import { ProvedorTempoReal } from '@/lib/tempo-real/provedor';

export const Route = createRootRouteWithContext<{ clienteConsultas: QueryClient }>()({
  component: LayoutRaiz,
  notFoundComponent: PaginaNaoEncontrada,
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
