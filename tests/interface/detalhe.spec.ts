import { expect, test, type Page } from '@playwright/test';
import { ANA, BRUNO, chamarApi, entrar } from '../apoio/api';

// ====================================================================
// 1. APOIO
// Coordenadas lidas dos frames de Detalhes, com tolerância de 1 px.
// ====================================================================
function conferir(valor: number | undefined, esperado: number) {
  expect(
    Math.abs((valor ?? -999) - esperado),
    `${valor} deveria ser ${esperado}`,
  ).toBeLessThanOrEqual(1);
}

async function entrarNaPagina(pagina: Page, credenciais: { email: string; senha: string }) {
  const token = await entrar(pagina, credenciais);

  await pagina.evaluate((valor) => localStorage.setItem('kurio:token', valor), token);
}

const nomeNaGrade = (pagina: Page) => pagina.getByTestId('cartao-nome').first();
const titulo = (pagina: Page) => pagina.getByRole('heading', { level: 1 }).first();

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(nomeNaGrade(page)).toBeVisible();
  await chamarApi(page, 'POST', '/api/__mock/resetar');
});

test.describe('desktop 1440', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('estrelas seguem a nota, com a última apagada como no frame', async ({ page }) => {
    await page.goto('/nfts/nft-01');

    const estrelas = page.getByTestId('detalhe-informacoes').locator('span[aria-hidden] svg');

    await expect(estrelas).toHaveCount(5);
    await expect(estrelas.nth(3)).toHaveCSS('color', 'rgb(210, 138, 76)');
    await expect(estrelas.nth(4)).toHaveCSS('color', 'rgb(207, 178, 140)');
  });

  test('acesso direto nas posições do Figma', async ({ page }) => {
    await page.goto('/nfts/nft-01');
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible();

    const produto = await page.getByTestId('detalhe-produto').boundingBox();
    const dados = await page.getByTestId('detalhe-informacoes').boundingBox();
    const comprar = await page.getByRole('button', { name: 'COMPRAR', exact: true }).boundingBox();
    const favoritar = await page
      .getByRole('button', { name: 'Favoritar', exact: true })
      .boundingBox();
    const relacionado = await page.getByTestId('relacionado').first().boundingBox();

    conferir(produto?.x, 120);
    conferir(produto?.y, 129);
    conferir(produto?.height, 448);
    conferir(dados?.x, 725);
    conferir(dados?.width, 595);
    conferir(comprar?.x, 1052);
    conferir(comprar?.y, 400);
    conferir(comprar?.width, 130);
    conferir(favoritar?.x, 1190);
    conferir(relacionado?.x, 120);
    conferir(relacionado?.y, 1169);
    const alturas = await page
      .getByTestId('cabecalho-nav')
      .locator('a, button')
      .evaluateAll((itens) => {
        return itens.map((item) => {
          const faixa = document.createRange();

          faixa.selectNodeContents(item);

          return Math.round(faixa.getBoundingClientRect().y);
        });
      });

    expect(new Set(alturas).size).toBe(1);
    await expect(page.getByRole('button', { name: 'Mercado', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByTestId('relacionado')).toHaveText([
      /Cosmic Bloom #118/,
      /Violet Nomad #314/,
      /Ivory Baron #088/,
      /Golden Beat #207/,
      /Golden Signal #160/,
    ]);
  });

  test('galeria troca a imagem e amplia com foco preso', async ({ page }) => {
    await page.goto('/nfts/nft-01');

    const segunda = page.getByRole('button', { name: 'Ver imagem 2 de 4' });
    const terceira = page.getByRole('button', { name: 'Ver imagem 3 de 4' });

    await expect(segunda).toHaveAttribute('aria-pressed', 'true');
    await terceira.click();
    await expect(terceira).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Ampliar imagem' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('abas mostram detalhes e avaliações', async ({ page }) => {
    await page.goto('/nfts/nft-01');
    await expect(page.getByRole('tabpanel')).toContainText('Cunhado na Ethereum');

    await page.getByRole('tab', { name: /Avaliações/ }).click();
    await expect(page.getByRole('tabpanel')).toContainText('nota média 4.8');
  });

  test('ações do cartão aparecem com o mouse, nas medidas do frame', async ({ page }) => {
    const cartao = page.getByTestId('cartao-nft').nth(1);
    const acoes = cartao.getByTestId('cartao-acoes');

    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect(acoes).toHaveCSS('opacity', '0');
    await cartao.hover();
    await expect(acoes).toHaveCSS('opacity', '1');

    const medidaCartao = await cartao.boundingBox();
    const medidaAcoes = await acoes.boundingBox();

    conferir((medidaAcoes?.x ?? 0) - (medidaCartao?.x ?? 0), 67);
    conferir((medidaAcoes?.y ?? 0) - (medidaCartao?.y ?? 0), 258);
    conferir(medidaAcoes?.width, 125);
    conferir(medidaAcoes?.height, 35);

    await cartao.getByRole('button', { name: 'Adicionar Sage Nomad #009 ao carrinho' }).click();
    await expect(page.getByTestId('cabecalho-badge')).toHaveText('1');
    await expect(page.getByText('Adicionado ao carrinho.')).toBeVisible();
  });
});

test.describe('compra', () => {
  test('NFT inexistente mostra aviso, sem quebrar', async ({ page }) => {
    await page.goto('/nfts/nao-existe');

    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible();
  });

  test('skeleton no lento, falha e nova tentativa', async ({ page }) => {
    await chamarApi(page, 'POST', '/api/__mock/cenario', { nome: 'lento' });
    await page.goto('/nfts/nft-01');
    await expect(page.getByTestId('detalhe-esqueleto')).toBeVisible();
    await expect(titulo(page)).toHaveText('Emerald Ape #042', { timeout: 8_000 });

    await chamarApi(page, 'POST', '/api/__mock/cenario', { nome: 'offline' });
    await page.goto('/nfts/nft-02');
    await expect(page.getByTestId('detalhe-erro')).toBeVisible({ timeout: 10_000 });

    await chamarApi(page, 'POST', '/api/__mock/cenario', { nome: 'padrao' });
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(titulo(page)).toHaveText('Sage Nomad #009');
  });

  test('quantidade respeita o limite da edição', async ({ page }) => {
    await page.goto('/nfts/nft-01');

    const aumentar = page.getByRole('button', { name: 'Aumentar quantidade' }).first();
    const edicaoUnica = page.getByRole('button', { name: '1/1', exact: true }).first();

    await aumentar.click();
    await aumentar.click();
    await expect(page.getByTestId('detalhe-quantidade')).toHaveText('3');

    await edicaoUnica.click();
    await expect(edicaoUnica).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('detalhe-quantidade')).toHaveText('1');
    await expect(aumentar).toBeDisabled();
    await expect(page.getByText('Limite disponível atingido').first()).toBeVisible();
  });

  test('NFT esgotado não permite comprar', async ({ page }) => {
    await page.goto('/nfts/nft-34');

    await expect(page.getByRole('button', { name: 'COMPRAR', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: '1/50', exact: true }).first()).toBeDisabled();
    await expect(page.getByText('Edição indisponível').first()).toBeVisible();
  });

  test('comprar adiciona a quantidade e leva ao carrinho', async ({ page }) => {
    await page.goto('/nfts/nft-01');
    await page.getByRole('button', { name: 'Aumentar quantidade' }).first().click();
    await page.getByRole('button', { name: 'COMPRAR', exact: true }).click();

    await expect(page).toHaveURL(/\/carrinho$/);
    await expect(page.getByTestId('cabecalho-badge')).toHaveText('2');
  });

  test('evento de estoque e preço atualiza a tela aberta, sem recarregar', async ({ page }) => {
    await page.goto('/nfts/nft-01');
    await expect(titulo(page)).toHaveText('Emerald Ape #042');
    await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');

    await chamarApi(page, 'POST', '/api/__mock/nfts/nft-01', { preco: '3.33' });
    await expect(page.getByTestId('detalhe-preco')).toHaveText('3.33 ETH');

    await chamarApi(page, 'POST', '/api/__mock/nfts/nft-01', { disponivel: 0 });
    await expect(page.getByRole('button', { name: 'COMPRAR', exact: true })).toBeDisabled();
    await expect(page.getByText('Edição indisponível').first()).toBeVisible();
  });
});

