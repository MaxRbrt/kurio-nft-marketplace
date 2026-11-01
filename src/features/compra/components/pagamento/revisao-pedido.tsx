import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Cotacao } from '@/contracts/compra/cotacao';
import { ErroApi } from '@/lib/api/erros';
import { formatarEth, textoDesconto } from '@/lib/eth';
import { REDES, TIPOS_CARTEIRA, type FormularioPagamento } from '../../usar-pagamento';

type PropsRevisao = {
  aberta: boolean;
  cotacao: Cotacao | undefined;
  valoresMudaram: boolean;
  atualizando: boolean;
  dados: FormularioPagamento;
  enviando: boolean;
  erroEnvio: unknown;
  aoFechar: () => void;
  aoAceitarValores: () => void;
  aoConfirmar: () => void;
};

// ====================================================================
// 1. MENSAGEM DA FALHA
// Sem resposta o pedido pode já existir: repetir é seguro, pois usa a
// mesma chave. Cotação recusada pede revisão dos valores novos.
// ====================================================================
function mensagemDoErro(erro: unknown) {
  if (!erro) {
    return null;
  }

  if (erro instanceof ErroApi && !erro.transitorio && erro.status !== 0) {
    return erro.message;
  }

  return 'Não tivemos resposta. Tente novamente: a compra não será duplicada.';
}

// ====================================================================
// 2. REVISÃO ANTES DO ENVIO
// Sem frame próprio: segue o modal da Confirmação. Valores que mudam com
// a revisão aberta, por evento ou resposta do servidor, travam o envio
// até nova confirmação. O diálogo prende o foco e fecha com Esc.
// ====================================================================
export function RevisaoPedido({
  aberta,
  cotacao,
  valoresMudaram,
  atualizando,
  dados,
  enviando,
  erroEnvio,
  aoFechar,
  aoAceitarValores,
  aoConfirmar,
}: PropsRevisao) {
  const mensagemErro = mensagemDoErro(erroEnvio);
  const enderecoCurto = `${dados.endereco.slice(0, 6)}…${dados.endereco.slice(-4)}`;
  const rede = REDES.find(({ valor }) => valor === dados.rede)?.rotulo;
  const carteira = TIPOS_CARTEIRA.find(({ valor }) => valor === dados.tipo)?.rotulo;
  const podeConfirmar = Boolean(cotacao) && !valoresMudaram && !atualizando && !enviando;

  return (
    <Dialog open={aberta} onOpenChange={(abrir) => !abrir && !enviando && aoFechar()}>
      <DialogContent
        data-testid="revisao-pedido"
        classeFundo="bg-black/60"
        onCloseAutoFocus={(evento) => {
          evento.preventDefault();
          document.getElementById('confirmar-compra')?.focus();
        }}
        className="max-h-[90dvh] w-[578px] max-w-[calc(100vw-32px)] gap-0 overflow-y-auto rounded-none border-0 bg-card p-6 ring-0 sm:max-w-[578px]"
      >
        <DialogTitle className="text-base leading-5 font-bold text-muted-foreground">
          Revise sua compra
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-5 text-muted-foreground">
          Carteira {carteira}, rede {rede}, endereço {enderecoCurto}. Confira os valores antes de
          confirmar.
        </DialogDescription>

        <ul className="mt-4 flex flex-col gap-2 border-t border-primary pt-4">
          {cotacao?.itens.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-sm leading-5">
              <span className="min-w-0 truncate">
                {item.nome}, edição {item.rotuloEdicao} (x {item.quantidade})
              </span>
              <span className="font-bold whitespace-nowrap text-texto-destaque">
                {formatarEth(item.subtotal)}
              </span>
            </li>
          ))}
        </ul>

        {cotacao && (
          <dl className="mt-4 flex flex-col gap-2 border-t border-primary/25 pt-4 text-sm leading-5">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatarEth(cotacao.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Desconto do lançamento</dt>
              <dd>{textoDesconto(cotacao.desconto)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Taxa de rede</dt>
              <dd>{formatarEth(cotacao.taxaRede)}</dd>
            </div>
            <div className="flex justify-between text-base font-bold">
              <dt>Total</dt>
              <dd data-testid="revisao-total" className="text-texto-destaque">
                {formatarEth(cotacao.total)}
              </dd>
            </div>
          </dl>
        )}

        {valoresMudaram && (
          <div
            role="alert"
            data-testid="revisao-mudou"
            className="mt-4 text-sm leading-5 text-texto-coral"
          >
            <p>Os valores mudaram desde a sua revisão. Confira o novo total para continuar.</p>
            <button
              type="button"
              onClick={aoAceitarValores}
              className="mt-2 h-10 rounded-[3px] border border-primary px-4 font-bold text-texto-destaque"
            >
              Aceitar novos valores
            </button>
          </div>
        )}

        {mensagemErro && !valoresMudaram && (
          <p
            role="alert"
            data-testid="revisao-erro"
            className="mt-4 text-sm leading-5 text-texto-coral"
          >
            {mensagemErro}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={enviando}
            onClick={aoFechar}
            className="h-12 flex-1 rounded-[5px] border border-primary text-sm font-bold text-texto-destaque disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={!podeConfirmar}
            onClick={aoConfirmar}
            className="h-12 flex-1 rounded-[5px] bg-primary text-sm font-bold text-primary-foreground hover:bg-primaria-clara disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Confirmar pedido'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
