import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { IconeSetaBaixo } from '@/components/icones/icones';
import type { ParametrosNfts } from '@/contracts/catalogo/nfts';
import { ROTULOS_ABA, ROTULOS_ORDEM } from '../busca';
import { useFiltrosCatalogo } from '../usar-catalogo';

type Aba = NonNullable<ParametrosNfts['aba']>;
type Ordem = NonNullable<ParametrosNfts['ordem']>;

const LARGURA_ABA: Record<Aba, string> = {
  todos: 'w-[110px] lg:w-[118px]',
  novos: 'ml-1 w-[143px] lg:ml-0 lg:w-[154px]',
  'em-alta': 'ml-4 w-[59px] lg:ml-0 lg:w-[64px]',
};

// ====================================================================
// 1. ABAS E ORDENAÇÃO
// Barra acima da grade. A aba ativa usa a cor e o traço do frame e é
// anunciada por aria-current, sem depender só da cor. Larguras e vãos são
// os do frame: 110, 143, 59 no mobile, com ativa em negrito; 118, 154, 64
// no desktop, todas em peso médio.
// ====================================================================
export function AbasCatalogo({ className = '' }: { className?: string }) {
  const { busca, alterarFiltros } = useFiltrosCatalogo();
  const abaAtiva = busca.aba ?? 'todos';
  const abas = Object.keys(ROTULOS_ABA) as Aba[];

  return (
    <ul className={`flex text-sm leading-4 lg:gap-5 lg:text-[15px] lg:font-medium ${className}`}>
      {abas.map((aba) => (
        <li key={aba}>
          <button
            type="button"
            aria-current={aba === abaAtiva ? 'true' : undefined}
            onClick={() => alterarFiltros({ aba: aba === 'todos' ? undefined : aba })}
            className={`relative text-left whitespace-nowrap ${LARGURA_ABA[aba]} ${
              aba === abaAtiva
                ? "font-bold text-texto-destaque after:absolute after:top-[18px] lg:font-medium after:left-0 after:h-0.5 after:w-full after:bg-primary after:content-[''] lg:after:top-5 lg:after:w-[101px]"
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

// ====================================================================
// 2. ORDENAÇÃO
// Rótulo, valor e seta em linha, alinhados à direita da grade. No frame a
// seta fica sobre o fim do valor; aqui vem depois dele, desvio documentado
// no ARCHITECTURE.md. O menu abre alinhado à direita.
// ====================================================================
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
        className="flex h-[18px] items-center gap-0 rounded-none border-0 bg-transparent p-0 text-[15px] leading-5 whitespace-nowrap shadow-none data-[size=default]:h-[18px] dark:bg-transparent [&>svg:last-child]:hidden"
      >
        <span className="mr-px">Ordenar por:</span>
        <span>{ROTULOS_ORDEM[ordem]}</span>
        <IconeSetaBaixo className="ml-1 text-foreground" />
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
