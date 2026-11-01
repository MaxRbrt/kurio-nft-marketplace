import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import {
  IconeBusca,
  IconeCarrinhoCompra,
  IconeEstrela,
  IconeEstrelaPequena,
  IconeFavorito,
  IconeLinkedinPequeno,
  IconeMais,
  IconeMenos,
  IconeMensagem,
  IconeTwitterPequeno,
  IconeVoltarDetalhe,
} from '@/components/icones/icones';
import { AcaoIndisponivel } from '@/components/layout/acao-indisponivel';
import { Rodape } from '@/components/layout/rodape';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { Edicao, NftDetalhe } from '@/contracts/catalogo/nfts';
import { BotaoQuantidade } from '@/features/compra/components/botao-quantidade';
import { useAdicionarAoCarrinho } from '@/features/compra/usar-carrinho';
import { ErroApi } from '@/lib/api/erros';
import { cn } from '@/lib/utils';
import { obterNft } from '../api/detalhe';
import { useFavorito } from '../usar-favoritos';
import { ImagemNft } from './imagem-nft';
import { VitrineNfts } from './vitrine-nfts';

// ====================================================================
// 1. ESTADO DA COMPRA
// Edição e quantidade valem para desktop e mobile. Começa na primeira
// edição disponível, e trocar de edição respeita o estoque dela.
// ====================================================================
function useCompra(nft: NftDetalhe) {
  const navigate = useNavigate();
  const adicionar = useAdicionarAoCarrinho();
  const inicial = nft.edicoes.find((edicao) => edicao.id === nft.edicaoInicialId);
  const primeiraDisponivel = inicial?.disponivel
    ? inicial
    : (nft.edicoes.find((edicao) => edicao.disponivel > 0) ?? nft.edicoes[0]);
  const [edicaoId, setEdicaoId] = useState(primeiraDisponivel.id);
  const [quantidade, setQuantidade] = useState(1);
  const edicao = nft.edicoes.find((candidata) => candidata.id === edicaoId) ?? primeiraDisponivel;
  const esgotada = edicao.disponivel === 0;

  function escolherEdicao(escolhida: Edicao) {
    setEdicaoId(escolhida.id);
    setQuantidade((atual) => Math.max(1, Math.min(atual, escolhida.disponivel)));
  }

  const entrada = { nftId: nft.id, edicaoId: edicao.id, quantidade };

  return {
    edicao,
    esgotada,
    quantidade,
    escolherEdicao,
    aumentar: () => setQuantidade((atual) => Math.min(atual + 1, edicao.disponivel)),
    diminuir: () => setQuantidade((atual) => Math.max(atual - 1, 1)),
    ocupado: adicionar.isPending,
    adicionarAoCarrinho: () => adicionar.mutate(entrada),
    comprar: () =>
      adicionar.mutate(entrada, { onSuccess: () => void navigate({ to: '/carrinho' }) }),
  };
}

type Compra = ReturnType<typeof useCompra>;

const LARGURA_EDICAO: Record<Edicao['rotulo'], { normal: string; ativa: string }> = {
  '1/1': { normal: 'w-9', ativa: 'w-10' },
  '1/10': { normal: 'w-[42px]', ativa: 'w-[46px]' },
  '1/50': { normal: 'w-[42px]', ativa: 'w-[46px]' },
  ABERTA: { normal: 'w-[66px]', ativa: 'w-[70px]' },
};

