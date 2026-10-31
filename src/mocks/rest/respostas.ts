import { HttpResponse } from 'msw';
import type { CodigoErro } from '@/contracts/comum/erros';

// ====================================================================
// 1. RESPOSTA DE ERRO
// Único caminho de erro dos handlers, para toda falha sair no mesmo
// formato do contrato.
// ====================================================================
export function responderErro(
  status: number,
  codigo: CodigoErro,
  mensagem: string,
  campos?: Record<string, string>,
) {
  return HttpResponse.json({ erro: { codigo, mensagem, campos } }, { status });
}
