import { expect, test, type Page } from '@playwright/test';
import { ANA, BRUNO, chamarApi, entrar } from '../apoio/api';

const IMAGEM_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==',
  'base64',
);
const ENDERECO = '0x1234567890123456789012345678901234567890';

// ====================================================================
// 1. PREPARO
// Sessão real pela API. Cada teste parte de banco restaurado e observa a
// tela e a persistência depois do refresh, sempre pelo MSW.
// ====================================================================
async function entrarEm(pagina: Page, destino: string, credenciais = ANA) {
  await pagina.goto('/');
  await pagina.getByTestId('socket-estado').waitFor({ state: 'attached' });
  await chamarApi(pagina, 'POST', '/api/__mock/resetar');
  const token = await entrar(pagina, credenciais);

  await pagina.evaluate((valor) => localStorage.setItem('kurio:token', valor), token);
  await pagina.goto(destino);
  await pagina.getByTestId('socket-estado').waitFor({ state: 'attached' });
}

test.describe('perfil', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('editar dados persiste após refresh e atualiza o cabeçalho', async ({ page }) => {
    await entrarEm(page, '/perfil');

    await page.getByLabel('Nome de exibição').fill('Ana Nova');
    await page.getByLabel('Nome ENS').last().fill('ananova');
    await page.getByLabel('Apelido da carteira').fill('Cofre');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();

    await expect(page.getByText('Perfil salvo.')).toBeVisible();
    await expect(page.getByTestId('cabecalho-conta')).toHaveAccessibleName('Perfil de Ana Nova');

    await page.reload();
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana Nova');
    await expect(page.getByLabel('Apelido da carteira')).toHaveValue('Cofre');
  });

  test('erros de validação aparecem nos campos, com foco no primeiro', async ({ page }) => {
    await entrarEm(page, '/perfil');
    const nome = page.getByLabel('Nome de exibição');

    await expect(nome).not.toHaveValue('');
    await nome.fill('');
    await page.getByLabel('E-mail').fill('invalido');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();

    await expect(page.getByText('Informe o nome de exibição')).toBeVisible();
    await expect(page.getByText('E-mail inválido')).toBeVisible();
    await expect(nome).toBeFocused();
    await expect(nome).toHaveAttribute('aria-describedby', 'perfil-exibicao-erro');
  });

  test('e-mail de outra conta volta como erro da API', async ({ page }) => {
    await entrarEm(page, '/perfil');
    await page.getByLabel('Apelido da carteira').fill('Cofre');
    await page.getByLabel('Nome ENS').last().fill('ana');
    await page.getByLabel('E-mail').fill(BRUNO.email);
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();

    await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  test('avatar: enviar, aparecer no cabeçalho, persistir e remover', async ({ page }) => {
    await entrarEm(page, '/perfil');
    await expect(page.getByRole('button', { name: 'Remover' })).toBeDisabled();

    await page.getByLabel('Escolher imagem do avatar').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: IMAGEM_PNG,
    });
    await expect(page.getByTestId('avatar-imagem')).toBeVisible();
    await expect(page.getByTestId('cabecalho-avatar')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('avatar-imagem')).toBeVisible();

    await page.getByRole('button', { name: 'Remover' }).click();
    await expect(page.getByTestId('avatar-imagem')).toHaveCount(0);
    await expect(page.getByTestId('cabecalho-avatar')).toHaveCount(0);
  });

  test('arquivo que não é imagem é recusado', async ({ page }) => {
    await entrarEm(page, '/perfil');
    await page.getByLabel('Escolher imagem do avatar').setInputFiles({
      name: 'nota.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('texto'),
    });

    await expect(page.getByText('Escolha uma imagem de até 2 MB.')).toBeVisible();
  });

  test('senha: confere a atual, valida a confirmação e passa a valer', async ({ page }) => {
    await entrarEm(page, '/perfil');
    await page.getByLabel('Apelido da carteira').fill('Cofre');
    await page.getByLabel('Nome ENS').last().fill('ana');
    await page.locator('#perfil-senha-atual').fill('errada');
    await page.locator('#perfil-nova-senha').fill('NovaSenha@2026');
    await page.locator('#perfil-confirmar-senha').fill('Diferente@2026');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText('As senhas não conferem')).toBeVisible();

    await page.locator('#perfil-confirmar-senha').fill('NovaSenha@2026');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText('Senha atual incorreta')).toBeVisible();

    await page.locator('#perfil-senha-atual').fill(ANA.senha);
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText('Perfil salvo.')).toBeVisible();
    await expect(page.locator('#perfil-senha-atual')).toHaveValue('');

    const login = await chamarApi(page, 'POST', '/api/auth/login', {
      email: ANA.email,
      senha: 'NovaSenha@2026',
    });

    expect(login.status).toBe(200);
  });

  test('itens fora do escopo avisam, e "Sair" encerra a sessão', async ({ page }) => {
    await entrarEm(page, '/perfil');
    const menu = page.getByTestId('menu-conta');

    await menu.getByRole('button', { name: 'Ofertas' }).click({ force: true });
    await expect(page).toHaveURL(/\/perfil/);

    await menu.getByRole('link', { name: 'Carteiras' }).click();
    await expect(page).toHaveURL(/\/carteiras/);
    await menu.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('cabecalho-entrar')).toBeVisible();
  });
});

