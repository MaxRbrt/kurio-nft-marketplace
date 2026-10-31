import { Link, useNavigate } from '@tanstack/react-router';
import { IconeVoltarDetalhe } from '@/components/icones/icones';
import { cn } from '@/lib/utils';

type PropsCabecalhoMobile = {
  titulo: string;
  recuo: string;
  voltarPara?: '/' | '/carrinho';
};

// ====================================================================
// 1. CABEÇALHO DA COMPRA
// Voltar e título dos frames mobile, com o recuo de cada um. No desktop,
// a trilha termina na tela atual.
// ====================================================================
export function CabecalhoMobile({ titulo, recuo, voltarPara = '/' }: PropsCabecalhoMobile) {
  const navigate = useNavigate();

  return (
    <div className="relative h-11">
      <button
        type="button"
        aria-label="Voltar"
        onClick={() => void navigate({ to: voltarPara })}
        className="flex size-[35px] items-center justify-center rounded-full border border-border bg-muted text-secundaria"
      >
        <IconeVoltarDetalhe />
      </button>
      <h1 className={cn('absolute top-[9px] text-xl leading-4 font-bold whitespace-nowrap', recuo)}>
        {titulo}
      </h1>
    </div>
  );
}

export function Trilha({ atual }: { atual: string }) {
  return (
    <nav aria-label="Trilha" className="h-4 text-[15px] leading-4 font-bold">
      <Link to="/">Início</Link> / <span>Mercado</span> / <span aria-current="page">{atual}</span>
    </nav>
  );
}
