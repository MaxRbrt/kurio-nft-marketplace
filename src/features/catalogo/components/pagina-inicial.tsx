import { Rodape } from '@/components/layout/rodape';
import { AbasCatalogo, OrdemCatalogo } from './barra-catalogo';
import { BuscaMobile } from './busca-mobile';
import { GradeNfts } from './grade-nfts';
import { Hero } from './hero';
import { ImagemNft } from './imagem-nft';
import { PainelFiltros } from './painel-filtros';
import { DiarioCunhagem, Promocoes } from './secoes-editoriais';

// ====================================================================
// 1. NFT EM DESTAQUE
// Coluna lateral do frame desktop, abaixo dos filtros, com os dois
// detalhes de luz desenhados sobre a imagem.
// ====================================================================
function BannerDestaque() {
  return (
    <aside
      aria-label="NFT em destaque"
      data-testid="banner-destaque"
      className="relative mt-6 h-[470px] overflow-hidden bg-linear-to-b from-primary/10 to-primary/3 pt-6"
    >
      <p className="px-5 text-2xl leading-8 font-bold text-texto-destaque">NFT EM DESTAQUE</p>
      <p className="mt-4 text-center text-[22px] leading-4 font-bold">OFERTA LIMITADA</p>
      <ImagemNft
        url="/nfts/arte-2-640.webp"
        sizes="310px"
        width={310}
        height={368}
        alt="Sage Nomad #009"
        loading="lazy"
        className="mt-4 h-[368px] w-[310px] rounded-[22px] object-cover"
      />
      <div
        aria-hidden
        className="absolute top-[105px] left-[38px] size-[15px] rounded-[29px] bg-linear-to-b from-primary to-primary/0"
      />
      <div
        aria-hidden
        className="absolute top-[343px] left-[248px] size-[45px] rounded-[29px] bg-linear-to-b from-primary to-primary/0"
      />
    </aside>
  );
}

// ====================================================================
// 2. TELA INICIAL
// Coordenadas do frame Desktop / Início: coluna de 310, intervalo de 48
// e grade de 842. No mobile vale a ordem do frame Mobile / Início.
// ====================================================================
export function PaginaInicial() {
  return (
    <>
      <main className="pb-[150px] lg:pb-0">
        <BuscaMobile />
        <Hero />

        <section
          id="catalogo"
          aria-label="Catálogo de NFTs"
          data-testid="catalogo"
          className="mx-6 mt-4 flex scroll-mt-6 gap-12 lg:mx-auto lg:mt-24 lg:w-full lg:max-w-[1232px] lg:px-4 xl:max-w-[1200px] xl:px-0"
        >
          <div data-testid="coluna-lateral" className="hidden w-[310px] shrink-0 lg:block">
            <PainelFiltros />
            <BannerDestaque />
          </div>

          <div data-testid="coluna-grade" className="min-w-0 flex-1">
            <div className="mb-[18px] flex min-h-[18px] flex-wrap items-center justify-between gap-y-3 lg:mb-8">
              <AbasCatalogo />
              <div className="hidden lg:block">
                <OrdemCatalogo />
              </div>
            </div>
            <GradeNfts />
          </div>
        </section>

        <Promocoes />
        <DiarioCunhagem />
      </main>
      <Rodape />
    </>
  );
}
