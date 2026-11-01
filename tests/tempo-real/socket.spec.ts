import { expect, test, type Page } from '@playwright/test';

const TEMPO_ALEM_DO_PRAZO_MS = 40_000;

function postarControle(pagina: Page, caminho: string, corpo?: unknown) {
  return pagina.evaluate(
    async ({ caminho, corpo }) => {
      const resposta = await fetch(`/api/__mock/${caminho}`, {
        method: 'POST',
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });

      return resposta.status;
    },
    { caminho, corpo },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');
});

test('recebe evento pelo socket.io-client', async ({ page }) => {
  const evento = { id: 'nft_1', preco: '1.25' };

  expect(await postarControle(page, 'eventos/nft-atualizado', evento)).toBe(204);

  await expect(page.getByTestId('socket-ultimo-evento')).toHaveText(JSON.stringify(evento));
});

test('reconecta sozinho após queda e volta a receber eventos', async ({ page }) => {
  expect(await postarControle(page, 'socket/derrubar')).toBe(204);

  await expect(page.getByTestId('socket-conexoes')).toHaveText('2', { timeout: 15_000 });
  await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');

  await postarControle(page, 'eventos/nft-atualizado', { id: 'nft_2' });
  await expect(page.getByTestId('socket-ultimo-evento')).toHaveText(
    JSON.stringify({ id: 'nft_2' }),
  );
});

test('heartbeat mantém a conexão além do prazo de 30 s', async ({ page }) => {
  await page.clock.install();
  await page.reload();
  await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');

  await page.clock.runFor(TEMPO_ALEM_DO_PRAZO_MS);

  await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');
  await expect(page.getByTestId('socket-conexoes')).toHaveText('1');
});