test.describe('favoritos', () => {
  const botao = (pagina: Page) => pagina.getByRole('button', { name: 'Favoritar', exact: true });

  test('visitante vai ao login e volta ao NFT', async ({ page }) => {
    await page.goto('/nfts/nft-01');
    await botao(page).first().click();

    await expect(page).toHaveURL(/\/login\?redirect=%2Fnfts%2Fnft-01/);

    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(ANA.email);
    await page.getByLabel('Senha', { exact: true }).fill(ANA.senha);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    await expect(page).toHaveURL(/\/nfts\/nft-01$/);
  });

  test('otimista: muda antes da resposta e persiste, sem vazar para outro', async ({ page }) => {
    await entrarNaPagina(page, ANA);
    await chamarApi(page, 'POST', '/api/__mock/cenario', {
      nome: 'lento',
      rota: '/api/favoritos/',
    });
    await page.clock.install();
    await page.goto('/nfts/nft-01');
    await expect(botao(page).first()).toBeVisible();

    await botao(page).first().click();
    await expect(botao(page).first()).toHaveAttribute('aria-pressed', 'true', { timeout: 1_000 });

    await page.clock.runFor(2_800);
    await page.reload();
    await expect(botao(page).first()).toHaveAttribute('aria-pressed', 'true');

    await chamarApi(page, 'POST', '/api/__mock/cenario', { nome: 'padrao' });
    await entrarNaPagina(page, BRUNO);
    await page.reload();
    await expect(botao(page).first()).toHaveAttribute('aria-pressed', 'false');
  });

  test('falha desfaz a mudança e avisa', async ({ page }) => {
    await entrarNaPagina(page, ANA);
    await page.goto('/nfts/nft-01');
    await expect(botao(page).first()).toHaveAttribute('aria-pressed', 'false');

    await chamarApi(page, 'POST', '/api/__mock/cenario', {
      nome: 'erro-500',
      rota: '/api/favoritos/nft-01',
      vezes: 1,
    });
    await botao(page).first().click();

    await expect(page.getByText('Não foi possível atualizar o favorito.')).toBeVisible();
    await expect(botao(page).first()).toHaveAttribute('aria-pressed', 'false');

    await botao(page).first().click();
    await expect(botao(page).first()).toHaveAttribute('aria-pressed', 'true');
  });

  test('sessão expirada no uso vai ao login guardando o destino', async ({ page }) => {
    await entrarNaPagina(page, ANA);
    await page.goto('/nfts/nft-01');
    await expect(botao(page).first()).toHaveAttribute('aria-pressed', 'false');

    await chamarApi(page, 'POST', '/api/__mock/sessoes/expirar');
    await botao(page).first().click();

    await expect(page).toHaveURL(/\/login\?redirect=%2Fnfts%2Fnft-01/);
    await expect(page.getByText('Sua sessão expirou. Entre novamente.')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('kurio:token'))).toBeNull();
  });
});

