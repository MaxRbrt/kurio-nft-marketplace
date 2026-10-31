import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { criarSocket } from '@/lib/tempo-real/socket';

export const Route = createFileRoute('/')({
  component: PaginaInicial,
});

function PaginaInicial() {
  const [estado, setEstado] = useState('Conectando');
  const [totalConexoes, setTotalConexoes] = useState(0);
  const [ultimoEvento, setUltimoEvento] = useState('Nenhum');

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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-medium">KURIO</h1>
      <p data-testid="socket-estado">{estado}</p>
      <p data-testid="socket-conexoes">{totalConexoes}</p>
      <p data-testid="socket-ultimo-evento">{ultimoEvento}</p>
    </main>
  );
}
