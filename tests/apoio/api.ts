import type { Page } from '@playwright/test';

// ====================================================================
// 1. CHAMADA PELA PÁGINA
// A requisição sai de dentro do navegador para passar pelo MSW, como
// o enunciado exige nos testes de REST. Com limite de tempo, a chamada
// abortada volta com status 0, como um timeout do cliente.
// ====================================================================
type OpcoesChamada = {
  cabecalhos?: Record<string, string>;
  limiteMs?: number;
};

export function chamarApi(
  pagina: Page,
  metodo: string,
  caminho: string,
  corpo?: unknown,
  token?: string,
  opcoes: OpcoesChamada = {},
) {
  return pagina.evaluate(
    async ({ metodo, caminho, corpo, token, opcoes }) => {
      const cabecalhos = { ...opcoes.cabecalhos };

      if (token) {
        cabecalhos.Authorization = `Bearer ${token}`;
      }

      try {
        const resposta = await fetch(caminho, {
          method: metodo,
          headers: cabecalhos,
          body: corpo === undefined ? undefined : JSON.stringify(corpo),
          signal: opcoes.limiteMs ? AbortSignal.timeout(opcoes.limiteMs) : undefined,
        });
        const texto = await resposta.text();

        return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
      } catch {
        return { status: 0, corpo: null };
      }
    },
    { metodo, caminho, corpo, token, opcoes },
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
