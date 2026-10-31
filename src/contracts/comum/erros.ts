import { z } from 'zod';

// ====================================================================
// 1. FORMATO ÚNICO DE ERRO
// Toda falha da API usa este corpo. A interface decide pelo código,
// nunca pelo texto. Erro de formulário vem por campo em "campos".
// ====================================================================
export const codigoErroSchema = z.enum([
  'VALIDACAO',
  'SESSAO_INVALIDA',
  'SESSAO_EXPIRADA',
  'SEM_PERMISSAO',
  'NAO_ENCONTRADO',
  'EMAIL_EM_USO',
  'NOME_USUARIO_EM_USO',
  'SENHA_INCORRETA',
  'CREDENCIAIS_INVALIDAS',
  'EDICAO_INDISPONIVEL',
  'CUPOM_INVALIDO',
  'CUPOM_EXPIRADO',
  'COTACAO_DESATUALIZADA',
  'CONFLITO_IDEMPOTENCIA',
  'CONEXAO_CARTEIRA_RECUSADA',
  'FALHA_TRANSITORIA',
]);
export type CodigoErro = z.infer<typeof codigoErroSchema>;

export const respostaErroSchema = z.object({
  erro: z.object({
    codigo: codigoErroSchema,
    mensagem: z.string(),
    campos: z.record(z.string(), z.string()).optional(),
    detalhes: z.unknown().optional(),
  }),
});
export type RespostaErro = z.infer<typeof respostaErroSchema>;
