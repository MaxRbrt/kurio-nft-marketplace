import { useSyncExternalStore } from 'react';

let conectado = false;
const ouvintes = new Set<() => void>();

// ====================================================================
// 1. ESTADO DA CONEXÃO
// Fora do React para o provedor escrever e qualquer tela ler, sem criar
// outra conexão. Serve à consulta periódica, que só existe sem socket.
// ====================================================================
export function definirSocketConectado(valor: boolean) {
  conectado = valor;
  ouvintes.forEach((ouvinte) => ouvinte());
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);

  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function useSocketConectado() {
  return useSyncExternalStore(assinar, () => conectado);
}
