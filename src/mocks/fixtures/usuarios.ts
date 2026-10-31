import type { Usuario } from '@/contracts/conta/sessao';

// ====================================================================
// 1. USUÁRIOS FICTÍCIOS
// Dois colecionadores para testar isolamento e troca de usuário. Só o
// hash SHA-256 com sal fica guardado: a senha nunca aparece em claro.
// ====================================================================
export type UsuarioBanco = Usuario & {
  sal: string;
  hashSenha: string;
  nomeEns: string | null;
  apelidoCarteira: string | null;
};

export function criarUsuariosIniciais(): UsuarioBanco[] {
  return [
    {
      id: 'usuario-ana',
      nomeUsuario: 'ana.colecionadora',
      email: 'ana@kurio.test',
      nomeExibicao: 'Ana Colecionadora',
      avatarUrl: null,
      nomeEns: 'ana',
      apelidoCarteira: 'Principal da Ana',
      sal: 'sal-ana-7f3a',
      hashSenha: '417b01994073c7534b8589dfe413790c86e9796d86dab3506beccd767976bb13',
    },
    {
      id: 'usuario-bruno',
      nomeUsuario: 'bruno.colecionador',
      email: 'bruno@kurio.test',
      nomeExibicao: 'Bruno Colecionador',
      avatarUrl: null,
      nomeEns: null,
      apelidoCarteira: null,
      sal: 'sal-bruno-c91d',
      hashSenha: '1cdb4c7b5a953fde91ed60a59e9ae8ddf4fcdf4646fe43280bb4424f2890f265',
    },
  ];
}
