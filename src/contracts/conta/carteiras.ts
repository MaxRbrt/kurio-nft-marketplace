import { z } from 'zod';
import { redeSchema } from '../comum/valores';

// ====================================================================
// 1. CARTEIRAS
// Uma principal e uma secundária, com os campos do frame. O layout
// pede endereço 0x em todas as redes, então a regra vale para todas.
// ====================================================================
export const tipoCarteiraSchema = z.enum(['metamask', 'walletconnect', 'coinbase']);
export const papelCarteiraSchema = z.enum(['principal', 'secundaria']);

const camposCarteiraSchema = z.object({
  nomeExibicao: z.string().trim().min(1, 'Informe o nome de exibição'),
  apelido: z.string().trim().nullable(),
  rede: redeSchema,
  nomePerfil: z.string().trim().nullable(),
  endereco: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Endereço 0x inválido'),
  carteiraSecundaria: z.string().trim().nullable(),
  tipo: tipoCarteiraSchema,
  codigoIndicacao: z.string().trim().nullable(),
  email: z.email('E-mail inválido').nullable(),
  nomeEns: z.string().trim().nullable(),
});

export const entradaCarteiraSchema = camposCarteiraSchema.extend({ papel: papelCarteiraSchema });
export type EntradaCarteira = z.infer<typeof entradaCarteiraSchema>;

export const carteiraSchema = entradaCarteiraSchema.extend({ id: z.string() });
export type Carteira = z.infer<typeof carteiraSchema>;

export const conexaoCarteiraSchema = z.object({
  carteiraId: z.string(),
  estado: z.enum(['conectada', 'desconectada']),
});
export type ConexaoCarteira = z.infer<typeof conexaoCarteiraSchema>;
