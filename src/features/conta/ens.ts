export const SUFIXOS_ENS = ['.eth', '.kurio.eth'] as const;
export const OPCOES_SUFIXO_ENS = SUFIXOS_ENS.map((sufixo) => ({ valor: sufixo, rotulo: sufixo }));

// ====================================================================
// 1. NOME ENS
// O frame separa o nome e o sufixo. Na API é um valor só: a leitura tenta
// o sufixo mais longo primeiro, e nome sem sufixo conhecido fica como está.
// ====================================================================
export function separarEns(valor: string | null | undefined) {
  const texto = valor ?? '';
  const sufixo = [...SUFIXOS_ENS]
    .sort((a, b) => b.length - a.length)
    .find((candidato) => texto.endsWith(candidato));

  return sufixo
    ? { nomeEns: texto.slice(0, -sufixo.length), sufixoEns: sufixo }
    : { nomeEns: texto, sufixoEns: SUFIXOS_ENS[0] };
}
