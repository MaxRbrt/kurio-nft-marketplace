import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ANA, chamarApi, criarPedidoConfirmado, entrar } from '../apoio/api';

// ====================================================================
// 1. TECLADO E DIÁLOGOS (ENUNCIADO 11)
// Só teclado: o foco anda pelos controles, fica visível, permanece preso
// no diálogo e volta ao fechar. Erros de formulário ficam ligados ao campo.
// ====================================================================
test.describe('teclado no desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('foco visível ao navegar com Tab', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('cartao-nome').first().waitFor();
    await page.keyboard.press('Tab');

    const contorno = await page.evaluate(() => {
      const ativo = document.activeElement as HTMLElement;
      const estilo = getComputedStyle(ativo);

      return { tag: ativo.tagName, largura: estilo.outlineWidth, estilo: estilo.outlineStyle };
    });

    expect(contorno.tag).toBe('A');
    expect(contorno.estilo).toBe('solid');
    expect(parseFloat(contorno.largura)).toBeGreaterThanOrEqual(2);
  });

  test('filtro alterna por teclado e não depende só de cor', async ({ page }) => {
    await page.goto('/');
    const filtro = page.getByRole('button', { name: /^Fotografia/ }).first();

    await filtro.focus();
    await page.keyboard.press('Enter');

    await expect(filtro).toHaveAttribute('aria-pressed', 'true');
    await expect(filtro).toHaveCSS('text-decoration-line', 'underline');
    await expect(page).toHaveURL(/categorias=.*fotografia/);
  });

  test('diálogo da imagem prende o foco, fecha com Esc e devolve o foco', async ({ page }) => {
    await page.goto('/nfts/nft-01');
    const abrir = page.getByRole('button', { name: 'Ampliar imagem' });

    await abrir.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');

    await expect(dialogo).toBeVisible();

    for (let passo = 0; passo < 4; passo += 1) {
      await page.keyboard.press('Tab');

      const dentro = await dialogo.evaluate((elemento) =>
        elemento.contains(document.activeElement),
      );

      expect(dentro).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialogo).toHaveCount(0);
    await expect(abrir).toBeFocused();
  });

  test('login: erro ligado ao campo e foco no primeiro inválido', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    const email = page.getByRole('textbox', { name: 'E-mail', exact: true });

    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toBeFocused();

    const idErro = await email.getAttribute('aria-describedby');

    await expect(page.locator(`[id="${idErro}"]`)).not.toBeEmpty();
  });

  test('carrinho é operável só com teclado', async ({ page }) => {
    await page.goto('/nfts/nft-01');
    await page.getByRole('button', { name: 'COMPRAR', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/carrinho/);

    const aumentar = page.getByRole('button', { name: /Aumentar quantidade de Emerald/ });

    await aumentar.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('item-quantidade')).toHaveText('2');

    await page.getByRole('button', { name: /Remover Emerald/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('carrinho-vazio')).toBeVisible();
  });

  test('imagens relevantes têm texto alternativo', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('cartao-nome').first().waitFor();

    const semTexto = await page
      .locator('[data-testid="cartao-nome"]')
      .first()
      .evaluate((nome) => {
        const cartao = nome.closest('li, article');
        const imagem = cartao?.querySelector('img');

        return imagem ? !imagem.alt : true;
      });

    expect(semTexto).toBe(false);
  });
});

test.describe('larguras e zoom', () => {
  for (const largura of [390, 768, 1440]) {
    for (const caminho of ['/', '/nfts/nft-01', '/carrinho', '/login']) {
      test(`sem rolagem lateral em ${caminho} com ${largura} px`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: 900 });
        await page.goto(caminho);
        await page.waitForLoadState('networkidle');

        const excesso = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );

        expect(excesso).toBeLessThanOrEqual(0);
      });
    }
  }

  test('zoom de 200% (720 px) não corta o conteúdo do carrinho vazio', async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 450 });
    await page.goto('/carrinho');
    await expect(page.getByTestId('carrinho-vazio')).toBeVisible();
  });
});

// ====================================================================
// 2. PAINEL DE CENÁRIOS
// Fora da tela por padrão. Age pelas rotas de controle: a mudança chega
// à interface pelo socket, como em qualquer evento.
// ====================================================================
test.describe('painel de cenários', () => {
  test('não aparece sem pedido', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('cartao-nome').first().waitFor();
    await expect(page.getByTestId('painel-cenarios')).toHaveCount(0);
  });

  test('com ?painel=1 muda o preço pelo servidor simulado', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/nfts/nft-01?painel=1');
    await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');
    const painel = page.getByTestId('painel-cenarios');

    await painel.getByRole('button', { name: 'Aumentar preço do Emerald Ape' }).click();
    await expect(page.getByTestId('painel-mensagem')).toContainText('Feito');
    await expect(page.getByTestId('detalhe-preco')).toHaveText('2.00 ETH');
  });
});

// ====================================================================
// 3. WCAG COM AXE (ENUNCIADO 8)
// Regras A e AA, inclusive contraste, em todas as telas, nas duas larguras
// dos frames. As telas privadas entram com sessão e item no carrinho.
// ====================================================================
const TELAS_PUBLICAS = ['/', '/nfts/nft-01', '/login', '/cadastro', '/rota-inexistente'];
const TELAS_PRIVADAS = ['/carrinho', '/pagamento', '/perfil', '/carteiras', '/pedidos'];

test.describe('wcag com axe', () => {
  for (const largura of [414, 1440]) {
    for (const caminho of [...TELAS_PUBLICAS, ...TELAS_PRIVADAS]) {
      test(`${caminho} em ${largura} px`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: 900 });
        await page.goto('/');
        await page.getByTestId('socket-estado').waitFor({ state: 'attached' });

        if (TELAS_PRIVADAS.includes(caminho)) {
          const token = await entrar(page, ANA);

          await chamarApi(
            page,
            'POST',
            '/api/carrinho/itens',
            { nftId: 'nft-01', edicaoId: 'nft-01-1-50', quantidade: 1 },
            token,
          );
          await page.evaluate((valor) => localStorage.setItem('kurio:token', valor), token);
        }

        const recibo = caminho === '/pedidos';

        await page.goto(recibo ? await criarPedidoConfirmado(page) : caminho);
        await page.waitForLoadState('networkidle');
        if (recibo) {
          await expect(page.getByTestId('pedido-titulo')).toHaveText(/Seus NFTs/, {
            timeout: 10_000,
          });
        }
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

        const { violations: violacoes } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        const resumo = violacoes.flatMap((violacao) =>
          violacao.nodes.map((no) => `${violacao.id}: ${no.target.join(' ')}`),
        );

        expect(resumo).toEqual([]);
      });
    }
  }
});
