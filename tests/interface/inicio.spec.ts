import { expect, test, type Page } from '@playwright/test';
import { chamarApi } from '../apoio/api';

// ====================================================================
// 1. APOIO
// Coordenadas lidas do frame Desktop / Início, com tolerância de 1 px.
// ====================================================================
async function caixa(pagina: Page, testId: string) {
  const medida = await pagina.getByTestId(testId).first().boundingBox();

  if (!medida) {
    throw new Error(`Sem medida para ${testId}`);
  }

  return medida;
}

function conferir(valor: number, esperado: number) {
  expect(Math.abs(valor - esperado), `${valor} deveria ser ${esperado}`).toBeLessThanOrEqual(1);
}

const nomes = (pagina: Page) => pagina.getByTestId('cartao-nome');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(nomes(page).first()).toBeVisible();
  await chamarApi(page, 'POST', '/api/__mock/resetar');
  await page.reload();
  await expect(nomes(page).first()).toBeVisible();
});

test.describe('desktop 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('blocos nas posições do Figma', async ({ page }) => {
    const hero = await caixa(page, 'hero');
    const lateral = await caixa(page, 'coluna-lateral');
    const grade = await caixa(page, 'coluna-grade');
    const banner = await caixa(page, 'banner-destaque');
    const cartao = await caixa(page, 'cartao-nft');
    const promocao = await caixa(page, 'promocao');
    const artigo = await caixa(page, 'artigo');

    conferir(hero.x, 120);
    conferir(hero.y, 101);
    conferir(hero.width, 1200);
    conferir(hero.height, 450);
    conferir(lateral.x, 120);
    conferir(lateral.y, 647);
    conferir(lateral.width, 310);
    conferir(grade.x, 478);
    conferir(grade.y, 647);
    conferir(grade.width, 842);
    conferir(banner.width, 310);
    conferir(banner.height, 470);
    conferir(cartao.x, 478);
    conferir(cartao.y, 697);
    conferir(cartao.width, 258);
    conferir(promocao.width, 586);
    conferir(promocao.height, 250);
    conferir(artigo.width, 282);
    conferir(artigo.height, 369);
  });

  test('nove NFTs na ordem e nos preços do Figma, com 4 páginas', async ({ page }) => {
    await expect(nomes(page)).toHaveText([
      'Emerald Ape #042',
      'Sage Nomad #009',
      'Neon Vessel #552',
      'Cosmic Bloom #118',
      'Violet Nomad #314',
      'Ivory Baron #088',
      'Golden Beat #207',
      'Golden Frequency #071',
      'Golden Signal #160',
    ]);
    await expect(page.getByTestId('cartao-nft').first()).toContainText('1.19 ETH');
    await expect(page.getByTestId('cartao-nft').nth(2)).toContainText('2.29 ETH');
    await expect(page.getByRole('button', { name: /^Página / })).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'Página 1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('imagem principal carrega sem imagem quebrada', async ({ page }) => {
    await page.getByTestId('catalogo').scrollIntoViewIfNeeded();
    await expect(nomes(page).first()).toBeVisible();

    const quebradas = await page.evaluate(() =>
      [...document.querySelectorAll('img[loading="eager"], img[fetchpriority="high"]')]
        .filter((imagem) => !(imagem as HTMLImageElement).naturalWidth)
        .map((imagem) => (imagem as HTMLImageElement).src),
    );

    expect(quebradas).toEqual([]);
  });
});

