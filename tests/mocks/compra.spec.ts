import { expect, test, type Page } from '@playwright/test';
import { carrinhoSchema } from '../../src/contracts/compra/carrinho';
import { cotacaoSchema } from '../../src/contracts/compra/cotacao';
import { pedidoSchema } from '../../src/contracts/compra/pedidos';
import { nftDetalheSchema } from '../../src/contracts/catalogo/nfts';
import { respostaErroSchema } from '../../src/contracts/comum/erros';
import { eventoPedidoAtualizadoSchema } from '../../src/contracts/tempo-real/eventos';
import { ANA, BRUNO, chamarApi, entrar } from '../apoio/api';
import { abrirOuvinte, lerEventos } from '../apoio/socket';

const EDICAO = 'nft-01-1-50';
const OUTRA_EDICAO = 'nft-02-1-50';
const codigoErro = (corpo: unknown) => respostaErroSchema.parse(corpo).erro.codigo;
const visitante = (id: string) => ({ cabecalhos: { 'X-Visitante-Id': id } });
const chave = (valor: string) => ({ cabecalhos: { 'Idempotency-Key': valor } });

function adicionar(
  pagina: Page,
  token: string,
  quantidade = 2,
  nftId = 'nft-01',
  edicaoId = EDICAO,
) {
  return chamarApi(pagina, 'POST', '/api/carrinho/itens', { nftId, edicaoId, quantidade }, token);
}

async function cotar(pagina: Page, token: string, entrada: object = {}) {
  const { corpo } = await chamarApi(pagina, 'POST', '/api/cotacoes', entrada, token);

  return cotacaoSchema.parse(corpo);
}

function entradaPedido(cotacaoId: string) {
  return {
    cotacaoId,
    carteiraId: 'carteira-ana-principal',
    rede: 'ethereum',
    nomeExibicao: 'Ana',
    email: ANA.email,
    nomeUsuario: 'ana.colecionadora',
    nomePerfil: null,
    carteiraSecundaria: null,
    codigoIndicacao: null,
    nomeEns: null,
    observacao: null,
  };
}

function criarPedido(pagina: Page, token: string, cotacaoId: string, valorChave: string) {
  return chamarApi(
    pagina,
    'POST',
    '/api/pedidos',
    entradaPedido(cotacaoId),
    token,
    chave(valorChave),
  );
}

async function lerEstoque(pagina: Page) {
  const { corpo } = await chamarApi(pagina, 'GET', '/api/nfts/nft-01');

  return nftDetalheSchema.parse(corpo).edicoes.find((edicao) => edicao.id === EDICAO)?.disponivel;
}

async function recarregar(pagina: Page) {
  await pagina.reload();
  await expect(pagina.getByTestId('socket-estado')).toHaveText('Conectado');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');
  expect((await chamarApi(page, 'POST', '/api/__mock/resetar')).status).toBe(204);
  await chamarApi(page, 'POST', '/api/__mock/pagamento', { resolucao: 'manual' });
});

