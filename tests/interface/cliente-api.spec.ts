import { expect, test, type Page } from '@playwright/test';
import { chamarApi } from '../apoio/api';

function definirCenario(pagina: Page, nome: string, extras: object = {}) {
  return chamarApi(pagina, 'POST', '/api/__mock/cenario', { nome, ...extras });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('nfts-total')).toHaveText('48');
  await chamarApi(page, 'POST', '/api/__mock/resetar');
});

test('Axios e Query mostram os dados da API simulada', async ({ page }) => {
  await expect(page.getByTestId('nfts-primeiro')).toHaveText('Emerald Ape #042');
});

test('busca envia parâmetro e mostra resultado vazio', async ({ page }) => {
  await page.getByLabel('Buscar NFTs').fill('ivory');
  await expect(page.getByTestId('nfts-primeiro')).toHaveText('Ivory Baron #088');

  await page.getByLabel('Buscar NFTs').fill('nao-existe');
  await expect(page.getByTestId('nfts-primeiro')).toHaveText('Nenhum resultado');
});

test('resposta atrasada não sobrescreve a busca mais recente', async ({ page }) => {
  await definirCenario(page, 'fora-de-ordem');

  await page.getByLabel('Buscar NFTs').fill('emerald');
  await page.getByLabel('Buscar NFTs').fill('ivory');
  await expect(page.getByTestId('nfts-primeiro')).toHaveText('Ivory Baron #088');

  await page.waitForTimeout(2_500);

  await expect(page.getByTestId('nfts-primeiro')).toHaveText('Ivory Baron #088');
});

test('falha transitória é repetida sozinha e recupera', async ({ page }) => {
  await definirCenario(page, 'erro-500', { vezes: 1 });
  await page.getByLabel('Buscar NFTs').fill('ivory');

  await expect(page.getByTestId('nfts-primeiro')).toHaveText('Ivory Baron #088', {
    timeout: 5_000,
  });
  await expect(page.getByTestId('nfts-erro')).toHaveCount(0);
});

test('offline mostra falha transitória e recupera ao tentar novamente', async ({ page }) => {
  await definirCenario(page, 'offline');
  await page.getByLabel('Buscar NFTs').fill('ivory');

  await expect(page.getByTestId('nfts-erro')).toHaveText('FALHA_TRANSITORIA', { timeout: 10_000 });

  await definirCenario(page, 'padrao');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();

  await expect(page.getByTestId('nfts-primeiro')).toHaveText('Ivory Baron #088');
});

test('erro 403 não é repetido e mostra o código certo', async ({ page }) => {
  await definirCenario(page, 'erro-403');

  const inicio = Date.now();

  await page.getByLabel('Buscar NFTs').fill('ivory');
  await expect(page.getByTestId('nfts-erro')).toHaveText('SEM_PERMISSAO');

  expect(Date.now() - inicio).toBeLessThan(900);
});

test('Axios cria identidade do visitante ao chamar sem sessão', async ({ page }) => {
  const visitante = await page.evaluate(() => localStorage.getItem('kurio:visitante'));

  expect(visitante).toMatch(/^[0-9a-f-]{36}$/);
});
