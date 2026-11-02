import { expect, test, type Page } from '@playwright/test';
import { ANA, chamarApi, entrar } from '../apoio/api';

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

  test('menu centrado com o logo e sem arcos nas promoções', async ({ page }) => {
    await page.goto('/');

    const logo = await caixa(page, 'cabecalho-logo');
    const centroDoMenu = await page
      .getByTestId('cabecalho-nav')
      .getByText('Criadores')
      .evaluate((elemento) => {
        const intervalo = document.createRange();

        intervalo.selectNodeContents(elemento);
        const texto = intervalo.getBoundingClientRect();

        return texto.top + texto.height / 2;
      });

    expect(Math.abs(centroDoMenu - (logo.y + logo.height / 2))).toBeLessThanOrEqual(1);
    await expect(page.getByTestId('promocao').first().locator('div[aria-hidden]')).toHaveCount(0);
  });

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

test('rota inexistente mostra a página 404 com volta ao início', async ({ page }) => {
  await page.goto('/rota-que-nao-existe');

  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar para o início' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('links reais levam às rotas', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('cabecalho-entrar').click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
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

test.describe('abertura antes do JavaScript', () => {
  test.use({ serviceWorkers: 'block' });

  test('marca aparece sem depender do JavaScript', async ({ page }) => {
    await page.route('**/assets/*.js', (rota) => rota.abort());
    await page.goto('/');

    await expect(page.getByText('KURIO')).toBeVisible();
  });
});

test.describe('falha ao iniciar', () => {
  const PACOTE_DOS_MOCKS = '**/assets/browser-*.js';

  test('pacote que não baixa mostra aviso, e tentar de novo recupera', async ({ page }) => {
    await page.route(PACOTE_DOS_MOCKS, (rota) => rota.abort());
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText('Não foi possível iniciar');

    await page.unroute(PACOTE_DOS_MOCKS);
    await page.getByRole('button', { name: 'Tentar de novo' }).click();
    await expect(page.getByTestId('cartao-nome').first()).toBeVisible();
  });

  test('inicialização presa além do limite também avisa', async ({ page }) => {
    await page.clock.install();
    await page.route(PACOTE_DOS_MOCKS, () => undefined);
    await page.goto('/', { waitUntil: 'commit' });

    await expect(async () => {
      await page.clock.runFor(15_000);
      await expect(page.getByRole('alert')).toContainText('Não foi possível iniciar', {
        timeout: 500,
      });
    }).toPass();
  });
});

test('abertura some quando a aplicação monta', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('cartao-nome').first()).toBeVisible();
  await expect(page.locator('.abertura')).toHaveCount(0);
});

