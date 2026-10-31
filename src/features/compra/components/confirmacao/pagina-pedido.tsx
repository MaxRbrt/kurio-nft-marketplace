import { Link, useNavigate } from '@tanstack/react-router';
import { useRef } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { IconeAgradecimento, IconeFechar } from '@/components/icones/icones';
import type { Pedido } from '@/contracts/compra/pedidos';
import { ImagemNft } from '@/features/catalogo/components/imagem-nft';
import { ErroApi } from '@/lib/api/erros';
import { descontoZerado, formatarEth } from '@/lib/eth';
import { useConsultaPedido } from '../../usar-pedido';
import { REDES, TIPOS_CARTEIRA } from '../../usar-pagamento';

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

// ====================================================================
// 1. FORMATOS DO RECIBO
// Como no frame: "29 Jul, 2026" e transação encurtada "0xA91F…E82C". O
// relógio é UTC, para o recibo não mudar com o fuso de quem abre.
// ====================================================================
function dataDoRecibo(iso: string) {
  const partes = FORMATO_DATA.formatToParts(new Date(iso));
  const parte = (tipo: string) => partes.find(({ type }) => type === tipo)?.value ?? '';
  const mes = parte('month').replace('.', '');

  return `${parte('day')} ${mes.charAt(0).toUpperCase()}${mes.slice(1)}, ${parte('year')}`;
}

