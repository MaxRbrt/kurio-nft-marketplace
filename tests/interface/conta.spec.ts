import { expect, test, type Page } from '@playwright/test';
import { ANA, BRUNO, chamarApi } from '../apoio/api';

// ====================================================================
// 1. APOIO
// Login pela interface, com as credenciais fictícias das fixtures.
// ====================================================================
const cartaoInicial = (pagina: Page) => pagina.getByTestId('cartao-nome').first();

async function preencherLogin(pagina: Page, credenciais: { email: string; senha: string }) {
  await pagina.getByRole('textbox', { name: 'E-mail' }).fill(credenciais.email);
  await pagina.getByLabel('Senha', { exact: true }).fill(credenciais.senha);
  await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
}

async function caixa(pagina: Page, seletor: string) {
  const medida = await pagina.locator(seletor).boundingBox();

  if (!medida) {
    throw new Error(`Sem medida para ${seletor}`);
  }

  return medida;
}

function conferir(valor: number, esperado: number) {
  expect(Math.abs(valor - esperado), `${valor} deveria ser ${esperado}`).toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(cartaoInicial(page)).toBeVisible();
  await chamarApi(page, 'POST', '/api/__mock/resetar');
  await page.evaluate(() => localStorage.removeItem('kurio:token'));
});

