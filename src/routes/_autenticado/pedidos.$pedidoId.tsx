import { createFileRoute } from '@tanstack/react-router';
import { PaginaPedido } from '@/features/compra/components/confirmacao/pagina-pedido';

export const Route = createFileRoute('/_autenticado/pedidos/$pedidoId')({
  component: Pagina,
});

function Pagina() {
  const { pedidoId } = Route.useParams();

  return <PaginaPedido pedidoId={pedidoId} />;
}