function transacaoCurta(id: string) {
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

const nomeDaRede = (pedido: Pedido) =>
  REDES.find(({ valor }) => valor === pedido.rede)?.rotulo ?? pedido.rede;
const nomeDaCarteira = (pedido: Pedido) =>
  TIPOS_CARTEIRA.find(({ valor }) => valor === pedido.carteira.tipo)?.rotulo ?? '';

// ====================================================================
// 2. CONTEÚDO POR ESTADO
// Só o confirmado mostra transação e recibo. Pendente e recusado usam o
// mesmo modal, sem nada que aparente compra concluída.
// ====================================================================
const TEXTOS = {
  pendente: {
    titulo: 'Aguardando a confirmação da carteira',
    nota: () =>
      'O pagamento está em processamento. Você pode recarregar a página: a compra não será duplicada.',
  },
  confirmado: {
    titulo: 'Seus NFTs agora estão na sua carteira',
    nota: (pedido: Pedido) =>
      `Transação confirmada na ${nomeDaRede(pedido)}. A propriedade foi transferida para sua carteira conectada e registrada na rede.`,
  },
  recusado: {
    titulo: 'O pagamento foi recusado',
    nota: () => 'Nenhum valor foi cobrado, e seus itens continuam no carrinho.',
  },
};

function Metadado({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className={`text-sm leading-4 ${forte ? 'font-bold' : ''}`}>{rotulo}</dt>
      <dd className="text-[15px] leading-5 whitespace-nowrap">{valor}</dd>
    </div>
  );
}

function Divisor() {
  return <span aria-hidden className="hidden h-8 w-px shrink-0 bg-primary sm:block" />;
}

function ConteudoPedido({ pedido }: { pedido: Pedido }) {
  const textos = TEXTOS[pedido.estado];
  const confirmado = pedido.estado === 'confirmado';
  const data =
    pedido.estado === 'confirmado'
      ? pedido.confirmadoEm
      : pedido.estado === 'recusado'
        ? pedido.recusadoEm
        : pedido.criadoEm;
  const temDesconto = !descontoZerado(pedido.desconto);

  return (
    <>
      <div className="flex h-[156px] flex-col items-center justify-center gap-4 px-4 text-center">
        {confirmado ? (
          <IconeAgradecimento className="shrink-0 text-primary" />
        ) : (
          <span
            aria-hidden
            className={`flex size-20 shrink-0 items-center justify-center rounded-full border-2 text-3xl font-bold text-texto-destaque ${
              pedido.estado === 'pendente'
                ? 'animate-spin border-primary border-t-transparent motion-reduce:animate-none'
                : 'border-texto-coral text-texto-coral'
            }`}
          >
            {pedido.estado === 'recusado' && '!'}
          </span>
        )}
        <DialogPrimitive.Title
          data-testid="pedido-titulo"
          className="text-base leading-4 font-bold text-muted-foreground"
        >
          {textos.titulo}
        </DialogPrimitive.Title>
      </div>

      <dl className="grid grid-cols-2 gap-3 border-y border-primary px-4 py-3 text-muted-foreground sm:flex sm:h-[66px] sm:items-center sm:justify-between sm:gap-0 sm:px-9 sm:py-0">
        {confirmado && (
          <Metadado rotulo="ID da transação" valor={transacaoCurta(pedido.idTransacao)} forte />
        )}
        {!confirmado && <Metadado rotulo="Pedido" valor={pedido.id} forte />}
        <Divisor />
        <Metadado rotulo="Data" valor={dataDoRecibo(data)} />
        <Divisor />
        <Metadado rotulo="Total" valor={formatarEth(pedido.total)} />
        <Divisor />
        <Metadado rotulo="Carteira" valor={nomeDaCarteira(pedido)} forte />
      </dl>

      <div className="px-4 pt-[21px] sm:px-11">
        <h2 className="text-[15px] leading-4 font-bold">Detalhes da transação</h2>
        <div className="mt-3 grid h-7 grid-cols-[1fr_auto] items-start border-b border-primary/25 text-base leading-4 font-medium sm:grid-cols-[297px_64px_1fr]">
          <span>NFTs</span>
          <span className="hidden whitespace-nowrap sm:block">Edições</span>
          <span className="text-right">Subtotal</span>
        </div>

        <ul className="mt-3 flex flex-col gap-3">
          {pedido.itens.map((item) => (
            <li
              key={`${item.nftId}-${item.edicaoId}`}
              data-testid="recibo-item"
              className="grid min-h-[70px] grid-cols-[1fr_auto] items-center gap-x-2 sm:grid-cols-[297px_64px_1fr] sm:gap-x-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ImagemNft
                  url={item.imagemUrl}
                  sizes="70px"
                  width={70}
                  height={70}
                  alt={item.nome}
                  className="size-[70px] shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-base leading-4 font-bold">{item.nome}</p>
                  <p className="mt-1.5 truncate text-sm leading-4 text-secundaria">
                    ID do token: {item.tokenId}
                  </p>
                  <p className="mt-1 text-sm leading-4 text-muted-foreground sm:hidden">
                    (x {item.quantidade})
                  </p>
                </div>
              </div>
              <span className="hidden pl-1.5 text-sm leading-4 text-muted-foreground sm:block">
                (x {item.quantidade})
              </span>
              <span className="text-right text-lg leading-4 font-bold whitespace-nowrap text-texto-destaque">
                {formatarEth(item.subtotal)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-2.5 border-b border-primary/25 pb-[7px]">
          {temDesconto && (
            <div className="flex h-6 items-center justify-between sm:pl-[169px]">
              <dt className="text-[15px] leading-5">Desconto do lançamento</dt>
              <dd className="text-[15px] leading-5">(-) {formatarEth(pedido.desconto)}</dd>
            </div>
          )}
          <div className="flex h-6 items-center justify-between sm:pl-[169px]">
            <dt className="text-[15px] leading-5">Taxa de rede</dt>
            <dd className="text-lg leading-4">{formatarEth(pedido.taxaRede)}</dd>
          </div>
          <div className="mt-1.5 flex h-6 items-center justify-between sm:pl-[169px]">
            <dt className="text-base leading-4 font-bold">Total</dt>
            <dd
              data-testid="recibo-total"
              className="text-lg leading-4 font-bold text-texto-destaque"
            >
              {formatarEth(pedido.total)}
            </dd>
          </div>
        </dl>

        <DialogPrimitive.Description className="mt-3 text-center text-sm leading-[22px] text-muted-foreground">
          {textos.nota(pedido)}
          {pedido.estado === 'recusado' && ` Motivo: ${pedido.motivoRecusa}.`}
        </DialogPrimitive.Description>

        <div className="mt-5 flex justify-center pb-12">
          {pedido.estado === 'confirmado' && (
            <a
              href={pedido.urlExplorador}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 w-[186px] items-center justify-center rounded-[5px] bg-primary text-base leading-4 font-bold text-primary-foreground hover:bg-primaria-clara"
            >
              Ver no Etherscan
            </a>
          )}
          {pedido.estado === 'recusado' && (
            <Link
              to="/pagamento"
              className="flex h-12 w-[186px] items-center justify-center rounded-[5px] bg-primary text-base leading-4 font-bold text-primary-foreground hover:bg-primaria-clara"
            >
              Tentar novamente
            </Link>
          )}
        </div>
      </div>
      <div aria-hidden className="h-2.5 bg-primary" />
    </>
  );
}

// ====================================================================
// 3. TELA DO PEDIDO
// Modal de 578 sobre o fundo liso do frame, em rota própria: sobrevive a
// refresh e reconexão. Foco preso e Esc pelo Radix; ao abrir, vai ao modal. Pedido de outro usuário
// ou inexistente nunca mostra dados, só a mensagem da API.
// ====================================================================
export function PaginaPedido({ pedidoId }: { pedidoId: string }) {
  const navigate = useNavigate();
  const consulta = useConsultaPedido(pedidoId);
  const janela = useRef<HTMLDivElement>(null);
  const fechar = () => void navigate({ to: '/' });
  const naoAcessivel = consulta.error instanceof ErroApi && consulta.error.status < 500;

  return (
    <DialogPrimitive.Root open onOpenChange={(aberto) => !aberto && fechar()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          ref={janela}
          aria-describedby={undefined}
          onOpenAutoFocus={(evento) => {
            evento.preventDefault();
            janela.current?.focus();
          }}
          className="fixed inset-0 z-40 overflow-y-auto bg-background outline-none"
        >
          <div
            data-testid="modal-pedido"
            className="relative mx-auto w-full max-w-[578px] bg-card sm:mt-[166px] sm:mb-10"
          >
            {consulta.data && <ConteudoPedido pedido={consulta.data} />}
            {consulta.isPending && (
              <div aria-busy="true" data-testid="pedido-esqueleto" className="p-6">
                <DialogPrimitive.Title className="sr-only">
                  Carregando o pedido
                </DialogPrimitive.Title>
                <div className="esqueleto h-[156px]" />
                <div className="esqueleto mt-4 h-[66px]" />
                <div className="esqueleto mt-4 h-[300px]" />
              </div>
            )}
            {consulta.isError && (
              <div role="alert" data-testid="pedido-erro" className="p-10 text-center">
                <DialogPrimitive.Title className="font-bold">
                  {naoAcessivel ? 'Pedido indisponível' : 'Não foi possível carregar o pedido'}
                </DialogPrimitive.Title>
                <p className="mt-2 text-sm text-muted-foreground">{consulta.error.message}</p>
                {!naoAcessivel && (
                  <button
                    type="button"
                    onClick={() => void consulta.refetch()}
                    className="mt-4 h-10 rounded-md bg-primary px-4 font-bold text-primary-foreground"
                  >
                    Tentar novamente
                  </button>
                )}
              </div>
            )}
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="absolute top-[17px] right-[14px] text-primary"
            >
              <IconeFechar />
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
