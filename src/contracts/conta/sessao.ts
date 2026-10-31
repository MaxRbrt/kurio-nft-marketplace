import { z } from 'zod';
import { dataIsoSchema } from '../comum/valores';

// ====================================================================
// 1. USUÁRIO E SESSÃO
// A senha nunca volta da API. O token identifica a sessão, que pode
// expirar durante a navegação ou o checkout.
// ====================================================================
const usuarioSchema = z.object({
  id: z.string(),
  nomeUsuario: z.string(),
  email: z.email(),
  nomeExibicao: z.string(),
  avatarUrl: z.string().nullable(),
});
export type Usuario = z.infer<typeof usuarioSchema>;

export const sessaoSchema = z.object({
  token: z.string(),
  expiraEm: dataIsoSchema,
  usuario: usuarioSchema,
});
export type Sessao = z.infer<typeof sessaoSchema>;

// ====================================================================
// 2. CADASTRO E LOGIN
// Campos dos frames de cadastro e login. Confirmação diferente da
// senha aponta o erro no próprio campo de confirmação.
// ====================================================================
export const entradaCadastroSchema = z
  .object({
    nomeUsuario: z.string().trim().min(3, 'Informe ao menos 3 caracteres'),
    email: z.email('E-mail inválido'),
    senha: z.string().min(8, 'A senha precisa de ao menos 8 caracteres'),
    confirmarSenha: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirmarSenha, {
    path: ['confirmarSenha'],
    message: 'As senhas não conferem',
  });
export type EntradaCadastro = z.infer<typeof entradaCadastroSchema>;

export const entradaLoginSchema = z.object({
  email: z.email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
});
export type EntradaLogin = z.infer<typeof entradaLoginSchema>;
