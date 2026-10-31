import { useState, type ComponentProps, type ReactNode } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Eye } from 'lucide-react';
import { IconeOcultarDesktop, IconeSetaBaixo } from '@/components/icones/icones';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type PropsCampoRotulado = {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  rotuloOculto?: boolean;
  erro?: string;
  classeRotulo?: string;
  children: ReactNode;
};

// ====================================================================
// 1. CAMPO COM RÓTULO
// Faixa de 29 px com rótulo de 15 e asterisco coral, dos frames de
// Pagamento, Perfil e Carteiras. O erro é ligado ao campo pelo id e vem
// em texto. Rótulo oculto continua disponível para leitor de tela.
// ====================================================================
export function CampoRotulado({
  id,
  rotulo,
  obrigatorio,
  rotuloOculto,
  erro,
  classeRotulo,
  children,
}: PropsCampoRotulado) {
  return (
    <div>
      <div className={cn('flex h-[29px] items-center', classeRotulo)}>
        <label htmlFor={id} className={cn('text-[15px] leading-[15px]', rotuloOculto && 'sr-only')}>
          {rotulo}
        </label>
        {obrigatorio && (
          <span aria-hidden className="text-[22px] leading-[29px] text-texto-coral">
            *
          </span>
        )}
      </div>
      {children}
      {erro && (
        <p id={`${id}-erro`} className="mt-1 text-sm leading-5 text-texto-coral">
          Erro: {erro}
        </p>
      )}
    </div>
  );
}

const CLASSE_ENTRADA =
  'h-10 w-full rounded-[3px] border border-border bg-transparent px-3 text-sm leading-[15px] text-foreground outline-none placeholder:text-secundaria focus-visible:border-primary aria-invalid:border-texto-coral';

type PropsEntrada = ComponentProps<'input'> & { erro?: string };

export function Entrada({ erro, id, className, ...props }: PropsEntrada) {
  return (
    <input
      id={id}
      aria-invalid={Boolean(erro)}
      aria-describedby={erro ? `${id}-erro` : undefined}
      className={cn(CLASSE_ENTRADA, className)}
      {...props}
    />
  );
}

// ====================================================================
// 2. SENHA
// Olho de 20 px a 16 da borda, como no frame de Perfil. O estado visível
// não tem desenho e usa um ícone de biblioteca no mesmo tamanho.
// ====================================================================
export function EntradaSenha({ erro, id, ...props }: PropsEntrada & { rotulo: string }) {
  const { rotulo, ...propsEntrada } = props;
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <Entrada
        id={id}
        erro={erro}
        type={visivel ? 'text' : 'password'}
        className="pr-11"
        {...propsEntrada}
      />
      <button
        type="button"
        aria-label={visivel ? `Ocultar ${rotulo}` : `Mostrar ${rotulo}`}
        aria-pressed={visivel}
        onClick={() => setVisivel((atual) => !atual)}
        className="absolute top-2.5 right-4 text-secundaria"
      >
        {visivel ? (
          <Eye aria-hidden className="size-5" />
        ) : (
          <IconeOcultarDesktop className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

type PropsSeletor<Campos extends FieldValues> = {
  id: string;
  control: Control<Campos>;
  nome: Path<Campos>;
  texto: string;
  opcoes: ReadonlyArray<{ valor: string; rotulo: string }>;
  erro?: string;
  aoEscolher?: (valor: string) => void;
  classeCaixa?: string;
  classeSeta?: string;
};

// ====================================================================
// 3. SELETOR
// Select do shadcn com a aparência dos frames. Teclado e foco vêm do
// Radix. Cada frame define a largura da caixa e a posição da seta.
// ====================================================================
export function Seletor<Campos extends FieldValues>({
  id,
  control,
  nome,
  texto,
  opcoes,
  erro,
  aoEscolher,
  classeCaixa = 'w-full',
  classeSeta = 'right-[27.5px] size-[18px] text-secundaria',
}: PropsSeletor<Campos>) {
  return (
    <Controller
      control={control}
      name={nome}
      render={({ field }) => (
        <Select
          value={field.value ?? ''}
          onValueChange={(valor) => {
            field.onChange(valor);
            aoEscolher?.(valor);
          }}
        >
          <SelectTrigger
            id={id}
            ref={field.ref}
            aria-invalid={Boolean(erro)}
            aria-describedby={erro ? `${id}-erro` : undefined}
            className={cn(
              'relative !h-10 rounded-[3px] border-border bg-transparent pl-3 text-sm leading-[15px] text-foreground shadow-none data-placeholder:text-secundaria dark:bg-transparent [&>svg:last-child]:hidden',
              classeCaixa,
            )}
          >
            <SelectValue placeholder={texto} />
            <IconeSetaBaixo className={cn('absolute top-[11px]', classeSeta)} />
          </SelectTrigger>
          <SelectContent className="border-border bg-card">
            {opcoes.map(({ valor, rotulo }) => (
              <SelectItem key={valor} value={valor}>
                {rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}
