import type { ComponentProps } from 'react';
import { toast } from 'sonner';

const MENSAGEM = 'Indisponível nesta versão';

// ====================================================================
// 1. AÇÃO FORA DO ESCOPO
// Mantém o visual do layout, mas não aparenta sucesso: avisa que não
// está disponível e não navega nem altera nada.
// ====================================================================
export function AcaoIndisponivel({ children, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-disabled="true"
      title={MENSAGEM}
      onClick={() => toast.info(MENSAGEM)}
      {...props}
    >
      {children}
    </button>
  );
}
