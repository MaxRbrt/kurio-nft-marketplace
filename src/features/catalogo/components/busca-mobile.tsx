import { IconeBuscaMobile, IconeFiltro } from '@/components/icones/icones';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useCampoBusca } from '../usar-campo-busca';
import { OrdemCatalogo } from './barra-catalogo';
import { PainelFiltros } from './painel-filtros';

// ====================================================================
// 1. BUSCA E FILTROS NO MOBILE
// Medidas do frame. Filtros e ordenação não têm frame mobile: abrem em
// painel lateral, com o mesmo conteúdo e padrão visual do desktop.
// ====================================================================
export function BuscaMobile() {
  const { texto, alterarTexto } = useCampoBusca();

  return (
    <div className="mx-6 mt-10 flex h-[45px] gap-2 lg:hidden">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-card px-3 has-focus-visible:outline-2 has-focus-visible:outline-ring">
        <IconeBuscaMobile className="shrink-0 text-secundaria" />
        <span className="sr-only">Buscar NFTs</span>
        <input
          type="search"
          value={texto}
          placeholder="Explorar coleções"
          onChange={(evento) => alterarTexto(evento.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm leading-4 font-bold outline-none placeholder:text-secundaria"
        />
      </label>

      <Sheet>
        <SheetTrigger
          aria-label="Abrir filtros"
          className="flex size-[45px] shrink-0 items-center justify-center rounded-[14px] bg-[linear-gradient(137.05deg,rgb(210_138_76/0.45)_-24.6%,rgb(210_138_76)_100%)] text-primary-foreground"
        >
          <IconeFiltro />
        </SheetTrigger>
        <SheetContent className="w-[min(320px,100vw)] overflow-y-auto bg-card p-0">
          <SheetTitle className="px-5 pt-5 text-lg font-bold">Filtros</SheetTitle>
          <div className="px-5 pt-4">
            <OrdemCatalogo empilhado />
          </div>
          <PainelFiltros />
        </SheetContent>
      </Sheet>
    </div>
  );
}
