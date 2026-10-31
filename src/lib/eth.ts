// ====================================================================
// 1. APRESENTAÇÃO DE ETH
// O valor chega como string decimal e não passa por número: só ganha as
// duas casas mínimas do layout, sem perder precisão.
// ====================================================================
export function formatarEth(valor: string) {
  const [inteiro, decimais = ''] = valor.split('.');

  return `${inteiro}.${decimais.padEnd(2, '0')} ETH`;
}
