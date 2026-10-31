import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Rodape } from '@/components/layout/rodape';
import { listarNfts } from '@/features/catalogo/api/nfts';
import { ErroApi } from '@/lib/api/erros';
import { criarSocket } from '@/lib/tempo-real/socket';

export const Route = createFileRoute('/')({
  component: PaginaInicial,
});

function PaginaInicial() {
  const [estado, setEstado] = useState('Conectando');
  const [totalConexoes, setTotalConexoes] = useState(0);
  const [ultimoEvento, setUltimoEvento] = useState('Nenhum');
  const [busca, setBusca] = useState('');
  const consulta = useQuery({
    queryKey: ['nfts', 'lista', { busca }],
    queryFn: ({ signal }) => listarNfts({ busca: busca || undefined }, signal),
  });

  useEffect(() => {
    const socket = criarSocket();

    socket.on('connect', () => {
      setEstado('Conectado');
      setTotalConexoes((total) => total + 1);
    });
    socket.on('disconnect', () => {
      setEstado('Desconectado');
    });
    socket.on('nft.updated', (evento: unknown) => {
      setUltimoEvento(JSON.stringify(evento));
    });
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <>
      <main className="flex flex-col items-center gap-2 py-10">
        <h1 className="text-2xl font-medium">KURIO</h1>
        <p data-testid="socket-estado">{estado}</p>
        <p data-testid="socket-conexoes">{totalConexoes}</p>
        <p data-testid="socket-ultimo-evento">{ultimoEvento}</p>
        <input
          aria-label="Buscar NFTs"
          className="border px-2"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
        {consulta.isPending && <p data-testid="nfts-carregando">Carregando</p>}
        {consulta.data && (
          <>
            <p data-testid="nfts-total">{consulta.data.paginacao.totalItens}</p>
            <p data-testid="nfts-primeiro">{consulta.data.itens[0]?.nome ?? 'Nenhum resultado'}</p>
          </>
        )}
        {consulta.isError && (
          <>
            <p data-testid="nfts-erro">
              {consulta.error instanceof ErroApi ? consulta.error.codigo : 'DESCONHECIDO'}
            </p>
            <button className="border px-2" onClick={() => void consulta.refetch()}>
              Tentar novamente
            </button>
          </>
        )}
      </main>
      <Rodape />
    </>
  );
}
