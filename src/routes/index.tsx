import { createFileRoute } from '@tanstack/react-router';
import { buscaCatalogoSchema } from '@/features/catalogo/busca';
import { PaginaInicial } from '@/features/catalogo/components/pagina-inicial';

export const Route = createFileRoute('/')({
  validateSearch: (busca) => buscaCatalogoSchema.parse(busca),
  component: PaginaInicial,
});
