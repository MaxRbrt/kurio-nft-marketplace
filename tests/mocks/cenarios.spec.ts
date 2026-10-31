import { expect, test, type Page } from '@playwright/test';
import { listaNftsSchema } from '../../src/contracts/catalogo/nfts';
import { respostaErroSchema } from '../../src/contracts/comum/erros';
import { ANA, chamarApi, entrar } from '../apoio/api';

const codigoErro = (corpo: unknown) => respostaErroSchema.parse(corpo).erro.codigo;

function definirCenario(pagina: Page, nome: string, extras: object = {}) {
  return chamarApi(pagina, 'POST', '/api/__mock/cenario', { nome, ...extras });
}

async function medirGet(pagina: Page, caminho: string) {
  return pagina.evaluate(async (caminho) => {
    const inicio = performance.now();

    await fetch(caminho);

    return performance.now() - inicio;
  }, caminho);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');
  expect((await chamarApi(page, 'POST', '/api/__mock/resetar')).status).toBe(204);
});

test('nome desconhecido é recusado', async ({ page }) => {
  const { status, corpo } = await definirCenario(page, 'inexistente');

  expect(status).toBe(422);
  expect(codigoErro(corpo)).toBe('VALIDACAO');
});

test('vazio devolve lista vazia no formato do contrato', async ({ page }) => {
  await definirCenario(page, 'vazio');

  const lista = listaNftsSchema.parse((await chamarApi(page, 'GET', '/api/nfts')).corpo);

  expect(lista.itens).toEqual([]);
  expect(lista.paginacao.totalPaginas).toBe(0);
});

test('lento atrasa e padrão volta a responder rápido', async ({ page }) => {
  await definirCenario(page, 'lento');
  expect(await medirGet(page, '/api/nfts')).toBeGreaterThan(2_000);

  await definirCenario(page, 'padrao');
  expect(await medirGet(page, '/api/nfts')).toBeLessThan(1_000);
});

test('latência variável repete a mesma sequência', async ({ page }) => {
  await definirCenario(page, 'latencia-variavel');

  const rapida = await medirGet(page, '/api/nfts');
  const lenta = await medirGet(page, '/api/nfts');

  expect(lenta).toBeGreaterThan(rapida);
  expect(lenta).toBeGreaterThan(800);
});

test('timeout não responde dentro do limite do cliente', async ({ page }) => {
  await definirCenario(page, 'timeout');

  const { status } = await chamarApi(page, 'GET', '/api/nfts', undefined, undefined, {
    limiteMs: 500,
  });

  expect(status).toBe(0);
});

test('offline falha a conexão e recupera ao sair do cenário', async ({ page }) => {
  await definirCenario(page, 'offline');
  expect((await chamarApi(page, 'GET', '/api/nfts')).status).toBe(0);

  await definirCenario(page, 'padrao');
  expect((await chamarApi(page, 'GET', '/api/nfts')).status).toBe(200);
});

test('erros HTTP seguem o contrato, por vezes e por rota', async ({ page }) => {
  await definirCenario(page, 'erro-500', { vezes: 1 });

  const falha = await chamarApi(page, 'GET', '/api/nfts');
  const recuperada = await chamarApi(page, 'GET', '/api/nfts');

  expect(falha.status).toBe(500);
  expect(codigoErro(falha.corpo)).toBe('FALHA_TRANSITORIA');
  expect(recuperada.status).toBe(200);

  await definirCenario(page, 'erro-403', { rota: '/api/nfts/nft-01' });

  const naRota = await chamarApi(page, 'GET', '/api/nfts/nft-01');
  const foraDaRota = await chamarApi(page, 'GET', '/api/nfts/nft-02');

  expect(naRota.status).toBe(403);
  expect(codigoErro(naRota.corpo)).toBe('SEM_PERMISSAO');
  expect(foraDaRota.status).toBe(200);
});

test('sessão expirada responde 401 com o código certo', async ({ page }) => {
  const token = await entrar(page, ANA);

  await definirCenario(page, 'sessao-expirada');

  const { status, corpo } = await chamarApi(page, 'GET', '/api/perfil', undefined, token);

  expect(status).toBe(401);
  expect(codigoErro(corpo)).toBe('SESSAO_EXPIRADA');
});

