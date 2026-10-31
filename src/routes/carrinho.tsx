import { createFileRoute } from '@tanstack/react-router';
import { buscaCompraSchema } from '@/features/compra/busca';
import { PaginaCarrinho } from '@/features/compra/components/pagina-carrinho';

export const Route = createFileRoute('/carrinho')({
  validateSearch: (busca) => buscaCompraSchema.parse(busca),
  component: Pagina,
});

function Pagina() {
  const { cupom } = Route.useSearch();

  return <PaginaCarrinho cupom={cupom} />;
}
