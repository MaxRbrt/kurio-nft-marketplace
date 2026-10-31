import { z } from 'zod';

// ====================================================================
// 1. PERFIL
// Campos do frame de perfil. O avatar trafega como imagem em data URL,
// pois não existe armazenamento real de arquivos na simulação.
// ====================================================================
export const perfilSchema = z.object({
  nomeExibicao: z.string(),
  nomeUsuario: z.string(),
  email: z.email(),
  nomeEns: z.string().nullable(),
  apelidoCarteira: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export type Perfil = z.infer<typeof perfilSchema>;

export const entradaPerfilSchema = z.object({
  nomeExibicao: z.string().trim().min(1, 'Informe o nome de exibição'),
  nomeUsuario: z.string().trim().min(3, 'Informe ao menos 3 caracteres'),
  email: z.email('E-mail inválido'),
  nomeEns: z.string().trim().nullable(),
  apelidoCarteira: z.string().trim().nullable(),
});
export type EntradaPerfil = z.infer<typeof entradaPerfilSchema>;

export const entradaAvatarSchema = z.object({
  avatarUrl: z.string().startsWith('data:image/', 'Imagem inválida').nullable(),
});

export const entradaSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, 'Informe a senha atual'),
    novaSenha: z.string().min(8, 'A senha precisa de ao menos 8 caracteres'),
    confirmarNovaSenha: z.string(),
  })
  .refine((dados) => dados.novaSenha === dados.confirmarNovaSenha, {
    path: ['confirmarNovaSenha'],
    message: 'As senhas não conferem',
  });
export type EntradaSenha = z.infer<typeof entradaSenhaSchema>;
