import { Link } from '@tanstack/react-router';
import { IconeLixeira } from '@/components/icones/icones';
import type { ItemCarrinho } from '@/contracts/compra/carrinho';
import { ImagemNft } from '@/features/catalogo/components/imagem-nft';
import { formatarEth } from '@/lib/eth';
import { useItemCarrinho } from '../usar-carrinho';
import { BotaoQuantidade } from './botao-quantidade';

const TOTAL_ESQUELETOS = 3;
const COLUNAS_DESKTOP =
  'grid grid-cols-[250px_77px_75px_87px_24px] items-center justify-between pr-6';

function textoEstoque(item: ItemCarrinho) {
  return item.disponivel === 0 ? 'Edição esgotada' : `Só ${item.disponivel} disponível`;
}

type PropsItem = { item: ItemCarrinho; aoRemover: () => void };
type PropsLinha = PropsItem & { mostrarEdicao: boolean };
type PropsItens = { itens?: ItemCarrinho[]; aoRemover: () => void };

// ====================================================================
// 1. LINHA DO DESKTOP
// Colunas nas posições do frame (431,25; 569,5; 705,75 e 854). Estoque
// abaixo do pedido troca o ID do token por um aviso em texto, sem
// depender só de cor, e finalizar fica bloqueado pela cotação. O mesmo
// NFT em duas edições mostra a edição, para as linhas não ficarem iguais.
// ====================================================================
function LinhaDesktop({ item, aoRemover, mostrarEdicao }: PropsLinha) {
  const acoes = useItemCarrinho(item, aoRemover);

  return (
    <tr role="row" data-testid="item-carrinho" className={`${COLUNAS_DESKTOP} h-[70px] bg-card`}>
      <td role="cell" className="flex items-center gap-4">
        <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="shrink-0">
          <ImagemNft
            url={item.imagemUrl}
            sizes="70px"
            width={70}
            height={70}
            alt={item.nome}
            className="size-[70px] rounded-md object-cover"
          />
        </Link>
        <div className="w-[215px] shrink-0">
          <p className="truncate text-base leading-4 font-bold">{item.nome}</p>
          {acoes.acimaDoEstoque ? (
            <p role="status" className="mt-1.5 text-sm leading-4 text-texto-coral">
              {textoEstoque(item)}
            </p>
          ) : (
            <p className="mt-1.5 text-sm leading-4 text-secundaria">
              {mostrarEdicao ? `Edição: ${item.rotuloEdicao}` : `ID do token: ${item.tokenId}`}
            </p>
          )}
        </div>
      </td>
      <td
        role="cell"
        className="text-base leading-4 font-bold whitespace-nowrap text-muted-foreground"
      >
        {formatarEth(item.precoUnitario)}
      </td>
      <td role="cell" className="flex items-center justify-between">
        <BotaoQuantidade
          disabled={!acoes.podeDiminuir}
          onClick={acoes.diminuir}
          acao="diminuir"
          aria-label={`Diminuir quantidade de ${item.nome}`}
        />
        <output
          aria-live="polite"
          data-testid="item-quantidade"
          className="flex w-[11px] justify-center text-[17px] leading-6"
        >
          {item.quantidade}
        </output>
        <BotaoQuantidade
          disabled={!acoes.podeAumentar}
          onClick={acoes.aumentar}
          acao="aumentar"
          aria-label={`Aumentar quantidade de ${item.nome}`}
        />
      </td>
      <td
        role="cell"
        data-testid="item-total"
        className="text-base leading-4 font-bold whitespace-nowrap text-texto-destaque"
      >
        {formatarEth(item.subtotal)}
      </td>
      <td role="cell" className="flex">
        <button
          type="button"
          aria-label={`Remover ${item.nome} do carrinho`}
          disabled={acoes.ocupado}
          onClick={acoes.remover}
          className="text-secundaria hover:text-primary disabled:opacity-50"
        >
          <IconeLixeira />
        </button>
      </td>
    </tr>
  );
}

// ====================================================================
// 2. TABELA DO DESKTOP
// Cabeçalho com os pesos do frame. Sem itens ainda: linhas em skeleton
// de 70 px, para não haver salto de layout ao carregar.
// ====================================================================
export function TabelaCarrinho({ itens, aoRemover }: PropsItens) {
  return (
    <table role="table" aria-label="NFTs no carrinho" className="block w-full xl:w-[782px]">
      <thead role="rowgroup" className="block">
        <tr
          role="row"
          className={`${COLUNAS_DESKTOP} h-7 items-start border-b border-primary/25 text-base leading-4`}
        >
          <th role="columnheader" className="text-left font-bold">
            NFTs
          </th>
          <th role="columnheader" className="text-left font-medium">
            Preço
          </th>
          <th role="columnheader" className="text-left font-bold">
            Edições
          </th>
          <th role="columnheader" className="text-left font-medium">
            Total
          </th>
          <th role="columnheader">
            <span className="sr-only">Ações</span>
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup" className="mt-3 flex flex-col gap-3">
        {itens?.map((item) => (
          <LinhaDesktop
            key={item.id}
            item={item}
            aoRemover={aoRemover}
            mostrarEdicao={itens.filter(({ nftId }) => nftId === item.nftId).length > 1}
          />
        ))}
        {!itens &&
          Array.from({ length: TOTAL_ESQUELETOS }, (_, indice) => (
            <tr key={indice} role="row" data-testid="item-esqueleto" className="block">
              <td role="cell" className="esqueleto block h-[70px]" />
            </tr>
          ))}
      </tbody>
    </table>
  );
}

