import { useEffect, useState } from 'react';
import { criarSocket } from './socket';

// ====================================================================
// 1. CONEXÃO DA APLICAÇÃO
// Uma conexão enquanto a aplicação estiver aberta, liberada ao sair. O
// estado fica oculto na página para os testes observarem o socket real.
// Aplicar eventos no cache entra junto com o fluxo de compra.
// ====================================================================
export function ProvedorTempoReal() {
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
    <div hidden>
      <p data-testid="socket-estado">{estado}</p>
      <p data-testid="socket-conexoes">{totalConexoes}</p>
      <p data-testid="socket-ultimo-evento">{ultimoEvento}</p>
    </div>
  );
}