test.describe('carrinho', () => {
  test('visitante adiciona, soma, altera, remove e mantém após refresh', async ({ page }) => {
    const opcoes = visitante('v1');
    const item = { nftId: 'nft-01', edicaoId: EDICAO, quantidade: 2 };

    await chamarApi(page, 'POST', '/api/carrinho/itens', item, undefined, opcoes);
    const somado = await chamarApi(page, 'POST', '/api/carrinho/itens', item, undefined, opcoes);
    const carrinho = carrinhoSchema.parse(somado.corpo);

    expect(carrinho.itens).toHaveLength(1);
    expect(carrinho.itens[0].quantidade).toBe(4);
    expect(carrinho.subtotal).toBe('4.76');

    await recarregar(page);

    const relido = await chamarApi(page, 'GET', '/api/carrinho', undefined, undefined, opcoes);
    const itemId = carrinhoSchema.parse(relido.corpo).itens[0].id;
    const alterado = await chamarApi(
      page,
      'PATCH',
      `/api/carrinho/itens/${itemId}`,
      { quantidade: 1 },
      undefined,
      opcoes,
    );
    const removido = await chamarApi(
      page,
      'DELETE',
      `/api/carrinho/itens/${itemId}`,
      undefined,
      undefined,
      opcoes,
    );

    expect(carrinhoSchema.parse(alterado.corpo).subtotal).toBe('1.19');
    expect(carrinhoSchema.parse(removido.corpo).itens).toEqual([]);
  });

  test('respeita disponibilidade e não mistura visitantes', async ({ page }) => {
    const excesso = await chamarApi(
      page,
      'POST',
      '/api/carrinho/itens',
      { nftId: 'nft-01', edicaoId: 'nft-01-1-1', quantidade: 2 },
      undefined,
      visitante('v1'),
    );
    await chamarApi(
      page,
      'POST',
      '/api/carrinho/itens',
      { nftId: 'nft-01', edicaoId: EDICAO, quantidade: 1 },
      undefined,
      visitante('v1'),
    );
    const outro = await chamarApi(
      page,
      'GET',
      '/api/carrinho',
      undefined,
      undefined,
      visitante('v2'),
    );
    const anonimo = await chamarApi(page, 'GET', '/api/carrinho');

    expect(excesso.status).toBe(409);
    expect(codigoErro(excesso.corpo)).toBe('EDICAO_INDISPONIVEL');
    expect(carrinhoSchema.parse(outro.corpo).itens).toEqual([]);
    expect(anonimo.status).toBe(422);
  });

  test('login preserva itens do visitante e limita ao disponível', async ({ page }) => {
    const ana = await entrar(page, ANA);

    await chamarApi(
      page,
      'POST',
      '/api/carrinho/itens',
      { nftId: 'nft-01', edicaoId: EDICAO, quantidade: 30 },
      undefined,
      visitante('v1'),
    );
    await adicionar(page, ana, 30);

    const mesclado = await chamarApi(
      page,
      'POST',
      '/api/carrinho/mesclar',
      undefined,
      ana,
      visitante('v1'),
    );
    const visitanteDepois = await chamarApi(
      page,
      'GET',
      '/api/carrinho',
      undefined,
      undefined,
      visitante('v1'),
    );

    expect(carrinhoSchema.parse(mesclado.corpo).itens[0].quantidade).toBe(50);
    expect(carrinhoSchema.parse(visitanteDepois.corpo).itens).toEqual([]);
  });
});

test.describe('cotação', () => {
  test('total coerente, cupom e taxa por rede com precisão', async ({ page }) => {
    const ana = await entrar(page, ANA);

    await adicionar(page, ana);

    const semCupom = await cotar(page, ana);
    const comCupom = await cotar(page, ana, { cupom: 'kurio10', rede: 'polygon' });

    expect(semCupom).toMatchObject({
      subtotal: '2.38',
      desconto: '0',
      taxaRede: '0.016',
      total: '2.396',
      cupom: null,
    });
    expect(comCupom).toMatchObject({
      desconto: '0.238',
      taxaRede: '0.002',
      total: '2.144',
      cupom: 'KURIO10',
    });
  });

  test('cupom inválido, expirado e carrinho vazio', async ({ page }) => {
    const ana = await entrar(page, ANA);
    const vazio = await chamarApi(page, 'POST', '/api/cotacoes', {}, ana);

    await adicionar(page, ana);

    const invalido = await chamarApi(page, 'POST', '/api/cotacoes', { cupom: 'NAOEXISTE' }, ana);
    const expirado = await chamarApi(page, 'POST', '/api/cotacoes', { cupom: 'GENESIS20' }, ana);

    expect(vazio.status).toBe(422);
    expect(codigoErro(invalido.corpo)).toBe('CUPOM_INVALIDO');
    expect(respostaErroSchema.parse(invalido.corpo).erro.campos).toHaveProperty('cupom');
    expect(codigoErro(expirado.corpo)).toBe('CUPOM_EXPIRADO');
  });
});

