import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { Rodape } from '@/components/layout/rodape';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Cotacao } from '@/contracts/compra/cotacao';
import type { Carteira } from '@/contracts/conta/carteiras';
import type { Perfil } from '@/contracts/conta/perfil';
import { useTelaDesktop } from '@/lib/usar-tela-desktop';
import { useCarrinho } from '../../usar-carrinho';
import { useResumoCompra } from '../../usar-cotacao';
import { useEnviarPedido, useRetomadaPedido } from '../../usar-pedido';
import {
  useDadosPagamento,
  ORDEM_DOS_CAMPOS,
  useFormularioPagamento,
  type FormularioPagamento,
} from '../../usar-pagamento';
import { Trilha } from '../cabecalho-compra';
import { ColunaCompra } from './coluna-compra';
import { FormularioColecionador } from './formulario-colecionador';
import { PagamentoMobile } from './pagamento-mobile';
import { RevisaoPedido } from './revisao-pedido';

const ESPERA_FOLHA_MS = 100;

// ====================================================================
// 1. ASSINATURA DOS VALORES
// Compara o que afeta a compra, sem o id: cada cotação tem id novo, mesmo
// com os mesmos valores. Assinatura diferente da revisada exige aceite.
// ====================================================================
function assinaturaDe(cotacao: Cotacao | undefined) {
  if (!cotacao) {
    return null;
  }

  const { subtotal, desconto, taxaRede, total, cupom, itens } = cotacao;

  return JSON.stringify({
    subtotal,
    desconto,
    taxaRede,
    total,
    cupom,
    itens: itens.map((item) => [item.edicaoId, item.precoUnitario, item.quantidade]),
  });
}

type PropsPagamento = { cupom?: string; perfil: Perfil; carteiras: Carteira[] };

