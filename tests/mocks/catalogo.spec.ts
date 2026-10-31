import { expect, test } from '@playwright/test';
import { listaNftsSchema, nftDetalheSchema } from '../../src/contracts/catalogo/nfts';
import { respostaErroSchema } from '../../src/contracts/comum/erros';
import { eventoNftAtualizadoSchema } from '../../src/contracts/tempo-real/eventos';
import { chamarApi } from '../apoio/api';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');
  expect((await chamarApi(page, 'POST', '/api/__mock/resetar')).status).toBe(204);
});

test('lista paginada segue o contrato e tem as 4 páginas do layout', async ({ page }) => {
  const { status, corpo } = await chamarApi(page, 'GET', '/api/nfts');
  const lista = listaNftsSchema.parse(corpo);

  expect(status).toBe(200);
  expect(lista.itens).toHaveLength(12);
  expect(lista.paginacao).toEqual({
    pagina: 1,
    tamanhoPagina: 12,
    totalItens: 48,
    totalPaginas: 4,
  });
  expect(corpo.itens[0]).not.toHaveProperty('emAlta');
});

test('filtros combinam e facetas ignoram categoria e rede', async ({ page }) => {
  const { corpo } = await chamarApi(
    page,
    'GET',
    '/api/nfts?categorias=musica&categorias=jogos&redes=polygon&tamanhoPagina=48',
  );
  const lista = listaNftsSchema.parse(corpo);

  expect(lista.itens.length).toBeGreaterThan(0);
  expect(lista.itens.length).toBeLessThan(48);
  for (const nft of lista.itens) {
    expect(['musica', 'jogos']).toContain(nft.categoria);
    expect(nft.rede).toBe('polygon');
  }

  const somaFacetas = Object.values(lista.facetas.redes).reduce((a, b) => a + b, 0);
  expect(somaFacetas).toBe(48);
});

test('busca, vazio e faixa de preço incluem as pontas', async ({ page }) => {
  const busca = listaNftsSchema.parse(
    (await chamarApi(page, 'GET', '/api/nfts?busca=emerald')).corpo,
  );
  const vazio = listaNftsSchema.parse(
    (await chamarApi(page, 'GET', '/api/nfts?busca=nao-existe')).corpo,
  );
  const faixa = listaNftsSchema.parse(
    (await chamarApi(page, 'GET', '/api/nfts?precoMinimo=0.02&precoMaximo=0.02')).corpo,
  );
  const topo = listaNftsSchema.parse(
    (await chamarApi(page, 'GET', '/api/nfts?precoMinimo=12.3&precoMaximo=12.30')).corpo,
  );

  expect(busca.itens.map((nft) => nft.nome)).toEqual(['Emerald Ape #042']);
  expect(vazio.itens).toEqual([]);
  expect(vazio.paginacao.totalPaginas).toBe(0);
  expect(faixa.itens.map((nft) => nft.preco)).toEqual(['0.02']);
  expect(topo.itens.map((nft) => nft.preco)).toEqual(['12.30']);
});

test('ordena preço como decimal, não como texto', async ({ page }) => {
  const { corpo } = await chamarApi(page, 'GET', '/api/nfts?ordem=maior-preco&tamanhoPagina=48');
  const lista = listaNftsSchema.parse(corpo);
  const precos = lista.itens.map((nft) => Number(nft.preco));

  expect(lista.itens[0].preco).toBe('12.30');
  expect(precos).toEqual([...precos].sort((a, b) => b - a));
});

test('parâmetro inválido devolve erro no formato do contrato', async ({ page }) => {
  const { status, corpo } = await chamarApi(page, 'GET', '/api/nfts?categorias=inexistente');

  expect(status).toBe(400);
  expect(respostaErroSchema.parse(corpo).erro.codigo).toBe('VALIDACAO');
});

test('detalhe, NFT inexistente e edição esgotada', async ({ page }) => {
  const detalhe = await chamarApi(page, 'GET', '/api/nfts/nft-01');
  const inexistente = await chamarApi(page, 'GET', '/api/nfts/nao-existe');
  const esgotado = nftDetalheSchema.parse((await chamarApi(page, 'GET', '/api/nfts/nft-46')).corpo);

  expect(nftDetalheSchema.parse(detalhe.corpo).nome).toBe('Emerald Ape #042');
  expect(inexistente.status).toBe(404);
  expect(respostaErroSchema.parse(inexistente.corpo).erro.codigo).toBe('NAO_ENCONTRADO');
  expect(esgotado.disponivel).toBe(0);
});

test('alteração reflete no REST e no evento, com a mesma versão', async ({ page }) => {
  const antes = nftDetalheSchema.parse((await chamarApi(page, 'GET', '/api/nfts/nft-01')).corpo);

  expect(
    (await chamarApi(page, 'POST', '/api/__mock/nfts/nft-01', { preco: '2.50', disponivel: 3 }))
      .status,
  ).toBe(204);

  const depois = nftDetalheSchema.parse((await chamarApi(page, 'GET', '/api/nfts/nft-01')).corpo);

  await expect(page.getByTestId('socket-ultimo-evento')).toContainText('evt-1');

  const texto = await page.getByTestId('socket-ultimo-evento').textContent();
  const evento = eventoNftAtualizadoSchema.parse(JSON.parse(texto ?? ''));

  expect(depois.preco).toBe('2.50');
  expect(depois.disponivel).toBe(12);
  expect(depois.versao).toBe(antes.versao + 1);
  expect(evento.versao).toBe(depois.versao);
  expect(evento.dados.preco).toBe(depois.preco);
  expect(evento.recurso).toEqual({ tipo: 'nft', id: 'nft-01' });
});

test('dado alterado sobrevive ao refresh e reset restaura o cenário', async ({ page }) => {
  await chamarApi(page, 'POST', '/api/__mock/nfts/nft-01', { preco: '2.50' });
  await page.reload();
  await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');

  const aposRefresh = nftDetalheSchema.parse(
    (await chamarApi(page, 'GET', '/api/nfts/nft-01')).corpo,
  );

  expect(aposRefresh.preco).toBe('2.50');

  await chamarApi(page, 'POST', '/api/__mock/resetar');
  await page.reload();
  await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');

  const aposReset = nftDetalheSchema.parse(
    (await chamarApi(page, 'GET', '/api/nfts/nft-01')).corpo,
  );

  expect(aposReset.preco).toBe('1.19');
  expect(aposReset.versao).toBe(1);
});

test('banco salvo guarda só hash, nunca a senha', async ({ page }) => {
  await chamarApi(page, 'POST', '/api/__mock/resetar');

  const salvo = await page.evaluate(() => localStorage.getItem('kurio:banco:v1'));

  expect(salvo).toContain('hashSenha');
  expect(salvo).not.toContain('Kurio@2026');
});
