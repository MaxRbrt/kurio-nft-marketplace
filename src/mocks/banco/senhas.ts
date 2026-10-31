// ====================================================================
// 1. HASH DE SENHA
// SHA-256 com sal, pela Web Crypto do navegador. Basta para a simulação
// não guardar senha em claro; servidor real usaria argon2 ou bcrypt.
// ====================================================================
export async function gerarHashSenha(sal: string, senha: string) {
  const dados = new TextEncoder().encode(sal + senha);
  const resumo = await crypto.subtle.digest('SHA-256', dados);

  return [...new Uint8Array(resumo)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
