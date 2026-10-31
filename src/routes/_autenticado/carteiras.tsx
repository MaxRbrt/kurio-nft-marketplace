import { createFileRoute } from '@tanstack/react-router';
import { PaginaCarteiras } from '@/features/conta/components/pagina-carteiras';

export const Route = createFileRoute('/_autenticado/carteiras')({
  component: PaginaCarteiras,
});
