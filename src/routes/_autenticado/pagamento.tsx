import { createFileRoute } from '@tanstack/react-router';
import { buscaCompraSchema } from '@/features/compra/busca';
import { PaginaPagamento } from '@/features/compra/components/pagamento/pagina-pagamento';

export const Route = createFileRoute('/_autenticado/pagamento')({
  validateSearch: (busca) => buscaCompraSchema.parse(busca),
  component: Pagina,
});

function Pagina() {
  const { cupom } = Route.useSearch();

  return <PaginaPagamento cupom={cupom} />;
}
