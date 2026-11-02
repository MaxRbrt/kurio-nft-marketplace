import type { CSSProperties } from 'react';
import {
  IconeBusca,
  IconeCarrinhoAcao,
  IconeFavorito,
  IconeSetaBaixo,
} from '@/components/icones/icones';
import { ELEMENTOS_FUNDO } from './fundo-autenticacao-dados';

export type ElementoFundo = {
  tipo: 'texto' | 'caixa' | 'imagem';
  x: number;
  y: number;
  w: number;
  h: number;
  texto?: string;
  tamanho?: number;
  peso?: number;
  entrelinha?: number;
  espaco?: number;
  cor?: string;
  alinhamento?: string;
  fundo?: string;
  borda?: string;
  bordaPeso?: number;
  bordaAlinha?: string;
  raio?: number | number[];
  url?: string;
};

// ====================================================================
// 1. ESTILO DE CADA ELEMENTO
// Posições e estilos vêm dos nós do frame Desktop / Login. Borda por fora
// vira outline, para não mudar o tamanho; raio em lista segue a ordem do
// Figma: superior esquerdo, superior direito, inferior direito, inferior esquerdo.
// ====================================================================
function estiloDe(elemento: ElementoFundo): CSSProperties {
  const raio = Array.isArray(elemento.raio)
    ? elemento.raio.map((valor) => `${valor}px`).join(' ')
    : elemento.raio;
  const estilo: CSSProperties = {
    left: elemento.x,
    top: elemento.y,
    width: elemento.w,
    height: elemento.h,
    borderRadius: raio,
  };

  if (elemento.tipo === 'texto') {
    return {
      ...estilo,
      fontSize: elemento.tamanho,
      fontWeight: elemento.peso,
      lineHeight: `${elemento.entrelinha}px`,
      letterSpacing: elemento.espaco,
      color: elemento.cor,
      textAlign: elemento.alinhamento as CSSProperties['textAlign'],
    };
  }

  if (!elemento.borda) {
    return { ...estilo, background: elemento.fundo };
  }

  const traco = `${elemento.bordaPeso}px solid ${elemento.borda}`;
  const bordaPorFora = elemento.bordaAlinha === 'OUTSIDE';

  return {
    ...estilo,
    background: elemento.fundo,
    border: bordaPorFora ? undefined : traco,
    outline: bordaPorFora ? traco : undefined,
  };
}

// ====================================================================
// 2. FUNDO DO LOGIN E DO CADASTRO NO DESKTOP
// Nos frames, o modal fica sobre uma composição própria da página, que
// difere da Início. É decorativa: fora da árvore acessível e inerte, sem
// foco nem clique. Mede 1200 x 1900, abaixo do cabeçalho, centrada em pixel
// inteiro; em tela mais estreita as laterais são recortadas, sem rolagem
// lateral.
// ====================================================================
export function FundoAutenticacao() {
  return (
    <div aria-hidden inert className="overflow-x-clip">
      <div
        data-testid="fundo-autenticacao"
        className="relative left-[round(down,50%,1px)] mt-3 h-[1900px] w-[1200px] -translate-x-1/2 overflow-hidden whitespace-pre"
      >
        {ELEMENTOS_FUNDO.map((elemento, indice) =>
          elemento.tipo === 'imagem' ? (
            <img
              key={indice}
              src={elemento.url}
              alt=""
              loading={indice === 0 ? 'eager' : 'lazy'}
              style={estiloDe(elemento)}
              className="absolute object-cover"
            />
          ) : elemento.tipo === 'texto' ? (
            <p key={indice} style={estiloDe(elemento)} className="absolute">
              {elemento.texto}
            </p>
          ) : (
            <div key={indice} style={estiloDe(elemento)} className="absolute" />
          ),
        )}
        <IconeSetaBaixo className="absolute top-[498px] left-[1183px] text-foreground" />
        <IconeCarrinhoAcao className="absolute top-[816px] left-[729px] text-foreground" />
        <IconeFavorito
          ativo={false}
          className="absolute top-[816px] left-[775px] text-foreground"
        />
        <IconeBusca className="absolute top-[815px] left-[822px] text-foreground" />
      </div>
    </div>
  );
}