test.describe('carteiras', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('edita a principal, e a alteração persiste', async ({ page }) => {
    await entrarEm(page, '/carteiras');
    const apelido = page.locator('#carteira-principal-apelido');

    await expect(apelido).toHaveValue('Principal');
    await page.locator('#carteira-principal-indicacao').fill('AMIGO10');
    await apelido.fill('Cofre principal');
    await page.getByRole('button', { name: 'Salvar carteira' }).first().click();
    await expect(page.getByText('Carteira salva.')).toBeVisible();

    await page.reload();
    await expect(apelido).toHaveValue('Cofre principal');
  });

  test('sem carteira: valida, cadastra principal e secundária', async ({ page }) => {
    await entrarEm(page, '/carteiras', BRUNO);
    await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible();

    await page.getByRole('button', { name: 'Adicionar' }).first().click();
    await expect(page.locator('#carteira-principal-exibicao')).toBeFocused();

    await page.getByRole('button', { name: 'Salvar carteira' }).click();
    await expect(page.getByText('Erro: Selecione uma rede')).toBeVisible();
    await expect(page.getByText('Endereço 0x inválido')).toBeVisible();

    await page.locator('#carteira-principal-exibicao').fill('Bruno');
    await page.locator('#carteira-principal-apelido').fill('Principal');
    await page.locator('#carteira-principal-rede').click();
    await page.getByRole('option', { name: 'Polygon' }).click();
    await page.locator('#carteira-principal-perfil').fill('bruno');
    await page.locator('#carteira-principal-endereco').fill(ENDERECO);
    await page.locator('#carteira-principal-tipo').click();
    await page.getByRole('option', { name: 'Coinbase Wallet' }).click();
    await page.locator('#carteira-principal-indicacao').fill('AMIGO');
    await page.locator('#carteira-principal-email').fill(BRUNO.email);
    await page.locator('#carteira-principal-ens').fill('bruno');
    await page.getByRole('button', { name: 'Salvar carteira' }).click();
    await expect(page.getByText('Carteira salva.')).toBeVisible();

    await page.getByRole('button', { name: 'Igual à carteira principal' }).click();
    await expect(page.locator('#carteira-secundaria-apelido')).toHaveValue('Principal');
    await page.locator('#carteira-secundaria-apelido').fill('Reserva');
    await page.getByRole('button', { name: 'Salvar carteira' }).last().click();
    await expect(page.getByRole('button', { name: 'Igual à carteira principal' })).toHaveCount(0);

    await page.reload();
    await expect(page.locator('#carteira-secundaria-apelido')).toHaveValue('Reserva');
  });
});

test.describe('conta no mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('perfil e carteiras em uma coluna, sem rolagem lateral', async ({ page }) => {
    await entrarEm(page, '/perfil');
    await expect(page.getByLabel('Nome de exibição')).toBeVisible();
    await expect(page.getByTestId('menu-conta')).toBeHidden();

    await page.getByRole('link', { name: 'Carteiras' }).first().click();
    await expect(page.locator('#carteira-principal-apelido')).toBeVisible();

    const estourou = await page.evaluate(() => {
      const raiz = document.documentElement;

      return raiz.scrollWidth > raiz.clientWidth;
    });

    expect(estourou).toBe(false);
  });
});
