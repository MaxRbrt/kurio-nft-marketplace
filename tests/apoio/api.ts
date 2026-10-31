import type { Page } from '@playwright/test';

// ====================================================================
// 1. CHAMADA PELA PÁGINA
// A requisição sai de dentro do navegador para passar pelo MSW, como
// o enunciado exige nos testes de REST.
// ====================================================================
export function chamarApi(pagina: Page, metodo: string, caminho: string, corpo?: unknown) {
  return pagina.evaluate(
    async ({ metodo, caminho, corpo }) => {
      const resposta = await fetch(caminho, {
        method: metodo,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
      const texto = await resposta.text();

      return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
    },
    { metodo, caminho, corpo },
  );
}
