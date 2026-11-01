import { CampoRotulado, Entrada, Seletor } from '@/components/formulario/campos-formulario';
import {
  DICA_CARTEIRA_SECUNDARIA,
  DICA_CARTEIRA_SECUNDARIA_CURTA,
  OPCOES_SUFIXO_ENS,
} from '@/features/conta/ens';
import { useTelaDesktop } from '@/lib/usar-tela-desktop';
import { cn } from '@/lib/utils';
import {
  REDES,
  TIPOS_CARTEIRA,
  type EstadoPagamento,
  type FormularioPagamento,
} from '../../usar-pagamento';

// ====================================================================
// 1. PERFIL DO COLECIONADOR
// Duas colunas de 369,5 no desktop, com os campos na ordem do frame, e
// uma coluna na folha do mobile. Carteira cadastrada: endereço somente
// leitura, pois o pedido usa a carteira da API.
// ====================================================================
export function FormularioColecionador({ estado }: { estado: EstadoPagamento }) {
  const telaDesktop = useTelaDesktop();
  const {
    register,
    formState: { errors },
  } = estado.formulario;
  const usarOutra = Boolean(estado.carteira && estado.carteira.papel === 'secundaria');

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
            control={estado.formulario.control}
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
        <CampoRotulado id="pagamento-secundaria" rotulo={DICA_CARTEIRA_SECUNDARIA} rotuloOculto>
          <Entrada
            id="pagamento-secundaria"
            placeholder={telaDesktop ? DICA_CARTEIRA_SECUNDARIA : DICA_CARTEIRA_SECUNDARIA_CURTA}
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
            control={estado.formulario.control}
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
            opcoes={OPCOES_SUFIXO_ENS}
            control={estado.formulario.control}
            classeCaixa="w-auto min-w-[78px] shrink-0 pr-7 pl-2.5 text-[15px]"
            classeSeta="right-[6px] size-[18px] text-foreground"
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
          className="mt-3 block h-[152px] w-full resize-none lg:max-w-[350px] rounded-[3px] border border-border bg-transparent p-3 text-sm outline-none focus-visible:border-primary"
          {...register('observacao')}
        />
      </div>
    </div>
  );
}
