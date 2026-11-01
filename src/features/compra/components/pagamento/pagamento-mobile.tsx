import { IconeCarteira } from '@/components/icones/icones';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Carteira } from '@/contracts/conta/carteiras';
import { formatarEth } from '@/lib/eth';
import { cn } from '@/lib/utils';
import type { ResumoCompra } from '../../usar-cotacao';
import { REDES, TIPOS_CARTEIRA, type EstadoPagamento } from '../../usar-pagamento';
import { FalhaCotacao, ValorOuEsqueleto } from '../resumo-carrinho';
import { CabecalhoMobile } from '../cabecalho-compra';
import { MarcadorOpcao } from './coluna-compra';

const LETRA_TIPO = { walletconnect: 'W', metamask: 'M' };

function enderecoCurto(endereco: string) {
  return `${endereco.slice(0, 6)}…${endereco.slice(-4)}`;
}

function detalhesCarteira(carteira: Carteira) {
  const rede = REDES.find(({ valor }) => valor === carteira.rede)?.rotulo;

  return carteira.papel === 'principal'
    ? [enderecoCurto(carteira.endereco), `Rede principal ${rede}`]
    : [
        carteira.nomeEns ? `${carteira.nomeEns}.eth` : enderecoCurto(carteira.endereco),
        `Rede ${rede}`,
      ];
}

