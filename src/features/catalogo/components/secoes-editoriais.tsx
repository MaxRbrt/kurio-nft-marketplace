import { IconeSetaDireita, IconeSetaTexto } from '@/components/icones/icones';
import { AcaoIndisponivel } from '@/components/layout/acao-indisponivel';
import { ImagemNft } from './imagem-nft';

// ====================================================================
// 1. PROMOÇÕES
// Dois cartões de 586 x 250 do frame, com os recuos do primeiro: no frame
// o segundo difere de 4 a 9 px, desvio documentado no ARCHITECTURE.md.
// A arte mantém o corte de cada cartão. O botão leva à grade do catálogo.
// ====================================================================
const PROMOCOES = [
  {
    titulo: 'Lançamentos gênesis\nde edição limitada',
    texto: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    imagem: '/nfts/arte-1-640.webp',
    largura: 292,
    esquerda: -5,
  },
  {
    titulo: 'Arte digital selecionada\ne muito mais',
    texto: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    imagem: '/nfts/arte-3-640.webp',
    largura: 287,
    esquerda: 2,
  },
];

export function Promocoes() {
  return (
    <section
      aria-label="Promoções"
      className="mx-auto mt-24 hidden w-full max-w-[1200px] gap-7 px-4 lg:flex xl:px-0"
    >
      {PROMOCOES.map((promocao) => (
        <article
          key={promocao.imagem}
          data-testid="promocao"
          className="relative h-[250px] flex-1 overflow-hidden rounded-lg bg-card"
        >
          <ImagemNft
            url={promocao.imagem}
            sizes="292px"
            width={promocao.largura}
            height={250}
            alt=""
            loading="lazy"
            style={{ left: promocao.esquerda, width: promocao.largura }}
            className="absolute top-0 h-[250px] rounded-[18px] object-cover"
          />
          <div
            aria-hidden
            className="absolute top-[142px] left-[-191px] size-64 rounded-full border-2 border-primary"
          />
          <div
            aria-hidden
            className="absolute top-[134px] left-[-199px] size-64 rounded-full border border-primary"
          />
          <h2 className="absolute top-[37px] right-[30px] text-right text-lg leading-6 font-bold whitespace-pre-line">
            {promocao.titulo}
          </h2>
          <p className="absolute top-[94px] right-[30px] w-[263px] text-right text-sm leading-6 text-muted-foreground">
            {promocao.texto}
          </p>
          <a
            href="#catalogo"
            className="absolute right-[30px] bottom-[46px] flex h-10 w-[140px] items-center justify-center rounded-md bg-primary text-sm leading-5 font-medium text-primary-foreground hover:bg-primaria-clara"
          >
            <span className="w-[68px]">Explorar</span>
            <IconeSetaDireita />
          </a>
        </article>
      ))}
    </section>
  );
}

// ====================================================================
// 2. DIÁRIO DA CUNHAGEM
// Conteúdo editorial fora da entrega: "Ler mais" avisa que está
// indisponível, em vez de aparentar que abre o artigo.
// ====================================================================
const ARTIGOS = [
  {
    meta: '12 de setembro  |  Leitura de 6 min',
    titulo: 'Como funciona a propriedade de NFTs',
    texto: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    imagem: '/nfts/arte-3-640.webp',
  },
  {
    meta: '13 de setembro  |  Leitura de 2 min',
    titulo: '10 artistas digitais para acompanhar',
    texto: 'Conheça criadores que moldam a cultura digital.',
    imagem: '/nfts/arte-1-640.webp',
  },
  {
    meta: '15 de setembro  |  Leitura de 3 min',
    titulo: 'Raridade, atributos e procedência',
    texto: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    imagem: '/nfts/arte-2-640.webp',
  },
  {
    meta: '15 de setembro  |  Leitura de 2 min',
    titulo: 'Como proteger sua carteira',
    texto: 'Proteja sua carteira, seus ativos e sua identidade.',
    imagem: '/nfts/arte-4-640.webp',
  },
];

export function DiarioCunhagem() {
  return (
    <section
      aria-labelledby="diario-titulo"
      className="mx-auto mt-24 hidden w-full max-w-[1200px] px-4 lg:block xl:px-0"
    >
      <h2 id="diario-titulo" className="text-center text-[28px] leading-[37px] font-bold">
        Diário da Cunhagem
      </h2>
      <p className="mt-3 text-center text-sm leading-[18px] text-muted-foreground">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>
      <ul className="mt-10 flex flex-wrap gap-6">
        {ARTIGOS.map((artigo) => (
          <li
            key={artigo.titulo}
            data-testid="artigo"
            className="h-[369px] w-[268px] overflow-hidden rounded-lg bg-card"
          >
            <ImagemNft
              url={artigo.imagem}
              sizes="268px"
              width={268}
              height={195}
              alt=""
              loading="lazy"
              className="h-[195px] w-[268px] object-cover"
            />
            <div className="px-4 pt-3">
              <p className="text-xs leading-4 font-medium whitespace-pre-wrap text-muted-foreground">
                {artigo.meta}
              </p>
              <h3 className="mt-2 text-base leading-[21px] font-bold">{artigo.titulo}</h3>
              <p className="mt-2 text-xs leading-4 font-medium text-muted-foreground">
                {artigo.texto}
              </p>
              <AcaoIndisponivel className="mt-2 flex cursor-not-allowed items-start gap-1 text-xs text-texto-destaque">
                <span className="leading-[14px] font-bold">Ler mais</span>
                <span aria-hidden className="relative h-4 w-3">
                  <IconeSetaTexto className="absolute top-[7.49px] left-[1.85px]" />
                </span>
              </AcaoIndisponivel>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