test.describe('pedido', () => {
  test('confirmação baixa estoque, remove só o comprado e congela o recibo', async ({ page }) => {
    const ana = await entrar(page, ANA);

    await adicionar(page, ana);

    const cotacao = await cotar(page, ana);
    const estoqueAntes = await lerEstoque(page);
    const criado = await criarPedido(page, ana, cotacao.id, 'chave-1');
    const pedido = pedidoSchema.parse(criado.corpo);

    expect(criado.status).toBe(201);
    expect(pedido.estado).toBe('pendente');
    expect(await lerEstoque(page)).toBe(estoqueAntes);

    await adicionar(page, ana, 3);
    await adicionar(page, ana, 1, 'nft-02', OUTRA_EDICAO);
    await chamarApi(page, 'POST', `/api/__mock/pedidos/${pedido.id}/resolver`, {
      estado: 'confirmado',
    });

    const final = pedidoSchema.parse(
      (await chamarApi(page, 'GET', `/api/pedidos/${pedido.id}`, undefined, ana)).corpo,
    );
    const carrinho = carrinhoSchema.parse(
      (await chamarApi(page, 'GET', '/api/carrinho', undefined, ana)).corpo,
    );

    expect(final.estado).toBe('confirmado');
    expect(await lerEstoque(page)).toBe((estoqueAntes ?? 0) - 2);
    expect(carrinho.itens.find((item) => item.nftId === 'nft-01')?.quantidade).toBe(3);
    expect(carrinho.itens.find((item) => item.nftId === 'nft-02')?.quantidade).toBe(1);

    await chamarApi(page, 'POST', '/api/__mock/nfts/nft-01', { preco: '9.99' });

    const recibo = pedidoSchema.parse(
      (await chamarApi(page, 'GET', `/api/pedidos/${pedido.id}`, undefined, ana)).corpo,
    );

    expect(recibo.itens[0].precoUnitario).toBe('1.19');
    expect(recibo.total).toBe('2.396');
  });

  test('recusa preserva itens e estoque, e estado terminal não muda', async ({ page }) => {
    const ana = await entrar(page, ANA);

    await adicionar(page, ana);

    const cotacao = await cotar(page, ana);
    const estoque = await lerEstoque(page);
    const pedido = pedidoSchema.parse((await criarPedido(page, ana, cotacao.id, 'chave-1')).corpo);
    const resolver = (estado: string) =>
      chamarApi(page, 'POST', `/api/__mock/pedidos/${pedido.id}/resolver`, { estado });

    await resolver('recusado');
    await resolver('confirmado');

    const final = pedidoSchema.parse(
      (await chamarApi(page, 'GET', `/api/pedidos/${pedido.id}`, undefined, ana)).corpo,
    );
    const carrinho = carrinhoSchema.parse(
      (await chamarApi(page, 'GET', '/api/carrinho', undefined, ana)).corpo,
    );

    expect(final.estado).toBe('recusado');
    expect(final.versao).toBe(2);
    expect(await lerEstoque(page)).toBe(estoque);
    expect(carrinho.itens[0].quantidade).toBe(2);
  });

  test('mesma chave recupera o pedido; conteúdo diferente é conflito', async ({ page }) => {
    const ana = await entrar(page, ANA);

    await adicionar(page, ana);

    const cotacao = await cotar(page, ana);
    const primeiro = await criarPedido(page, ana, cotacao.id, 'chave-1');
    const segundo = await criarPedido(page, ana, cotacao.id, 'chave-1');
    const conflito = await chamarApi(
      page,
      'POST',
      '/api/pedidos',
      { ...entradaPedido(cotacao.id), nomeExibicao: 'Outro nome' },
      ana,
      chave('chave-1'),
    );
    const semChave = await chamarApi(page, 'POST', '/api/pedidos', entradaPedido(cotacao.id), ana);

    expect(primeiro.status).toBe(201);
    expect(segundo.status).toBe(200);
    expect(segundo.corpo.id).toBe(primeiro.corpo.id);
    expect(codigoErro(conflito.corpo)).toBe('CONFLITO_IDEMPOTENCIA');
    expect(semChave.status).toBe(422);
  });

  test('timeout depois de criar recupera o mesmo pedido, sem segunda compra', async ({ page }) => {
    const ana = await entrar(page, ANA);

    await adicionar(page, ana);

    const cotacao = await cotar(page, ana);
    const estoque = await lerEstoque(page);

    await chamarApi(page, 'POST', '/api/__mock/pedidos/timeout-no-proximo');

    const perdido = await chamarApi(page, 'POST', '/api/pedidos', entradaPedido(cotacao.id), ana, {
      ...chave('chave-timeout'),
      limiteMs: 1_000,
    });

    expect(perdido.status).toBe(0);

    const recuperado = await criarPedido(page, ana, cotacao.id, 'chave-timeout');
    const pedido = pedidoSchema.parse(recuperado.corpo);

    expect(recuperado.status).toBe(200);
    expect(pedido.id).toBe('pedido-1');

    await chamarApi(page, 'POST', `/api/__mock/pedidos/${pedido.id}/resolver`, {
      estado: 'confirmado',
    });

    expect(await lerEstoque(page)).toBe((estoque ?? 0) - 2);
  });

  test('preço alterado invalida a cotação e exige confirmar a nova', async ({ page }) => {
    const ana = await entrar(page, ANA);

    await adicionar(page, ana);

    const cotacao = await cotar(page, ana);

    await chamarApi(page, 'POST', '/api/__mock/nfts/nft-01', { preco: '2.00' });

    const recusado = await criarPedido(page, ana, cotacao.id, 'chave-1');
    const erro = respostaErroSchema.parse(recusado.corpo).erro;
    const nova = cotacaoSchema.parse((erro.detalhes as { cotacao: unknown }).cotacao);
    const aceito = await criarPedido(page, ana, nova.id, 'chave-2');

    expect(recusado.status).toBe(409);
    expect(erro.codigo).toBe('COTACAO_DESATUALIZADA');
    expect(nova.total).toBe('4.016');
    expect(aceito.status).toBe(201);
    expect(pedidoSchema.parse(aceito.corpo).total).toBe('4.016');
  });

  test('edição esgotada durante a compra impede o pedido', async ({ page }) => {
    const ana = await entrar(page, ANA);

    await adicionar(page, ana);

    const cotacao = await cotar(page, ana);

    await chamarApi(page, 'POST', '/api/__mock/nfts/nft-01', { edicaoId: EDICAO, disponivel: 0 });

    const recusado = await criarPedido(page, ana, cotacao.id, 'chave-1');

    expect(recusado.status).toBe(409);
    expect(codigoErro(recusado.corpo)).toBe('EDICAO_INDISPONIVEL');
  });

  test('pedido pendente é retomado após refresh sem criar outra compra', async ({ page }) => {
    await chamarApi(page, 'POST', '/api/__mock/pagamento', { resolucao: 'confirmar' });

    const ana = await entrar(page, ANA);

    await adicionar(page, ana);

    const cotacao = await cotar(page, ana);
    const criado = pedidoSchema.parse((await criarPedido(page, ana, cotacao.id, 'chave-1')).corpo);

    expect(criado.estado).toBe('pendente');

    await recarregar(page);

    await expect
      .poll(
        async () =>
          (await chamarApi(page, 'GET', `/api/pedidos/${criado.id}`, undefined, ana)).corpo.estado,
        { timeout: 6_000 },
      )
      .toBe('confirmado');

    const repetido = await criarPedido(page, ana, cotacao.id, 'chave-1');

    expect(repetido.corpo.id).toBe(criado.id);
    expect(repetido.corpo.estado).toBe('confirmado');
  });
});

