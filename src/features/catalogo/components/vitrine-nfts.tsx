import { Link } from '@tanstack/react-router';
import { useId } from 'react';
import type { NftResumo } from '@/contracts/catalogo/nfts';
import { cn } from '@/lib/utils';
import { ImagemNft } from './imagem-nft';

const TOTAL_CARTOES = 5;
const ESTILOS = {
  detalhe: { arte: 'rounded-[13px]', nome: 'mt-3', preco: '' },
  carrinho: { arte: 'rounded-[17px]', nome: 'mt-2', preco: 'mt-2' },
};

type PropsVitrine = {
  titulo: string;
  variante: keyof typeof ESTILOS;
  nfts?: NftResumo[];
};

// ====================================================================
// 1. VITRINE DE NFTS
// "Mais desta coleção" e "Colecionadores também viram": mesma composição
// de cinco cartões, com raio e vãos próprios de cada frame. Sem dados:
// skeleton nas mesmas dimensões. Os pontos só repetem o desenho do frame.
// ====================================================================
export function VitrineNfts({ titulo, variante, nfts }: PropsVitrine) {
  const tituloId = useId();
  const estilo = ESTILOS[variante];

  return (
    <section className="mt-24" aria-labelledby={tituloId} aria-busy={!nfts}>
      <h2
        id={tituloId}
        className="h-7 border-b border-primary/25 text-[17px] leading-4 font-bold text-texto-destaque"
      >
        {titulo}
      </h2>
      <ul className="mt-8 grid grid-cols-5 gap-[26px] xl:gap-[26.25px]">
        {nfts?.map((nft) => (
          <li key={nft.id} data-testid="relacionado">
            <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="block">
              <div className="flex aspect-[219/255] items-center justify-center bg-card">
                <ImagemNft
                  url={nft.imagem.url}
                  sizes="212px"
                  width={212}
                  height={212}
                  alt={nft.imagem.alt}
                  loading="lazy"
                  className={cn('aspect-square w-[calc(100%-7px)] object-cover', estilo.arte)}
                />
              </div>
              <h3 className={cn('truncate text-[15px] leading-5', estilo.nome)}>{nft.nome}</h3>
              <p className={cn('text-base leading-4 font-bold text-texto-destaque', estilo.preco)}>
                {nft.preco} ETH
              </p>
            </Link>
          </li>
        ))}
        {!nfts &&
          Array.from({ length: TOTAL_CARTOES }, (_, indice) => (
            <li key={indice} data-testid="relacionado-esqueleto">
              <div className="esqueleto aspect-[219/255]" />
              <div className={cn('esqueleto h-5 w-2/3', estilo.nome)} />
              <div className={cn('esqueleto h-4 w-1/3', estilo.preco)} />
            </li>
          ))}
      </ul>
      <div aria-hidden className="mt-8 flex justify-center gap-2">
        <span className="size-3 rounded-full border-[1.3px] border-primary" />
        <span className="size-3 rounded-full bg-primary" />
        <span className="size-3 rounded-full border-[1.3px] border-primary" />
      </div>
    </section>
  );
}
