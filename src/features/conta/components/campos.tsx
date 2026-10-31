import { Eye } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { toast } from 'sonner';
import {
  IconeFacebookEntrada,
  IconeGoogle,
  IconeOcultarDesktop,
  IconeOcultarMobile,
} from '@/components/icones/icones';
import { cn } from '@/lib/utils';

// ====================================================================
// 1. CAMPO DE FORMULÁRIO
// O layout só desenha o texto de ajuda dentro do campo: o rótulo fica
// para leitores de tela. O erro é ligado ao campo e não depende de cor.
// Mobile 50 e desktop 40 de altura. Ajuda em 14 px secundário; senha
// digitada em 16 px, como os asteriscos do login, que os desenha claros.
// ====================================================================
type PropsCampo = ComponentProps<'input'> & {
  rotulo: string;
  erro?: string;
  alternarSenha?: 'sempre' | 'mobile';
};

export function Campo({ rotulo, erro, alternarSenha, className, type, id, ...props }: PropsCampo) {
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const idErro = `${id}-erro`;

  return (
    <div>
      <div className="relative">
        <label htmlFor={id} className="sr-only">
          {rotulo}
        </label>
        <input
          id={id}
          type={alternarSenha && senhaVisivel ? 'text' : type}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? idErro : undefined}
          className={cn(
            'h-[50px] w-full rounded-[10px] border border-border bg-transparent pr-11 pl-4 text-foreground outline-none focus:border-primary aria-invalid:border-texto-coral lg:h-10 lg:rounded-[5px]',
            'text-sm leading-4 placeholder:text-secundaria',
            type === 'password' && 'not-placeholder-shown:text-base',
            className,
          )}
          {...props}
        />
        {alternarSenha && (
          <button
            type="button"
            aria-label={senhaVisivel ? `Ocultar ${rotulo}` : `Mostrar ${rotulo}`}
            aria-pressed={senhaVisivel}
            onClick={() => setSenhaVisivel((atual) => !atual)}
            className={cn(
              'absolute top-1/2 right-4 flex -translate-y-1/2 text-borda-suave lg:right-[11.33px] lg:text-secundaria',
              alternarSenha === 'mobile' && 'lg:hidden',
            )}
          >
            {senhaVisivel ? (
              <Eye aria-hidden className="size-[18px] lg:h-5 lg:w-[22.67px]" />
            ) : (
              <>
                <IconeOcultarMobile className="lg:hidden" />
                <IconeOcultarDesktop className="hidden h-5 w-[22.67px] lg:block" />
              </>
            )}
          </button>
        )}
      </div>
      {erro && (
        <p id={idErro} className="mt-1 text-xs leading-4 text-texto-coral">
          <span aria-hidden>! </span>
          {erro}
        </p>
      )}
    </div>
  );
}

// ====================================================================
// 2. ENTRADA SOCIAL
// Fora da entrega: login só com a API simulada. Avisa que não está
// disponível em vez de aparentar que iniciou uma autenticação.
// ====================================================================
const MENSAGEM_INDISPONIVEL = 'Indisponível nesta versão';

function BotaoSocial({ rotulo, icone }: { rotulo: string; icone: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-disabled="true"
      title={MENSAGEM_INDISPONIVEL}
      onClick={() => toast.info(MENSAGEM_INDISPONIVEL)}
      className="flex h-10 w-full cursor-not-allowed items-center justify-center gap-3 rounded-[5px] border border-border text-[13px] leading-4 font-medium text-muted-foreground"
    >
      {icone}
      {rotulo}
    </button>
  );
}

type PropsEntradas = { espacamento: string; espacamentoTopo?: string };

export function EntradasSociais({ espacamento, espacamentoTopo = 'mt-3' }: PropsEntradas) {
  return (
    <div className="mt-10 lg:mt-6">
      <div className="flex items-center gap-[10px] lg:-mx-20 lg:gap-3">
        <span className="mt-[7px] h-px flex-1 self-start bg-border" />
        <span className="text-[13px] leading-4">Ou continue com</span>
        <span className="mt-[7px] h-px flex-1 self-start bg-border" />
      </div>
      <div className={cn('flex flex-col', espacamentoTopo, espacamento)}>
        <BotaoSocial rotulo="Continuar com Google" icone={<IconeGoogle />} />
        <BotaoSocial rotulo="Continuar com Facebook" icone={<IconeFacebookEntrada />} />
      </div>
    </div>
  );
}
