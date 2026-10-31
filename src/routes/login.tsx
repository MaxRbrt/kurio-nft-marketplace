import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  component: () => (
    <main className="mx-auto max-w-[1200px] py-10">
      <h1 className="text-2xl font-bold">Entrar</h1>
    </main>
  ),
});
