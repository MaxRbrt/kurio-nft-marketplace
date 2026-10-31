import { criarNftsIniciais, type NftBanco } from '../fixtures/nfts';
import { criarUsuariosIniciais, type UsuarioBanco } from '../fixtures/usuarios';

// ====================================================================
// 1. ESTADO DO BANCO
// Fonte única de REST e eventos. Roda na página, em memória, e é salvo
// no localStorage para sobreviver ao refresh. Cada aba tem sua cópia.
// ====================================================================
export type EstadoBanco = {
  nfts: NftBanco[];
  usuarios: UsuarioBanco[];
  proximoEvento: number;
};

const CHAVE_ARMAZENAMENTO = 'kurio:banco:v1';

function criarEstadoInicial(): EstadoBanco {
  return {
    nfts: criarNftsIniciais(),
    usuarios: criarUsuariosIniciais(),
    proximoEvento: 1,
  };
}

// ====================================================================
// 2. CARGA E PERSISTÊNCIA
// Conteúdo salvo corrompido não derruba a aplicação: volta ao cenário
// conhecido das fixtures.
// ====================================================================
function carregarEstado(): EstadoBanco {
  const salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO);

  if (!salvo) {
    return criarEstadoInicial();
  }

  try {
    return JSON.parse(salvo) as EstadoBanco;
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