// ====================================================================
// 2. FLUXO DO PAGAMENTO
// Confirmar valida o formulário, garante a carteira conectada e abre a
// revisão com cotação recém-buscada. Só a revisão envia, e confere a
// conexão de novo: a carteira pode ter sido trocada ou desconectada com a
// revisão aberta. Tentativa aberta é retomada ao entrar, sem criar outra
// compra.
// ====================================================================
function PagamentoCarregado({ cupom, perfil, carteiras }: PropsPagamento) {
  const navigate = useNavigate({ from: '/pagamento' });
  const desktop = useTelaDesktop();
  const carrinho = useCarrinho();
  const estado = useFormularioPagamento(perfil, carteiras);
  const temItens = Boolean(carrinho.data?.itens.length);
  const trocarCupom = useCallback(
    (codigo: string | undefined) => void navigate({ search: { cupom: codigo }, replace: true }),
    [navigate],
  );
  const resumo = useResumoCompra({ cupom, rede: estado.rede, habilitada: temItens, trocarCupom });
  const envio = useEnviarPedido();
  const retomando = useRetomadaPedido(envio.mutate);
  const [revisando, setRevisando] = useState(false);
  const [assinaturaRevisada, setAssinaturaRevisada] = useState<string | null>(null);
  const [folhaAberta, setFolhaAberta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pediuConexao, setPediuConexao] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const cotacaoAtual = resumo.cotacao.data;
  const valoresMudaram =
    revisando && assinaturaRevisada !== null && assinaturaRevisada !== assinaturaDe(cotacaoAtual);

  async function prosseguir() {
    setFolhaAberta(false);
    setAviso(null);
    setPediuConexao(false);
    setPreparando(true);

    const garantia = await estado.garantirCarteira();

    if ('erro' in garantia) {
      setPreparando(false);
      setAviso(garantia.erro);

      return;
    }

    if (estado.carteira && !estado.conexao.conectada) {
      setPreparando(false);
      setPediuConexao(true);

      return;
    }

    const atualizada = await resumo.cotacao.refetch();

    setPreparando(false);

    if (atualizada.isSuccess) {
      setAssinaturaRevisada(assinaturaDe(atualizada.data));
      envio.reset();
      setRevisando(true);
    }
  }

  const confirmar = estado.formulario.handleSubmit(prosseguir, (erros) => {
    const primeiroErro = ORDEM_DOS_CAMPOS.find((campo) => erros[campo]);

    if (desktop) {
      if (primeiroErro) {
        estado.formulario.setFocus(primeiroErro);
      }

      return;
    }

    setFolhaAberta(true);
    window.setTimeout(
      () => primeiroErro && estado.formulario.setFocus(primeiroErro),
      ESPERA_FOLHA_MS,
    );
  });

  function enviarPedido(dados: FormularioPagamento) {
    if (!cotacaoAtual || !estado.carteira) {
      return;
    }

    if (!estado.conexao.conectada) {
      setRevisando(false);
      setPediuConexao(true);

      return;
    }

    envio.mutate(
      {
        cotacaoId: cotacaoAtual.id,
        carteiraId: estado.carteira.id,
        rede: dados.rede,
        nomeExibicao: dados.nomeExibicao,
        email: dados.email,
        nomeUsuario: dados.nomeUsuario,
        nomePerfil: dados.nomePerfil,
        carteiraSecundaria: dados.carteiraSecundaria || null,
        codigoIndicacao: dados.codigoIndicacao,
        nomeEns: `${dados.nomeUsuario}${dados.sufixoEns}`,
        observacao: dados.observacao || null,
      },
      {
        onError: () => void resumo.cotacao.refetch(),
      },
    );
  }

  const ocupado = preparando || envio.isPending;
  const revisao = (
    <RevisaoPedido
      aberta={revisando}
      cotacao={cotacaoAtual}
      valoresMudaram={valoresMudaram}
      avisoCupom={resumo.erroCupom}
      atualizando={resumo.cotacao.isFetching}
      dados={estado.formulario.getValues()}
      enviando={envio.isPending}
      erroEnvio={envio.error}
      aoFechar={() => setRevisando(false)}
      aoAceitarValores={() => setAssinaturaRevisada(assinaturaDe(cotacaoAtual))}
      aoConfirmar={() => enviarPedido(estado.formulario.getValues())}
    />
  );
  const avisoRetomada =
    retomando && envio.isPending ? (
      <p role="status" data-testid="pagamento-retomando" className="text-sm leading-5">
        Retomando sua compra...
      </p>
    ) : null;
  const falhaRetomada =
    retomando && envio.isError && !revisando ? 'Não foi possível retomar a compra anterior.' : null;
  const avisoConexao =
    pediuConexao && !estado.conexao.conectada ? 'Conecte a carteira para continuar.' : null;

  if (!desktop) {
    return (
      <>
        {avisoRetomada}
        <PagamentoMobile
          resumo={resumo}
          estado={estado}
          carteiras={carteiras}
          confirmar={() => void confirmar()}
          aviso={aviso ?? avisoConexao ?? falhaRetomada}
          ocupado={ocupado}
        />
        <Sheet open={folhaAberta} onOpenChange={setFolhaAberta}>
          <SheetContent
            side="bottom"
            className="max-h-[90dvh] overflow-y-auto rounded-t-[40px] border-0 bg-card px-6 pb-8"
          >
            <SheetHeader className="px-0">
              <SheetTitle className="text-[17px] font-bold">Perfil do colecionador</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Complete os dados obrigatórios para finalizar a compra.
              </SheetDescription>
            </SheetHeader>
            <FormularioColecionador estado={estado} />
            <button
              type="button"
              onClick={() => void confirmar()}
              className="mt-6 h-[60px] w-full rounded-[40px] bg-primary text-[15px] font-bold text-primary-foreground"
            >
              Continuar
            </button>
          </SheetContent>
        </Sheet>
        {revisao}
      </>
    );
  }

  return (
    <>
      <main className="mx-auto mt-8 w-full max-w-[1200px] px-4 xl:px-0">
        <Trilha atual="Pagamento" />
        {avisoRetomada}
        <div className="mt-8 flex flex-col gap-8 xl:flex-row">
          <form
            noValidate
            aria-labelledby="pagamento-perfil"
            onSubmit={(evento) => evento.preventDefault()}
            className="w-full xl:w-[763px]"
          >
            <h1 id="pagamento-perfil" className="text-[17px] leading-4 font-bold">
              Perfil do colecionador
            </h1>
            <div className="mt-3">
              <FormularioColecionador estado={estado} />
            </div>
          </form>
          <ColunaCompra
            resumo={resumo}
            estado={estado}
            confirmar={() => void confirmar()}
            aviso={aviso ?? avisoConexao ?? falhaRetomada}
            ocupado={ocupado}
          />
        </div>
      </main>
      <Rodape />
      {revisao}
    </>
  );
}

// ====================================================================
// 3. CARREGAMENTO
// O formulário depende do perfil e das carteiras. Skeleton com a largura
// das colunas do frame enquanto eles chegam.
// ====================================================================
export function PaginaPagamento({ cupom }: { cupom?: string }) {
  const { perfil, carteiras } = useDadosPagamento();

  if (perfil.isError || carteiras.isError) {
    return (
      <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div role="alert" data-testid="pagamento-erro">
          <p>Não foi possível carregar seus dados.</p>
          <button
            type="button"
            onClick={() => {
              void perfil.refetch();
              void carteiras.refetch();
            }}
            className="mt-4 h-10 rounded-md bg-primary px-4 font-bold text-primary-foreground"
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  if (!perfil.data || !carteiras.data) {
    return (
      <main
        aria-busy="true"
        data-testid="pagamento-esqueleto"
        className="mx-auto mt-8 flex w-full max-w-[1200px] gap-8 px-4 xl:px-0"
      >
        <div className="esqueleto h-[668px] flex-1" />
        <div className="esqueleto hidden h-[778px] w-[405px] lg:block" />
      </main>
    );
  }

  return <PagamentoCarregado cupom={cupom} perfil={perfil.data} carteiras={carteiras.data} />;
}
