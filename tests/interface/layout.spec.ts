import { expect, test, type Page } from '@playwright/test';
import { chamarApi } from '../apoio/api';

// ====================================================================
// 1. MEDIDAS DO FIGMA
// Posições lidas do frame Desktop / Início, com tolerância de 1 px.
// ====================================================================
async function caixa(pagina: Page, testId: string) {
  const medida = await pagina.getByTestId(testId).boundingBox();

  if (!medida) {
    throw new Error(`Sem medida para ${testId}`);
  }

  return medida;
}

function conferir(valor: number, esperado: number) {
  expect(Math.abs(valor - esperado), `${valor} deveria ser ${esperado}`).toBeLessThanOrEqual(1);
}

test.describe('desktop 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('cabeçalho nas posições do Figma', async ({ page }) => {
    await page.goto('/');

    const logo = await caixa(page, 'cabecalho-logo');
    const nav = await caixa(page, 'cabecalho-nav');
    const acoes = await caixa(page, 'cabecalho-acoes');
    const entrar = await caixa(page, 'cabecalho-entrar');

    conferir(logo.x, 120);
    conferir(logo.y, 24);
    conferir(logo.width, 160);
    conferir(logo.height, 34);
    conferir(nav.x, 496);
    conferir(nav.width, 401);
    conferir(acoes.x, 1113);
    conferir(acoes.width, 207);
    conferir(entrar.x, 1220);
    conferir(entrar.y, 24);
    conferir(entrar.width, 100);
    conferir(entrar.height, 35);
  });

  test('rodapé nas medidas do Figma', async ({ page }) => {
    await page.goto('/');

    const servicos = await caixa(page, 'rodape-servicos');
    const contato = await caixa(page, 'rodape-contato');
    const links = await caixa(page, 'rodape-links');

    conferir(servicos.x, 120);
    conferir(servicos.width, 1200);
    conferir(servicos.height, 250);
    conferir(contato.y - servicos.y, 250);
    conferir(contato.height, 88);
    conferir(links.y - servicos.y, 338);
    conferir(links.height, 236);
  });

  test('cores, fonte e contagem real do carrinho', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cartao-nft').first()).toBeVisible();
    await chamarApi(page, 'POST', '/api/__mock/resetar');
    await expect(page.getByTestId('cabecalho-badge')).toHaveCount(0);

    const estilos = await page.evaluate(() => {
      const corpo = getComputedStyle(document.body);
      const entrar = document.querySelector('[data-testid=cabecalho-entrar]') as HTMLElement;

      return {
        fundo: corpo.backgroundColor,
        texto: corpo.color,
        fonte: corpo.fontFamily,
        botao: getComputedStyle(entrar).backgroundColor,
      };
    });

    expect(estilos.fundo).toBe('rgb(20, 13, 10)');
    expect(estilos.texto).toBe('rgb(245, 241, 235)');
    expect(estilos.botao).toBe('rgb(210, 138, 76)');
    expect(estilos.fonte).toContain('Roboto Mono');
    expect(await page.evaluate(() => document.fonts.check('16px "Roboto Mono Variable"'))).toBe(
      true,
    );
  });
});

test('badge soma quantidades do carrinho da API', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('cartao-nft').first()).toBeVisible();
  await chamarApi(page, 'POST', '/api/__mock/resetar');

  const visitante = await page.evaluate(() => localStorage.getItem('kurio:visitante'));

  await chamarApi(
    page,
    'POST',
    '/api/carrinho/itens',
    { nftId: 'nft-01', edicaoId: 'nft-01-1-50', quantidade: 6 },
    undefined,
    { cabecalhos: { 'X-Visitante-Id': visitante ?? '' } },
  );
  await page.reload();

  await expect(page.getByTestId('cabecalho-badge')).toHaveText('6');
  await expect(page.getByRole('link', { name: 'Carrinho, 6 itens' })).toBeVisible();
});

test('ação fora do escopo avisa, sem navegar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mercado', exact: true }).click({ force: true });

  await expect(page.getByText('Indisponível nesta versão')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
});

test('links reais levam às rotas', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('cabecalho-entrar').click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('cabecalho-logo').click();
  await expect(page).toHaveURL(/\/$/);
});

test.describe('mobile 414', () => {
  test.use({ viewport: { width: 414, height: 896 } });

  test('barra inferior substitui cabeçalho e rodapé, como no frame', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('barra-navegacao')).toBeVisible();
    await expect(page.getByTestId('cabecalho-logo')).toBeHidden();
    await expect(page.getByTestId('rodape')).toBeHidden();

    const barra = await caixa(page, 'barra-navegacao');

    conferir(barra.x, 0);
    conferir(barra.width, 414);
    conferir(barra.height, 135);
    conferir(barra.y + barra.height, 896);

    await page.getByRole('link', { name: 'Carrinho' }).click();
    await expect(page).toHaveURL(/\/carrinho$/);
  });
});

for (const largura of [390, 768, 1440]) {
  test(`sem overflow horizontal em ${largura}`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto('/');
    await expect(page.getByTestId('cartao-nft').first()).toBeVisible();

    const excesso = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(excesso).toBeLessThanOrEqual(0);
  });
}
