import { expect, test, type Page } from '@playwright/test';
import { ANA, BRUNO, chamarApi, entrar } from '../apoio/api';

// ====================================================================
// 1. PREPARO
// Cada caso aqui veio de um defeito visto clicando na tela. Banco
// restaurado, sessão real e carrinho montado pela API simulada.
// ====================================================================
async function entrarEm(pagina: Page, destino: string, credenciais = ANA) {
  await pagina.goto('/');
  await pagina.getByTestId('socket-estado').waitFor({ state: 'attached' });
  await chamarApi(pagina, 'POST', '/api/__mock/resetar');
  const token = await entrar(pagina, credenciais);

  await pagina.evaluate((valor) => localStorage.setItem('kurio:token', valor), token);
  await pagina.goto(destino);
  await pagina.getByTestId('socket-estado').waitFor({ state: 'attached' });

  return token;
}

function posicaoCatalogo(pagina: Page) {
  return pagina.evaluate(() => document.getElementById('catalogo')?.getBoundingClientRect().top);
}

test.describe('catálogo no desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('filtro, aba e ordem mantêm a posição da tela', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('cartao-nome').first().waitFor();
    await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));

    await page
      .getByRole('button', { name: /^Fotografia/ })
      .first()
      .click();
    await expect(page.getByTestId('cartao-nome')).toHaveCount(4);
    expect(await page.evaluate(() => window.scrollY)).toBe(500);

    await page.getByRole('button', { name: 'Novos lançamentos' }).first().click();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(500);
  });

  test('trocar de página leva ao início do catálogo, não ao topo', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('cartao-nome').first().waitFor();
    await page
      .getByRole('navigation', { name: 'Paginação' })
      .getByText('2', { exact: true })
      .click();
    await expect(page.getByTestId('cartao-nome').first()).not.toHaveText('Emerald Ape #042');
    await expect.poll(() => posicaoCatalogo(page)).toBeLessThan(120);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  });

  test('contagem de cada grupo respeita o outro grupo', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: /^Fotografia/ })
      .first()
      .click();
    const ethereum = page.getByRole('button', { name: /^Ethereum/ }).first();

    await expect(ethereum).toHaveText(/\(1\)/);
    await ethereum.click();
    await expect(page.getByTestId('cartao-nome')).toHaveCount(1);
    await expect(ethereum).toHaveText(/\(1\)/);
  });

  test('contagem mostra traço, e não zero, enquanto carrega', async ({ page }) => {
    await page.goto('/?cenario=lento');
    await expect(page.getByRole('button', { name: /^Fotografia/ }).first()).toHaveText(/\(–\)/);
  });

  test('busca recolhida avisa que a lista está filtrada e pode ser limpa', async ({ page }) => {
    await page.goto('/?busca=golden');
    const aviso = page.getByTestId('busca-ativa');

    await expect(aviso).toContainText('golden');
    await aviso.getByRole('button', { name: 'Limpar busca' }).click();
    await expect(aviso).toHaveCount(0);
    await expect(page.getByTestId('cartao-nome')).toHaveCount(9);
  });
});

test.describe('login', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('fechar volta à tela de origem, mesmo depois de trocar de aba', async ({ page }) => {
    await page.goto('/nfts/nft-01');
    await page.getByRole('button', { name: 'Favoritar', exact: true }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByRole('link', { name: 'Criar conta' }).first().click();
    await expect(page).toHaveURL(/\/cadastro/);
    await page.getByRole('button', { name: 'Fechar' }).click();
    await expect(page).toHaveURL(/\/nfts\/nft-01$/);
  });

  test('acesso direto: fechar vai à Início', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Fechar' }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('perfil', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('senha atual preenchida pelo navegador não impede de salvar', async ({ page }) => {
    await entrarEm(page, '/perfil');
    await page.getByLabel('Apelido da carteira').fill('Cofre');
    await page.locator('#perfil-ens').fill('ana');
    await page.locator('#perfil-senha-atual').fill('preenchida-pelo-navegador');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();

    await expect(page.getByText('Perfil salvo.')).toBeVisible();
    await expect(page.locator('#perfil-nova-senha')).toHaveAttribute('aria-invalid', 'false');
  });
});

