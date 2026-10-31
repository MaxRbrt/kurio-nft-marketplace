import { toSocketIo } from '@mswjs/socket.io-binding';
import { ws, type WebSocketHandlerConnection } from 'msw';

// ====================================================================
// 1. CONEXÕES ABERTAS
// O binding não tem broadcast nem rooms: o mock guarda as conexões
// para publicar eventos e derrubá-las nos cenários de queda. O link usa
// só a origem: o MSW remove /socket.io/ da URL antes de comparar.
// ====================================================================
type ConexaoSocket = {
  bruta: WebSocketHandlerConnection;
  io: ReturnType<typeof toSocketIo>;
};

const linkSocket = ws.link(`${location.origin.replace(/^http/, 'ws')}/`);
const conexoes = new Set<ConexaoSocket>();

export function publicarEvento(nome: string, dados: unknown) {
  for (const conexao of conexoes) {
    conexao.io.client.emit(nome, dados);
  }
}

export function derrubarConexoes() {
  for (const conexao of conexoes) {
    conexao.bruta.client.close();
  }
}

// ====================================================================
// 2. HEARTBEAT
// O binding 0.2.0 anuncia ping a cada 25 s + 5 s de tolerância, mas
// não envia ping. Sem o pacote "2" do Engine.IO, o cliente cai em 30 s.
// ====================================================================
const INTERVALO_HEARTBEAT_MS = 25_000;
const PING_ENGINE_IO = '2';

export const handlersSocket = [
  linkSocket.addEventListener('connection', (bruta) => {
    const conexao = { bruta, io: toSocketIo(bruta) };
    conexoes.add(conexao);

    const heartbeat = setInterval(() => {
      bruta.client.send(PING_ENGINE_IO);
    }, INTERVALO_HEARTBEAT_MS);

    bruta.client.addEventListener('close', () => {
      clearInterval(heartbeat);
      conexoes.delete(conexao);
    });
  }),
];
