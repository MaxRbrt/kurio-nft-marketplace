import { ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import type { ParametrosNfts } from '@/contracts/catalogo/nfts';
import { ROTULOS_ABA, ROTULOS_ORDEM } from '../busca';
import { useFiltrosCatalogo } from '../usar-catalogo';

type Aba = NonNullable<ParametrosNfts['aba']>;
type Ordem = NonNullable<ParametrosNfts['ordem']>;

// ====================================================================
// 1. ABAS E ORDENAÇÃO
// Barra acima da grade. A aba ativa usa a cor e o traço do frame e é
// anunciada por aria-current, sem depender só da cor.
// ====================================================================
export function AbasCatalogo({ className = '' }: { className?: string }) {
  const { busca, alterarFiltros } = useFiltrosCatalogo();
  const abaAtiva = busca.aba ?? 'todos';
  const abas = Object.keys(ROTULOS_ABA) as Aba[];

  return (
    <ul className={`flex gap-5 text-[15px] leading-4 font-medium ${className}`}>
      {abas.map((aba) => (
        <li key={aba}>
          <button
            type="button"
            aria-current={aba === abaAtiva ? 'true' : undefined}
            onClick={() => alterarFiltros({ aba: aba === 'todos' ? undefined : aba })}
            className={`relative whitespace-nowrap ${
              aba === abaAtiva
                ? "text-texto-destaque after:absolute after:top-[22px] after:left-0 after:h-0.5 after:w-[86%] after:bg-primary after:content-['']"
                : 'text-foreground'
            }`}
          >
            {ROTULOS_ABA[aba]}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function OrdemCatalogo() {
  const { busca, alterarFiltros } = useFiltrosCatalogo();
  const ordem = busca.ordem ?? 'recentes';
  const ordens = Object.keys(ROTULOS_ORDEM) as Ordem[];

  return (
    <Select
      value={ordem}
      onValueChange={(valor) =>
        alterarFiltros({ ordem: valor === 'recentes' ? undefined : (valor as Ordem) })
      }
    >
      <SelectTrigger
        aria-label="Ordenar por"
        className="flex h-[18px] items-center gap-0 border-0 bg-transparent p-0 text-[15px] leading-5 shadow-none data-[size=default]:h-[18px] dark:bg-transparent [&>svg:last-child]:hidden"
      >
        <span className="whitespace-nowrap">Ordenar por: </span>
        <span className="whitespace-nowrap">{ROTULOS_ORDEM[ordem]}</span>
        <ChevronDown aria-hidden className="ml-1 size-4" />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        <SelectGroup>
          {ordens.map((opcao) => (
            <SelectItem key={opcao} value={opcao}>
              {ROTULOS_ORDEM[opcao]}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
