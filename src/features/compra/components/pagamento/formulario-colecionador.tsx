import type { ComponentProps, ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import { IconeSetaBaixo } from '@/components/icones/icones';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  REDES,
  SUFIXOS_ENS,
  TIPOS_CARTEIRA,
  type EstadoPagamento,
  type FormularioPagamento,
} from '../../usar-pagamento';

type PropsCampoRotulado = {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  rotuloOculto?: boolean;
  erro?: string;
  children: ReactNode;
};

// ====================================================================
// 1. CAMPO DO FORMULÁRIO
// Rótulo de 15 px e asterisco coral, em uma faixa de 29 px, como no frame.
// O campo opcional sem rótulo visível mantém o rótulo para leitor de tela.
// ====================================================================
function CampoRotulado({
  id,
  rotulo,
  obrigatorio,
  rotuloOculto,
  erro,
  children,
}: PropsCampoRotulado) {
  return (
    <div>
      <div className="flex h-[29px] items-center">
        <label htmlFor={id} className={cn('text-[15px] leading-[15px]', rotuloOculto && 'sr-only')}>
          {rotulo}
        </label>
        {obrigatorio && (
          <span aria-hidden className="text-[22px] leading-[29px] text-texto-coral">
            *
          </span>
        )}
      </div>
      {children}
      {erro && (
        <p id={`${id}-erro`} className="mt-1 text-sm leading-5 text-texto-coral">
          Erro: {erro}
        </p>
      )}
    </div>
  );
}

const CLASSE_CAMPO =
  'h-10 w-full rounded-[3px] border border-border bg-transparent px-3 text-sm leading-[15px] text-foreground outline-none placeholder:text-secundaria focus-visible:border-primary aria-invalid:border-texto-coral';

function Entrada({ erro, id, ...props }: ComponentProps<'input'> & { erro?: string }) {
  return (
    <input
      id={id}
      aria-invalid={Boolean(erro)}
      aria-describedby={erro ? `${id}-erro` : undefined}
      className={CLASSE_CAMPO}
      {...props}
    />
  );
}

type PropsSeletor = {
  id: string;
  nome: 'rede' | 'tipo' | 'sufixoEns';
  texto: string;
  opcoes: ReadonlyArray<{ valor: string; rotulo: string }>;
  estado: EstadoPagamento;
  erro?: string;
  aoEscolher?: (valor: string) => void;
  estreito?: boolean;
};

