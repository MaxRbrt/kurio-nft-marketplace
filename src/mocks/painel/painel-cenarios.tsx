import { useState } from 'react';
import { cenarioSchema } from '../cenarios/cenarios';

const NFT_DEMONSTRACAO = 'nft-01';
const CENARIOS = cenarioSchema.shape.nome.options;

const CLASSE_BOTAO =
  'rounded-[3px] border border-primary px-2 py-1 text-left text-xs leading-4 text-texto-destaque hover:bg-superficie-elevada';

async function controlar(caminho: string, corpo?: unknown) {
  const resposta = await fetch(`/api/__mock/${caminho}`, {
    method: 'POST',
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

  return resposta.ok;
}

// ====================================================================
// 1. PAINEL DE DEMONSTRAÇÃO
// Só existe com mocks ativos e com ?painel=1 na URL, sem aparecer nas
// telas. Não toca em estado da interface: pede ao servidor simulado, pelas
// rotas de controle, e o evento segue pelo socket real.
// ====================================================================
export function PainelCenarios() {
  const [aberto, setAberto] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [recusarConexao, setRecusarConexao] = useState(false);

  async function executar(rotulo: string, caminho: string, corpo?: unknown) {
    const deuCerto = await controlar(caminho, corpo);

    setMensagem(deuCerto ? `Feito: ${rotulo}` : `Falhou: ${rotulo}`);
  }

  const acoes: Array<[string, string, unknown?]> = [
    ['Restaurar dados', 'resetar'],
    ['Aumentar preço do Emerald Ape', `nfts/${NFT_DEMONSTRACAO}`, { preco: '2.00' }],
    ['Esgotar o Emerald Ape', `nfts/${NFT_DEMONSTRACAO}`, { disponivel: 0 }],
    ['Derrubar o socket', 'socket/derrubar'],
    ['Expirar a sessão', 'sessoes/expirar'],
    ['Próximo pedido sem resposta', 'pedidos/timeout-no-proximo'],
    ['Pagamento: confirmar', 'pagamento', { resolucao: 'confirmar' }],
    ['Pagamento: recusar', 'pagamento', { resolucao: 'recusar' }],
    ['Pagamento: manter pendente', 'pagamento', { resolucao: 'manual' }],
  ];

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="fixed right-3 bottom-3 z-50 rounded-[3px] bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
      >
        Cenários
      </button>
    );
  }

  return (
    <aside
      aria-label="Painel de cenários"
      data-testid="painel-cenarios"
      className="fixed right-3 bottom-3 z-50 flex max-h-[80dvh] w-64 flex-col gap-2 overflow-y-auto rounded-md border border-primary bg-card p-3 text-foreground shadow-lg"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Painel de cenários</p>
        <button type="button" onClick={() => setAberto(false)} className="text-xs underline">
          Recolher
        </button>
      </div>

      <label htmlFor="painel-cenario" className="text-xs leading-4">
        Cenário de rede
      </label>
      <select
        id="painel-cenario"
        defaultValue="padrao"
        onChange={(evento) =>
          void executar(evento.target.value, 'cenario', { nome: evento.target.value })
        }
        className="h-8 rounded-[3px] border border-border bg-background px-1 text-xs"
      >
        {CENARIOS.map((nome) => (
          <option key={nome} value={nome}>
            {nome}
          </option>
        ))}
      </select>

      {acoes.map(([rotulo, caminho, corpo]) => (
        <button
          key={rotulo}
          type="button"
          onClick={() => void executar(rotulo, caminho, corpo)}
          className={CLASSE_BOTAO}
        >
          {rotulo}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={recusarConexao}
        onClick={() => {
          const proximo = !recusarConexao;

          setRecusarConexao(proximo);
          void executar('Recusa de conexão', 'carteiras/recusar-conexao', { recusar: proximo });
        }}
        className={CLASSE_BOTAO}
      >
        Carteira recusa conexão: {recusarConexao ? 'sim' : 'não'}
      </button>

      <p role="status" data-testid="painel-mensagem" className="min-h-4 text-xs leading-4">
        {mensagem}
      </p>
    </aside>
  );
}
