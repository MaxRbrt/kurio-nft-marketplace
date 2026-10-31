import { useEffect, useState } from 'react';
import { useSessao } from '@/features/conta/usar-sessao';
import { lerToken } from '@/lib/api/identidade';
import { criarSocket } from './socket';

// ====================================================================
// 1. CONEXÃO DA APLICAÇÃO
// Uma conexão por sessão: entrar, sair ou trocar de usuário encerra a
// anterior, e eventos privados não vazam. O estado fica oculto na página
// para os testes observarem o socket real.
// ====================================================================
export function ProvedorTempoReal() {
  const [estado, setEstado] = useState('Conectando');
  const [totalConexoes, setTotalConexoes] = useState(0);
  const [ultimoEvento, setUltimoEvento] = useState('Nenhum');

  const usuarioId = useSessao()?.usuario.id;

  useEffect(() => {
    const socket = criarSocket();

    socket.on('connect', () => {
      setEstado('Conectado');
      setTotalConexoes((total) => total + 1);

      if (usuarioId) {
        socket.emit('session.subscribe', lerToken());
      }
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
  }, [usuarioId]);

  return (
    <div hidden>
      <p data-testid="socket-estado">{estado}</p>
      <p data-testid="socket-conexoes">{totalConexoes}</p>
      <p data-testid="socket-ultimo-evento">{ultimoEvento}</p>
    </div>
  );
}