// ====================================================================
// 2. SELETOR
// Select do shadcn com a aparência do frame: texto a 12 e seta de 18 a
// 28,5 da borda. O teclado e o foco vêm do Radix.
// ====================================================================
function Seletor({ id, nome, texto, opcoes, estado, erro, aoEscolher, estreito }: PropsSeletor) {
  return (
    <Controller
      control={estado.formulario.control}
      name={nome}
      render={({ field }) => (
        <Select
          value={field.value ?? ''}
          onValueChange={(valor) => {
            field.onChange(valor);
            aoEscolher?.(valor);
          }}
        >
          <SelectTrigger
            id={id}
            ref={field.ref}
            aria-invalid={Boolean(erro)}
            aria-describedby={erro ? `${id}-erro` : undefined}
            className={cn(
              'relative !h-10 rounded-[3px] border-border bg-transparent pl-3 text-sm leading-[15px] text-foreground shadow-none data-placeholder:text-secundaria dark:bg-transparent [&>svg:last-child]:hidden',
              estreito ? 'w-[78px] pr-0 pl-2.5 text-[15px]' : 'w-full',
            )}
          >
            <SelectValue placeholder={texto} />
            <IconeSetaBaixo
              className={cn(
                'absolute top-[11px] size-[18px]',
                estreito ? 'right-[6px] text-foreground' : 'right-[27.5px] text-secundaria',
              )}
            />
          </SelectTrigger>
          <SelectContent className="border-border bg-card">
            {opcoes.map(({ valor, rotulo }) => (
              <SelectItem key={valor} value={valor}>
                {rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

// ====================================================================
// 3. PERFIL DO COLECIONADOR
// Duas colunas de 369,5 no desktop, com os campos na ordem do frame, e
// uma coluna na folha do mobile. Carteira cadastrada: endereço somente
// leitura, pois o pedido usa a carteira da API.
// ====================================================================
export function FormularioColecionador({ estado }: { estado: EstadoPagamento }) {
  const {
    register,
    formState: { errors },
  } = estado.formulario;
  const usarOutra = Boolean(estado.carteira && estado.carteira.papel === 'secundaria');
  const opcoesSufixo = SUFIXOS_ENS.map((sufixo) => ({ valor: sufixo, rotulo: sufixo }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-2">
        <CampoRotulado
          id="pagamento-nome-exibicao"
          rotulo="Nome de exibição"
          obrigatorio
          erro={errors.nomeExibicao?.message}
        >
          <Entrada
            id="pagamento-nome-exibicao"
            autoComplete="name"
            erro={errors.nomeExibicao?.message}
            {...register('nomeExibicao')}
          />
        </CampoRotulado>
        <CampoRotulado
          id="pagamento-nome-usuario"
          rotulo="Nome de usuário"
          obrigatorio
          erro={errors.nomeUsuario?.message}
        >
          <Entrada
            id="pagamento-nome-usuario"
            autoComplete="username"
            erro={errors.nomeUsuario?.message}
            {...register('nomeUsuario')}
          />
        </CampoRotulado>
        <CampoRotulado id="pagamento-rede" rotulo="Rede" obrigatorio erro={errors.rede?.message}>
          <Seletor
            id="pagamento-rede"
            nome="rede"
            texto="Selecione uma rede"
            opcoes={REDES}
            estado={estado}
            erro={errors.rede?.message}
          />
        </CampoRotulado>
        <CampoRotulado
          id="pagamento-nome-perfil"
          rotulo="Nome do perfil"
          obrigatorio
          erro={errors.nomePerfil?.message}
        >
          <Entrada
            id="pagamento-nome-perfil"
            erro={errors.nomePerfil?.message}
            {...register('nomePerfil')}
          />
        </CampoRotulado>
        <CampoRotulado
          id="pagamento-endereco"
          rotulo="Endereço da carteira"
          obrigatorio
          erro={errors.endereco?.message}
        >
          <Entrada
            id="pagamento-endereco"
            placeholder="Endereço 0x da carteira"
            readOnly={Boolean(estado.carteira)}
            erro={errors.endereco?.message}
            {...register('endereco')}
          />
        </CampoRotulado>
        <CampoRotulado
          id="pagamento-secundaria"
          rotulo="ENS ou carteira secundária (opcional)"
          rotuloOculto
        >
          <Entrada
            id="pagamento-secundaria"
            placeholder="ENS ou carteira secundária (opcional)"
            {...register('carteiraSecundaria')}
          />
        </CampoRotulado>
        <CampoRotulado
          id="pagamento-tipo"
          rotulo="Tipo de carteira"
          obrigatorio
          erro={errors.tipo?.message}
        >
          <Seletor
            id="pagamento-tipo"
            nome="tipo"
            texto="Selecione uma carteira"
            opcoes={TIPOS_CARTEIRA}
            estado={estado}
            erro={errors.tipo?.message}
            aoEscolher={(valor) => estado.escolherTipo(valor as FormularioPagamento['tipo'])}
          />
        </CampoRotulado>
        <CampoRotulado
          id="pagamento-indicacao"
          rotulo="Código de indicação"
          obrigatorio
          erro={errors.codigoIndicacao?.message}
        >
          <Entrada
            id="pagamento-indicacao"
            autoComplete="off"
            erro={errors.codigoIndicacao?.message}
            {...register('codigoIndicacao')}
          />
        </CampoRotulado>
        <CampoRotulado
          id="pagamento-email"
          rotulo="E-mail"
          obrigatorio
          erro={errors.email?.message}
        >
          <Entrada
            id="pagamento-email"
            type="email"
            autoComplete="email"
            erro={errors.email?.message}
            {...register('email')}
          />
        </CampoRotulado>
        <CampoRotulado id="pagamento-ens" rotulo="Nome ENS" obrigatorio>
          <Seletor
            id="pagamento-ens"
            nome="sufixoEns"
            texto=".eth"
            opcoes={opcoesSufixo}
            estado={estado}
            estreito
          />
        </CampoRotulado>
      </div>

      <button
        type="button"
        aria-pressed={usarOutra}
        disabled={!estado.outraCarteira}
        onClick={() => estado.outraCarteira && estado.escolherTipo(estado.outraCarteira.tipo)}
        className="flex h-5 items-start gap-2 text-left text-[15px] leading-5 disabled:cursor-not-allowed"
      >
        <span
          aria-hidden
          className={cn(
            'size-[15px] shrink-0 rounded-full border-2 border-primary',
            usarOutra && 'bg-primary',
          )}
        />
        Usar outra carteira?
      </button>

      <div>
        <label htmlFor="pagamento-observacao" className="block text-[15px] leading-[15px]">
          Observação do colecionador (opcional)
        </label>
        <textarea
          id="pagamento-observacao"
          className="mt-3 block h-[152px] w-full max-w-[350px] resize-none rounded-[3px] border border-border bg-transparent p-3 text-sm outline-none focus-visible:border-primary"
          {...register('observacao')}
        />
      </div>
    </div>
  );
}
