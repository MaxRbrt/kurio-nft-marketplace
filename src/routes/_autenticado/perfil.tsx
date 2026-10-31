import { createFileRoute } from '@tanstack/react-router';
import { PaginaPerfil } from '@/features/conta/components/pagina-perfil';

export const Route = createFileRoute('/_autenticado/perfil')({
  component: PaginaPerfil,
});