test.describe('pagamento', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('erros em português e foco no primeiro campo da tela', async ({ page }) => {
    const token = await entrarEm(page, '/', BRUNO);

    await chamarApi(
      page,
      'POST',
      '/api/carrinho/itens',
      { nftId: 'nft-01', edicaoId: 'nft-01-1-50', quantidade: 1 },
      token,
    );
    await page.goto('/pagamento');
    await expect(page.getByTestId('pagamento-total')).toHaveText('1.206 ETH');
    await page.getByRole('button', { name: 'Confirmar compra' }).click();

    await expect(page.getByText('Erro: Selecione uma rede')).toBeVisible();
    await expect(page.getByText('Erro: Selecione uma carteira')).toBeVisible();
    await expect(page.getByText('Invalid option')).toHaveCount(0);
    await expect(page.locator('#pagamento-rede')).toBeFocused();
  });

  test('abrir o cupom foca o campo, e o aviso de conexão some ao reconectar', async ({ page }) => {
    const token = await entrarEm(page, '/');

    await chamarApi(
      page,
      'POST',
      '/api/carrinho/itens',
      { nftId: 'nft-01', edicaoId: 'nft-01-1-50', quantidade: 1 },
      token,
    );
    await page.goto('/pagamento');
    await page.getByRole('button', { name: 'Desconectar' }).click();
    await page.getByLabel('Código de indicação').fill('AMIGO');
    await page.getByRole('button', { name: 'Confirmar compra' }).click();
    const aviso = page.getByTestId('pagamento-aviso');

    await expect(aviso).toContainText('Conecte a carteira');
    await page.getByRole('button', { name: 'Conectar', exact: true }).click();
    await expect(aviso).toHaveCount(0);

    await page.getByRole('button', { name: /Tem um código promocional/ }).click();
    await expect(page.locator('#cupom-pagamento')).toBeFocused();
  });

  test('revisão mostra o endereço, e a recusa volta com o cupom', async ({ page }) => {
    const token = await entrarEm(page, '/');

    await chamarApi(
      page,
      'POST',
      '/api/carrinho/itens',
      { nftId: 'nft-01', edicaoId: 'nft-01-1-50', quantidade: 1 },
      token,
    );
    await chamarApi(page, 'POST', '/api/__mock/pagamento', { resolucao: 'recusar' });
    await page.goto('/pagamento?cupom=KURIO10');
    await expect(page.getByRole('button', { name: 'Desconectar' })).toBeVisible();
    await page.getByLabel('Código de indicação').fill('AMIGO');
    await page.getByRole('button', { name: 'Confirmar compra' }).click();
    await expect(page.getByTestId('revisao-pedido')).toContainText('0xA91F…E82C');
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();

    await expect(page.getByTestId('pedido-titulo')).toHaveText('O pagamento foi recusado', {
      timeout: 8000,
    });
    await page.getByRole('link', { name: 'Tentar novamente' }).click();
    await expect(page).toHaveURL(/cupom=KURIO10/);
  });

  test('compra em Polygon aponta para o explorador da rede', async ({ page }) => {
    const token = await entrarEm(page, '/');

    await chamarApi(
      page,
      'POST',
      '/api/carrinho/itens',
      { nftId: 'nft-01', edicaoId: 'nft-01-1-50', quantidade: 1 },
      token,
    );
    await page.goto('/pagamento');
    await page.getByRole('button', { name: 'Usar outra carteira?' }).click();
    await expect(page.getByRole('button', { name: 'Desconectar' })).toBeVisible();
    await page.getByLabel('Código de indicação').fill('AMIGO');
    await page.getByRole('button', { name: 'Confirmar compra' }).click();
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();

    await expect(page.getByRole('link', { name: 'Ver no Polygonscan' })).toHaveAttribute(
      'href',
      /polygonscan\.com/,
      { timeout: 8000 },
    );
  });
});

test.describe('carrinho no desktop', () => {
  test.use({ viewport: { width: 1440, height: 400 } });

  test('remover não rola a página, e edições do mesmo NFT se distinguem', async ({ page }) => {
    const token = await entrarEm(page, '/');

    for (const edicaoId of ['nft-01-1-50', 'nft-01-1-10', 'nft-02-1-50']) {
      const nftId = edicaoId.slice(0, 6);

      await chamarApi(
        page,
        'POST',
        '/api/carrinho/itens',
        { nftId, edicaoId, quantidade: 1 },
        token,
      );
    }

    await page.goto('/carrinho');
    const linhas = page.getByTestId('item-carrinho');

    await expect(linhas.nth(0)).toContainText('Edição: 1/50');
    await expect(linhas.nth(1)).toContainText('Edição: 1/10');
    await expect(linhas.nth(2)).toContainText('ID do token');

    await page.evaluate(() => window.scrollTo({ top: 60, behavior: 'instant' }));
    const antes = await page.evaluate(() => window.scrollY);

    await linhas
      .nth(2)
      .getByRole('button', { name: /Remover/ })
      .click();
    await expect(linhas).toHaveCount(2);
    expect(await page.evaluate(() => window.scrollY)).toBe(antes);
  });
});

