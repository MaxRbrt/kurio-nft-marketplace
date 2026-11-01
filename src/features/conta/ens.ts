export const SUFIXOS_ENS = ['.eth', '.kurio.eth'] as const;
export const OPCOES_SUFIXO_ENS = SUFIXOS_ENS.map((sufixo) => ({ valor: sufixo, rotulo: sufixo }));

// ====================================================================
// 1. DICA DA CARTEIRA SECUNDÁRIA
// O texto do frame desktop não cabe no campo em tela estreita; abaixo
// de 1024 px vale a versão curta. O rótulo completo segue para leitores
// de tela.
// ====================================================================
export const DICA_CARTEIRA_SECUNDARIA = 'ENS ou carteira secundária (opcional)';
export const DICA_CARTEIRA_SECUNDARIA_CURTA = 'ENS ou carteira (opcional)';

// ====================================================================
// 2. NOME ENS
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
