import { useEffect, useRef, useState } from 'react';
import { IconeBusca } from '@/components/icones/icones';
import { useCampoBusca } from '../usar-campo-busca';

// ====================================================================
// 1. BUSCA DO CABEÇALHO
// O frame desktop só desenha o ícone. O campo abre abaixo dele, no
// padrão do campo mobile, e leva à tela inicial com a busca na URL.
// Esc fecha e devolve o foco ao ícone.
// ====================================================================
export function BuscaDesktop() {
  const { texto, alterarTexto } = useCampoBusca();
  const [aberta, setAberta] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (aberta) {
      campo.current?.focus();
    }
  }, [aberta]);

  return (
    <div className="relative size-5">
      <button
        ref={botao}
        type="button"
        aria-label="Buscar"
        aria-expanded={aberta}
        onClick={() => setAberta((atual) => !atual)}
        className="size-5 text-foreground"
      >
        <IconeBusca />
      </button>
      {aberta && (
        <div className="absolute top-8 right-0 z-30 w-[313px] rounded-[10px] bg-card px-3 py-3 has-focus-visible:outline-2 has-focus-visible:outline-ring">
          <label htmlFor="busca-desktop" className="sr-only">
            Buscar NFTs
          </label>
          <input
            id="busca-desktop"
            ref={campo}
            type="search"
            value={texto}
            placeholder="Explorar coleções"
            onChange={(evento) => alterarTexto(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Escape') {
                setAberta(false);
                botao.current?.focus();
              }
            }}
            className="w-full bg-transparent text-sm leading-4 font-bold outline-none placeholder:text-secundaria"
          />
        </div>
      )}
    </div>
  );
}
