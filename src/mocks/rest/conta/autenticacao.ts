import { lerBanco } from '../../banco/estado';
import type { UsuarioBanco } from '../../fixtures/usuarios';
import { responderErro } from '../respostas';

// ====================================================================
// 1. SESSÃO DA REQUISIÇÃO
// Token vem no Authorization. Ausente ou desconhecido é sessão inválida;
// vencido é sessão expirada, para a interface preservar o contexto.
// ====================================================================
export function lerToken(request: Request) {
  return request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? null;
}

export function autenticar(request: Request): { usuario: UsuarioBanco } | { erro: Response } {
  const banco = lerBanco();
  const token = lerToken(request);
  const sessao = token ? banco.sessoes[token] : undefined;
  const usuario = banco.usuarios.find((candidato) => candidato.id === sessao?.usuarioId);

  if (!sessao || !usuario) {
    return { erro: responderErro(401, 'SESSAO_INVALIDA', 'Sessão inválida') };
  }

  if (new Date(sessao.expiraEm).getTime() <= Date.now()) {
    return { erro: responderErro(401, 'SESSAO_EXPIRADA', 'Sessão expirada') };
  }

  return { usuario };
}
