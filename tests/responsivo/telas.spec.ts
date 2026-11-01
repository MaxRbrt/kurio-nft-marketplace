import { expect, test, type Page } from '@playwright/test';
import { ANA, chamarApi, entrar } from '../apoio/api';
import { auditarFimDaPagina, auditarLayout } from '../apoio/auditoria-layout';

// ====================================================================
// 1. TELAS
// Cada tela roda em todos os aparelhos de PROJETOS_RESPONSIVOS
// (aparelhos.ts), um projeto do Playwright por aparelho.
// ====================================================================
type Estado = 'inicial' | 'filtros' | 'folha-pagamento' | 'revisao';
type Tela = { rota: string; sessao: boolean; estado: Estado };

const TELAS: Tela[] = [
  { rota: '/', sessao: false, estado: 'inicial' },
  { rota: '/', sessao: false, estado: 'filtros' },
  { rota: '/nfts/nft-01', sessao: false, estado: 'inicial' },
  { rota: '/login', sessao: false, estado: 'inicial' },
  { rota: '/cadastro', sessao: false, estado: 'inicial' },
  { rota: '/carrinho', sessao: true, estado: 'inicial' },
  { rota: '/pagamento', sessao: true, estado: 'inicial' },
  { rota: '/pagamento', sessao: true, estado: 'folha-pagamento' },
  { rota: '/pagamento', sessao: true, estado: 'revisao' },
  { rota: '/perfil', sessao: true, estado: 'inicial' },
  { rota: '/carteiras', sessao: true, estado: 'inicial' },
];

const ITENS_CARRINHO = [
  ['nft-01', 'nft-01-1-50', 2],
  ['nft-05', 'nft-05-1-50', 6],
] as const;

// ====================================================================
// 2. PREPARO
// Pior caso real dos dados: sufixo ENS mais longo (".kurio.eth") e
// carrinho com dois itens, para o pagamento ter todos os blocos.
// ====================================================================
async function aguardarSimulacao(pagina: Page) {
  await pagina.getByTestId('socket-estado').waitFor({ state: 'attached' });
}

async function prepararSessao(pagina: Page) {
  await pagina.goto('/');
  await aguardarSimulacao(pagina);
  await chamarApi(pagina, 'POST', '/api/__mock/resetar');
  const token = await entrar(pagina, ANA);
  const perfil = await chamarApi(pagina, 'GET', '/api/perfil', undefined, token);
  const { avatarUrl: _avatar, ...dadosPerfil } = perfil.corpo;

  await chamarApi(
    pagina,
    'PATCH',
    '/api/perfil',
    { ...dadosPerfil, nomeEns: 'ana.kurio.eth' },
    token,
  );
  for (const [nftId, edicaoId, quantidade] of ITENS_CARRINHO) {
    await chamarApi(pagina, 'POST', '/api/carrinho/itens', { nftId, edicaoId, quantidade }, token);
  }
  await pagina.evaluate((valor) => localStorage.setItem('kurio:token', valor), token);
}

async function esperarFontesEAnimacoes() {
  await document.fonts.ready;
  const animacoesFinitas = document
    .getAnimations()
    .filter((animacao) => animacao.effect?.getTiming().iterations !== Infinity);
  await Promise.all(animacoesFinitas.map((animacao) => animacao.finished.catch(() => null)));
  await new Promise((pronto) => requestAnimationFrame(() => requestAnimationFrame(pronto)));
}

async function rolarAteOFim() {
  const folha = document.querySelector('[role="dialog"]');
  const rolavel = folha ?? document.scrollingElement;
  if (!rolavel) {
    return true;
  }
  rolavel.scrollTo({ top: rolavel.scrollHeight, behavior: 'instant' });
  await new Promise((pronto) => requestAnimationFrame(() => requestAnimationFrame(pronto)));
  const noFim = rolavel.scrollTop + rolavel.clientHeight >= rolavel.scrollHeight - 1;
  return noFim;
}

// ====================================================================
// 3. ESTADOS QUE SÓ APARECEM COM CLIQUE
// Filtros e a folha de dados do pagamento existem só abaixo de 1024 px;
// a revisão do pedido, em todas as larguras. Retorna falso quando o
// estado não se aplica à largura.
// ====================================================================
async function abrirRevisao(pagina: Page, desktop: boolean) {
  await pagina.getByRole('button', { name: 'Confirmar compra' }).click();
  if (!desktop) {
    await expect(pagina.getByRole('dialog')).toBeVisible();
  }
  await pagina.getByLabel('Código de indicação').fill('AMIGO10');
  const continuar = desktop ? 'Confirmar compra' : 'Continuar';
  await pagina.getByRole('button', { name: continuar, exact: true }).click();
  await expect(pagina.getByTestId('revisao-pedido')).toBeVisible();
}

async function abrirEstado(pagina: Page, estado: Estado) {
  const desktop = (pagina.viewportSize()?.width ?? 0) >= 1024;

  if (estado === 'inicial') {
    return true;
  }
  if (estado === 'revisao') {
    await abrirRevisao(pagina, desktop);
    await pagina.evaluate(esperarFontesEAnimacoes);
    return true;
  }
  if (desktop) {
    return false;
  }
  if (estado === 'filtros') {
    await pagina.getByRole('button', { name: 'Abrir filtros' }).click();
  }
  if (estado === 'folha-pagamento') {
    await pagina.getByRole('button', { name: 'Confirmar compra' }).click();
  }
  await expect(pagina.getByRole('dialog')).toBeVisible();
  await pagina.evaluate(esperarFontesEAnimacoes);
  return true;
}

// ====================================================================
// 4. AUDITORIA DE UMA TELA
// Mede no topo e no fim da rolagem. Com folha aberta, rola a própria
// folha até o fim, onde ficam os botões de ação. A rolagem se repete até
// o fim de verdade, pois a página ainda cresce enquanto os dados chegam.
// ====================================================================
async function auditarTela(pagina: Page, tela: Tela) {
  if (tela.sessao) {
    await prepararSessao(pagina);
  }
  await pagina.goto(tela.rota);
  await aguardarSimulacao(pagina);
  await expect(pagina.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(
    pagina.locator('main, [role="dialog"]').filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(pagina.getByText(/Algo deu errado|Página não encontrada/)).toHaveCount(0);
  await pagina.evaluate(esperarFontesEAnimacoes);

  const aplicavel = await abrirEstado(pagina, tela.estado);
  if (!aplicavel) {
    return [];
  }

  const noTopo = await pagina.evaluate(auditarLayout);
  await expect.poll(() => pagina.evaluate(rolarAteOFim)).toBe(true);
  await pagina.evaluate(esperarFontesEAnimacoes);
  const noFimDaFolha = await pagina.evaluate(auditarLayout);
  const noFim = await pagina.evaluate(auditarFimDaPagina);

  return [...new Set([...noTopo, ...noFimDaFolha, ...noFim])];
}

function nomeDoTeste(tela: Tela) {
  const sufixo = tela.estado === 'inicial' ? '' : ` (${tela.estado})`;
  return `${tela.rota}${sufixo}`;
}

for (const tela of TELAS) {
  test(nomeDoTeste(tela), async ({ page }) => {
    const achados = await auditarTela(page, tela);

    expect(achados, achados.join('\n')).toEqual([]);
  });
}
