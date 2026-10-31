import { useState, type ReactNode } from 'react';
import { ImagemNft } from '@/features/catalogo/components/imagem-nft';
import { formatarEth, textoDesconto } from '@/lib/eth';
import { cn } from '@/lib/utils';
import { TIPOS_CARTEIRA, type EstadoPagamento } from '../../usar-pagamento';
import type { ResumoCompra } from '../../usar-cotacao';
import { CampoCupom, FalhaCotacao, ValorOuEsqueleto } from '../resumo-carrinho';

// ====================================================================
// 1. MARCADOR DE OPÇÃO
// Círculo de 16 com miolo laranja. A seleção também é anunciada pelo
// rádio nativo e pela borda, então não depende só de cor.
// ====================================================================
export function MarcadorOpcao({
  marcada,
  miolo,
  apagado,
}: {
  marcada: boolean;
  miolo: string;
  apagado?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-full border-[1.2px]',
        apagado && !marcada ? 'border-borda-suave' : 'border-primary',
      )}
    >
      {marcada && <span className={cn('rounded-full bg-primary', miolo)} />}
    </span>
  );
}

// ====================================================================
// 2. ESTADO DA CONEXÃO
// Só a carteira escolhida mostra o estado. Recusa e desconexão oferecem
// nova tentativa, e nada disso aparenta sucesso sem resposta da API.
// ====================================================================
export function EstadoConexao({ estado }: { estado: EstadoPagamento }) {
  const { conexao, carteira } = estado;

  if (!carteira) {
    return <span className="text-xs leading-4 text-muted-foreground">Sem cadastro</span>;
  }

  if (conexao.estado === 'conectando') {
    return <span className="text-xs leading-4 text-muted-foreground">Conectando...</span>;
  }

  if (conexao.estado === 'conectada') {
    return (
      <button
        type="button"
        onClick={conexao.desconectar}
        className="text-xs leading-4 text-texto-destaque underline"
      >
        Desconectar
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={conexao.conectar}
      className="text-xs leading-4 text-texto-coral underline"
    >
      {conexao.estado === 'recusada' ? 'Recusada: conectar de novo' : 'Conectar'}
    </button>
  );
}

function LinhaValor({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex h-5 items-center justify-between">
      <dt className="text-[15px] leading-5">{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

type PropsColuna = {
  resumo: ResumoCompra;
  estado: EstadoPagamento;
  confirmar: () => void;
  aviso: string | null;
  ocupado: boolean;
};

// ====================================================================
// 3. COLUNA DO DESKTOP
// Coluna de 405 do frame, com as linhas uniformes pelo primeiro item e o
// Total alinhado aos demais valores (ver ARCHITECTURE.md). Todo valor é o
// da cotação, recalculada com a rede escolhida.
// ====================================================================
export function ColunaCompra({ resumo, estado, confirmar, aviso, ocupado }: PropsColuna) {
  const [cupomAberto, setCupomAberto] = useState(false);
  const dados = resumo.cotacao.isError ? undefined : resumo.cotacao.data;
  const mostrarCupom = cupomAberto || Boolean(resumo.cupomAplicado) || Boolean(resumo.erroCupom);

  return (
    <aside
      aria-labelledby="pagamento-seus-nfts"
      aria-busy={resumo.cotacao.isFetching}
      data-testid="coluna-compra"
      className="w-full xl:w-[405px] xl:shrink-0"
    >
      <h2 id="pagamento-seus-nfts" className="text-[17px] leading-4 font-bold">
        Seus NFTs
      </h2>
      <div className="mt-3 flex h-7 items-start justify-between border-b border-primary/25 text-base leading-4">
        <span className="font-bold">NFTs</span>
        <span className="font-medium">Subtotal</span>
      </div>

      <ul className="mt-3 flex flex-col gap-3">
        {dados?.itens.map((item) => (
          <li
            key={item.id}
            data-testid="pagamento-item"
            className="grid h-[70px] grid-cols-[70px_172px_43px_1fr] items-center bg-card pr-[11px] pl-1"
          >
            <ImagemNft
              url={item.imagemUrl}
              sizes="70px"
              width={70}
              height={70}
              alt={item.nome}
              className="size-[70px] rounded-lg object-cover"
            />
            <div className="ml-2 min-w-0">
              <p className="truncate text-base leading-4 font-bold">{item.nome}</p>
              <p className="mt-1.5 truncate text-sm leading-4 text-secundaria">
                ID do token: {item.tokenId}
              </p>
            </div>
            <span className="text-sm leading-4 whitespace-nowrap text-muted-foreground">
              (x {item.quantidade})
            </span>
            <span className="justify-self-end text-lg leading-4 font-bold whitespace-nowrap text-texto-destaque">
              {formatarEth(item.subtotal)}
            </span>
          </li>
        ))}
        {!dados && <li data-testid="pagamento-item-esqueleto" className="esqueleto h-[234px]" />}
      </ul>

      <div className="mt-3">
        {mostrarCupom ? (
          <CampoCupom
            resumo={resumo}
            sufixo="pagamento"
            classes={{
              caixa:
                'flex h-10 items-center rounded-[3px] border border-primary pl-2 focus-within:outline-2 focus-within:outline-ring',
              campo:
                'h-full min-w-0 flex-1 bg-transparent text-xs leading-4 outline-none placeholder:text-secundaria',
              botao:
                '-mr-px h-10 w-[102px] shrink-0 rounded-r-[3px] bg-primary text-[15px] leading-4 font-bold text-primary-foreground disabled:opacity-50',
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCupomAberto(true)}
            className="block h-4 w-full text-center text-sm leading-4 hover:underline"
          >
            Tem um código promocional? Aplique aqui
          </button>
        )}
      </div>

      <dl className="mt-3 flex flex-col gap-3">
        <LinhaValor rotulo="Subtotal">
          <ValorOuEsqueleto
            valor={dados && formatarEth(dados.subtotal)}
            largura="w-[98px]"
            className="block text-lg leading-4"
          />
        </LinhaValor>
        <LinhaValor rotulo="Desconto do lançamento">
          <ValorOuEsqueleto
            valor={dados && textoDesconto(dados.desconto)}
            largura="w-[82px]"
            className="block text-[15px] leading-5"
          />
        </LinhaValor>
        <LinhaValor rotulo="Taxa de rede">
          <ValorOuEsqueleto
            valor={dados && formatarEth(dados.taxaRede)}
            largura="w-[98px]"
            className="block text-lg leading-4"
          />
        </LinhaValor>
        <p className="text-right text-xs leading-4 text-texto-destaque">Taxa estimada</p>
        <div className="flex h-7 items-start justify-between border-t border-primary/25 pt-3">
          <dt className="text-base leading-4 font-bold">Total</dt>
          <dd data-testid="pagamento-total">
            <ValorOuEsqueleto
              valor={dados && formatarEth(dados.total)}
              largura="w-[109px]"
              className="block text-lg leading-4 font-bold text-texto-destaque"
            />
          </dd>
        </div>
      </dl>

      <fieldset className="mt-3">
        <legend className="text-[17px] leading-4 font-bold">Carteira e rede</legend>
        <div className="mt-5 flex flex-col gap-4">
          {TIPOS_CARTEIRA.map(({ valor, rotulo }) => {
            const marcada = estado.tipo === valor;

            return (
              <label
                key={valor}
                className={cn(
                  'flex h-[45px] cursor-pointer items-center gap-2.5 rounded-[3px] border px-3 has-focus-visible:outline-2 has-focus-visible:outline-ring',
                  marcada ? 'border-primary' : 'border-border',
                )}
              >
                <input
                  type="radio"
                  name="tipo-carteira-opcao"
                  value={valor}
                  checked={marcada}
                  onChange={() => estado.escolherTipo(valor)}
                  className="sr-only"
                />
                <MarcadorOpcao marcada={marcada} miolo="size-2.5" />
                <span className="flex-1 text-[15px] leading-5">{rotulo}</span>
                {marcada && <EstadoConexao estado={estado} />}
              </label>
            );
          })}
        </div>
      </fieldset>

      {aviso && (
        <p
          role="alert"
          data-testid="pagamento-aviso"
          className="mt-3 text-sm leading-5 text-texto-coral"
        >
          {aviso}
        </p>
      )}
      <div className="mt-3 empty:hidden">
        <FalhaCotacao resumo={resumo} />
      </div>

      <button
        type="button"
        disabled={ocupado || !dados}
        onClick={confirmar}
        className="mt-6 h-[45px] w-full rounded-lg bg-primary text-[15px] leading-4 font-bold text-primary-foreground hover:bg-primaria-clara disabled:cursor-not-allowed disabled:opacity-50"
      >
        Confirmar compra
      </button>
    </aside>
  );
}
