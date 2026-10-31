import { nftDetalheSchema } from '@/contracts/catalogo/nfts';
import type { Cotacao, EntradaCotacao } from '@/contracts/compra/cotacao';
import type { Pedido } from '@/contracts/compra/pedidos';
import type { Cenario } from '../cenarios/cenarios';
import { criarCarteirasIniciais, type CarteiraBanco } from '../fixtures/carteiras';
import { criarCuponsIniciais, type Cupom } from '../fixtures/cupons';
import { criarNftsIniciais, type NftBanco } from '../fixtures/nfts';
import { criarUsuariosIniciais, type UsuarioBanco } from '../fixtures/usuarios';

// ====================================================================
// 1. ESTADO DO BANCO
// Fonte única de REST e eventos. Roda na página, em memória, e é salvo
// no localStorage para sobreviver ao refresh. Cada aba tem sua cópia.
// ====================================================================
export type SessaoBanco = {
  usuarioId: string;
  expiraEm: string;
};

export type ItemCarrinhoBanco = {
  id: string;
  nftId: string;
  edicaoId: string;
  quantidade: number;
};

export type CotacaoBanco = Cotacao & {
  dono: string;
  entrada: EntradaCotacao;
};

export type ResolucaoPagamento = 'confirmar' | 'recusar' | 'manual';

export type EstadoBanco = {
  nfts: NftBanco[];
  usuarios: UsuarioBanco[];
  sessoes: Record<string, SessaoBanco>;
  favoritos: Record<string, string[]>;
  carteiras: CarteiraBanco[];
  carteirasConectadas: string[];
  recusarConexaoCarteira: boolean;
  carrinhos: Record<string, ItemCarrinhoBanco[]>;
  cupons: Cupom[];
  cotacoes: Record<string, CotacaoBanco>;
  pedidos: Record<string, Pedido>;
  idempotencia: Record<string, { conteudo: string; pedidoId: string }>;
  resolucaoPagamento: ResolucaoPagamento;
  timeoutNoProximoPedido: boolean;
  cenario: Cenario;
  proximoEvento: number;
  proximoPedido: number;
};

const CHAVE_ARMAZENAMENTO = 'kurio:banco:v3';

function criarEstadoInicial(): EstadoBanco {
  return {
    nfts: criarNftsIniciais(),
    usuarios: criarUsuariosIniciais(),
    sessoes: {},
    favoritos: {},
    carteiras: criarCarteirasIniciais(),
    carteirasConectadas: [],
    recusarConexaoCarteira: false,
    carrinhos: {},
    cupons: criarCuponsIniciais(),
    cotacoes: {},
    pedidos: {},
    idempotencia: {},
    resolucaoPagamento: 'confirmar',
    timeoutNoProximoPedido: false,
    cenario: { nome: 'padrao', vezes: null, rota: null },
    proximoEvento: 1,
    proximoPedido: 1,
  };
}

// ====================================================================
// 2. CARGA E PERSISTÊNCIA
// Conteúdo salvo corrompido ou de outra versão não derruba a aplicação:
// volta ao cenário conhecido. Mudou a forma dos dados? Suba a versão da
// chave, ou quem já abriu o site ficaria com o banco antigo.
// ====================================================================
function carregarEstado(): EstadoBanco {
  const salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO);

  if (!salvo) {
    return criarEstadoInicial();
  }

  try {
    const lido = JSON.parse(salvo) as Partial<EstadoBanco>;

    const nftsValidos = nftDetalheSchema
      .omit({ relacionados: true })
      .array()
      .safeParse(lido.nfts).success;

    if (!nftsValidos) {
      return criarEstadoInicial();
    }

    return { ...criarEstadoInicial(), ...lido };
  } catch {
    return criarEstadoInicial();
  }
}

let estado = carregarEstado();

export function lerBanco() {
  return estado;
}

export function salvarBanco() {
  localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estado));
}

// ====================================================================
// 3. RESET
// Restaura integralmente o cenário conhecido, como pede o enunciado.
// É o que dá isolamento a cada teste.
// ====================================================================
export function resetarBanco() {
  estado = criarEstadoInicial();
  salvarBanco();
}
