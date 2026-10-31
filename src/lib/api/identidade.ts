const CHAVE_TOKEN = 'kurio:token';
const CHAVE_VISITANTE = 'kurio:visitante';

// ====================================================================
// 1. TOKEN DA SESSÃO
// Em localStorage para recuperar a sessão após o refresh. Vale só para
// a simulação: em produção o token ficaria em cookie httpOnly.
// ====================================================================
export function lerToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function salvarToken(token: string) {
  localStorage.setItem(CHAVE_TOKEN, token);
}

export function apagarToken() {
  localStorage.removeItem(CHAVE_TOKEN);
}

// ====================================================================
// 2. IDENTIDADE DO VISITANTE
// Gerada uma vez, identifica o carrinho de quem ainda não entrou.
// ====================================================================
export function lerVisitanteId() {
  const salvo = localStorage.getItem(CHAVE_VISITANTE);

  if (salvo) {
    return salvo;
  }

  const novo = crypto.randomUUID();
  localStorage.setItem(CHAVE_VISITANTE, novo);

  return novo;
}
