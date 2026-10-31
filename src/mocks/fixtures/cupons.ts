// ====================================================================
// 1. CUPONS
// Um válido e um vencido, com data fixa para o resultado ser sempre o
// mesmo. Qualquer outro código é tratado como inválido.
// ====================================================================
export type Cupom = {
  codigo: string;
  percentual: string;
  expiraEm: string;
};

export function criarCuponsIniciais(): Cupom[] {
  return [
    { codigo: 'KURIO10', percentual: '10', expiraEm: '2099-12-31T23:59:59.000Z' },
    { codigo: 'GENESIS20', percentual: '20', expiraEm: '2026-01-01T00:00:00.000Z' },
  ];
}
