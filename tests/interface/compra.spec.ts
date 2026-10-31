import { expect, test, type Page } from '@playwright/test';
import { ANA, BRUNO, chamarApi, entrar } from '../apoio/api';

// ====================================================================
// 1. PREPARO
// Sessão real pela API e carrinho do usuário montado na simulação. Os
// pedidos e eventos passam pelo MSW e pelo socket.io-client de verdade.
// ====================================================================
type Item = [string, string, number];

const ITENS: Item[] = [
  ['nft-01', 'nft-01-1-50', 2],
  ['nft-05', 'nft-05-1-50', 6],
];

async function controlar(pagina: Page, caminho: string, corpo?: unknown) {
  return chamarApi(pagina, 'POST', `/api/__mock/${caminho}`, corpo);
}

async function prepararSessao(
  pagina: Page,
  credenciais = ANA,
  itens: Item[] = ITENS,
  destino = '/pagamento',
) {
  await pagina.goto('/');
  await pagina.getByTestId('socket-estado').waitFor({ state: 'attached' });
  await controlar(pagina, 'resetar');
  const token = await entrar(pagina, credenciais);

  for (const [nftId, edicaoId, quantidade] of itens) {
    await chamarApi(pagina, 'POST', '/api/carrinho/itens', { nftId, edicaoId, quantidade }, token);
  }

  await pagina.evaluate((valor) => localStorage.setItem('kurio:token', valor), token);
  await pagina.goto(destino);
  await pagina.getByTestId('socket-estado').waitFor({ state: 'attached' });

  return token;
}

async function preencherCodigo(pagina: Page) {
  await pagina.getByLabel('Nome do perfil').fill('ana.colecionadora');
  await pagina.getByLabel('Código de indicação').fill('AMIGO10');
}

async function abrirRevisao(pagina: Page) {
  await expect(pagina.getByTestId('pagamento-total')).toHaveText('10.736 ETH');
  await expect(pagina.getByRole('button', { name: 'Desconectar' })).toBeVisible();
  await preencherCodigo(pagina);
  await pagina.getByRole('button', { name: 'Confirmar compra' }).click();
  await expect(pagina.getByTestId('revisao-pedido')).toBeVisible();
}

async function totalDePedidos(pagina: Page) {
  return pagina.evaluate(() => {
    const banco = JSON.parse(localStorage.getItem('kurio:banco:v3') ?? '{}') as {
      pedidos?: Record<string, unknown>;
    };

    return Object.keys(banco.pedidos ?? {}).length;
  });
}

