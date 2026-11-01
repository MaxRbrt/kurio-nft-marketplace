// ====================================================================
// 1. SUBSTITUTO LEVE DO TLDTS
// O cookie store do MSW usa o tough-cookie, que pede o domínio registrável
// ao tldts, com a lista mundial de sufixos: cerca de 300 KB só para isso.
// A API simulada autentica por Bearer e não grava cookies, então os dois
// últimos rótulos do domínio bastam. Ligado por alias no vite.config.ts.
// ====================================================================
const ENDERECO_IP = /^(\d{1,3}\.){3}\d{1,3}$|:/;

export function getDomain(endereco: string | null | undefined) {
  if (!endereco || ENDERECO_IP.test(endereco)) {
    return null;
  }

  const rotulos = endereco.split('.').filter(Boolean);

  if (rotulos.length < 2) {
    return null;
  }

  return rotulos.slice(-2).join('.');
}