test.describe('desktop 1440', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('modal de login nas medidas do Figma', async ({ page }) => {
    await page.goto('/login');

    const modal = await caixa(page, '[data-testid=modal-autenticacao]');
    const email = await caixa(page, '#login-email');
    const senha = await caixa(page, '#login-senha');
    const entrar = await page.getByRole('button', { name: 'Entrar', exact: true }).boundingBox();

    conferir(modal.x, 470);
    conferir(modal.y, 160);
    conferir(modal.width, 500);
    conferir(modal.height, 600);
    conferir(email.x, 550);
    conferir(email.y, 324);
    conferir(email.width, 340);
    conferir(email.height, 40);
    conferir(senha.y, 376);
    conferir(entrar?.x ?? 0, 550);
    conferir(entrar?.y ?? 0, 468);
    conferir(entrar?.height ?? 0, 45);
  });

  test('modal de cadastro nas medidas do Figma', async ({ page }) => {
    await page.goto('/cadastro');

    const modal = await caixa(page, '[data-testid=modal-autenticacao]');
    const usuario = await caixa(page, '#cadastro-usuario');
    const confirmar = await caixa(page, '#cadastro-confirmar');

    conferir(modal.y, 158);
    conferir(modal.height, 656);
    conferir(usuario.y, 322);
    conferir(confirmar.y, 478);
  });

  test('abas alternam login e cadastro, mantendo o destino', async ({ page }) => {
    await page.goto('/login?redirect=%2Fperfil');
    await page.getByRole('link', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL(/\/cadastro\?redirect=%2Fperfil/);
    await expect(page.getByRole('link', { name: 'Criar conta' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('foco fica preso no modal e Esc fecha', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('dialog')).toBeVisible();

    for (let tecla = 0; tecla < 12; tecla += 1) {
      await page.keyboard.press('Tab');

      const dentro = await page.evaluate(
        () => document.querySelector('[role=dialog]')?.contains(document.activeElement) ?? false,
      );

      expect(dentro).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('login', () => {
  test('validação liga o erro ao campo e foca o primeiro', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    const email = page.getByRole('textbox', { name: 'E-mail' });

    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toHaveAttribute('aria-describedby', 'login-email-erro');
    await expect(page.locator('#login-email-erro')).toContainText('E-mail inválido');
    await expect(email).toBeFocused();
  });

  test('credencial errada mostra alerta e não abre sessão', async ({ page }) => {
    await page.goto('/login');
    await preencherLogin(page, { email: ANA.email, senha: 'incorreta' });

    await expect(page.getByRole('alert').first()).toContainText('E-mail ou senha incorretos');
    expect(await page.evaluate(() => localStorage.getItem('kurio:token'))).toBeNull();
  });

  test('mostrar senha alterna o campo', async ({ page }) => {
    await page.goto('/login');

    const senha = page.getByLabel('Senha', { exact: true });

    await expect(senha).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar Senha' }).click();
    await expect(senha).toHaveAttribute('type', 'text');
  });

  test('ações fora do escopo avisam, sem aparentar sucesso', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Continuar com Google' }).click({ force: true });

    await expect(page.getByText('Indisponível nesta versão')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('entrada volta ao início, abre sessão e preserva o carrinho', async ({ page }) => {
    const visitante = await page.evaluate(() => localStorage.getItem('kurio:visitante'));

    await chamarApi(
      page,
      'POST',
      '/api/carrinho/itens',
      { nftId: 'nft-01', edicaoId: 'nft-01-1-50', quantidade: 2 },
      undefined,
      { cabecalhos: { 'X-Visitante-Id': visitante ?? '' } },
    );
    await page.goto('/login');
    await preencherLogin(page, ANA);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('cabecalho-conta')).toBeVisible();
    await expect(page.getByTestId('cabecalho-badge')).toHaveText('2');

    await page.reload();
    await expect(page.getByTestId('cabecalho-conta')).toBeVisible();
    await expect(page.getByTestId('cabecalho-badge')).toHaveText('2');
  });
});

test.describe('rotas privadas', () => {
  test('sem sessão vai ao login e volta ao destino, inclusive após refresh', async ({ page }) => {
    await page.goto('/perfil');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fperfil/);

    await preencherLogin(page, ANA);

    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByTestId('perfil-usuario')).toHaveText('Ana Colecionadora');

    await page.reload();
    await expect(page.getByTestId('perfil-usuario')).toHaveText('Ana Colecionadora');
  });

  test('destino externo é ignorado', async ({ page }) => {
    await page.goto('/login?redirect=%2F%2Fexterno.test');
    await preencherLogin(page, ANA);

    await expect(page).toHaveURL('/');
  });

  test('quem já entrou não vê login', async ({ page }) => {
    await page.goto('/login');
    await preencherLogin(page, ANA);
    await expect(page.getByTestId('cabecalho-conta')).toBeVisible();

    await page.goto('/login');
    await expect(page).toHaveURL(/\/$/);
  });

  test('sessão expirada volta ao login guardando o destino', async ({ page }) => {
    await page.goto('/login?redirect=%2Fperfil');
    await preencherLogin(page, ANA);
    await expect(page.getByTestId('perfil-usuario')).toBeVisible();

    await chamarApi(page, 'POST', '/api/__mock/sessoes/expirar');
    await page.reload();

    await expect(page).toHaveURL(/\/login\?redirect=%2Fperfil/);
    expect(await page.evaluate(() => localStorage.getItem('kurio:token'))).toBeNull();
  });

  test('sair limpa sessão, e o próximo usuário não vê dados do anterior', async ({ page }) => {
    await page.goto('/login');
    await preencherLogin(page, ANA);
    await expect(page.getByTestId('cabecalho-conta')).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem('kurio:token'));

    await chamarApi(
      page,
      'POST',
      '/api/carrinho/itens',
      { nftId: 'nft-01', edicaoId: 'nft-01-1-50', quantidade: 3 },
      token ?? '',
    );
    await page.reload();
    await expect(page.getByTestId('cabecalho-badge')).toHaveText('3');

    await page.getByTestId('cabecalho-conta').click();
    await page.getByRole('button', { name: 'Sair' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('cabecalho-entrar')).toBeVisible();
    await expect(page.getByTestId('cabecalho-badge')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('kurio:token'))).toBeNull();

    await page.goto('/login');
    await preencherLogin(page, BRUNO);
    await expect(page.getByLabel('Perfil de Bruno Colecionador')).toBeVisible();
    await expect(page.getByTestId('cabecalho-badge')).toHaveCount(0);
  });

  test('socket reconecta por sessão, sem acumular conexões', async ({ page }) => {
    await page.goto('/login');
    await preencherLogin(page, ANA);
    await expect(page.getByTestId('cabecalho-conta')).toBeVisible();
    await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');

    await chamarApi(page, 'POST', '/api/__mock/nfts/nft-01', { preco: '3.00' });
    await expect(page.getByTestId('socket-ultimo-evento')).toContainText('nft.updated');

    const eventos = await page.getByTestId('socket-ultimo-evento').textContent();

    expect(JSON.parse(eventos ?? '{}').dados.preco).toBe('3.00');
  });
});

test.describe('cadastro', () => {
  const entrada = {
    usuario: 'carla',
    email: 'carla@kurio.test',
    senha: 'senha-segura',
  };

  async function preencherCadastro(pagina: Page, email: string, confirmar: string) {
    await pagina.getByLabel('Nome de usuário').fill(entrada.usuario);
    await pagina.getByRole('textbox', { name: 'E-mail' }).fill(email);
    await pagina.getByLabel('Senha', { exact: true }).fill(entrada.senha);
    await pagina.getByLabel('Confirmar senha', { exact: true }).fill(confirmar);
    await pagina.getByRole('button', { name: 'Criar conta', exact: true }).click();
  }

  test('senhas diferentes apontam o campo de confirmação', async ({ page }) => {
    await page.goto('/cadastro');
    await preencherCadastro(page, entrada.email, 'outra');

    await expect(page.locator('#cadastro-confirmar-erro')).toContainText('As senhas não conferem');
  });

  test('e-mail em uso aparece no próprio campo, com os dados mantidos', async ({ page }) => {
    await page.goto('/cadastro');
    await preencherCadastro(page, ANA.email, entrada.senha);

    await expect(page.locator('#cadastro-email-erro')).toContainText('E-mail já cadastrado');
    await expect(page.getByLabel('Nome de usuário')).toHaveValue(entrada.usuario);
  });

  test('conta criada abre sessão e continua após refresh', async ({ page }) => {
    await page.goto('/cadastro');
    await preencherCadastro(page, entrada.email, entrada.senha);

    await expect(page.getByLabel(`Perfil de ${entrada.usuario}`)).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(`Perfil de ${entrada.usuario}`)).toBeVisible();
  });
});

test.describe('mobile 414', () => {
  test.use({ viewport: { width: 414, height: 896 } });

  test('login é tela própria, nas medidas do frame, sem barra inferior', async ({ page }) => {
    await page.goto('/login');

    const email = await caixa(page, '#login-email');
    const senha = await caixa(page, '#login-senha');
    const entrar = await page.getByRole('button', { name: 'Entrar', exact: true }).boundingBox();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('barra-navegacao')).toHaveCount(0);
    await expect(
      page.getByTestId('tela-autenticacao').getByText('KURIO', { exact: true }),
    ).toBeVisible();
    conferir(email.x, 28);
    conferir(email.y, 312);
    conferir(email.width, 358);
    conferir(email.height, 50);
    conferir(senha.y, 374);
    conferir(entrar?.y ?? 0, 492);
    conferir(entrar?.height ?? 0, 60);
  });

  test('cadastro mobile usa textos do frame e leva ao login', async ({ page }) => {
    await page.goto('/cadastro');

    await expect(page.getByRole('heading', { name: 'Criar perfil de colecionador' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar perfil', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Já tem uma conta? Entre' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('sem overflow horizontal', async ({ page }) => {
    await page.goto('/cadastro');
    await expect(page.getByLabel('Nome de usuário')).toBeVisible();

    const excesso = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(excesso).toBeLessThanOrEqual(0);
  });
});