// ====================================================================
// 1. CARTÃO DE CARTEIRA CADASTRADA
// Frame com a reserva antes da principal. O menu de três pontos faz a
// conexão simulada da carteira escolhida; a outra só pode ser escolhida.
// ====================================================================
function CartaoCarteira({ carteira, estado }: { carteira: Carteira; estado: EstadoPagamento }) {
  const marcada = estado.carteira?.id === carteira.id;
  const [linha1, linha2] = detalhesCarteira(carteira);

  return (
    <li
      data-testid="cartao-carteira"
      className={cn(
        'relative h-[93px] rounded-[14px] bg-card has-focus-visible:outline-2 has-focus-visible:outline-ring',
        marcada && 'shadow-[0_20px_20px_rgba(10,6,4,0.45)]',
      )}
    >
      <label className="absolute inset-0 cursor-pointer rounded-[14px]">
        <input
          type="radio"
          name="carteira-cadastrada"
          checked={marcada}
          onChange={() => estado.escolherTipo(carteira.tipo)}
          className="sr-only"
        />
        <span className="absolute top-[39px] left-[19px]">
          <MarcadorOpcao marcada={marcada} miolo="size-2" apagado />
        </span>
        <span className="absolute top-[15px] left-[54px] text-base leading-4 font-bold">
          {carteira.apelido}
        </span>
        <span className="absolute top-[38px] left-[54px] text-sm leading-[22px] whitespace-pre text-muted-foreground">
          {linha1}
          {'\n'}
          {linha2}
        </span>
      </label>

      {marcada && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Conexão de ${carteira.apelido}`}
            className="absolute top-[28px] right-[9px] flex h-9 w-6 flex-col items-center justify-center gap-[3px]"
          >
            {[0, 1, 2].map((ponto) => (
              <span key={ponto} className="size-[3px] rounded-full bg-secundaria" />
            ))}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-border bg-card">
            {estado.conexao.conectada ? (
              <DropdownMenuItem onSelect={estado.conexao.desconectar}>Desconectar</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={estado.conexao.conectar}>Conectar</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {!marcada && (
        <span aria-hidden className="absolute top-[39px] right-[19px] flex flex-col gap-[3px]">
          {[0, 1, 2].map((ponto) => (
            <span key={ponto} className="size-[3px] rounded-full bg-secundaria" />
          ))}
        </span>
      )}
    </li>
  );
}

type PropsMobile = {
  resumo: ResumoCompra;
  estado: EstadoPagamento;
  carteiras: Carteira[];
  confirmar: () => void;
  aviso: string | null;
  ocupado: boolean;
};

// ====================================================================
// 2. TELA DO MOBILE
// Medidas do frame. O formulário do desktop não existe aqui: ele abre em
// uma folha se faltar campo obrigatório, pois o pedido exige os dados.
// A reserva vem antes da principal, como no frame.
// ====================================================================
export function PagamentoMobile({
  resumo,
  estado,
  carteiras,
  confirmar,
  aviso,
  ocupado,
}: PropsMobile) {
  const ordenadas = [...carteiras].sort((a, b) => (a.papel > b.papel ? -1 : 1));
  const dados = resumo.cotacao.isError ? undefined : resumo.cotacao.data;
  const conexao = estado.conexao.estado;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[414px] flex-col px-7 pt-8 pb-8">
      <CabecalhoMobile titulo="Pagamento com carteira" recuo="left-[59px]" voltarPara="/carrinho" />

      <div className="mt-4 flex h-4 items-center justify-between">
        <h2 className="text-base leading-4 font-bold">Carteira conectada</h2>
        <button
          type="button"
          disabled={!estado.outraCarteira}
          onClick={() => estado.outraCarteira && estado.escolherTipo(estado.outraCarteira.tipo)}
          className="text-sm leading-4 font-bold text-texto-destaque disabled:opacity-50"
        >
          Trocar carteira
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-5">
        {ordenadas.map((carteira) => (
          <CartaoCarteira key={carteira.id} carteira={carteira} estado={estado} />
        ))}
        {ordenadas.length === 0 && (
          <li className="rounded-[14px] bg-card p-4 text-sm leading-5 text-muted-foreground">
            Nenhuma carteira cadastrada. Escolha o tipo abaixo e informe o endereço ao confirmar.
          </li>
        )}
      </ul>
      <p role="status" data-testid="estado-conexao" className="sr-only">
        {conexao}
      </p>
      {conexao === 'recusada' && (
        <p role="alert" className="mt-2 text-sm leading-5 text-texto-coral">
          {estado.conexao.mensagemErro}{' '}
          <button type="button" onClick={estado.conexao.conectar} className="underline">
            Conectar de novo
          </button>
        </p>
      )}

      <fieldset className="mt-4">
        <legend className="text-base leading-4 font-bold">Carteira e rede</legend>
        <div className="mt-4 flex flex-col gap-4">
          {TIPOS_CARTEIRA.map(({ valor, rotulo }) => {
            const marcada = estado.tipo === valor;

            return (
              <label
                key={valor}
                className="relative block h-[65px] cursor-pointer rounded-[15px] bg-card shadow-[0_0_20px_rgba(10,6,4,0.45)] has-focus-visible:outline-2 has-focus-visible:outline-ring"
              >
                <input
                  type="radio"
                  name="tipo-carteira-mobile"
                  checked={marcada}
                  onChange={() => estado.escolherTipo(valor)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className="absolute top-[13px] left-[14px] flex size-10 items-center justify-center rounded-full border border-border bg-muted text-sm leading-[18px] font-bold text-texto-destaque"
                >
                  {valor === 'coinbase' ? (
                    <IconeCarteira className="text-primary" />
                  ) : (
                    <span className="pr-1">{LETRA_TIPO[valor]}</span>
                  )}
                </span>
                <span className="absolute top-[25px] left-[65px] text-sm leading-4">{rotulo}</span>
                <span className="absolute top-[25px] right-4">
                  <MarcadorOpcao marcada={marcada} miolo="size-2" apagado />
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 flex h-4 items-center justify-end gap-7">
        <span className="text-base leading-4 font-bold">Total:</span>
        <span data-testid="pagamento-total-mobile">
          <ValorOuEsqueleto
            valor={dados && formatarEth(dados.total)}
            largura="w-[98px]"
            className="block text-lg leading-4 font-bold text-texto-destaque"
          />
        </span>
      </div>

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
        id="confirmar-compra"
        type="button"
        disabled={ocupado || !dados}
        onClick={confirmar}
        className="mt-auto h-[60px] w-full shrink-0 rounded-[40px] bg-[linear-gradient(100.37deg,rgb(210_138_76)_-3.96%,rgb(210_138_76/0.8)_121.97%)] text-[15px] leading-4 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        Confirmar compra
      </button>
    </main>
  );
}
