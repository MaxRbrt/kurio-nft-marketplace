import { createFileRoute, redirect } from '@tanstack/react-router';
import { consultaSessao } from '@/features/conta/api/sessao';
import { PaginaAutenticacao } from '@/features/conta/components/pagina-autenticacao';
import { buscaAutenticacaoSchema } from '@/features/conta/destino';

export const Route = createFileRoute('/cadastro')({
  validateSearch: (busca) => buscaAutenticacaoSchema.parse(busca),
  beforeLoad: async ({ context, search }) => {
    if (await context.clienteConsultas.ensureQueryData(consultaSessao)) {
      throw redirect({ to: search.redirect ?? '/' });
    }
  },
  component: Pagina,
});

function Pagina() {
  return <PaginaAutenticacao modo="cadastro" busca={Route.useSearch()} />;
}
