import { z } from 'zod';

// ====================================================================
// 1. RETORNO AO FLUXO ANTERIOR
// Só aceita caminho interno. Endereço externo como //site.test ou /\site.test vira
// a tela inicial, para o login não servir de redirecionamento aberto.
// ====================================================================
export const buscaAutenticacaoSchema = z.object({
  redirect: z
    .string()
    .regex(/^\/(?![/\\])/)
    .optional()
    .catch(undefined),
});

export type BuscaAutenticacao = z.infer<typeof buscaAutenticacaoSchema>;
