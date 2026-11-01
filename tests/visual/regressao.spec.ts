import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { ANA, chamarApi, entrar } from '../apoio/api';

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 414, height: 896 },
};
const ITENS = [
  ['nft-01', 'nft-01-1-50', 2],
  ['nft-05', 'nft-05-1-50', 6],
  ['nft-06', 'nft-06-1-10', 9],
] as const;

// ====================================================================
// 1. DADOS ESTÁVEIS
// Banco restaurado, carrinho conhecido e animações desligadas. Baselines
// dependem do sistema: há versões para Windows e Linux, e em outro sistema
// o teste é pulado até gerar as próprias com --update-snapshots.
// ====================================================================
const pastaBaselines = 'tests/visual/regressao.spec.ts-snapshots';
const baselineDoSistema = `${pastaBaselines}/inicio-desktop-chromium-${process.platform}.png`;

test.skip(
  !existsSync(baselineDoSistema) && !process.env.PLAYWRIGHT_VISUAL_QUALQUER_SISTEMA,
  'Sem baselines para este sistema; veja o README para gerar.',
);

async function prepararCarrinho(pagina: Page) {
  await pagina.goto('/');
  await pagina.getByTestId('socket-estado').waitFor({ state: 'attached' });
  await chamarApi(pagina, 'POST', '/api/__mock/resetar');
  const token = await entrar(pagina, ANA);

  for (const [nftId, edicaoId, quantidade] of ITENS) {
    await chamarApi(pagina, 'POST', '/api/carrinho/itens', { nftId, edicaoId, quantidade }, token);
  }

  await pagina.evaluate((valor) => localStorage.setItem('kurio:token', valor), token);
}

async function comparar(pagina: Page, nome: string) {
  await pagina.waitForLoadState('networkidle');
  await pagina.evaluate(() => document.fonts.ready);
  await expect(pagina).toHaveScreenshot(`${nome}.png`, {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.005,
  });
}

for (const [perfil, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`regressão visual ${perfil}`, () => {
    test.use({ viewport, deviceScaleFactor: 1 });

    test('início', async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('cartao-nome').first().waitFor();
      await comparar(page, `inicio-${perfil}`);
    });

    test('detalhe', async ({ page }) => {
      await page.goto('/nfts/nft-01');
      await page.getByRole('heading', { name: 'Emerald Ape #042' }).first().waitFor();
      await comparar(page, `detalhe-${perfil}`);
    });

    test('carrinho', async ({ page }) => {
      await prepararCarrinho(page);
      await page.goto('/carrinho');
      await expect(page.getByRole('button', { name: /Remover Emerald/ }).first()).toBeAttached();
      await comparar(page, `carrinho-${perfil}`);
    });

    test('pagamento', async ({ page }) => {
      await prepararCarrinho(page);
      await page.goto('/pagamento');
      await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled();
      await comparar(page, `pagamento-${perfil}`);
    });
  });
}
