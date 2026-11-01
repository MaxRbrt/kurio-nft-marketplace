import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useRef, type ReactNode } from 'react';
import { Rodape } from '@/components/layout/rodape';
import { obterNft } from '@/features/catalogo/api/detalhe';
import { VitrineNfts } from '@/features/catalogo/components/vitrine-nfts';
import { useCarrinho } from '../usar-carrinho';
import { useResumoCompra } from '../usar-cotacao';
import { CabecalhoMobile, Trilha } from './cabecalho-compra';
import { ListaCarrinhoMobile, TabelaCarrinho } from './itens-carrinho';
import { ResumoDesktop, ResumoMobile } from './resumo-carrinho';

// ====================================================================
// 1. COLECIONADORES TAMBÉM VIRAM
// Relacionados do primeiro item, que reproduz os cinco NFTs do frame,
// inclusive os que já estão no carrinho. Falha na vitrine não atrapalha
// a compra: a seção só some.
// ====================================================================
function Sugestoes({ nftId }: { nftId: string }) {
  const consulta = useQuery({
    queryKey: ['nfts', 'detalhe', nftId],
    queryFn: ({ signal }) => obterNft(nftId, signal),
  });

  if (consulta.isError) {
    return null;
  }

  return (
    <VitrineNfts
      titulo="Colecionadores também viram"
      variante="carrinho"
      nfts={consulta.data?.relacionados}
    />
  );
}

// ====================================================================
// 2. ESTADOS SEM LISTA
// Vazio e erro não têm frame: seguem o padrão visual, com o cabeçalho de
// cada tamanho de tela. Erro de carga oferece nova tentativa.
// ====================================================================
function MensagemCarrinho({ children }: { children: ReactNode }) {
  return (
    <main>
      <div className="mx-auto mt-8 hidden max-w-[1200px] px-4 lg:block xl:px-0">
        <Trilha atual="Carrinho" />
        <h1 className="mt-3 text-2xl font-bold">Carrinho de NFTs</h1>
      </div>
      <div className="mx-auto max-w-[414px] px-7 pt-8 lg:hidden">
        <CabecalhoMobile titulo="Carrinho de NFTs" recuo="left-24" />
      </div>
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-4 text-center">
        {children}
      </div>
    </main>
  );
}

// ====================================================================
// 3. TELA DO CARRINHO
// Uma estrutura para os dois frames, trocada por CSS. A remoção devolve
// o foco ao conteúdo, para quem usa teclado não ficar sem posição. Cupom
// na URL com replace: aplicar não enche o histórico.
// ====================================================================
export function PaginaCarrinho({ cupom }: { cupom?: string }) {
  const navigate = useNavigate({ from: '/carrinho' });
  const conteudo = useRef<HTMLElement>(null);
  const carrinho = useCarrinho();
  const itens = carrinho.data?.itens;
  const temItens = Boolean(itens?.length);
  const trocarCupom = useCallback(
    (codigo: string | undefined) => void navigate({ search: { cupom: codigo }, replace: true }),
    [navigate],
  );
  const resumo = useResumoCompra({ cupom, habilitada: temItens, trocarCupom });
  const focarConteudo = () => conteudo.current?.focus({ preventScroll: true });

  if (carrinho.isError) {
    return (
      <MensagemCarrinho>
        <div role="alert" data-testid="carrinho-erro">
          <p>Não foi possível carregar o carrinho.</p>
          <button
            type="button"
            onClick={() => void carrinho.refetch()}
            className="mt-4 h-10 rounded-md bg-primary px-4 font-bold text-primary-foreground"
          >
            Tentar novamente
          </button>
        </div>
      </MensagemCarrinho>
    );
  }

  if (itens && !temItens) {
    return (
      <MensagemCarrinho>
        <p data-testid="carrinho-vazio">Seu carrinho está vazio.</p>
        <Link to="/" className="text-texto-destaque underline">
          Continuar explorando
        </Link>
      </MensagemCarrinho>
    );
  }

  return (
    <>
      <main ref={conteudo} tabIndex={-1} aria-busy={carrinho.isPending} className="outline-none">
        <div className="mx-auto mt-8 hidden w-full max-w-[1200px] px-4 lg:block xl:px-0">
          <Trilha atual="Carrinho" />
          <h1 className="sr-only">Carrinho de NFTs</h1>
          <div className="mt-3 flex flex-col gap-10 xl:flex-row xl:justify-between xl:gap-0">
            <TabelaCarrinho itens={itens} aoRemover={focarConteudo} />
            <ResumoDesktop resumo={resumo} />
          </div>
          {itens && <Sugestoes nftId={itens[0].nftId} />}
        </div>

        <div className="mx-auto flex min-h-dvh max-w-[414px] flex-col lg:hidden">
          <div className="px-7 pt-8 pb-1.5">
            <CabecalhoMobile titulo="Carrinho de NFTs" recuo="left-24" />
            <div className="mt-3">
              <ListaCarrinhoMobile itens={itens} aoRemover={focarConteudo} />
            </div>
          </div>
          <ResumoMobile resumo={resumo} />
        </div>
      </main>
      <div className="hidden lg:block">
        <Rodape />
      </div>
    </>
  );
}
