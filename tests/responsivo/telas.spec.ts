import { expect, test, type Page } from '@playwright/test';
import { ANA, chamarApi, entrar } from '../apoio/api';
import { auditarFimDaPagina, auditarLayout } from '../apoio/auditoria-layout';

// ====================================================================
// 1. LARGURAS E TELAS
// O enunciado pede no mínimo 390, 768 e 1440. A lista cobre também os
// celulares mais comuns (320 a 430) e o tablet deitado. No WebKit, que
// reproduz o Safari do iPhone, ficam as larguras dos iPhones atuais.
// ====================================================================
const LARGURAS_CHROMIUM = [320, 360, 375, 390, 393, 414, 430, 768, 1024, 1440];
const LARGURAS_IPHONE = [375, 393, 430];

const TELAS_VISITANTE = ['/', '/nfts/nft-01', '/login', '/cadastro'];
const TELAS_COM_SESSAO = ['/carrinho', '/pagamento', '/perfil', '/carteiras'];

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

async function abrirTela(pagina: Page, rota: string) {
  await pagina.goto(rota);
  await aguardarSimulacao(pagina);
  await expect(pagina.locator('[aria-busy="true"]')).toHaveCount(0);
  await pagina.evaluate(esperarFontesEAnimacoes);
}

async function esperarFontesEAnimacoes() {
  await document.fonts.ready;
  const animacoesFinitas = document
    .getAnimations()
    .filter((animacao) => animacao.effect?.getTiming().iterations !== Infinity);
  await Promise.all(animacoesFinitas.map((animacao) => animacao.finished.catch(() => null)));
  await new Promise((pronto) => requestAnimationFrame(() => requestAnimationFrame(pronto)));
}

// ====================================================================
// 3. AUDITORIA POR LARGURA
// Cada tela é medida no topo e no fim da rolagem. Os problemas de todas
// as larguras saem juntos na falha, para a correção ser feita de uma vez.
// ====================================================================
async function auditarTela(pagina: Page, rota: string, larguras: number[]) {
  const achados: string[] = [];

  for (const largura of larguras) {
    await pagina.setViewportSize({ width: largura, height: largura < 768 ? 852 : 900 });
    await abrirTela(pagina, rota);
    const noTopo = await pagina.evaluate(auditarLayout);

    await pagina.evaluate(() => window.scrollTo({ top: 1e6, behavior: 'instant' }));
    await pagina.evaluate(esperarFontesEAnimacoes);
    const noFim = await pagina.evaluate(auditarFimDaPagina);

    for (const problema of new Set([...noTopo, ...noFim])) {
      achados.push(`${largura}px ${problema}`);
    }
  }

  return achados;
}

function largurasDoProjeto(nomeProjeto: string) {
  return nomeProjeto.includes('iphone') ? LARGURAS_IPHONE : LARGURAS_CHROMIUM;
}

test.describe('responsividade sem corte nem sobreposição', () => {
  test.describe.configure({ timeout: 180_000 });

  for (const rota of TELAS_VISITANTE) {
    test(`visitante ${rota}`, async ({ page }, info) => {
      const achados = await auditarTela(page, rota, largurasDoProjeto(info.project.name));

      expect(achados, achados.join('\n')).toEqual([]);
    });
  }

  for (const rota of TELAS_COM_SESSAO) {
    test(`com sessão ${rota}`, async ({ page }, info) => {
      await prepararSessao(page);
      const achados = await auditarTela(page, rota, largurasDoProjeto(info.project.name));

      expect(achados, achados.join('\n')).toEqual([]);
    });
  }
});