test.describe('estado na URL', () => {
  test('filtros combinam, voltam à página 1 e sobrevivem a refresh e histórico', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Página 2' }).click();
    await expect(page).toHaveURL(/pagina=2/);

    await page
      .getByTestId('coluna-lateral')
      .getByRole('button', { name: /^Música/ })
      .click();
    await expect(page).not.toHaveURL(/pagina=/);
    await expect(page).toHaveURL(/categorias=/);
    await expect(
      page.getByTestId('coluna-lateral').getByRole('button', { name: /^Música/ }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page
      .getByTestId('coluna-lateral')
      .getByRole('button', { name: /^Polygon/ })
      .click();
    await expect(page).toHaveURL(/redes=/);

    const filtrados = await page.getByTestId('cartao-nft').count();

    expect(filtrados).toBeGreaterThan(0);
    expect(filtrados).toBeLessThan(9);

    const nomeFiltrado = await nomes(page).first().textContent();

    await page.reload();
    await expect(nomes(page).first()).toHaveText(nomeFiltrado ?? '');
    await expect(
      page.getByTestId('coluna-lateral').getByRole('button', { name: /^Polygon/ }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page.goBack();
    await expect(
      page.getByTestId('coluna-lateral').getByRole('button', { name: /^Polygon/ }),
    ).toHaveAttribute('aria-pressed', 'false');
    await page.goBack();
    await page.goBack();
    await expect(page).not.toHaveURL(/categorias=/);
    await expect(nomes(page).first()).toHaveText('Emerald Ape #042');
  });

  test('ordenação e aba mudam a consulta', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Ordenar por' }).click();
    await page.getByRole('option', { name: 'Maior preço' }).click();
    await expect(page).toHaveURL(/ordem=maior-preco/);
    await expect(page.getByTestId('cartao-nft').first()).toContainText('12.30 ETH');

    await page.getByRole('button', { name: 'Em alta' }).click();
    await expect(page).toHaveURL(/aba=em-alta/);
    await expect(page.getByRole('button', { name: 'Em alta' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  test('faixa de preço só vale ao aplicar', async ({ page }) => {
    await page.goto('/?precoMaximo=%220.50%22');
    await expect(page.getByText('Preço: 0,02 - 0,50 ETH')).toBeVisible();

    const url = page.url();

    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByTestId('cartao-nft').first()).toBeVisible();
    expect(page.url()).not.toBe('');
    expect(url).toContain('precoMaximo');

    for (const preco of await page.getByTestId('cartao-preco').all()) {
      expect(Number.parseFloat((await preco.textContent()) ?? '')).toBeLessThanOrEqual(0.5);
    }
  });

  test('URL inválida cai no padrão, sem quebrar', async ({ page }) => {
    await page.goto('/?categorias=%5B%22inexistente%22%5D&pagina=-3&ordem=%22x%22');

    await expect(nomes(page).first()).toHaveText('Emerald Ape #042');
  });
});

test.describe('estados', () => {
  test('banco salvo de versão antiga não trava a tela', async ({ page }) => {
    await page.evaluate(() =>
      localStorage.setItem('kurio:banco:v3', JSON.stringify({ nfts: [{ id: 'antigo' }] })),
    );
    await page.reload();
    await expect(nomes(page).first()).toHaveText('Emerald Ape #042');

    await page.evaluate(() => localStorage.setItem('kurio:banco:v3', '{corrompido'));
    await page.reload();
    await expect(nomes(page).first()).toHaveText('Emerald Ape #042');
  });

  test('evento de preço durante a primeira carga não trava a grade', async ({ page }) => {
    await page.goto('/?cenario=lento');
    await page.getByTestId('socket-estado').waitFor({ state: 'attached' });
    await chamarApi(page, 'POST', '/api/__mock/nfts/nft-01', { preco: '9.99' });

    await expect(nomes(page).first()).toHaveText('Emerald Ape #042', { timeout: 10_000 });
    await expect(page.getByTestId('cartao-preco').first()).toHaveText('9.99 ETH');
  });

  test('evento de preço reaplica o filtro: NFT acima do teto sai da grade', async ({ page }) => {
    await page.goto('/?precoMaximo=%225%22');
    await page.getByTestId('socket-estado').waitFor({ state: 'attached' });
    await expect(nomes(page).first()).toHaveText('Emerald Ape #042');

    await chamarApi(page, 'POST', '/api/__mock/nfts/nft-01', { preco: '9.99' });

    await expect(nomes(page).filter({ hasText: 'Emerald Ape #042' })).toHaveCount(0);
  });

  test('faixa de preço começa como no Figma', async ({ page }) => {
    await expect(page.getByText('Preço: 0,02 - 12,30 ETH')).toBeVisible();
  });

  test('skeleton aparece no lento, com tamanho estável', async ({ page }) => {
    await chamarApi(page, 'POST', '/api/__mock/cenario', { nome: 'lento' });
    await page.reload();

    const esqueleto = page.getByTestId('grade-esqueleto');

    await expect(esqueleto).toBeVisible();
    await expect(esqueleto.locator('li')).toHaveCount(9);
    expect(
      await esqueleto
        .locator('.esqueleto')
        .first()
        .evaluate((elemento) => getComputedStyle(elemento).animationName),
    ).toBe('brilho-esqueleto');

    await expect(nomes(page).first()).toBeVisible({ timeout: 8_000 });
    await expect(esqueleto).toHaveCount(0);
  });

  test('shimmer para com movimento reduzido', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await chamarApi(page, 'POST', '/api/__mock/cenario', { nome: 'lento' });
    await page.reload();

    const bloco = page.getByTestId('grade-esqueleto').locator('.esqueleto').first();

    await expect(bloco).toBeVisible();
    expect(await bloco.evaluate((elemento) => getComputedStyle(elemento).animationName)).toBe(
      'none',
    );
  });

  test('vazio oferece limpar filtros', async ({ page }) => {
    await page.goto('/?busca=%22nao-existe%22');
    await expect(page.getByTestId('nfts-vazio')).toBeVisible();

    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(nomes(page).first()).toHaveText('Emerald Ape #042');
  });

  test('detalhe abre pelo cartão', async ({ page }) => {
    await nomes(page).first().click();
    await expect(page).toHaveURL(/\/nfts\/nft-01$/);
  });
});

test.describe('mobile 414', () => {
  test.use({ viewport: { width: 414, height: 896 } });

  test('blocos nas posições do frame mobile', async ({ page }) => {
    const hero = await caixa(page, 'hero-mobile');
    const primeiro = await caixa(page, 'cartao-nft');
    const segundo = await page.getByTestId('cartao-nft').nth(1).boundingBox();

    conferir(hero.x, 24);
    conferir(hero.y, 101);
    conferir(hero.width, 366);
    conferir(hero.height, 190);
    conferir(primeiro.x, 24);
    conferir(primeiro.y, 343);
    conferir(primeiro.width, 175);
    conferir(segundo?.x ?? 0, 215);
    conferir(segundo?.y ?? 0, 375);
    await expect(page.getByTestId('hero')).toBeHidden();
    await expect(page.getByTestId('coluna-lateral')).toBeHidden();
    await expect(page.getByTestId('cartao-nft').nth(2).getByText('RARO')).toBeVisible();
    await expect(page.getByTestId('cartao-nft').first().getByText('RARO')).toHaveCount(0);
  });

  test('filtros abrem em painel com foco preso e fecham com Esc', async ({ page }) => {
    await page.getByRole('button', { name: 'Abrir filtros' }).click();

    const painel = page.getByRole('dialog');

    await expect(painel).toBeVisible();
    await painel.getByRole('button', { name: /^Música/ }).click();
    await expect(page).toHaveURL(/categorias=/);

    await page.keyboard.press('Escape');
    await expect(painel).toBeHidden();
  });

  test('busca mobile filtra', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('ivory');
    await expect(nomes(page).first()).toHaveText('Ivory Baron #088');
    await expect(page).toHaveURL(/busca=/);
  });
});

for (const largura of [390, 768, 1024, 1440]) {
  test(`sem overflow horizontal em ${largura}`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto('/');
    await expect(nomes(page).first()).toBeVisible();

    const excesso = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(excesso).toBeLessThanOrEqual(0);
  });
}

// ====================================================================
// FAIXA DE PREÇO
// O puxador segue o frame, e o valor nunca passa de 12,30 ETH.
// ====================================================================
test.describe('faixa de preço', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('puxadores nas posições do frame e teto de 12,30 no teclado', async ({ page }) => {
    await page.goto('/');
    const painel = page.getByRole('region', { name: 'Faixa de preço' });
    const minimo = page.getByRole('slider', { name: 'Preço mínimo em ETH' });
    const maximo = page.getByRole('slider', { name: 'Preço máximo em ETH' });

    await expect(maximo).toBeVisible();

    const caixaMinimo = await minimo.boundingBox();
    const caixaMaximo = await maximo.boundingBox();

    expect(Math.abs((caixaMinimo?.x ?? 0) - 152)).toBeLessThanOrEqual(1);
    expect(Math.abs((caixaMaximo?.x ?? 0) - 334)).toBeLessThanOrEqual(1);

    await maximo.focus();
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowRight');
    await expect(painel).toContainText('0,02 - 12,30 ETH');
    await expect(maximo).toHaveAttribute('aria-valuemax', '16.01');
  });
});
