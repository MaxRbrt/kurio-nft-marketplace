import { createFileRoute } from '@tanstack/react-router';
import { PaginaDetalhe } from '@/features/catalogo/components/pagina-detalhe';

export const Route = createFileRoute('/nfts/$nftId')({
  component: Pagina,
});

function Pagina() {
  const { nftId } = Route.useParams();

  return <PaginaDetalhe nftId={nftId} />;
}
