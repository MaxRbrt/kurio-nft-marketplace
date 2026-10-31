import type { Page } from '@playwright/test';

// ====================================================================
// 1. CHAMADA PELA PÁGINA
// A requisição sai de dentro do navegador para passar pelo MSW, como
// o enunciado exige nos testes de REST.
// ====================================================================
export function chamarApi(
  pagina: Page,
  metodo: string,
  caminho: string,
  corpo?: unknown,
  token?: string,
) {
  return pagina.evaluate(
    async ({ metodo, caminho, corpo, token }) => {
      const resposta = await fetch(caminho, {
        method: metodo,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
      const texto = await resposta.text();

      return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
    },
    { metodo, caminho, corpo, token },
  );
}

// ====================================================================
// 2. CREDENCIAIS FICTÍCIAS
// Mesmas pessoas das fixtures. Só existem na simulação.
// ====================================================================
export const ANA = { email: 'ana@kurio.test', senha: 'Kurio@2026a' };
export const BRUNO = { email: 'bruno@kurio.test', senha: 'Kurio@2026b' };

export async function entrar(pagina: Page, credenciais: { email: string; senha: string }) {
  const { status, corpo } = await chamarApi(pagina, 'POST', '/api/auth/login', credenciais);

  if (status !== 200) {
    throw new Error(`Login falhou com status ${status}`);
  }

  return corpo.token as string;
}
