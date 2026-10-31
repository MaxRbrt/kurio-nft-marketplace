import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSessao } from '@/features/conta/usar-sessao';
import { lerToken } from '@/lib/api/identidade';
import { definirSocketConectado } from './estado';
import { criarProcessadorEventos } from './processador';
import { criarSocket } from './socket';

// ====================================================================
// 1. CONEXÃO DA APLICAÇÃO
// Uma conexão por sessão: entrar, sair ou trocar de usuário encerra a
// anterior, e eventos privados não vazam. Reconectar reconcilia pela API.
// O estado fica oculto na página para os testes observarem o socket real.
// ====================================================================
export function ProvedorTempoReal() {
  const clienteConsultas = useQueryClient();
  const [estado, setEstado] = useState('Conectando');
  const [totalConexoes, setTotalConexoes] = useState(0);
  const [ultimoEvento, setUltimoEvento] = useState('Nenhum');
  const [anuncio, setAnuncio] = useState('');

  const usuarioId = useSessao()?.usuario.id;

  useEffect(() => {
    const socket = criarSocket();
    const processador = criarProcessadorEventos(clienteConsultas, usuarioId, (mensagem) => {
      setAnuncio(mensagem);
      toast.info(mensagem);
    });
    let jaConectou = false;

    socket.on('connect', () => {
      setEstado('Conectado');
      setTotalConexoes((total) => total + 1);
      definirSocketConectado(true);

      if (usuarioId) {
        socket.emit('session.subscribe', lerToken());
      }

      if (jaConectou) {
        processador.reconciliar();
      }

      jaConectou = true;
    });
    socket.on('disconnect', () => {
      setEstado('Desconectado');
      definirSocketConectado(false);
    });
    socket.on('nft.updated', (evento: unknown) => {
      setUltimoEvento(JSON.stringify(evento));
      processador.nftAtualizado(evento);
    });
    socket.on('order.updated', (evento: unknown) => {
      processador.pedidoAtualizado(evento);
    });
    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      definirSocketConectado(false);
    };
  }, [clienteConsultas, usuarioId]);

  return (
    <>
      <div hidden>
        <p data-testid="socket-estado">{estado}</p>
        <p data-testid="socket-conexoes">{totalConexoes}</p>
        <p data-testid="socket-ultimo-evento">{ultimoEvento}</p>
      </div>
      <p aria-live="polite" data-testid="anuncio-tempo-real" className="sr-only">
        {anuncio}
      </p>
    </>
  );
}
