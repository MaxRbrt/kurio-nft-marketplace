// ====================================================================
// 1. AVISO DE SESSÃO EXPIRADA
// O cliente HTTP só avisa, sem conhecer rotas nem cache. Várias respostas
// 401 ao mesmo tempo geram um único tratamento, até a próxima sessão.
// ====================================================================
let tratar: () => void = () => undefined;
let jaAvisado = false;

export function aoExpirarSessao(tratamento: () => void) {
  tratar = tratamento;
}

export function avisarSessaoExpirada() {
  if (jaAvisado) {
    return;
  }

  jaAvisado = true;
  tratar();
}

export function liberarAvisoDeSessao() {
  jaAvisado = false;
}
