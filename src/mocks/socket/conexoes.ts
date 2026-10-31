import { toSocketIo } from '@mswjs/socket.io-binding';
import { ws, type WebSocketHandlerConnection } from 'msw';
import { lerBanco } from '../banco/estado';

// ====================================================================
// 1. CONEXÕES ABERTAS
// O binding não tem broadcast nem rooms: o mock guarda as conexões
// para publicar eventos e derrubá-las nos cenários de queda. O link usa
// só a origem: o MSW remove /socket.io/ da URL antes de comparar.
// ====================================================================
type ConexaoSocket = {
  bruta: WebSocketHandlerConnection;
  io: ReturnType<typeof toSocketIo>;
  usuarioId: string | null;
};

const linkSocket = ws.link(`${location.origin.replace(/^http/, 'ws')}/`);
const conexoes = new Set<ConexaoSocket>();

export function publicarEvento(nome: string, dados: unknown) {
  for (const conexao of conexoes) {
    conexao.io.client.emit(nome, dados);
  }
}

// ====================================================================
// 2. EVENTOS PRIVADOS
// Só a conexão do dono recebe. O cliente se identifica com o token da
// sessão em session.subscribe; conexão anônima não recebe nada privado.
// ====================================================================
export function publicarParaUsuario(usuarioId: string, nome: string, dados: unknown) {
  for (const conexao of conexoes) {
    if (conexao.usuarioId === usuarioId) {
      conexao.io.client.emit(nome, dados);
    }
  }
}

export function derrubarConexoes() {
  for (const conexao of conexoes) {
    conexao.bruta.client.close();
  }
}

// ====================================================================
// 3. HEARTBEAT
// O binding 0.2.0 anuncia ping a cada 25 s + 5 s de tolerância, mas
// não envia ping. Sem o pacote "2" do Engine.IO, o cliente cai em 30 s.
// ====================================================================
const INTERVALO_HEARTBEAT_MS = 25_000;
const PING_ENGINE_IO = '2';

export const handlersSocket = [
  linkSocket.addEventListener('connection', (bruta) => {
    const conexao: ConexaoSocket = { bruta, io: toSocketIo(bruta), usuarioId: null };
    conexoes.add(conexao);

    conexao.io.client.on('session.subscribe', (_evento, token: string) => {
      const sessao = lerBanco().sessoes[token];
      const valida = sessao && new Date(sessao.expiraEm).getTime() > Date.now();

      conexao.usuarioId = valida ? sessao.usuarioId : null;
    });

    const heartbeat = setInterval(() => {
      bruta.client.send(PING_ENGINE_IO);
    }, INTERVALO_HEARTBEAT_MS);

    bruta.client.addEventListener('close', () => {
      clearInterval(heartbeat);
      conexoes.delete(conexao);
    });
  }),
];
