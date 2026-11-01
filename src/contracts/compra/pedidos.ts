import { z } from 'zod';
import {
  dataIsoSchema,
  quantidadeSchema,
  redeSchema,
  valorEthSchema,
  versaoSchema,
} from '../comum/valores';
import { tipoCarteiraSchema } from '../conta/carteiras';

// ====================================================================
// 1. CRIAÇÃO DO PEDIDO
// Vai com o cabeçalho Idempotency-Key. Mesma chave e mesmo conteúdo
// recuperam o pedido; mesma chave e conteúdo diferente geram conflito.
// ====================================================================
export const CABECALHO_IDEMPOTENCIA = 'Idempotency-Key';

export const entradaPedidoSchema = z.object({
  cotacaoId: z.string(),
  carteiraId: z.string(),
  rede: redeSchema,
  nomeExibicao: z.string().trim().min(1, 'Informe o nome de exibição'),
  email: z.email('E-mail inválido'),
  nomeUsuario: z.string().trim().min(1, 'Informe o nome de usuário'),
  nomePerfil: z.string().trim().nullable(),
  carteiraSecundaria: z.string().trim().nullable(),
  codigoIndicacao: z.string().trim().nullable(),
  nomeEns: z.string().trim().nullable(),
  observacao: z.string().trim().nullable(),
});
export type EntradaPedido = z.infer<typeof entradaPedidoSchema>;

// ====================================================================
// 2. RECIBO COMO SNAPSHOT
// Itens e valores são copiados na criação, sem referência ao catálogo:
// mudanças posteriores de preço não alteram um pedido já feito.
// ====================================================================
const itemPedidoSchema = z.object({
  nftId: z.string(),
  edicaoId: z.string(),
  nome: z.string(),
  tokenId: z.string(),
  imagemUrl: z.string(),
  rotuloEdicao: z.string(),
  precoUnitario: valorEthSchema,
  quantidade: quantidadeSchema,
  subtotal: valorEthSchema,
});

const pedidoBaseSchema = z.object({
  id: z.string(),
  usuarioId: z.string(),
  versao: versaoSchema,
  itens: z.array(itemPedidoSchema).min(1),
  subtotal: valorEthSchema,
  desconto: valorEthSchema,
  taxaRede: valorEthSchema,
  total: valorEthSchema,
  cupom: z.string().nullable().default(null),
  rede: redeSchema,
  carteira: z.object({ endereco: z.string(), tipo: tipoCarteiraSchema }),
  criadoEm: dataIsoSchema,
});

// ====================================================================
// 3. ESTADOS DO PEDIDO
// Confirmado e recusado são terminais. Só o confirmado tem transação:
// o tipo impede mostrar recibo de um pedido que não foi confirmado.
// ====================================================================
export const pedidoSchema = z.discriminatedUnion('estado', [
  pedidoBaseSchema.extend({ estado: z.literal('pendente') }),
  pedidoBaseSchema.extend({
    estado: z.literal('confirmado'),
    idTransacao: z.string(),
    urlExplorador: z.string(),
    confirmadoEm: dataIsoSchema,
  }),
  pedidoBaseSchema.extend({
    estado: z.literal('recusado'),
    motivoRecusa: z.string(),
    recusadoEm: dataIsoSchema,
  }),
]);
export type Pedido = z.infer<typeof pedidoSchema>;
