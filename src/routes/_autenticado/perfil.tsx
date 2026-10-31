import { createFileRoute } from '@tanstack/react-router';
import { useSair, useSessao } from '@/features/conta/usar-sessao';

export const Route = createFileRoute('/_autenticado/perfil')({
  component: Pagina,
});

function Pagina() {
  const sessao = useSessao();
  const sair = useSair();

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-10">
      <h1 className="text-2xl font-bold">Perfil do colecionador</h1>
      <p data-testid="perfil-usuario" className="mt-4">
        {sessao?.usuario.nomeExibicao}
      </p>
      <button type="button" className="mt-4 underline" onClick={() => sair.mutate()}>
        Sair
      </button>
    </main>
  );
}