test('cenário sobrevive ao refresh e reset volta ao padrão', async ({ page }) => {
  await definirCenario(page, 'erro-500');
  await page.reload();
  await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');
  expect((await chamarApi(page, 'GET', '/api/nfts')).status).toBe(500);

  await chamarApi(page, 'POST', '/api/__mock/resetar');
  expect((await chamarApi(page, 'GET', '/api/nfts')).status).toBe(200);
});

test('cenário pode ser escolhido pela URL', async ({ page }) => {
  await page.goto('/?cenario=vazio');
  await expect(page.getByTestId('nfts-vazio')).toBeVisible();
});

test.describe('durante a compra', () => {
  async function prepararCotacao(pagina: Page) {
    const ana = await entrar(pagina, ANA);

    await chamarApi(
      pagina,
      'POST',
      '/api/carrinho/itens',
      { nftId: 'nft-01', edicaoId: 'nft-01-1-50', quantidade: 2 },
      ana,
    );

    const { corpo } = await chamarApi(pagina, 'POST', '/api/cotacoes', {}, ana);

    return { ana, entrada: entradaPedido(corpo.id) };
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

  const comChave = (chave: string, limiteMs?: number) => ({
    cabecalhos: { 'Idempotency-Key': chave },
    limiteMs,
  });

  test('preço alterado muda o dado e o pedido é recusado', async ({ page }) => {
    const { ana, entrada } = await prepararCotacao(page);

    await definirCenario(page, 'preco-alterado');

    const { status, corpo } = await chamarApi(
      page,
      'POST',
      '/api/pedidos',
      entrada,
      ana,
      comChave('c1'),
    );
    const nft = await chamarApi(page, 'GET', '/api/nfts/nft-01');

    expect(status).toBe(409);
    expect(codigoErro(corpo)).toBe('COTACAO_DESATUALIZADA');
    expect(nft.corpo.preco).toBe('1.19');
    expect(
      nft.corpo.edicoes.find((edicao: { id: string }) => edicao.id === 'nft-01-1-50').preco,
    ).toBe('1.69');
    await expect(page.getByTestId('socket-ultimo-evento')).toContainText('nft.updated');
  });

  test('edição esgotada recusa o pedido', async ({ page }) => {
    const { ana, entrada } = await prepararCotacao(page);

    await definirCenario(page, 'edicao-esgotada');

    const { status, corpo } = await chamarApi(
      page,
      'POST',
      '/api/pedidos',
      entrada,
      ana,
      comChave('c1'),
    );

    expect(status).toBe(409);
    expect(codigoErro(corpo)).toBe('EDICAO_INDISPONIVEL');
  });

  test('pedido com timeout recupera o mesmo pedido', async ({ page }) => {
    const { ana, entrada } = await prepararCotacao(page);

    await definirCenario(page, 'pedido-timeout');

    const perdido = await chamarApi(
      page,
      'POST',
      '/api/pedidos',
      entrada,
      ana,
      comChave('c1', 800),
    );
    const recuperado = await chamarApi(page, 'POST', '/api/pedidos', entrada, ana, comChave('c1'));

    expect(perdido.status).toBe(0);
    expect(recuperado.status).toBe(200);
    expect(recuperado.corpo.id).toBe('pedido-1');
  });

  test('pagamento confirmado e recusado chegam ao estado final', async ({ page }) => {
    const { ana, entrada } = await prepararCotacao(page);

    await definirCenario(page, 'pagamento-recusado');

    const recusado = await chamarApi(page, 'POST', '/api/pedidos', entrada, ana, comChave('c1'));

    await expect
      .poll(
        async () =>
          (await chamarApi(page, 'GET', `/api/pedidos/${recusado.corpo.id}`, undefined, ana)).corpo
            .estado,
        { timeout: 5_000 },
      )
      .toBe('recusado');

    await definirCenario(page, 'pagamento-confirmado');

    const nova = await chamarApi(page, 'POST', '/api/cotacoes', {}, ana);
    const confirmado = await chamarApi(
      page,
      'POST',
      '/api/pedidos',
      entradaPedido(nova.corpo.id),
      ana,
      comChave('c2'),
    );

    await expect
      .poll(
        async () =>
          (await chamarApi(page, 'GET', `/api/pedidos/${confirmado.corpo.id}`, undefined, ana))
            .corpo.estado,
        { timeout: 5_000 },
      )
      .toBe('confirmado');
  });
});