// ====================================================================
// FRAMES: DIVISÓRIA DO CABEÇALHO E INÍCIO ATRÁS DO LOGIN
// A divisória só aparece nas telas cujo frame a desenha. Abrir o login não
// muda nada atrás do modal, também com barra de rolagem real, que o navegador
// de teste esconde por padrão. O modal fica centrado na Início e em pixel
// inteiro, para o texto não borrar.
// ====================================================================
test.describe('frames do desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  async function medirInicio(pagina: Page) {
    return pagina.evaluate(() => {
      const seletores = [
        '[data-testid=cabecalho-logo]',
        '[data-testid=hero]',
        '[data-testid=hero] h1',
        '[data-testid=hero] img',
        '[data-testid=coluna-lateral]',
        '[data-testid=coluna-grade]',
        '[data-testid=cartao-nome]',
      ];

      return seletores.map((seletor) => {
        const elemento = document.querySelector(seletor);
        const caixa = elemento?.getBoundingClientRect();
        const texto = elemento instanceof HTMLElement ? elemento.innerText : '';

        return { seletor, x: caixa?.x, y: caixa?.y, largura: caixa?.width, texto };
      });
    });
  }

  for (const caminho of ['/nfts/nft-01', '/carrinho']) {
    test(`${caminho} sem divisória no cabeçalho, como no frame`, async ({ page }) => {
      await page.goto(caminho);
      await expect(page.getByTestId('cabecalho-logo')).toBeVisible();
      await expect(page.getByTestId('cabecalho-divisoria')).toHaveCount(0);
    });
  }

  test('/pagamento sem divisória no cabeçalho, como no frame', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('socket-estado').waitFor({ state: 'attached' });

    const token = await entrar(page, ANA);

    await chamarApi(
      page,
      'POST',
      '/api/carrinho/itens',
      { nftId: 'nft-01', edicaoId: 'nft-01-1-50', quantidade: 1 },
      token,
    );
    await page.evaluate((valor) => localStorage.setItem('kurio:token', valor), token);
    await page.goto('/pagamento');

    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeVisible();
    await expect(page.getByTestId('cabecalho-logo')).toBeVisible();
    await expect(page.getByTestId('cabecalho-divisoria')).toHaveCount(0);
  });

  test('início com divisória no cabeçalho, como no frame', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cabecalho-divisoria')).toBeVisible();
  });

  test('abrir o login mantém a Início parada e o modal centrado com barra de rolagem real', async ({
    playwright,
    baseURL,
  }) => {
    const navegador = await playwright.chromium.launch({
      ignoreDefaultArgs: ['--hide-scrollbars'],
    });
    const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });

    await pagina.goto(`${baseURL}/`);
    await expect(pagina.getByTestId('cartao-nome').first()).toBeVisible();
    await pagina.evaluate(() => window.scrollTo({ top: 20, behavior: 'instant' }));

    const antes = await medirInicio(pagina);

    await pagina.getByTestId('cabecalho-entrar').click();

    const modal = pagina.getByTestId('modal-autenticacao');

    await expect(modal).toBeVisible();
    await modal.evaluate((elemento) =>
      Promise.all(elemento.getAnimations().map(({ finished }) => finished)),
    );

    const depois = await medirInicio(pagina);
    const inerte = await pagina.locator('[inert] [data-testid=hero]').count();
    const medidas = await pagina.evaluate(() => {
      const caixaModal = document
        .querySelector('[data-testid=modal-autenticacao]')
        ?.getBoundingClientRect();
      const caixaHero = document.querySelector('[data-testid=hero]')?.getBoundingClientRect();

      return {
        barra: getComputedStyle(document.body).getPropertyValue('--removed-body-scroll-bar-size'),
        modal: caixaModal?.x ?? 0,
        centroModal: (caixaModal?.x ?? 0) + (caixaModal?.width ?? 0) / 2,
        centroHero: (caixaHero?.x ?? 0) + (caixaHero?.width ?? 0) / 2,
      };
    });

    await navegador.close();

    expect(depois).toEqual(antes);
    expect(inerte).toBe(1);
    expect(parseFloat(medidas.barra)).toBeGreaterThan(0);
    expect(Number.isInteger(medidas.modal)).toBe(true);
    expect(Math.abs(medidas.centroModal - medidas.centroHero)).toBeLessThanOrEqual(0.5);
  });
});

// ====================================================================
// SERVICE WORKER DESLIGADO PELO NAVEGADOR
// Aba parada faz o navegador desligar o worker, que perde o registro da
// página. Ao religar, as chamadas à API não podem ir para a rede.
// ====================================================================
test.describe('service worker desligado pelo navegador', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  async function desligarWorker(pagina: Page) {
    const sessao = await pagina.context().newCDPSession(pagina);

    await sessao.send('ServiceWorker.enable');
    await sessao.send('ServiceWorker.stopAllWorkers');
  }

  test('catálogo segue funcionando ao clicar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cartao-nome').first()).toBeVisible();
    await desligarWorker(page);

    await page.getByRole('button', { name: 'Página 2' }).click();
    await expect(page).toHaveURL(/pagina=2/);
    await expect(page.getByTestId('cartao-nome').first()).toBeVisible();
    await expect(page.getByTestId('nfts-erro')).toHaveCount(0);
  });

  test('consulta sem clique do usuário também recupera', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cartao-nome').first()).toBeVisible();
    await desligarWorker(page);

    await page.evaluate(() => {
      history.pushState({}, '', '/?pagina=3');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await expect(page).toHaveURL(/pagina=3/);
    await expect(page.getByTestId('cartao-nome').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('nfts-erro')).toHaveCount(0);
  });

  test('comprar segue funcionando', async ({ page }) => {
    await page.goto('/nfts/nft-01');
    await expect(page.getByRole('button', { name: 'COMPRAR', exact: true })).toBeVisible();
    await desligarWorker(page);

    await page.getByRole('button', { name: 'COMPRAR', exact: true }).click();
    await expect(page).toHaveURL(/\/carrinho/);
    await expect(page.getByTestId('item-carrinho').first()).toBeVisible();
  });
});
