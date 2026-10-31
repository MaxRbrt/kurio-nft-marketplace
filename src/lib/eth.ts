// ====================================================================
// 1. APRESENTAÇÃO DE ETH
// O valor chega como string decimal e não passa por número: só ganha as
// duas casas mínimas do layout, sem perder precisão.
// ====================================================================
export function formatarEth(valor: string) {
  const [inteiro, decimais = ''] = valor.split('.');

  return `${inteiro}.${decimais.padEnd(2, '0')} ETH`;
}

// ====================================================================
// 2. DESCONTO
// Zerado aparece como no frame, "(-) 00.00", e com valor leva a moeda.
// ====================================================================
const DESCONTO_ZERADO = /^0(\.0+)?$/;

export function descontoZerado(desconto: string) {
  return DESCONTO_ZERADO.test(desconto);
}

export function textoDesconto(desconto: string) {
  return descontoZerado(desconto) ? '(-) 00.00' : `(-) ${formatarEth(desconto)}`;
}
