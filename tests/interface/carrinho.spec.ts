import { expect, test, type Page } from '@playwright/test';
import { ANA, chamarApi } from '../apoio/api';

const CHAVE_VISITANTE = 'kurio:visitante';

// ====================================================================
// 1. PREPARO
// Cada teste parte de banco restaurado e monta o carrinho pela API, como
// visitante. As asserções olham a interface e os valores da cotação.
// ====================================================================
async function abrirCarrinho(pagina: Page, itens: Array<[string, string, number]>, caminho = '') {
  await pagina.goto('/');
  await pagina.waitForFunction((chave) => localStorage.getItem(chave), CHAVE_VISITANTE);
  await chamarApi(pagina, 'POST', '/api/__mock/resetar');
  const visitante = await pagina.evaluate((chave) => localStorage.getItem(chave), CHAVE_VISITANTE);

  for (const [nftId, edicaoId, quantidade] of itens) {
    await chamarApi(
      pagina,
      'POST',
      '/api/carrinho/itens',
      { nftId, edicaoId, quantidade },
      undefined,
      { cabecalhos: { 'X-Visitante-Id': visitante ?? '' } },
    );
  }

  await pagina.goto(`/carrinho${caminho}`);
}

const ITENS: Array<[string, string, number]> = [
  ['nft-01', 'nft-01-1-50', 2],
  ['nft-05', 'nft-05-1-50', 6],
  ['nft-06', 'nft-06-1-10', 9],
];

