import { HttpResponse } from 'msw';
import type { z } from 'zod';
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

// ====================================================================
// 2. VALIDAÇÃO DO CORPO
// Corpo que não é JSON ou fura o contrato vira 422 com a mensagem de
// cada campo, para o formulário mostrar o erro no lugar certo.
// ====================================================================
export async function lerCorpo<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<{ dados: z.infer<Schema> } | { erro: Response }> {
  const corpo: unknown = await request.json().catch(() => null);
  const leitura = schema.safeParse(corpo);

  if (leitura.success) {
    return { dados: leitura.data };
  }

  const campos: Record<string, string> = {};

  for (const problema of leitura.error.issues) {
    campos[problema.path.join('.')] ??= problema.message;
  }

  return { erro: responderErro(422, 'VALIDACAO', 'Dados inválidos', campos) };
}
