import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { consultaSessao } from '@/features/conta/api/sessao';

// ====================================================================
// 1. ROTAS PRIVADAS
// A checagem roda antes de montar a tela: conteúdo privado não pisca
// nem dispara consultas. Sem sessão, vai ao login guardando o destino.
// ====================================================================
export const Route = createFileRoute('/_autenticado')({
  beforeLoad: async ({ context, location }) => {
    if (!(await context.clienteConsultas.ensureQueryData(consultaSessao))) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: Outlet,
});