// ====================================================================
// 2. PARTES COMPARTILHADAS
// Edição e dados do token são iguais nos dois frames. Selecionada ganha
// 4 px, como a 1/50 do frame, sem cortar rótulo maior. Edição esgotada
// fica riscada e desabilitada, sem depender só da cor.
// ====================================================================
function SeletorEdicao({ nft, compra }: { nft: NftDetalhe; compra: Compra }) {
  return (
    <fieldset>
      <legend className="text-[15px] leading-4 font-bold">Edição:</legend>
      <div className="mt-2 flex gap-3 lg:mt-3 lg:gap-1.5">
        {nft.edicoes.map((edicao) => {
          const ativa = edicao.id === compra.edicao.id;

          return (
            <button
              key={edicao.id}
              type="button"
              aria-pressed={ativa}
              disabled={edicao.disponivel === 0}
              onClick={() => compra.escolherEdicao(edicao)}
              className={cn(
                'h-7 rounded-full border px-1 text-sm leading-4 disabled:cursor-not-allowed disabled:line-through disabled:opacity-50',
                LARGURA_EDICAO[edicao.rotulo][ativa ? 'ativa' : 'normal'],
                ativa
                  ? 'border-primary font-medium text-texto-destaque'
                  : 'border-border text-muted-foreground',
              )}
            >
              {edicao.rotulo}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function DadosToken({ nft }: { nft: NftDetalhe }) {
  return (
    <div className="flex flex-col gap-3 text-[15px] leading-5 text-secundaria">
      <p>ID do token: {nft.tokenId}</p>
      <p>Coleção: {nft.nomeColecao}</p>
      <p>Atributos: {nft.atributos.join(', ')}</p>
    </div>
  );
}

// ====================================================================
// 3. AVISO DE ESTOQUE
// Esgotada é impedimento, em coral. Limite é só informação, no tom do
// texto secundário. Ocupa o vão entre quantidade e botões, sem encostar.
// ====================================================================
function AvisoEstoque({ compra, className }: { compra: Compra; className?: string }) {
  const noLimite = !compra.esgotada && compra.quantidade >= compra.edicao.disponivel;

  return (
    <p
      role="status"
      data-testid="aviso-estoque"
      className={cn(
        'text-xs leading-4 empty:hidden',
        compra.esgotada ? 'text-texto-coral' : 'text-muted-foreground',
        className,
      )}
    >
      {compra.esgotada && 'Edição indisponível'}
      {noLimite && 'Limite disponível atingido'}
    </p>
  );
}

// ====================================================================
// 4. GALERIA DO DESKTOP
// Miniaturas de 100, com a segunda selecionada como no frame. A lupa abre
// a imagem ampliada em diálogo, com foco preso e fechamento por Esc.
// ====================================================================
function Galeria({ nft }: { nft: NftDetalhe }) {
  const [indice, setIndice] = useState(Math.min(1, nft.imagens.length - 1));
  const [ampliada, setAmpliada] = useState(false);
  const botaoAmpliar = useRef<HTMLButtonElement>(null);
  const imagem = nft.imagens[indice];

  return (
    <div className="flex w-[573px] shrink-0 gap-7">
      <ul className="flex w-[100px] shrink-0 flex-col gap-4">
        {nft.imagens.map((miniatura, posicao) => (
          <li key={posicao} className="rounded-md bg-card">
            <button
              type="button"
              aria-label={`Ver imagem ${posicao + 1} de ${nft.imagens.length}`}
              aria-pressed={posicao === indice}
              onClick={() => setIndice(posicao)}
              className={cn(
                'block size-[100px] overflow-hidden rounded-lg border',
                posicao === indice ? 'border-primary' : 'border-transparent',
              )}
            >
              <ImagemNft
                url={miniatura.url}
                sizes="100px"
                width={100}
                height={100}
                alt=""
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative mt-0.5 size-[444px] shrink-0 rounded-md bg-card p-5">
        <ImagemNft
          url={imagem.url}
          sizes="404px"
          width={404}
          height={404}
          alt={imagem.alt}
          fetchPriority="high"
          className="size-[404px] rounded-3xl object-cover"
        />
        <button
          ref={botaoAmpliar}
          type="button"
          aria-label="Ampliar imagem"
          onClick={() => setAmpliada(true)}
          className="absolute top-[13px] right-3 flex size-[30px] items-center justify-center rounded-full border border-border bg-muted text-foreground"
        >
          <IconeBusca />
        </button>
      </div>

      <Dialog open={ampliada} onOpenChange={setAmpliada}>
        <DialogContent
          classeFundo="bg-black/60"
          className="w-[640px] max-w-[90vw] bg-card p-4 sm:max-w-[640px]"
          onCloseAutoFocus={(evento) => {
            evento.preventDefault();
            botaoAmpliar.current?.focus();
          }}
        >
          <DialogTitle className="text-base">{nft.nome}</DialogTitle>
          <ImagemNft
            url={imagem.url}
            sizes="608px"
            width={608}
            height={608}
            alt={imagem.alt}
            className="w-full rounded-2xl"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====================================================================
// 5. TELA DO DESKTOP
// Coordenadas do frame Desktop / Detalhes. Abaixo de 1200 px as colunas
// empilham, para não haver overflow em larguras sem frame.
// ====================================================================
function ConteudoDesktop({ nft, compra }: { nft: NftDetalhe; compra: Compra }) {
  const { favorito, alternar } = useFavorito(nft.id);
  const [aba, setAba] = useState<'detalhes' | 'avaliacoes'>('detalhes');

  return (
    <div className="hidden lg:block">
      <main className="mx-auto mt-8 w-full max-w-[1200px] px-4 xl:px-0">
        <nav aria-label="Trilha" className="text-[15px] leading-4 font-bold">
          <Link to="/">Início</Link> / <span aria-current="page">Mercado</span>
        </nav>

        <section
          data-testid="detalhe-produto"
          className="mt-3 flex flex-col gap-8 xl:h-[448px] xl:flex-row"
        >
          <Galeria nft={nft} />

          <div data-testid="detalhe-informacoes" className="min-w-0 xl:w-[595px]">
            <h1 className="text-[28px] leading-[37px] font-bold">{nft.nome}</h1>
            <div className="mt-3 flex h-5 items-center justify-between">
              <p
                data-testid="detalhe-preco"
                className="text-[22px] leading-4 font-bold text-texto-destaque"
              >
                {compra.edicao.preco} ETH
              </p>
              <p className="flex items-center gap-1 text-[15px] leading-5">
                <span className="flex gap-1 text-primary" aria-hidden>
                  {Array.from({ length: 5 }, (_, indice) => (
                    <IconeEstrela key={indice} />
                  ))}
                </span>
                <span className="w-[280px]">
                  {nft.avaliacoes.total} avaliações de colecionadores
                </span>
              </p>
            </div>
            <hr className="mt-[11px] w-[573px] max-w-full border-primary/25" />

            <h2 className="mt-[13px] text-[15px] leading-4 font-bold">Sobre este NFT:</h2>
            <p className="mt-3 h-[66px] w-[574px] max-w-full text-sm leading-6 text-muted-foreground">
              {nft.descricao}
            </p>

            <div className="mt-3.5">
              <SeletorEdicao nft={nft} compra={compra} />
            </div>

            <div className="mt-[13px] flex items-start justify-between">
              <div
                role="group"
                aria-label="Quantidade"
                className="flex h-[49.5px] w-[103px] items-center justify-between"
              >
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  disabled={compra.quantidade <= 1}
                  onClick={compra.diminuir}
                  className="flex h-[49.5px] w-[33px] items-center justify-center rounded-[33px] border border-background bg-primary text-black disabled:cursor-not-allowed"
                >
                  <IconeMenos className="size-[26.4px]" />
                </button>
                <output
                  data-testid="detalhe-quantidade"
                  aria-live="polite"
                  className="text-xl leading-7"
                >
                  {compra.quantidade}
                </output>
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  disabled={compra.esgotada || compra.quantidade >= compra.edicao.disponivel}
                  onClick={compra.aumentar}
                  className="flex h-[49.5px] w-[33px] items-center justify-center rounded-[33px] border border-background bg-primary text-black disabled:opacity-50"
                >
                  <IconeMais className="size-[26.4px]" />
                </button>
              </div>

              <AvisoEstoque compra={compra} className="mt-3 flex-1 px-3 text-center" />

              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  disabled={compra.esgotada || compra.ocupado}
                  onClick={compra.comprar}
                  className="h-10 w-[130px] rounded-md bg-primary text-sm leading-5 font-bold text-primary-foreground hover:bg-primaria-clara disabled:opacity-50"
                >
                  COMPRAR
                </button>
                <button
                  type="button"
                  aria-pressed={favorito}
                  onClick={alternar}
                  className="flex h-10 w-[130px] items-center justify-center gap-2 rounded-md border border-primary text-sm leading-5 font-medium text-texto-destaque"
                >
                  <IconeFavorito ativo={favorito} className="text-primary" />
                  Favoritar
                </button>
              </div>
            </div>

            <div className="mt-[13.5px]">
              <DadosToken nft={nft} />
            </div>

            <div className="mt-3 flex h-[18px] items-center gap-2">
              <span className="w-[199px] text-[15px] leading-4 font-bold">
                Compartilhar este NFT:
              </span>
              <AcaoIndisponivel
                aria-label="Compartilhar no LinkedIn"
                className="cursor-not-allowed"
              >
                <IconeLinkedinPequeno />
              </AcaoIndisponivel>
              <AcaoIndisponivel
                aria-label="Compartilhar por mensagem"
                className="cursor-not-allowed"
              >
                <IconeMensagem />
              </AcaoIndisponivel>
              <AcaoIndisponivel aria-label="Compartilhar no X" className="cursor-not-allowed">
                <IconeTwitterPequeno />
              </AcaoIndisponivel>
            </div>
          </div>
        </section>

        <section className="mt-24" aria-label="Mais informações">
          <div role="tablist" className="flex h-7 items-start gap-8 border-b border-primary/25">
            <button
              type="button"
              role="tab"
              id="aba-detalhes"
              aria-selected={aba === 'detalhes'}
              aria-controls="painel-nft"
              onClick={() => setAba('detalhes')}
              className={cn(
                'relative flex h-7 w-[161px] items-start text-left text-[17px] leading-4',
                aba === 'detalhes'
                  ? "font-bold text-texto-destaque after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-primary after:content-['']"
                  : '',
              )}
            >
              Detalhes do NFT
            </button>
            <button
              type="button"
              role="tab"
              id="aba-avaliacoes"
              aria-selected={aba === 'avaliacoes'}
              aria-controls="painel-nft"
              onClick={() => setAba('avaliacoes')}
              className={cn(
                'relative flex h-7 w-[337px] items-start text-left text-[17px] leading-4',
                aba === 'avaliacoes'
                  ? "font-bold text-texto-destaque after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-primary after:content-['']"
                  : '',
              )}
            >
              Avaliações de colecionadores ({nft.avaliacoes.total})
            </button>
          </div>

          <div
            id="painel-nft"
            role="tabpanel"
            aria-labelledby={aba === 'detalhes' ? 'aba-detalhes' : 'aba-avaliacoes'}
            className="mt-3 text-sm leading-6 text-muted-foreground"
          >
            {aba === 'detalhes' ? (
              <>
                <p className="whitespace-pre-line">{nft.descricaoCompleta}</p>
                <h3 className="mt-3 font-bold text-foreground">Rede:</h3>
                <p>{nft.textoRede}</p>
                <h3 className="mt-3 font-bold text-foreground">Contrato:</h3>
                <p>{nft.direitosAutorais}</p>
                <h3 className="mt-3 font-bold text-foreground">Direitos autorais:</h3>
                <p>{nft.contrato}</p>
              </>
            ) : (
              <p>
                {nft.avaliacoes.total} avaliações de colecionadores, com nota média{' '}
                {nft.avaliacoes.nota}.
              </p>
            )}
          </div>
        </section>

        <VitrineNfts titulo="Mais desta coleção" nfts={nft.relacionados} variante="detalhe" />
      </main>
      <Rodape />
    </div>
  );
}

// ====================================================================
// 6. TELA DO MOBILE
// Medidas do frame Mobile / Detalhes: imagem, painel sobreposto e barra
// de compra fixa no rodapé da tela, sem a barra de navegação.
// ====================================================================
function ConteudoMobile({ nft, compra }: { nft: NftDetalhe; compra: Compra }) {
  const { favorito, alternar } = useFavorito(nft.id);
  const navigate = useNavigate();
  const classeRedonda =
    'flex size-[35px] items-center justify-center rounded-full border border-border bg-muted text-texto-destaque';

  return (
    <main data-testid="detalhe-mobile" className="mx-auto max-w-[414px] lg:hidden">
      <div className="relative h-[506px] bg-linear-to-b from-card to-muted px-7 pt-[23px]">
        <div className="flex justify-between">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => void navigate({ to: '/' })}
            className={classeRedonda}
          >
            <IconeVoltarDetalhe className="text-secundaria" />
          </button>
          <button
            type="button"
            aria-label="Favoritar"
            aria-pressed={favorito}
            onClick={alternar}
            className={classeRedonda}
          >
            <IconeFavorito ativo={favorito} className="size-4" />
          </button>
        </div>
        <ImagemNft
          url={nft.imagem.url}
          sizes="361px"
          width={361}
          height={356}
          alt={nft.imagem.alt}
          fetchPriority="high"
          className="mt-2 h-[356px] w-full rounded-3xl object-cover"
        />
      </div>

      <section
        data-testid="detalhe-painel"
        className="relative z-10 -mt-[114px] min-h-[504px] rounded-t-[31px] bg-card px-6 pt-8 pb-[176px]"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-xl leading-4 font-bold">{nft.nome}</h1>
          <p className="relative mr-[2.42px] h-[27px] w-[80.16px] shrink-0 rounded-[32px] border border-primary text-sm leading-4">
            <IconeEstrelaPequena className="absolute top-[5px] left-[4.58px] text-ambar" />
            <span className="absolute top-[5px] left-[22.58px] font-medium">
              {nft.avaliacoes.nota}
            </span>
            <span className="absolute top-[5px] left-[47.58px] text-muted-foreground">
              ({nft.avaliacoes.total})
            </span>
          </p>
        </div>
        <p className="mt-3 h-[71px] text-sm leading-6 text-muted-foreground">
          {nft.descricaoCurta}
        </p>
        <div className="mt-3">
          <SeletorEdicao nft={nft} compra={compra} />
        </div>
        <AvisoEstoque compra={compra} className="mt-2" />
        <div className="mt-3">
          <DadosToken nft={nft} />
        </div>
      </section>

      <div
        data-testid="barra-compra"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto h-[164px] max-w-[414px] rounded-t-[40px] bg-card px-6 pt-5 shadow-[0_0_20px_rgba(10,6,4,0.45)]"
      >
        <div className="flex h-[30px] items-center justify-between">
          <div role="group" aria-label="Quantidade" className="flex items-center gap-2">
            <span className="text-[15px] leading-4 font-medium text-muted-foreground">Qtd.</span>
            <div className="flex items-center gap-3">
              <BotaoQuantidade
                acao="diminuir"
                disabled={compra.quantidade <= 1}
                onClick={compra.diminuir}
              />
              <output
                aria-live="polite"
                className="w-[11px] text-center text-lg leading-[25px] font-medium"
              >
                {compra.quantidade}
              </output>
              <BotaoQuantidade
                acao="aumentar"
                disabled={compra.esgotada || compra.quantidade >= compra.edicao.disponivel}
                onClick={compra.aumentar}
              />
            </div>
          </div>
          <p
            data-testid="detalhe-preco-mobile"
            className="text-xl leading-4 font-bold text-texto-destaque"
          >
            {compra.edicao.preco} ETH
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={compra.esgotada || compra.ocupado}
            onClick={compra.comprar}
            className="h-[60px] w-[196px] rounded-[40px] bg-[linear-gradient(100.37deg,rgb(210_138_76)_-3.96%,rgb(210_138_76/0.8)_121.97%)] pr-[45px] pl-[47px] text-base leading-5 font-bold whitespace-nowrap text-primary-foreground disabled:opacity-50"
          >
            Comprar NFT
          </button>
          <button
            type="button"
            aria-label="Adicionar ao carrinho"
            disabled={compra.esgotada || compra.ocupado}
            onClick={compra.adicionarAoCarrinho}
            className="flex size-[60px] items-center justify-center rounded-[40px] border border-border bg-muted text-secundaria disabled:opacity-50"
          >
            <IconeCarrinhoCompra />
          </button>
        </div>
      </div>
    </main>
  );
}

function DetalheCarregado({ nft }: { nft: NftDetalhe }) {
  const compra = useCompra(nft);

  return (
    <>
      <ConteudoDesktop nft={nft} compra={compra} />
      <ConteudoMobile nft={nft} compra={compra} />
    </>
  );
}

// ====================================================================
// 7. CARREGAMENTO, ERRO E INEXISTENTE
// Skeleton nas dimensões do frame, para não haver salto de layout. A
// chave por id faz cada NFT começar com a própria seleção.
// ====================================================================
export function PaginaDetalhe({ nftId }: { nftId: string }) {
  const consulta = useQuery({
    queryKey: ['nfts', 'detalhe', nftId],
    queryFn: ({ signal }) => obterNft(nftId, signal),
  });

  if (consulta.isPending) {
    return (
      <main
        aria-busy="true"
        data-testid="detalhe-esqueleto"
        className="mx-auto mt-8 flex w-full max-w-[1200px] gap-[33px] px-4 xl:px-0"
      >
        <div className="esqueleto h-[356px] w-full rounded-3xl lg:size-[444px]" />
        <div className="hidden flex-1 flex-col gap-4 lg:flex">
          <div className="esqueleto h-[37px] w-2/3" />
          <div className="esqueleto h-5 w-1/4" />
          <div className="esqueleto h-[66px]" />
          <div className="esqueleto h-[50px]" />
        </div>
      </main>
    );
  }

  if (consulta.isError) {
    const naoEncontrado = consulta.error instanceof ErroApi && consulta.error.status === 404;

    return (
      <main className="mx-auto flex min-h-[60dvh] max-w-[1200px] flex-col items-center justify-center gap-4 px-4 text-center">
        {naoEncontrado ? (
          <>
            <h1 className="text-2xl font-bold">NFT não encontrado</h1>
            <Link to="/" className="text-texto-destaque underline">
              Voltar para o início
            </Link>
          </>
        ) : (
          <div role="alert" data-testid="detalhe-erro">
            <p>Não foi possível carregar este NFT.</p>
            <button
              type="button"
              onClick={() => void consulta.refetch()}
              className="mt-4 h-10 rounded-md bg-primary px-4 font-bold text-primary-foreground"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </main>
    );
  }

  return <DetalheCarregado key={consulta.data.id} nft={consulta.data} />;
}