test.describe('isolamento', () => {
  test('outro usuário não vê pedido, carrinho nem usa carteira alheia', async ({ page }) => {
    const ana = await entrar(page, ANA);
    const bruno = await entrar(page, BRUNO);

    await adicionar(page, ana);

    const cotacao = await cotar(page, ana);
    const pedido = pedidoSchema.parse((await criarPedido(page, ana, cotacao.id, 'chave-1')).corpo);
    const pedidoAlheio = await chamarApi(
      page,
      'GET',
      `/api/pedidos/${pedido.id}`,
      undefined,
      bruno,
    );
    const carrinhoBruno = await chamarApi(page, 'GET', '/api/carrinho', undefined, bruno);

    await adicionar(page, bruno, 1);

    const cotacaoBruno = await cotar(page, bruno);
    const carteiraAlheia = await criarPedido(page, bruno, cotacaoBruno.id, 'chave-b');
    const carteiraBruno = await chamarApi(
      page,
      'POST',
      '/api/carteiras',
      {
        papel: 'principal',
        nomeExibicao: 'Bruno',
        apelido: null,
        rede: 'ethereum',
        nomePerfil: null,
        endereco: `0x${'b'.repeat(40)}`,
        carteiraSecundaria: null,
        tipo: 'coinbase',
        codigoIndicacao: null,
        email: null,
        nomeEns: null,
      },
      bruno,
    );
    const cotacaoAlheia = await chamarApi(
      page,
      'POST',
      '/api/pedidos',
      { ...entradaPedido(cotacao.id), carteiraId: carteiraBruno.corpo.id },
      bruno,
      chave('chave-cotacao-alheia'),
    );

    expect(cotacaoAlheia.status).toBe(409);
    expect(codigoErro(cotacaoAlheia.corpo)).toBe('COTACAO_DESATUALIZADA');
    expect(pedidoAlheio.status).toBe(403);
    expect(codigoErro(pedidoAlheio.corpo)).toBe('SEM_PERMISSAO');
    expect(carrinhoSchema.parse(carrinhoBruno.corpo).itens).toEqual([]);
    expect(carteiraAlheia.status).toBe(403);
  });

  test('evento de pedido chega só para o dono', async ({ page }) => {
    const ana = await entrar(page, ANA);
    const bruno = await entrar(page, BRUNO);

    await abrirOuvinte(page, 'ana', ana);
    await abrirOuvinte(page, 'bruno', bruno);
    await adicionar(page, ana);

    const cotacao = await cotar(page, ana);
    const pedido = pedidoSchema.parse((await criarPedido(page, ana, cotacao.id, 'chave-1')).corpo);

    await chamarApi(page, 'POST', `/api/__mock/pedidos/${pedido.id}/resolver`, {
      estado: 'confirmado',
    });

    await expect
      .poll(async () =>
        (await lerEventos(page, 'ana')).filter((texto) => texto.includes('order.updated')),
      )
      .toHaveLength(1);

    const [recebido] = (await lerEventos(page, 'ana')).filter((texto) =>
      texto.includes('order.updated'),
    );
    const [, dados] = JSON.parse(recebido);
    const evento = eventoPedidoAtualizadoSchema.parse(dados);
    const doBruno = await lerEventos(page, 'bruno');

    expect(evento.dados).toEqual({ usuarioId: 'usuario-ana', estado: 'confirmado' });
    expect(evento.versao).toBe(2);
    expect(doBruno.filter((texto) => texto.includes('order.updated'))).toEqual([]);
    expect(doBruno.some((texto) => texto.includes('nft.updated'))).toBe(true);
  });
});