test.describe('mobile 414', () => {
  test.use({ viewport: { width: 414, height: 896 } });

  test('medidas do frame mobile, com barra de compra fixa', async ({ page }) => {
    await page.goto('/nfts/nft-01');
    await expect(page.getByTestId('detalhe-mobile')).toBeVisible();

    const painel = await page.getByTestId('detalhe-painel').boundingBox();
    const barra = await page.getByTestId('barra-compra').boundingBox();
    const comprar = await page.getByRole('button', { name: 'Comprar NFT' }).boundingBox();

    conferir(painel?.x, 0);
    conferir(painel?.y, 392);
    conferir(barra?.y, 732);
    conferir(barra?.height, 164);
    conferir(comprar?.x, 24);
    conferir(comprar?.y, 802);
    conferir(comprar?.width, 196);
    conferir(comprar?.height, 60);
    await expect(page.getByTestId('barra-navegacao')).toHaveCount(0);
    await expect(page.getByTestId('detalhe-informacoes')).toBeHidden();
  });

  test('edição e dados do token na altura exata do frame', async ({ page }) => {
    await page.goto('/nfts/nft-01');

    const painel = page.getByTestId('detalhe-painel');
    await expect(painel).toBeVisible();

    const edicao = await painel.getByText('Edição:').boundingBox();
    const token = await painel.getByText('ID do token:').boundingBox();
    const atributos = await painel.getByText('Atributos:').boundingBox();

    expect(edicao?.y).toBe(546);
    expect(token?.y).toBe(610);
    expect(atributos?.y).toBe(674);
  });

  test('adicionar pelo botão do carrinho e voltar', async ({ page }) => {
    await page.goto('/nfts/nft-01');
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
    await expect(page.getByText('Adicionado ao carrinho.')).toBeVisible();

    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

for (const largura of [390, 768, 1024, 1440]) {
  test(`detalhe sem overflow horizontal em ${largura}`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto('/nfts/nft-01');
    await expect(titulo(page)).toBeAttached();

    const excesso = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(excesso).toBeLessThanOrEqual(0);
  });
}

// ====================================================================
// RÓTULOS DE EDIÇÃO E AVISO DE LIMITE
// Nenhum rótulo estoura a pílula selecionada, e o aviso não encosta
// nos botões vizinhos.
// ====================================================================
test.describe('edição selecionada', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const rotulo of ['1/1', '1/10', '1/50', 'ABERTA']) {
    test(`rótulo ${rotulo} cabe na pílula selecionada`, async ({ page }) => {
      await page.goto('/nfts/nft-01');
      const pilula = page.getByRole('button', { name: rotulo, exact: true }).first();

      await pilula.click();
      await expect(pilula).toHaveAttribute('aria-pressed', 'true');

      const cabe = await pilula.evaluate((elemento) => {
        const faixa = document.createRange();

        faixa.selectNodeContents(elemento);

        return faixa.getBoundingClientRect().width <= elemento.clientWidth;
      });

      expect(cabe).toBe(true);
    });
  }

  test('aviso de limite fica no vão, afastado da quantidade e dos botões', async ({ page }) => {
    await page.goto('/nfts/nft-01');
    await page.getByRole('button', { name: '1/1', exact: true }).first().click();
    const aviso = page.getByTestId('aviso-estoque').first();

    await expect(aviso).toHaveText('Limite disponível atingido');

    const faixa = await aviso.evaluate((elemento) => {
      const intervalo = document.createRange();

      intervalo.selectNodeContents(elemento);
      const texto = intervalo.getBoundingClientRect();

      return {
        esquerda: texto.left,
        direita: texto.right,
        linhas: intervalo.getClientRects().length,
      };
    });
    const mais = await page
      .getByRole('button', { name: 'Aumentar quantidade' })
      .first()
      .boundingBox();
    const comprar = await page.getByRole('button', { name: 'COMPRAR', exact: true }).boundingBox();

    expect(faixa.linhas).toBe(1);
    expect(faixa.esquerda - ((mais?.x ?? 0) + (mais?.width ?? 0))).toBeGreaterThanOrEqual(8);
    expect((comprar?.x ?? 0) - faixa.direita).toBeGreaterThanOrEqual(8);
  });
});