// ====================================================================
// 2. LARGURAS ESTREITAS
// Nada encosta na arte nem passa da margem, e os nomes aparecem inteiros.
// Em 414 px, a largura do frame, as posições não mudam.
// ====================================================================
for (const largura of [375, 390, 414]) {
  test.describe(`mobile ${largura}`, () => {
    test.use({ viewport: { width: largura, height: 844 } });

    test('hero sem sobreposição, abas na margem e nomes inteiros', async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('cartao-nome').first().waitFor();

      const medidas = await page.evaluate(() => {
        const paragrafo = [...document.querySelectorAll('p')].find((elemento) =>
          elemento.textContent?.startsWith('Descubra NFTs selecionados de criadores do mundo'),
        );
        const faixa = document.createRange();

        faixa.selectNodeContents(paragrafo as Element);
        const arte = [...document.querySelectorAll('img')].find((imagem) => {
          const { width } = imagem.getBoundingClientRect();

          return width >= 90 && width <= 138;
        });
        const abas = document.querySelector('[aria-current="true"]')?.closest('ul');
        const nomes = [...document.querySelectorAll<HTMLElement>('[data-testid="cartao-nome"]')];

        return {
          textoDireita: faixa.getBoundingClientRect().right,
          arteEsquerda: arte?.getBoundingClientRect().left ?? 0,
          abasDireita: abas?.lastElementChild?.getBoundingClientRect().right ?? 0,
          larguraTela: document.documentElement.clientWidth,
          cortados: nomes.filter(
            (nome) => nome.offsetParent && nome.scrollHeight > nome.clientHeight + 1,
          ).length,
          estouro: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

      expect(medidas.textoDireita).toBeLessThanOrEqual(medidas.arteEsquerda);
      expect(medidas.abasDireita).toBeLessThanOrEqual(medidas.larguraTela - 24 + 1);
      expect(medidas.cortados).toBe(0);
      expect(medidas.estouro).toBeLessThanOrEqual(0);
    });

    test('folha de filtros sem rolagem lateral', async ({ page }) => {
      await page.goto('/');
      await page
        .getByRole('button', { name: /filtro/i })
        .first()
        .click();
      const folha = page.getByRole('dialog');

      await expect(folha.getByText('Coleções')).toBeVisible();

      const excesso = await folha.evaluate(
        (elemento) => elemento.scrollWidth - elemento.clientWidth,
      );

      expect(excesso).toBeLessThanOrEqual(0);
    });
  });
}

test.describe('tablet 768', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('arte ocupa o cartão, sem rolagem lateral', async ({ page }) => {
    await page.goto('/');
    const cartao = page.getByTestId('cartao-nft').first();

    await expect(cartao).toBeVisible();

    const medidas = await cartao.evaluate((elemento) => ({
      cartao: elemento.getBoundingClientRect().width,
      arte: elemento.querySelector('img')?.getBoundingClientRect().width ?? 0,
    }));

    expect(medidas.arte).toBeGreaterThan(medidas.cartao - 10);
  });
});

// ====================================================================
// 3. CARTÃO DO CARRINHO EM TELAS ESTREITAS
// Lixeira e botões ficam dentro do cartão em qualquer largura do mobile.
// ====================================================================
for (const largura of [375, 390, 414]) {
  test.describe(`carrinho em ${largura}`, () => {
    test.use({ viewport: { width: largura, height: 844 } });

    test('botões dentro do cartão', async ({ page }) => {
      const token = await entrarEm(page, '/');

      await chamarApi(
        page,
        'POST',
        '/api/carrinho/itens',
        { nftId: 'nft-08', edicaoId: 'nft-08-1-50', quantidade: 1 },
        token,
      );
      await page.goto('/carrinho');
      const cartao = page.getByTestId('item-carrinho-mobile').first();

      await expect(cartao).toBeVisible();

      const excedem = await cartao.evaluate((elemento) => {
        const limite = elemento.getBoundingClientRect().right;

        return [...elemento.querySelectorAll('button')].filter(
          (botao) => botao.getBoundingClientRect().right > limite,
        ).length;
      });

      expect(excedem).toBe(0);
    });
  });
}
