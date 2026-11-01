import { Link } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { ErroApi } from '@/lib/api/erros';
import { formatarEth, textoDesconto } from '@/lib/eth';
import { useConsultaTela } from '@/lib/usar-tela-desktop';
import { cn } from '@/lib/utils';
import type { ResumoCompra } from '../usar-cotacao';

type PropsValor = {
  valor?: string;
  className: string;
  largura: string;
};

export function ValorOuEsqueleto({ valor, className, largura }: PropsValor) {
  if (!valor) {
    return <span data-testid="resumo-esqueleto" className={cn('esqueleto block h-4', largura)} />;
  }

  return <span className={className}>{valor}</span>;
}

type PropsCampoCupom = {
  resumo: ResumoCompra;
  sufixo: string;
  classes: { caixa: string; campo: string; botao: string };
  focarAoAbrir?: boolean;
  dica?: string;
};

const DICA_CUPOM = 'Digite o código promocional...';
const DICA_CUPOM_CURTA = 'Código promocional';

// ====================================================================
// 1. CÓDIGO PROMOCIONAL
// Mesmo comportamento nos dois frames, só o visual muda. Código aplicado
// fica somente leitura e o botão passa a remover. O erro é ligado ao
// campo e anunciado, e não depende só de cor.
// ====================================================================
export function CampoCupom({
  resumo,
  sufixo,
  classes,
  focarAoAbrir,
  dica = DICA_CUPOM,
}: PropsCampoCupom) {
  const [digitado, setDigitado] = useState('');
  const aplicado = resumo.cupomAplicado;
  const erroId = `cupom-erro-${sufixo}`;

  function enviar(evento: FormEvent) {
    evento.preventDefault();

    if (aplicado) {
      setDigitado('');
      resumo.removerCupom();

      return;
    }

    if (digitado.trim()) {
      resumo.aplicarCupom(digitado);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <div className={classes.caixa}>
        <input
          id={`cupom-${sufixo}`}
          aria-label="Código promocional"
          aria-invalid={Boolean(resumo.erroCupom)}
          aria-describedby={resumo.erroCupom ? erroId : undefined}
          readOnly={Boolean(aplicado)}
          autoComplete="off"
          autoFocus={focarAoAbrir}
          placeholder={dica}
          value={aplicado ?? digitado}
          onChange={(evento) => setDigitado(evento.target.value)}
          className={classes.campo}
        />
        <button type="submit" disabled={resumo.aplicandoCupom} className={classes.botao}>
          {aplicado ? 'Remover' : 'Aplicar'}
        </button>
      </div>
      {resumo.erroCupom && (
        <p id={erroId} role="alert" className="mt-2 text-sm leading-5 text-texto-coral">
          Erro: {resumo.erroCupom}
        </p>
      )}
      {aplicado && (
        <p role="status" className="mt-2 text-sm leading-5 text-texto-destaque">
          Código {aplicado} aplicado.
        </p>
      )}
    </form>
  );
}

// ====================================================================
// 2. FALHA DA COTAÇÃO
// Falha transitória oferece nova tentativa. Conflito de estoque só se
// resolve no carrinho: a mensagem diz qual item, e finalizar fica travado.
// ====================================================================
export function FalhaCotacao({ resumo }: { resumo: ResumoCompra }) {
  const { error, refetch } = resumo.cotacao;

  if (!(error instanceof ErroApi) || error.codigo.startsWith('CUPOM_')) {
    return null;
  }

  return (
    <div role="alert" data-testid="resumo-erro" className="text-sm leading-5 text-texto-coral">
      <p>{error.transitorio ? 'Não foi possível calcular o resumo.' : error.message}</p>
      {error.transitorio && (
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-1 text-texto-destaque underline"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

type PropsFinalizar = {
  resumo: ResumoCompra;
  className: string;
};

function BotaoFinalizar({ resumo, className }: PropsFinalizar) {
  const pronta = Boolean(resumo.cotacao.data) && !resumo.cotacao.isError;

  if (!pronta) {
    return (
      <button type="button" disabled className={cn(className, 'cursor-not-allowed opacity-50')}>
        Conectar e finalizar
      </button>
    );
  }

  return (
    <Link
      to="/pagamento"
      search={{ cupom: resumo.cupomAplicado ?? undefined }}
      className={className}
    >
      Conectar e finalizar
    </Link>
  );
}

type PropsResumo = { resumo: ResumoCompra };

// ====================================================================
// 3. RESUMO DO DESKTOP
// Coluna de 332 do frame. Todo valor vem da cotação. O resumo anterior
// segue visível ao recalcular; aria-busy avisa a atualização.
// ====================================================================
export function ResumoDesktop({ resumo }: PropsResumo) {
  const dados = resumo.cotacao.isError ? undefined : resumo.cotacao.data;

  return (
    <aside
      aria-labelledby="resumo-titulo"
      aria-busy={resumo.cotacao.isFetching}
      data-testid="resumo-carrinho"
      className="w-full xl:w-[332px] xl:shrink-0"
    >
      <h2
        id="resumo-titulo"
        className="h-7 border-b border-primary/25 text-lg leading-4 font-bold text-foreground"
      >
        Resumo da carteira
      </h2>

      <div className="mt-6">
        <label htmlFor="cupom-desktop" className="block text-sm leading-4 font-bold">
          Código promocional
        </label>
        <div className="mt-2">
          <CampoCupom
            resumo={resumo}
            sufixo="desktop"
            classes={{
              caixa:
                'flex h-10 items-center rounded-[3px] border border-primary pl-2 focus-within:outline-2 focus-within:outline-ring',
              campo:
                'h-full min-w-0 flex-1 bg-transparent text-xs leading-4 outline-none placeholder:text-xs placeholder:text-secundaria',
              botao:
                '-mr-px h-10 w-[102px] shrink-0 rounded-r-[3px] bg-primary text-[15px] leading-4 font-bold text-primary-foreground hover:bg-primaria-clara disabled:opacity-50',
            }}
          />
        </div>
      </div>

      <dl className="mt-6">
        <div className="flex h-5 items-start justify-between">
          <dt className="text-[15px] leading-5">Subtotal</dt>
          <dd>
            <ValorOuEsqueleto
              valor={dados && formatarEth(dados.subtotal)}
              largura="w-[98px]"
              className="block text-lg leading-4"
            />
          </dd>
        </div>
        <div className="mt-3 flex h-5 items-start justify-between">
          <dt className="text-[15px] leading-5">Desconto do lançamento</dt>
          <dd>
            <ValorOuEsqueleto
              valor={dados && textoDesconto(dados.desconto)}
              largura="w-[82px]"
              className="block text-[15px] leading-5"
            />
          </dd>
        </div>
        <div className="mt-3 flex h-5 items-center justify-between">
          <dt className="text-[15px] leading-5">Taxa de rede</dt>
          <dd>
            <ValorOuEsqueleto
              valor={dados && formatarEth(dados.taxaRede)}
              largura="w-[98px]"
              className="block text-lg leading-4"
            />
          </dd>
        </div>
        <p className="mt-3 text-right text-xs leading-4 text-texto-destaque">Taxa estimada</p>
        <div className="mt-6 flex h-4 items-start justify-between">
          <dt className="text-base leading-4 font-bold">Total</dt>
          <dd data-testid="resumo-total">
            <ValorOuEsqueleto
              valor={dados && formatarEth(dados.total)}
              largura="w-[109px]"
              className="block text-lg leading-4 font-bold text-texto-destaque"
            />
          </dd>
        </div>
      </dl>

      <div className="mt-6 empty:hidden">
        <FalhaCotacao resumo={resumo} />
      </div>

      <BotaoFinalizar
        resumo={resumo}
        className="mt-6 flex h-10 w-full items-center justify-center rounded-[3px] bg-primary text-[15px] leading-4 font-bold text-primary-foreground hover:bg-primaria-clara"
      />
      <Link
        to="/"
        className="mx-auto mt-3 block w-fit text-[15px] leading-5 text-texto-destaque hover:underline"
      >
        Continuar explorando
      </Link>
    </aside>
  );
}

// ====================================================================
// 4. PAINEL DO MOBILE
// Painel de 342 fixo no fim da tela enquanto a lista rola, e que volta ao
// fluxo no fim da página: nenhum item fica escondido, mesmo com zoom.
// Em tela mais estreita que o frame (414), rótulo longo quebra linha sem
// invadir a linha de baixo, e o cupom usa uma dica curta que cabe.
// ====================================================================
export function ResumoMobile({ resumo }: PropsResumo) {
  const dados = resumo.cotacao.isError ? undefined : resumo.cotacao.data;
  const larguraDoFrame = useConsultaTela('(min-width: 414px)');

  return (
    <section
      aria-label="Resumo da carteira"
      aria-busy={resumo.cotacao.isFetching}
      data-testid="resumo-carrinho-mobile"
      className="sticky bottom-0 z-30 mt-auto flex min-h-[342px] flex-col justify-between rounded-t-[40px] bg-card px-6 pt-6 pb-9"
    >
      <div>
        <CampoCupom
          resumo={resumo}
          sufixo="mobile"
          dica={larguraDoFrame ? DICA_CUPOM : DICA_CUPOM_CURTA}
          classes={{
            caixa:
              'flex h-[50px] items-center rounded-[40px] border border-border bg-card pl-4 shadow-[0_6px_20px_rgba(10,6,4,0.45)] focus-within:outline-2 focus-within:outline-ring',
            campo:
              'h-full min-w-0 flex-1 bg-transparent text-[13px] leading-[22px] outline-none placeholder:text-[13px] placeholder:text-secundaria',
            botao:
              '-my-px -mr-px h-[50px] w-[97px] shrink-0 rounded-[40px] bg-[linear-gradient(90deg,rgb(210_138_76/0.54),rgb(210_138_76))] text-[15px] leading-4 font-bold text-foreground disabled:opacity-50',
          }}
        />

        <dl className="mt-3">
          <div className="flex min-h-5 items-start justify-between gap-3">
            <dt className="text-[15px] leading-5">Subtotal</dt>
            <dd className="shrink-0">
              <ValorOuEsqueleto
                valor={dados && formatarEth(dados.subtotal)}
                largura="w-[77px]"
                className="block text-base leading-4"
              />
            </dd>
          </div>
          <div className="mt-3 flex min-h-5 items-start justify-between gap-3">
            <dt className="text-[15px] leading-5">Desconto do lançamento</dt>
            <dd className="shrink-0">
              <ValorOuEsqueleto
                valor={dados && textoDesconto(dados.desconto)}
                largura="w-[82px]"
                className="block text-[15px] leading-5"
              />
            </dd>
          </div>
          <div className="mt-3 flex min-h-5 items-center justify-between gap-3">
            <dt className="text-[15px] leading-5">Taxa de rede</dt>
            <dd className="shrink-0">
              <ValorOuEsqueleto
                valor={dados && formatarEth(dados.taxaRede)}
                largura="w-[87px]"
                className="block text-base leading-4"
              />
            </dd>
          </div>
          <p className="text-right text-xs leading-4 text-texto-destaque">Taxa estimada</p>
          <div className="mt-3 flex h-4 items-start justify-between">
            <dt className="text-base leading-4 font-bold">Total</dt>
            <dd data-testid="resumo-total-mobile">
              <ValorOuEsqueleto
                valor={dados && formatarEth(dados.total)}
                largura="w-[98px]"
                className="block text-lg leading-4 font-bold text-texto-destaque"
              />
            </dd>
          </div>
        </dl>

        <div className="mt-2 empty:hidden">
          <FalhaCotacao resumo={resumo} />
        </div>
      </div>

      <BotaoFinalizar
        resumo={resumo}
        className="mt-3 flex h-[60px] w-full items-center justify-center rounded-[40px] bg-[linear-gradient(100.37deg,rgb(210_138_76)_-3.96%,rgb(210_138_76/0.8)_121.97%)] text-base leading-4 font-bold text-primary-foreground"
      />
    </section>
  );
}