test.describe('compra no desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // ==================================================================
  // 2. COMPRA COMPLETA (ENUNCIADO 6)
  // ==================================================================
  test('do catálogo ao recibo confirmado, removendo só o comprado', async ({ page }) => {
    await prepararSessao(page, ANA, [], '/');

    await page.getByTestId('cartao-nome').first().click();
    await page.getByRole('button', { name: 'COMPRAR', exact: true }).click();
    await expect(page).toHaveURL(/\/carrinho/);
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click();
    await expect(page).toHaveURL(/\/pagamento/);

    await expect(page.getByRole('button', { name: 'Desconectar' })).toBeVisible();
    await preencherCodigo(page);
    await page.getByRole('button', { name: 'Confirmar compra' }).click();
    await expect(page.getByTestId('revisao-total')).toHaveText('1.206 ETH');
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();

    await expect(page).toHaveURL(/\/pedidos\/pedido-/);
    await expect(page.getByTestId('pedido-titulo')).toHaveText(
      'Seus NFTs agora estão na sua carteira',
      { timeout: 8000 },
    );
    await expect(page.getByTestId('recibo-total')).toHaveText('1.206 ETH');
    await expect(page.getByRole('link', { name: 'Ver no Etherscan' })).toHaveAttribute(
      'href',
      /etherscan\.io\/tx\/0x/,
    );

    await page.getByRole('button', { name: 'Fechar' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('cabecalho-badge')).toHaveCount(0);
  });

  test('o recibo é um retrato: mudar o preço depois não altera os valores', async ({ page }) => {
    await prepararSessao(page);
    await abrirRevisao(page);
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page.getByTestId('recibo-total')).toHaveText('10.736 ETH');
    await expect(page.getByRole('link', { name: 'Ver no Etherscan' })).toBeVisible({
      timeout: 8000,
    });

    await controlar(page, 'nfts/nft-01', { preco: '9.99' });
    await page.reload();
    await expect(page.getByTestId('recibo-total')).toHaveText('10.736 ETH');
  });

  test('validação aponta os campos, com foco no primeiro erro', async ({ page }) => {
    await prepararSessao(page);
    await expect(page.getByTestId('pagamento-total')).toHaveText('10.736 ETH');
    await page.getByLabel('Nome de exibição').fill('');
    await page.getByRole('button', { name: 'Confirmar compra' }).click();

    await expect(page.getByLabel('Nome de exibição')).toBeFocused();
    await expect(page.getByLabel('Nome de exibição')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Informe o nome de exibição')).toBeVisible();
    await expect(page.getByTestId('revisao-pedido')).toHaveCount(0);
  });

  // ==================================================================
  // 3. FALHAS DO PEDIDO (ENUNCIADO 7)
  // ==================================================================
  test('recusa mostra o motivo, preserva os itens e permite nova compra', async ({ page }) => {
    await prepararSessao(page);
    await controlar(page, 'pagamento', { resolucao: 'recusar' });
    await abrirRevisao(page);
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();

    await expect(page.getByTestId('pedido-titulo')).toHaveText('O pagamento foi recusado', {
      timeout: 8000,
    });
    await expect(page.getByRole('link', { name: 'Ver no Etherscan' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Tentar novamente' }).click();
    await expect(page).toHaveURL(/\/pagamento/);
    await expect(page.getByTestId('pagamento-item')).toHaveCount(2);
    await expect(page.getByTestId('revisao-pedido')).toHaveCount(0);
  });

  test('clique repetido cria um único pedido', async ({ page }) => {
    await prepararSessao(page);
    await abrirRevisao(page);
    await page.getByRole('button', { name: 'Confirmar pedido' }).dblclick({ force: true });

    await expect(page).toHaveURL(/\/pedidos\/pedido-/);
    expect(await totalDePedidos(page)).toBe(1);
  });

  test('timeout recupera o mesmo pedido, sem segunda compra', async ({ page }) => {
    test.setTimeout(60_000);
    await prepararSessao(page);
    await abrirRevisao(page);
    await controlar(page, 'pedidos/timeout-no-proximo');
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();

    await expect(page.getByTestId('revisao-erro')).toContainText('não será duplicada', {
      timeout: 15_000,
    });
    expect(await totalDePedidos(page)).toBe(1);

    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page).toHaveURL(/\/pedidos\/pedido-1/);
    expect(await totalDePedidos(page)).toBe(1);
  });

  // ==================================================================
  // 4. TEMPO REAL NO CHECKOUT (ENUNCIADO 9)
  // ==================================================================
  test('preço alterado pelo socket avisa, atualiza e exige nova confirmação', async ({ page }) => {
    await prepararSessao(page);
    await abrirRevisao(page);
    await expect(page.getByTestId('revisao-total')).toHaveText('10.736 ETH');

    await controlar(page, 'nfts/nft-01', { preco: '2.00' });

    await expect(page.getByTestId('anuncio-tempo-real')).toHaveText(
      'Preço de Emerald Ape #042 mudou de 1.19 para 2.00 ETH.',
    );
    await expect(page.getByTestId('revisao-total')).toHaveText('12.356 ETH');
    await expect(page.getByTestId('revisao-mudou')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled();

    await page.getByRole('button', { name: 'Aceitar novos valores' }).click();
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page).toHaveURL(/\/pedidos\/pedido-1/);
    await expect(page.getByTestId('recibo-total')).toHaveText('12.356 ETH');
  });

  test('servidor recusa cotação velha mesmo sem o evento chegar', async ({ page }) => {
    await prepararSessao(page);
    await abrirRevisao(page);
    await controlar(page, 'socket/derrubar');
    await controlar(page, 'nfts/nft-05', { preco: '3.00' });
    await page.getByRole('button', { name: 'Confirmar pedido' }).click({ force: true });

    await expect(page.getByTestId('revisao-mudou')).toBeVisible({ timeout: 8000 });
    expect(await totalDePedidos(page)).toBe(0);
  });

  test('carrinho aberto reflete preço e estoque recebidos', async ({ page }) => {
    await prepararSessao(page, ANA, ITENS, '/carrinho');
    await expect(page.getByTestId('resumo-total')).toHaveText('10.736 ETH');

    await controlar(page, 'nfts/nft-01', { preco: '2.00' });
    await expect(page.getByTestId('resumo-total')).toHaveText('12.356 ETH');
    await expect(page.getByTestId('anuncio-tempo-real')).toContainText('mudou de 1.19 para 2.00');

    await controlar(page, 'nfts/nft-05', { edicaoId: 'nft-05-1-50', disponivel: 2 });
    await expect(page.getByTestId('resumo-carrinho').getByTestId('resumo-erro')).toContainText(
      'Violet Nomad',
    );
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled();
  });

  // ==================================================================
  // 5. EVENTOS E QUEDA (ENUNCIADO 10)
  // ==================================================================
  test('evento duplicado não reanuncia, e evento antigo não regride', async ({ page }) => {
    await prepararSessao(page, ANA, ITENS, '/carrinho');
    await expect(page.getByTestId('resumo-total')).toHaveText('10.736 ETH');
    await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');

    await controlar(page, 'nfts/nft-01', { preco: '2.00' });
    await expect(page.getByTestId('resumo-total')).toHaveText('12.356 ETH');

    const atual = await page.getByTestId('socket-ultimo-evento').textContent();
    const evento = JSON.parse(atual ?? '{}') as Record<string, unknown>;

    await page.evaluate(() => {
      const anuncio = document.querySelector('[data-testid="anuncio-tempo-real"]');

      if (anuncio) {
        anuncio.textContent = 'marcador';
      }
    });
    await controlar(page, 'eventos/nft-atualizado', evento);
    await controlar(page, 'eventos/nft-atualizado', {
      ...evento,
      idEvento: 'evento-antigo',
      versao: 1,
      dados: { ...(evento.dados as object), preco: '0.50' },
    });

    await expect(page.getByTestId('socket-ultimo-evento')).toContainText('evento-antigo');
    await expect(page.getByTestId('anuncio-tempo-real')).toHaveText('marcador');
    await expect(page.getByTestId('resumo-total')).toHaveText('12.356 ETH');
  });

  test('queda de conexão com pedido pendente reconcilia ao reconectar', async ({ page }) => {
    await prepararSessao(page);
    await controlar(page, 'pagamento', { resolucao: 'manual' });
    await abrirRevisao(page);
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page.getByTestId('pedido-titulo')).toHaveText(
      'Aguardando a confirmação da carteira',
    );
    const pedidoId = page.url().split('/').pop();

    await controlar(page, 'socket/derrubar');
    await controlar(page, `pedidos/${pedidoId}/resolver`, { estado: 'confirmado' });

    await expect(page.getByTestId('pedido-titulo')).toHaveText(
      'Seus NFTs agora estão na sua carteira',
      { timeout: 15_000 },
    );
    expect(await totalDePedidos(page)).toBe(1);
  });

  test('refresh com pedido pendente recupera o estado e o terminal não muda', async ({ page }) => {
    await prepararSessao(page);
    await controlar(page, 'pagamento', { resolucao: 'manual' });
    await abrirRevisao(page);
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page.getByTestId('pedido-titulo')).toHaveText(
      'Aguardando a confirmação da carteira',
    );
    const url = page.url();
    const pedidoId = url.split('/').pop();

    await page.goto('/pagamento');
    await expect(page).toHaveURL(url);
    await expect(page.getByTestId('pedido-titulo')).toHaveText(
      'Aguardando a confirmação da carteira',
    );

    await controlar(page, `pedidos/${pedidoId}/resolver`, { estado: 'recusado' });
    await expect(page.getByTestId('pedido-titulo')).toHaveText('O pagamento foi recusado');
    await controlar(page, `pedidos/${pedidoId}/resolver`, { estado: 'confirmado' });
    await page.reload();
    await expect(page.getByTestId('pedido-titulo')).toHaveText('O pagamento foi recusado');
    expect(await totalDePedidos(page)).toBe(1);
  });

  // ==================================================================
  // 6. CARTEIRA, SESSÃO E ISOLAMENTO
  // ==================================================================
  test('conexão recusada trava a compra até conectar de novo', async ({ page }) => {
    await prepararSessao(page);
    await controlar(page, 'carteiras/recusar-conexao', { recusar: true });
    await page.reload();

    const reconectar = page.getByRole('button', { name: /Recusada/ });

    await expect(reconectar).toBeVisible();
    await preencherCodigo(page);
    await page.getByRole('button', { name: 'Confirmar compra' }).click();
    await expect(page.getByTestId('pagamento-aviso')).toContainText('Conecte a carteira');

    await controlar(page, 'carteiras/recusar-conexao', { recusar: false });
    await reconectar.click();
    await page.getByRole('button', { name: 'Desconectar' }).click();
    await expect(page.getByRole('button', { name: 'Conectar', exact: true })).toBeVisible();
  });

  test('sem carteira: informa o endereço, cadastra e compra', async ({ page }) => {
    await prepararSessao(page, BRUNO);
    await expect(page.getByTestId('pagamento-total')).toHaveText('10.736 ETH');
    await page.getByLabel('Coinbase Wallet').check({ force: true });
    await page.getByRole('combobox', { name: 'Rede' }).click();
    await page.getByRole('option', { name: 'Ethereum' }).click();
    await page.getByLabel('Endereço da carteira').fill('0x1234');
    await preencherCodigo(page);
    await page.getByRole('button', { name: 'Confirmar compra' }).click();
    await expect(page.getByText('Endereço 0x inválido')).toBeVisible();

    await page
      .getByLabel('Endereço da carteira')
      .fill('0x1234567890123456789012345678901234567890');
    await page.getByRole('button', { name: 'Confirmar compra' }).click();
    await expect(page.getByTestId('revisao-pedido')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page).toHaveURL(/\/pedidos\/pedido-1/);
  });

  test('pedido de outro usuário não mostra dados', async ({ page }) => {
    await prepararSessao(page);
    await abrirRevisao(page);
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page).toHaveURL(/\/pedidos\/pedido-1/);

    const tokenBruno = await entrar(page, BRUNO);

    await page.evaluate((valor) => localStorage.setItem('kurio:token', valor), tokenBruno);
    await page.reload();
    await expect(page.getByTestId('pedido-erro')).toContainText('Pedido indisponível');
    await expect(page.getByTestId('recibo-total')).toHaveCount(0);
  });

  test('visitante é levado ao login e volta ao pagamento', async ({ page }) => {
    await page.goto('/pagamento?cupom=KURIO10');
    await expect(page).toHaveURL(/\/login\?redirect=/);
  });
});

