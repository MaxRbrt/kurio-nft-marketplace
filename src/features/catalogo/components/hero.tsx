import { IconeSetaDireitaPequena } from '@/components/icones/icones';
import { ImagemNft } from './imagem-nft';

const ARTE_PRINCIPAL = '/nfts/arte-1-960.webp';

function PontosCarrossel({ className }: { className: string }) {
  return (
    <div aria-hidden className={`flex ${className}`}>
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
        <PontosCarrossel className="absolute top-[399px] left-[600px] gap-2" />
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
        className="relative mx-6 mt-4 h-[190px] overflow-hidden rounded-[30px] bg-[linear-gradient(116.88deg,rgb(210_138_76/0.2)_1.08%,rgb(210_138_76/0.1)_99.23%)] lg:hidden"
      >
        <div
          aria-hidden
          className="absolute top-[-31px] left-[-80px] size-[248px] rounded-full bg-[linear-gradient(160.25deg,rgb(221_154_95/0.43)_22.1%,rgb(210_138_76/0.04)_87.42%)]"
        />
        <div
          aria-hidden
          className="absolute top-[-10px] left-[73px] size-[248px] rounded-full bg-[linear-gradient(160.25deg,rgb(221_154_95/0.37)_22.1%,rgb(210_138_76/0)_87.42%)]"
        />
        <div className="relative px-4 pt-[5.5px]">
          <p className="text-xs leading-4 font-medium">Bem-vindo à Kurio</p>
          <p className="mt-1.5 text-lg leading-[29px] font-bold whitespace-pre-line">
            {'SEJA DONO DA\nCULTURA DIGITAL'}
          </p>
          <p className="mt-1.5 w-[min(188px,calc(100%-98px))] text-xs leading-[18px] text-muted-foreground">
            Descubra NFTs selecionados de criadores do mundo todo.
          </p>
          <a
            href="#catalogo"
            className="flex items-center gap-2 text-xs leading-[14px] font-bold text-texto-destaque"
          >
            <span className="w-[58px]">EXPLORAR</span>
            <IconeSetaDireitaPequena className="text-primary" />
          </a>
        </div>
        <ImagemNft
          url={ARTE_PRINCIPAL}
          sizes="138px"
          width={138}
          height={138}
          alt=""
          className="absolute top-[10.5px] right-4 aspect-square w-[clamp(90px,calc(100%-228px),138px)] rounded-2xl object-cover"
        />
        <PontosCarrossel className="absolute bottom-[5.5px] left-1/2 -translate-x-1/2 gap-1.5 [&>span]:size-[7px]" />
      </section>
    </>
  );
}
