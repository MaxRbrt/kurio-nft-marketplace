import { expect, test } from '@playwright/test';
import { entradaItemCarrinhoSchema } from '../../src/contracts/compra/carrinho';
import { valorEthSchema } from '../../src/contracts/comum/valores';
import { entradaCarteiraSchema } from '../../src/contracts/conta/carteiras';
import { entradaSenhaSchema } from '../../src/contracts/conta/perfil';
import { respostaErroSchema } from '../../src/contracts/comum/erros';
import { eventoNftAtualizadoSchema } from '../../src/contracts/tempo-real/eventos';
import { parametrosNftsSchema } from '../../src/contracts/catalogo/nfts';
import { pedidoSchema } from '../../src/contracts/compra/pedidos';
import { entradaCadastroSchema } from '../../src/contracts/conta/sessao';

const pedidoBase = {
  id: 'pedido_1',
  usuarioId: 'usuario_1',
  versao: 1,
  itens: [
    {
      nftId: 'nft_1',
      edicaoId: 'edicao_1',
      nome: 'Emerald Ape #042',
      tokenId: '#0042',
      imagemUrl: '/nfts/emerald.webp',
      rotuloEdicao: '1/50',
      precoUnitario: '1.19',
      quantidade: 2,
      subtotal: '2.38',
    },
  ],
  subtotal: '2.38',
  desconto: '0',
  taxaRede: '0.016',
  total: '2.396',
  rede: 'ethereum',
  carteira: { endereco: `0x${'a'.repeat(40)}`, tipo: 'metamask' },
  criadoEm: '2026-11-01T12:00:00.000Z',
};

test('ETH aceita string decimal com 18 casas e rejeita número', () => {
  expect(valorEthSchema.safeParse('0.123456789012345678').success).toBe(true);
  expect(valorEthSchema.safeParse(1.19).success).toBe(false);
  expect(valorEthSchema.safeParse('-1').success).toBe(false);
  expect(valorEthSchema.safeParse('1,19').success).toBe(false);
  expect(valorEthSchema.safeParse('0.1234567890123456789').success).toBe(false);
});

test('quantidade do carrinho precisa ser inteira e positiva', () => {
  const item = { nftId: 'nft_1', edicaoId: 'edicao_1' };

  expect(entradaItemCarrinhoSchema.safeParse({ ...item, quantidade: 2 }).success).toBe(true);
  expect(entradaItemCarrinhoSchema.safeParse({ ...item, quantidade: 1.5 }).success).toBe(false);
  expect(entradaItemCarrinhoSchema.safeParse({ ...item, quantidade: 0 }).success).toBe(false);
});

test('confirmação de senha aponta erro no próprio campo', () => {
  const cadastro = entradaCadastroSchema.safeParse({
    nomeUsuario: 'colecionador',
    email: 'colecionador@kurio.test',
    senha: 'senha-segura',
    confirmarSenha: 'outra-senha',
  });
  const troca = entradaSenhaSchema.safeParse({
    senhaAtual: 'senha-antiga',
    novaSenha: 'senha-segura',
    confirmarNovaSenha: 'outra-senha',
  });

  expect(cadastro.error?.issues[0]?.path).toEqual(['confirmarSenha']);
  expect(troca.error?.issues[0]?.path).toEqual(['confirmarNovaSenha']);
});

test('pedido confirmado exige transação e recusado exige motivo', () => {
  expect(pedidoSchema.safeParse({ ...pedidoBase, estado: 'pendente' }).success).toBe(true);
  expect(pedidoSchema.safeParse({ ...pedidoBase, estado: 'confirmado' }).success).toBe(false);
  expect(pedidoSchema.safeParse({ ...pedidoBase, estado: 'recusado' }).success).toBe(false);
  expect(
    pedidoSchema.safeParse({
      ...pedidoBase,
      estado: 'confirmado',
      idTransacao: '0xA91F',
      urlExplorador: 'https://etherscan.io/tx/0xA91F',
      confirmadoEm: '2026-11-01T12:01:00.000Z',
    }).success,
  ).toBe(true);
});

test('carteira exige endereço 0x válido', () => {
  const carteira = {
    papel: 'principal',
    nomeExibicao: 'Principal',
    apelido: null,
    rede: 'ethereum',
    nomePerfil: null,
    carteiraSecundaria: null,
    tipo: 'metamask',
    codigoIndicacao: null,
    email: null,
    nomeEns: null,
  };

  expect(
    entradaCarteiraSchema.safeParse({ ...carteira, endereco: `0x${'a'.repeat(40)}` }).success,
  ).toBe(true);
  expect(entradaCarteiraSchema.safeParse({ ...carteira, endereco: '0x123' }).success).toBe(false);
});

test('evento exige identidade, recurso e versão', () => {
  const evento = {
    idEvento: 'evt_1',
    tipo: 'nft.updated',
    recurso: { tipo: 'nft', id: 'nft_1' },
    versao: 2,
    ocorridoEm: '2026-11-01T12:00:00.000Z',
    dados: { preco: '1.25', disponivel: 3, edicoes: [] },
  };
  const { idEvento: _idEvento, ...semIdentidade } = evento;
  const { versao: _versao, ...semVersao } = evento;

  expect(eventoNftAtualizadoSchema.safeParse(evento).success).toBe(true);
  expect(eventoNftAtualizadoSchema.safeParse(semIdentidade).success).toBe(false);
  expect(eventoNftAtualizadoSchema.safeParse(semVersao).success).toBe(false);
});

test('erro e parâmetros de listagem seguem o contrato', () => {
  expect(
    respostaErroSchema.safeParse({ erro: { codigo: 'VALIDACAO', mensagem: 'Inválido' } }).success,
  ).toBe(true);
  expect(
    respostaErroSchema.safeParse({ erro: { codigo: 'INEXISTENTE', mensagem: 'x' } }).success,
  ).toBe(false);
  expect(
    parametrosNftsSchema.safeParse({ categorias: ['musica'], redes: ['polygon'], pagina: 1 })
      .success,
  ).toBe(true);
  expect(parametrosNftsSchema.safeParse({ categorias: ['inexistente'] }).success).toBe(false);
});
