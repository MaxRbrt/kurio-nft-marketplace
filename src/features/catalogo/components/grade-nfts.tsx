import { Link } from '@tanstack/react-router';
import { ChevronRight, Heart } from 'lucide-react';
import { AcaoIndisponivel } from '@/components/layout/acao-indisponivel';
import { ErroApi } from '@/lib/api/erros';
import type { NftResumo } from '@/contracts/catalogo/nfts';
import { useFiltrosCatalogo, useListaNfts } from '../usar-catalogo';
import { ImagemNft } from './imagem-nft';

const TAMANHO_PAGINA_LAYOUT = 9;

// ====================================================================
// 1. CARTÃO DO NFT
// Medidas do frame: 258 x 300 no desktop e 175 x 200 no mobile. O selo
// RARO e o favorito só aparecem no frame mobile, então seguem assim.
// ====================================================================
function CartaoNft({ nft, prioridade }: { nft: NftResumo; prioridade: boolean }) {
  return (
    <li data-testid="cartao-nft" className="relative">
      <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="block">
        <div className="relative flex h-[200px] items-center justify-center rounded-[20px] bg-linear-to-b from-card to-muted lg:h-[300px] lg:rounded-none lg:bg-card lg:bg-none">
          <ImagemNft
            url={nft.imagem.url}
            sizes="(min-width: 1024px) 250px, 168px"
            width={250}
            height={250}
            alt={nft.imagem.alt}
            loading={prioridade ? 'eager' : 'lazy'}
            className="size-[168px] rounded-2xl object-cover lg:aspect-square lg:size-auto lg:w-[calc(100%-8px)] lg:rounded-[15px]"
          />
          {nft.raro && (
            <span className="absolute top-4 left-0 flex h-8 w-[68px] items-center justify-center bg-primary text-[13px] leading-4 font-medium text-primary-foreground lg:hidden">
              RARO
            </span>
          )}
        </div>
        <h3
          data-testid="cartao-nome"
          className="mt-2 truncate pl-2 text-[15px] leading-5 lg:mt-3 lg:pl-0 lg:text-base lg:leading-4"
        >
          {nft.nome}
        </h3>
        <p className="pl-2 lg:mt-1.5 lg:flex lg:gap-3 lg:pl-0">
          <span
            data-testid="cartao-preco"
            className="text-base leading-4 font-bold text-texto-destaque lg:text-lg"
          >
            {nft.preco} ETH
          </span>
          {nft.precoAnterior && (
            <s className="ml-2 text-sm leading-4 text-secundaria lg:ml-0 lg:text-lg">
              <span className="sr-only">Preço anterior: </span>
              {nft.precoAnterior} ETH
            </s>
          )}
        </p>
      </Link>
      <AcaoIndisponivel
        aria-label={`Favoritar ${nft.nome}`}
        className="absolute top-3 right-[10px] flex size-7 items-center justify-center rounded-full border border-border bg-muted lg:hidden"
      >
        <Heart aria-hidden className="size-3.5 text-texto-destaque" />
      </AcaoIndisponivel>
    </li>
  );
}

// ====================================================================
// 2. ESTADOS DE CARREGAMENTO, VAZIO E ERRO
// O skeleton tem as dimensões do cartão, para não haver salto de layout.
// Falha mostra como tentar de novo, e o estado é anunciado.
// ====================================================================
function GradeEsqueleto() {
  return (
    <ul
      aria-hidden
      data-testid="grade-esqueleto"
      className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3 lg:gap-x-[34px] lg:gap-y-[72px]"
    >
      {Array.from({ length: TAMANHO_PAGINA_LAYOUT }, (_, indice) => (
        <li key={indice}>
          <div className="esqueleto h-[200px] rounded-[20px] lg:h-[300px] lg:rounded-none" />
          <div className="esqueleto mt-2 h-5 w-3/4 lg:mt-3 lg:h-4" />
          <div className="esqueleto mt-1.5 h-4 w-1/3" />
        </li>
      ))}
    </ul>
  );
}

function Paginacao({ pagina, totalPaginas }: { pagina: number; totalPaginas: number }) {
  const { irParaPagina } = useFiltrosCatalogo();
  const paginas = Array.from({ length: totalPaginas }, (_, indice) => indice + 1);

  if (totalPaginas <= 1) {
    return null;
  }

  return (
    <nav aria-label="Paginação" className="mt-[88px] flex justify-end gap-2">
      {paginas.map((numero) => (
        <button
          key={numero}
          type="button"
          aria-label={`Página ${numero}`}
          aria-current={numero === pagina ? 'page' : undefined}
          onClick={() => irParaPagina(numero)}
          className={`size-[35px] rounded text-lg leading-4 ${
            numero === pagina
              ? 'bg-primary font-bold text-primary-foreground'
              : 'border border-border text-foreground'
          }`}
        >
          {numero}
        </button>
      ))}
      <button
        type="button"
        aria-label="Próxima página"
        disabled={pagina >= totalPaginas}
        onClick={() => irParaPagina(pagina + 1)}
        className="flex size-[35px] items-center justify-center rounded border border-border text-foreground disabled:opacity-40"
      >
        <ChevronRight aria-hidden className="size-[18px]" />
      </button>
    </nav>
  );
}

// ====================================================================
// 3. GRADE
// Desktop em 3 colunas. No mobile, 2 colunas com a direita 32 px abaixo,
// como no frame. Só a primeira linha é prioritária, para o LCP.
// ====================================================================
export function GradeNfts() {
  const consulta = useListaNfts();
  const { alterarFiltros } = useFiltrosCatalogo();

  if (consulta.isPending) {
    return <GradeEsqueleto />;
  }

  if (consulta.isError) {
    const codigo = consulta.error instanceof ErroApi ? consulta.error.codigo : 'DESCONHECIDO';

    return (
      <div role="alert" data-testid="nfts-erro" data-codigo={codigo} className="bg-card p-8">
        <p className="text-base">Não foi possível carregar os NFTs.</p>
        <button
          type="button"
          onClick={() => void consulta.refetch()}
          className="mt-4 h-10 rounded-md bg-primary px-4 font-bold text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const { itens, paginacao } = consulta.data;

  if (itens.length === 0) {
    return (
      <div role="status" data-testid="nfts-vazio" className="bg-card p-8">
        <p className="text-base">Nenhum NFT encontrado.</p>
        <button
          type="button"
          onClick={() =>
            alterarFiltros({
              busca: undefined,
              categorias: undefined,
              redes: undefined,
              precoMinimo: undefined,
              precoMaximo: undefined,
              aba: undefined,
            })
          }
          className="mt-4 h-10 rounded-md bg-primary px-4 font-bold text-primary-foreground"
        >
          Limpar filtros
        </button>
      </div>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3 lg:gap-x-[34px] lg:gap-y-[72px] max-lg:[&>li:nth-child(even)]:translate-y-8">
        {itens.map((nft, indice) => (
          <CartaoNft key={nft.id} nft={nft} prioridade={indice < 3} />
        ))}
      </ul>
      <Paginacao pagina={paginacao.pagina} totalPaginas={paginacao.totalPaginas} />
    </>
  );
}