test.describe('carrinho no desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('mostra itens e resumo com os valores da cotação, como visitante', async ({ page }) => {
    await abrirCarrinho(page, ITENS);

    await expect(page.getByTestId('item-carrinho')).toHaveCount(3);
    await expect(page.getByTestId('item-total').first()).toHaveText('2.38 ETH');
    await expect(page.getByTestId('resumo-carrinho')).toContainText('26.83 ETH');
    await expect(page.getByTestId('resumo-carrinho')).toContainText('(-) 00.00');
    await expect(page.getByTestId('resumo-total')).toHaveText('26.846 ETH');
    await expect(page.getByTestId('relacionado')).toHaveCount(5);
    await expect(page.getByTestId('cabecalho-badge')).toHaveText('17');
  });

  test('alterar quantidade recalcula e persiste após refresh', async ({ page }) => {
    await abrirCarrinho(page, ITENS);
    const linha = page.getByTestId('item-carrinho').first();

    await linha.getByRole('button', { name: /Aumentar/ }).click();
    await expect(linha.getByTestId('item-quantidade')).toHaveText('3');
    await expect(linha.getByTestId('item-total')).toHaveText('3.57 ETH');
    await expect(page.getByTestId('resumo-total')).toHaveText('28.036 ETH');

    await page.reload();
    await expect(linha.getByTestId('item-quantidade')).toHaveText('3');
    await expect(page.getByTestId('resumo-total')).toHaveText('28.036 ETH');
  });

  test('preço com três dígitos fica em uma linha só', async ({ page }) => {
    await abrirCarrinho(page, [['nft-36', 'nft-36-1-50', 2]]);
    const preco = page.getByRole('cell', { name: '12.30 ETH', exact: true });

    await expect(preco).toBeVisible();
    expect((await preco.boundingBox())?.height).toBe(16);
  });

  test('respeita o limite da edição e o mínimo de 1', async ({ page }) => {
    await abrirCarrinho(page, [['nft-05', 'nft-05-1-1', 1]]);
    const linha = page.getByTestId('item-carrinho');

    await expect(linha.getByRole('button', { name: /Aumentar/ })).toBeDisabled();
    await expect(linha.getByRole('button', { name: /Diminuir/ })).toBeDisabled();
  });

  test('remover devolve o foco ao conteúdo; o último mostra o vazio', async ({ page }) => {
    await abrirCarrinho(page, ITENS.slice(0, 2));

    await page.getByRole('button', { name: 'Remover Emerald Ape #042 do carrinho' }).click();
    await expect(page.getByTestId('item-carrinho')).toHaveCount(1);
    await expect(page.getByRole('main')).toBeFocused();
    await expect(page.getByTestId('resumo-total')).toHaveText('8.356 ETH');

    await page.getByRole('button', { name: 'Remover Violet Nomad #314 do carrinho' }).click();
    await expect(page.getByTestId('carrinho-vazio')).toBeVisible();
  });

  test('cupom válido entra na URL, sobrevive a refresh e pode sair', async ({ page }) => {
    await abrirCarrinho(page, ITENS);
    const resumo = page.getByTestId('resumo-carrinho');

    await resumo.getByLabel('Código promocional').fill('kurio10');
    await resumo.getByRole('button', { name: 'Aplicar' }).click();

    await expect(page).toHaveURL(/cupom=KURIO10/);
    await expect(resumo).toContainText('(-) 2.683 ETH');
    await expect(page.getByTestId('resumo-total')).toHaveText('24.163 ETH');

    await page.reload();
    await expect(page.getByTestId('resumo-total')).toHaveText('24.163 ETH');

    await resumo.getByRole('button', { name: 'Remover' }).click();
    await expect(page).not.toHaveURL(/cupom/);
    await expect(page.getByTestId('resumo-total')).toHaveText('26.846 ETH');
  });

  test('cupom inválido e expirado mostram erro no campo e mantêm o resumo', async ({ page }) => {
    await abrirCarrinho(page, ITENS);
    const resumo = page.getByTestId('resumo-carrinho');
    const campo = resumo.getByLabel('Código promocional');

    await campo.fill('NAOEXISTE');
    await resumo.getByRole('button', { name: 'Aplicar' }).click();
    await expect(resumo.getByRole('alert')).toContainText('Código promocional inválido');
    await expect(campo).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('resumo-total')).toHaveText('26.846 ETH');
    await expect(page).not.toHaveURL(/cupom/);

    await campo.fill('GENESIS20');
    await resumo.getByRole('button', { name: 'Aplicar' }).click();
    await expect(resumo.getByRole('alert')).toContainText('Código promocional expirado');
  });

  test('cupom recusado vindo da URL avisa e calcula sem ele', async ({ page }) => {
    await abrirCarrinho(page, ITENS, '?cupom=GENESIS20');

    await expect(page.getByTestId('resumo-carrinho').getByRole('alert')).toContainText('expirado');
    await expect(page.getByTestId('resumo-total')).toHaveText('26.846 ETH');
    await expect(page.getByRole('link', { name: 'Conectar e finalizar' })).not.toHaveAttribute(
      'href',
      /cupom/,
    );
  });

  test('skeleton no resumo durante lentidão, sem deslocar o layout', async ({ page }) => {
    await abrirCarrinho(page, ITENS, '?cenario=lento');
    const finalizar = page.getByRole('button', { name: 'Conectar e finalizar' });

    await expect(page.getByTestId('resumo-esqueleto').first()).toBeVisible();
    await expect(finalizar).toBeDisabled();
    const durante = await finalizar.boundingBox();

    await expect(page.getByTestId('resumo-total')).toHaveText('26.846 ETH', { timeout: 20_000 });
    const depois = await page.getByRole('link', { name: 'Conectar e finalizar' }).boundingBox();

    expect(durante?.y).toBe(depois?.y);
    expect(depois?.y).toBe(445);
  });

  test('falha da cotação oferece nova tentativa e trava finalizar', async ({ page }) => {
    await abrirCarrinho(page, ITENS);
    await expect(page.getByTestId('resumo-total')).toHaveText('26.846 ETH');
    await chamarApi(page, 'POST', '/api/__mock/cenario', {
      nome: 'erro-500',
      vezes: 3,
      rota: '/api/cotacoes',
    });

    await page.getByRole('button', { name: /Aumentar quantidade de Emerald/ }).click();
    const erro = page.getByTestId('resumo-carrinho').getByTestId('resumo-erro');

    await expect(erro).toBeVisible();
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled();

    await erro.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByTestId('resumo-total')).toHaveText('28.036 ETH');
    await expect(page.getByRole('link', { name: 'Conectar e finalizar' })).toBeVisible();
  });

  test('estoque abaixo do pedido avisa em texto, trava finalizar e diminuir leva ao limite', async ({
    page,
  }) => {
    await abrirCarrinho(page, ITENS);
    await expect(page.getByTestId('resumo-total')).toHaveText('26.846 ETH');
    await chamarApi(page, 'POST', '/api/__mock/nfts/nft-06', {
      edicaoId: 'nft-06-1-10',
      disponivel: 4,
    });
    await page.reload();
    const linha = page.getByTestId('item-carrinho').nth(2);

    await expect(linha.getByText('Só 4 disponível')).toBeVisible();
    await expect(page.getByTestId('resumo-carrinho').getByTestId('resumo-erro')).toContainText(
      'Ivory Baron',
    );
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled();

    await linha.getByRole('button', { name: /Diminuir/ }).click();
    await expect(linha.getByTestId('item-quantidade')).toHaveText('4');
    await expect(page.getByRole('link', { name: 'Conectar e finalizar' })).toBeVisible();
  });

  test('visitante vai ao login com retorno, e o carrinho é preservado', async ({ page }) => {
    await abrirCarrinho(page, ITENS, '?cupom=KURIO10');

    await page.getByRole('link', { name: 'Conectar e finalizar' }).click();
    await expect(page).toHaveURL(/\/login\?redirect=/);

    await page.getByLabel('E-mail', { exact: true }).fill(ANA.email);
    await page.getByLabel('Senha', { exact: true }).fill(ANA.senha);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/pagamento\?cupom=KURIO10/);

    await page.goto('/carrinho');
    await expect(page.getByTestId('item-carrinho')).toHaveCount(3);
    await expect(page.getByTestId('cabecalho-conta')).toBeVisible();
  });
});