// ====================================================================
// 3. CARTÃO DO MOBILE
// Medidas do frame. O preço do cartão é o total do item, como no frame.
// Botões presos à direita, para caberem em telas menores que o frame.
// Passo entre cartões uniforme e lixeira em todos eles, acima do "+":
// o frame a desenha só em um cartão, sobre o botão (ver ARCHITECTURE.md).
// ====================================================================
function CartaoMobile({ item, aoRemover }: PropsItem) {
  const acoes = useItemCarrinho(item, aoRemover);
  const classeBotao =
    'absolute top-[38px] flex size-6 items-center justify-center rounded-[31px] border border-border bg-muted';

  return (
    <li
      data-testid="item-carrinho-mobile"
      className="relative h-[100px] rounded-[14px] bg-card shadow-[0_6px_20px_rgba(10,6,4,0.45)]"
    >
      <Link
        to="/nfts/$nftId"
        params={{ nftId: item.nftId }}
        className="absolute inset-y-0 left-0 w-[100px]"
      >
        <ImagemNft
          url={item.imagemUrl}
          sizes="100px"
          width={100}
          height={100}
          alt={item.nome}
          className="size-[100px] rounded-[14px] object-cover"
        />
      </Link>
      <p className="absolute top-[13px] left-[109px] max-w-[calc(100%-158px)] truncate text-[15px] leading-4 font-bold">
        {item.nome}
      </p>
      {acoes.acimaDoEstoque ? (
        <p
          role="status"
          className="absolute top-[35px] left-[109px] text-sm leading-4 text-texto-coral"
        >
          {item.disponivel === 0 ? 'Esgotada' : `Só ${item.disponivel}`}
        </p>
      ) : (
        <p className="absolute top-[35px] left-[109px] text-sm leading-4 text-muted-foreground">
          Edição: {item.rotuloEdicao}
        </p>
      )}
      <p
        data-testid="item-total-mobile"
        className="absolute top-[69px] left-[109px] text-lg leading-4 font-bold text-texto-destaque"
      >
        {formatarEth(item.subtotal)}
      </p>
      <button
        type="button"
        aria-label={`Remover ${item.nome} do carrinho`}
        disabled={acoes.ocupado}
        onClick={acoes.remover}
        className="absolute top-2 right-4 text-primary disabled:opacity-50"
      >
        <IconeLixeira />
      </button>
      <button
        type="button"
        aria-label={`Diminuir quantidade de ${item.nome}`}
        disabled={!acoes.podeDiminuir}
        onClick={acoes.diminuir}
        className={`${classeBotao} right-[73px] disabled:cursor-not-allowed`}
      >
        <span
          aria-hidden
          className={`h-0.5 w-[8.88px] ${acoes.podeDiminuir ? 'bg-foreground' : 'bg-borda-suave'}`}
        />
      </button>
      <output
        aria-live="polite"
        data-testid="item-quantidade-mobile"
        className="absolute top-[38px] right-10 flex h-6 w-[33px] items-center justify-center text-base leading-[22px]"
      >
        {item.quantidade}
      </output>
      <button
        type="button"
        aria-label={`Aumentar quantidade de ${item.nome}`}
        disabled={!acoes.podeAumentar}
        onClick={acoes.aumentar}
        className={`${classeBotao} right-4 text-[21px] leading-4 disabled:opacity-50`}
      >
        <span aria-hidden>+</span>
      </button>
    </li>
  );
}

export function ListaCarrinhoMobile({ itens, aoRemover }: PropsItens) {
  return (
    <ul aria-label="NFTs no carrinho" className="flex flex-col gap-5">
      {itens?.map((item) => (
        <CartaoMobile key={item.id} item={item} aoRemover={aoRemover} />
      ))}
      {!itens &&
        Array.from({ length: TOTAL_ESQUELETOS }, (_, indice) => (
          <li
            key={indice}
            data-testid="item-esqueleto-mobile"
            className="esqueleto h-[100px] rounded-[14px]"
          />
        ))}
    </ul>
  );
}
