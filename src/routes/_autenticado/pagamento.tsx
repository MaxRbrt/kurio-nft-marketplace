import { createFileRoute } from '@tanstack/react-router';
import { buscaCompraSchema } from '@/features/compra/busca';

export const Route = createFileRoute('/_autenticado/pagamento')({
  validateSearch: (busca) => buscaCompraSchema.parse(busca),
  component: () => (
    <main className="mx-auto max-w-[1200px] px-4 py-10">
      <h1 className="text-2xl font-bold">Pagamento</h1>
    </main>
  ),
});