test.describe('carrinho no mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('cartões, painel e ações funcionam sem a barra inferior', async ({ page }) => {
    await abrirCarrinho(page, [
      ['nft-01', 'nft-01-1-50', 1],
      ['nft-06', 'nft-06-1-10', 2],
    ]);
    const cartao = page.getByTestId('item-carrinho-mobile').first();

    await expect(page.getByTestId('barra-navegacao')).toHaveCount(0);
    await expect(page.getByTestId('resumo-total-mobile')).toHaveText('4.786 ETH');
    await expect(cartao.getByRole('button', { name: /Diminuir/ })).toBeDisabled();

    await cartao.getByRole('button', { name: /Aumentar/ }).click();
    await expect(cartao.getByTestId('item-quantidade-mobile')).toHaveText('2');
    await expect(cartao.getByTestId('item-total-mobile')).toHaveText('2.38 ETH');

    await cartao.getByRole('button', { name: /Remover/ }).click();
    await expect(page.getByTestId('item-carrinho-mobile')).toHaveCount(1);
    await expect(page.getByTestId('resumo-total-mobile')).toHaveText('3.596 ETH');
  });

  test('a lixeira não encosta nos botões e não há rolagem lateral', async ({ page }) => {
    await abrirCarrinho(page, ITENS);
    const cartao = page.getByTestId('item-carrinho-mobile').first();
    const lixeira = await cartao.getByRole('button', { name: /Remover/ }).boundingBox();
    const mais = await cartao.getByRole('button', { name: /Aumentar/ }).boundingBox();

    expect(lixeira!.y + lixeira!.height).toBeLessThanOrEqual(mais!.y);

    const larguraExcedida = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

    expect(larguraExcedida).toBe(false);
  });

  test('com muitos itens o último fica alcançável acima do painel', async ({ page }) => {
    await abrirCarrinho(page, [
      ...ITENS,
      ['nft-07', 'nft-07-1-50', 1],
      ['nft-09', 'nft-09-1-50', 1],
    ]);

    await expect(page.getByTestId('resumo-total-mobile')).not.toBeEmpty();
    await expect(page.getByTestId('item-carrinho-mobile')).toHaveCount(5);
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    );
    const ultimo = await page.getByTestId('item-carrinho-mobile').last().boundingBox();
    const painel = await page.getByTestId('resumo-carrinho-mobile').boundingBox();

    expect(ultimo!.y + ultimo!.height).toBeLessThanOrEqual(painel!.y);
  });
});
