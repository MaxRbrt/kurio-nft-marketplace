import { CABECALHO_VISITANTE } from '@/contracts/compra/carrinho';
import { donoUsuario, donoVisitante } from '../../banco/carrinhos';
import { autenticar, lerToken } from '../conta/autenticacao';
import { responderErro } from '../respostas';

// ====================================================================
// 1. QUEM É O DONO
// Com token, o carrinho é do usuário, e token vencido é erro de sessão.
// Sem token, é do visitante identificado pelo cabeçalho.
// ====================================================================
export function lerDono(request: Request): { dono: string } | { erro: Response } {
  if (lerToken(request)) {
    const sessao = autenticar(request);

    return 'erro' in sessao ? sessao : { dono: donoUsuario(sessao.usuario.id) };
  }

  const visitanteId = request.headers.get(CABECALHO_VISITANTE);

  return visitanteId
    ? { dono: donoVisitante(visitanteId) }
    : { erro: responderErro(422, 'VALIDACAO', 'Visitante não identificado') };
}
