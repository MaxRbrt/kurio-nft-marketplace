import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: LayoutRaiz,
  notFoundComponent: PaginaNaoEncontrada,
});

function LayoutRaiz() {
  return <Outlet />;
}

function PaginaNaoEncontrada() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-medium">Página não encontrada</h1>
      <Link to="/" className="underline">
        Voltar para o início
      </Link>
    </main>
  );
}
