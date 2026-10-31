import type { ComponentProps } from 'react';
import { IconeMaisPequeno, IconeMenosPequeno } from '@/components/icones/icones';
import { cn } from '@/lib/utils';

type PropsBotaoQuantidade = Omit<ComponentProps<'button'>, 'children'> & {
  acao: 'diminuir' | 'aumentar';
};

// ====================================================================
// 1. BOTÃO DE QUANTIDADE
// Pílula de 20 x 30 dos frames de Detalhe mobile e Carrinho desktop. No
// limite inferior o desenho não muda de cor; acima, fica esmaecido.
// ====================================================================
export function BotaoQuantidade({ acao, className, ...props }: PropsBotaoQuantidade) {
  const diminuir = acao === 'diminuir';

  return (
    <button
      type="button"
      aria-label={diminuir ? 'Diminuir quantidade' : 'Aumentar quantidade'}
      className={cn(
        'flex h-[30px] w-5 items-center justify-center rounded-[20px] border border-background bg-primary text-black shadow-[0_4px_12px_-2px_rgba(20,13,10,0.15)]',
        diminuir ? 'disabled:cursor-not-allowed' : 'disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {diminuir ? <IconeMenosPequeno /> : <IconeMaisPequeno />}
    </button>
  );
}