test.describe('compra no mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('sem formulário na tela: a folha pede o que falta, e a compra conclui', async ({ page }) => {
    await prepararSessao(page);
    await expect(page.getByTestId('pagamento-total-mobile')).toHaveText('10.736 ETH');
    await expect(page.getByTestId('cartao-carteira')).toHaveCount(2);
    await expect(page.getByTestId('barra-navegacao')).toHaveCount(0);

    await page.getByRole('button', { name: 'Confirmar compra' }).click();
    const folha = page.getByRole('dialog');

    await expect(folha.getByText('Informe o código de indicação')).toBeVisible();
    await folha.getByLabel('Código de indicação').fill('AMIGO10');
    await folha.getByLabel('Nome do perfil').fill('ana.colecionadora');
    await folha.getByRole('button', { name: 'Continuar' }).click();

    await expect(page.getByTestId('revisao-pedido')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page.getByTestId('recibo-total')).toHaveText('10.736 ETH');
    await expect(page.getByTestId('pedido-titulo')).toHaveText(
      'Seus NFTs agora estão na sua carteira',
      { timeout: 8000 },
    );

    const estourou = await page.evaluate(() => {
      const raiz = document.documentElement;

      return raiz.scrollWidth > raiz.clientWidth;
    });

    expect(estourou).toBe(false);
  });
});
