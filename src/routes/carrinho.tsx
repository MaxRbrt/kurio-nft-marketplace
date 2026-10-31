import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/carrinho')({
  component: () => (
    <main className="mx-auto max-w-[1200px] py-10">
      <h1 className="text-2xl font-bold">Carrinho de NFTs</h1>
    </main>
  ),
});
