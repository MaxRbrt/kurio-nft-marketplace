import { ArrowRight } from 'lucide-react';
import { ImagemNft } from './imagem-nft';

const ARTE_PRINCIPAL = '/nfts/arte-1-960.webp';
const ARTE_SECUNDARIA = '/nfts/arte-2-320.webp';

function PontosCarrossel({ className }: { className: string }) {
  return (
    <div aria-hidden className={`flex gap-2 ${className}`}>
      <span className="size-2 rounded-full bg-primary" />
      <span className="size-2 rounded-full bg-primary" />
      <span className="size-2 rounded-full bg-primary" />
    </div>
  );
}

// ====================================================================
// 1. HERO
// Cada largura segue seu frame, inclusive no texto: o desktop e o mobile
// têm títulos diferentes no layout. A imagem principal é o LCP da tela.
// ====================================================================
export function Hero() {
  return (
    <>
      <section
        aria-labelledby="hero-titulo"
        data-testid="hero"
        className="relative mx-auto mt-8 hidden h-[450px] w-full max-w-[1200px] px-4 lg:block xl:px-0"
      >
        <div className="pt-[43px] pl-10">
          <p className="text-sm leading-4 font-medium tracking-[0.1em]">Bem-vindo à Kurio</p>
          <h1
            id="hero-titulo"
            className="mt-2 text-[43px] leading-[70px] font-bold whitespace-pre-line"
          >
            {'SEJA DONO DO FUTURO\nDA ARTE DIGITAL'}
          </h1>
          <p className="mt-1 w-[min(557px,calc(100%-500px))] text-sm leading-6 text-muted-foreground">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital
            rara, apoie artistas e tenha uma parte da cultura da internet.
          </p>
          <a
            href="#catalogo"
            className="mt-8 flex h-10 w-[140px] items-center justify-center rounded-md bg-primary text-base leading-5 font-bold text-primary-foreground hover:bg-primaria-clara"
          >
            EXPLORAR
          </a>
        </div>
        <PontosCarrossel className="absolute top-[399px] left-[600px]" />
        <ImagemNft
          url={ARTE_PRINCIPAL}
          sizes="450px"
          width={450}
          height={450}
          alt="Emerald Ape #042"
          fetchPriority="high"
          className="absolute top-0 right-4 size-[450px] xl:right-0 rounded-3xl object-cover"
        />
      </section>

      <section
        aria-label="Destaque"
        data-testid="hero-mobile"
        className="relative mx-6 mt-4 h-[190px] overflow-hidden rounded-xl bg-linear-to-b from-primary/20 to-primary/10 lg:hidden"
      >
        <div
          aria-hidden
          className="absolute top-[-31px] left-[-80px] size-[248px] rounded-full bg-linear-to-b from-primaria-clara/40 to-primary/5"
        />
        <div
          aria-hidden
          className="absolute top-[-10px] left-[73px] size-[248px] rounded-full bg-linear-to-b from-primaria-clara/35 to-primary/0"
        />
        <div className="relative px-4 pt-1.5">
          <p className="text-xs leading-4 font-medium">Bem-vindo à Kurio</p>
          <p className="mt-1.5 text-lg leading-[29px] font-bold whitespace-pre-line">
            {'SEJA DONO DA\nCULTURA DIGITAL'}
          </p>
          <p className="mt-1.5 w-[188px] max-w-[52%] text-xs leading-[18px] text-muted-foreground">
            Descubra NFTs selecionados de criadores do mundo todo.
          </p>
          <a
            href="#catalogo"
            className="mt-0.5 flex items-center gap-2 text-xs leading-[14px] font-bold text-texto-destaque"
          >
            EXPLORAR
            <ArrowRight className="size-4" aria-hidden />
          </a>
        </div>
        <ImagemNft
          url={ARTE_PRINCIPAL}
          sizes="138px"
          width={138}
          height={138}
          alt=""
          className="absolute top-[11px] right-4 size-[138px] rounded-2xl object-cover"
        />
        <ImagemNft
          url={ARTE_SECUNDARIA}
          sizes="58px"
          width={58}
          height={58}
          alt=""
          className="absolute top-[99px] right-[82px] size-[58px] rounded-2xl object-cover"
        />
        <PontosCarrossel className="absolute bottom-1 left-1/2 -translate-x-1/2 [&>span]:size-[7px]" />
      </section>
    </>
  );
}
