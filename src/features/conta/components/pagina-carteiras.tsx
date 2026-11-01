import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CampoRotulado, Entrada, Seletor } from '@/components/formulario/campos-formulario';
import { redeSchema } from '@/contracts/comum/valores';
import {
  tipoCarteiraSchema,
  type Carteira,
  type EntradaCarteira,
} from '@/contracts/conta/carteiras';
import { ErroApi } from '@/lib/api/erros';
import { useTelaDesktop } from '@/lib/usar-tela-desktop';
import { cn } from '@/lib/utils';
import { atualizarCarteira, criarCarteira, listarCarteiras } from '../api/carteiras';
import {
  DICA_CARTEIRA_SECUNDARIA,
  DICA_CARTEIRA_SECUNDARIA_CURTA,
  OPCOES_SUFIXO_ENS,
  separarEns,
  SUFIXOS_ENS,
} from '../ens';
import { useSessao } from '../usar-sessao';
import { LayoutConta } from './layout-conta';

const REDES = [
  { valor: 'ethereum', rotulo: 'Ethereum' },
  { valor: 'polygon', rotulo: 'Polygon' },
  { valor: 'solana', rotulo: 'Solana' },
];
const TIPOS = [
  { valor: 'metamask', rotulo: 'MetaMask' },
  { valor: 'walletconnect', rotulo: 'WalletConnect' },
  { valor: 'coinbase', rotulo: 'Coinbase Wallet' },
];
const obrigatorio = (mensagem: string) => z.string().trim().min(1, mensagem);
const SETA_CHEIA = 'right-2 size-[18px] text-secundaria';
const ESPACO_ROTULO = 'mb-[-4px]';

// ====================================================================
// 1. VALIDAÇÃO
// Obrigatórios seguem os asteriscos do frame. O endereço usa a regra 0x
// do contrato. Rede e tipo vêm de listas, com mensagem própria se vazios.
// ====================================================================
const formularioCarteiraSchema = z.object({
  nomeExibicao: obrigatorio('Informe o nome de exibição'),
  apelido: obrigatorio('Informe o apelido da carteira'),
  rede: redeSchema.or(z.literal('')).refine(Boolean, 'Selecione uma rede'),
  nomePerfil: obrigatorio('Informe o nome do perfil'),
  endereco: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Endereço 0x inválido'),
  carteiraSecundaria: z.string().trim(),
  tipo: tipoCarteiraSchema.or(z.literal('')).refine(Boolean, 'Selecione uma carteira'),
  codigoIndicacao: obrigatorio('Informe o código de indicação'),
  email: z.email('E-mail inválido'),
  nomeEns: obrigatorio('Informe o nome ENS'),
  sufixoEns: z.enum(SUFIXOS_ENS),
});
type FormularioCarteira = z.infer<typeof formularioCarteiraSchema>;

function valoresDe(carteira: Carteira | undefined): FormularioCarteira {
  return {
    nomeExibicao: carteira?.nomeExibicao ?? '',
    apelido: carteira?.apelido ?? '',
    rede: carteira?.rede ?? '',
    nomePerfil: carteira?.nomePerfil ?? '',
    endereco: carteira?.endereco ?? '',
    carteiraSecundaria: carteira?.carteiraSecundaria ?? '',
    tipo: carteira?.tipo ?? '',
    codigoIndicacao: carteira?.codigoIndicacao ?? '',
    email: carteira?.email ?? '',
    ...separarEns(carteira?.nomeEns),
  };
}

type PropsFormulario = {
  papel: Carteira['papel'];
  carteira?: Carteira;
  valoresIniciais: FormularioCarteira;
};

// ====================================================================
// 2. FORMULÁRIO DE UMA CARTEIRA
// Mesmos campos para principal e secundária. Com carteira existente edita,
// sem ela cadastra. Conflito de papel e erros da API voltam aos campos.
// ====================================================================
function FormularioDeCarteira({ papel, carteira, valoresIniciais }: PropsFormulario) {
  const clienteConsultas = useQueryClient();
  const usuarioId = useSessao()?.usuario.id;
  const prefixo = `carteira-${papel}`;
  const telaDesktop = useTelaDesktop();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<FormularioCarteira>({
    resolver: zodResolver(formularioCarteiraSchema),
    defaultValues: valoresIniciais,
    values: valoresIniciais,
  });

  const envio = useMutation({
    mutationFn: (dados: FormularioCarteira) => {
      const entrada: EntradaCarteira = {
        papel,
        nomeExibicao: dados.nomeExibicao,
        apelido: dados.apelido,
        rede: dados.rede as EntradaCarteira['rede'],
        nomePerfil: dados.nomePerfil,
        endereco: dados.endereco,
        carteiraSecundaria: dados.carteiraSecundaria || null,
        tipo: dados.tipo as EntradaCarteira['tipo'],
        codigoIndicacao: dados.codigoIndicacao,
        email: dados.email,
        nomeEns: `${dados.nomeEns}${dados.sufixoEns}`,
      };

      return carteira ? atualizarCarteira(carteira.id, entrada) : criarCarteira(entrada);
    },
    onSuccess: async () => {
      await clienteConsultas.invalidateQueries({ queryKey: ['usuario', usuarioId, 'carteiras'] });
      toast.success('Carteira salva.');
    },
    onError: (erro) => {
      const campos = erro instanceof ErroApi ? Object.entries(erro.campos) : [];

      campos.forEach(([campo, message], indice) =>
        setError(campo as keyof FormularioCarteira, { message }, { shouldFocus: indice === 0 }),
      );

      if (campos.length === 0 || campos.every(([campo]) => campo === 'papel')) {
        const mensagem = campos[0]?.[1] ?? 'Não foi possível salvar a carteira. Tente novamente.';

        toast.error(mensagem);
      }
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((dados) => envio.mutate(dados))}>
      <div className="grid grid-cols-1 gap-x-7 gap-y-6 xl:grid-cols-2">
        <CampoRotulado
          id={`${prefixo}-exibicao`}
          rotulo="Nome de exibição"
          obrigatorio
          classeRotulo={ESPACO_ROTULO}
          erro={errors.nomeExibicao?.message}
        >
          <Entrada
            id={`${prefixo}-exibicao`}
            erro={errors.nomeExibicao?.message}
            {...register('nomeExibicao')}
          />
        </CampoRotulado>
        <CampoRotulado
          id={`${prefixo}-apelido`}
          rotulo="Apelido da carteira"
          obrigatorio
          classeRotulo={ESPACO_ROTULO}
          erro={errors.apelido?.message}
        >
          <Entrada
            id={`${prefixo}-apelido`}
            erro={errors.apelido?.message}
            {...register('apelido')}
          />
        </CampoRotulado>
        <CampoRotulado
          id={`${prefixo}-rede`}
          rotulo="Rede"
          obrigatorio
          classeRotulo={ESPACO_ROTULO}
          erro={errors.rede?.message}
        >
          <Seletor
            id={`${prefixo}-rede`}
            control={control}
            nome="rede"
            texto="Selecione uma rede"
            opcoes={REDES}
            erro={errors.rede?.message}
            classeSeta={SETA_CHEIA}
          />
        </CampoRotulado>
        <CampoRotulado
          id={`${prefixo}-perfil`}
          rotulo="Nome do perfil"
          obrigatorio
          classeRotulo={ESPACO_ROTULO}
          erro={errors.nomePerfil?.message}
        >
          <Entrada
            id={`${prefixo}-perfil`}
            erro={errors.nomePerfil?.message}
            {...register('nomePerfil')}
          />
        </CampoRotulado>
        <CampoRotulado
          id={`${prefixo}-endereco`}
          rotulo="Endereço da carteira"
          obrigatorio
          classeRotulo={ESPACO_ROTULO}
          erro={errors.endereco?.message}
        >
          <Entrada
            id={`${prefixo}-endereco`}
            placeholder="Endereço 0x da carteira"
            erro={errors.endereco?.message}
            {...register('endereco')}
          />
        </CampoRotulado>
        <CampoRotulado
          id={`${prefixo}-secundaria`}
          rotulo={DICA_CARTEIRA_SECUNDARIA}
          rotuloOculto
          classeRotulo={ESPACO_ROTULO}
        >
          <Entrada
            id={`${prefixo}-secundaria`}
            placeholder={telaDesktop ? DICA_CARTEIRA_SECUNDARIA : DICA_CARTEIRA_SECUNDARIA_CURTA}
            {...register('carteiraSecundaria')}
          />
        </CampoRotulado>
        <CampoRotulado
          id={`${prefixo}-tipo`}
          rotulo="Tipo de carteira"
          obrigatorio
          classeRotulo={ESPACO_ROTULO}
          erro={errors.tipo?.message}
        >
          <Seletor
            id={`${prefixo}-tipo`}
            control={control}
            nome="tipo"
            texto="Selecione uma carteira"
            opcoes={TIPOS}
            erro={errors.tipo?.message}
            classeSeta={SETA_CHEIA}
          />
        </CampoRotulado>
        <CampoRotulado
          id={`${prefixo}-indicacao`}
          rotulo="Código de indicação"
          obrigatorio
          classeRotulo={ESPACO_ROTULO}
          erro={errors.codigoIndicacao?.message}
        >
          <Entrada
            id={`${prefixo}-indicacao`}
            erro={errors.codigoIndicacao?.message}
            {...register('codigoIndicacao')}
          />
        </CampoRotulado>
        <CampoRotulado
          id={`${prefixo}-email`}
          rotulo="E-mail"
          obrigatorio
          classeRotulo={ESPACO_ROTULO}
          erro={errors.email?.message}
        >
          <Entrada
            id={`${prefixo}-email`}
            type="email"
            erro={errors.email?.message}
            {...register('email')}
          />
        </CampoRotulado>
        <CampoRotulado
          id={`${prefixo}-ens`}
          rotulo="Nome ENS"
          obrigatorio
          classeRotulo={ESPACO_ROTULO}
          erro={errors.nomeEns?.message}
        >
          <div className="flex gap-2.5">
            <Seletor
              id={`${prefixo}-ens-sufixo`}
              control={control}
              nome="sufixoEns"
              texto=".eth"
              opcoes={OPCOES_SUFIXO_ENS}
              classeCaixa="w-auto min-w-[78px] shrink-0 pr-7 pl-2.5 text-[15px]"
              classeSeta="right-[4px] size-5 text-foreground"
            />
            <Entrada
              id={`${prefixo}-ens`}
              erro={errors.nomeEns?.message}
              {...register('nomeEns')}
            />
          </div>
        </CampoRotulado>
      </div>
      <button
        type="submit"
        disabled={envio.isPending}
        className="mt-8 h-10 w-[131px] rounded-[3px] bg-primary text-sm leading-4 font-bold text-primary-foreground hover:bg-primaria-clara disabled:opacity-50"
      >
        Salvar carteira
      </button>
    </form>
  );
}

// ====================================================================
// 3. TELA DAS CARTEIRAS
// "Adicionar" do topo foca a principal, ou abre a secundária quando a
// principal já existe. "Igual à principal" abre a secundária preenchida,
// para o usuário só ajustar o que muda. Nada é salvo sem "Salvar carteira".
// ====================================================================
function CarteirasCarregadas({ carteiras }: { carteiras: Carteira[] }) {
  const principal = carteiras.find((carteira) => carteira.papel === 'principal');
  const secundaria = carteiras.find((carteira) => carteira.papel === 'secundaria');
  const [abrirSecundaria, setAbrirSecundaria] = useState(false);
  const [igualPrincipal, setIgualPrincipal] = useState(false);
  const mostrarSecundaria = Boolean(secundaria) || abrirSecundaria;
  const valoresSecundaria = secundaria
    ? valoresDe(secundaria)
    : valoresDe(igualPrincipal ? principal : undefined);

  function adicionarNoTopo() {
    if (principal) {
      setAbrirSecundaria(true);

      return;
    }

    document.getElementById('carteira-principal-exibicao')?.focus();
  }

  return (
    <>
      <div className="flex h-4 items-center justify-between">
        <h1 className="text-[17px] leading-5 font-bold">Carteira principal</h1>
        <button
          type="button"
          onClick={adicionarNoTopo}
          className="text-base leading-4 font-medium text-texto-destaque"
        >
          Adicionar
        </button>
      </div>
      <p className="mt-2 text-sm leading-[15px] text-muted-foreground">
        Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
      </p>

      <div className="mt-8">
        <FormularioDeCarteira
          papel="principal"
          carteira={principal}
          valoresIniciais={valoresDe(principal)}
        />
      </div>

      <section aria-labelledby="carteira-secundaria-titulo" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-y-2">
          <h2 id="carteira-secundaria-titulo" className="text-[17px] leading-4 font-bold">
            Carteira secundária
          </h2>
          {!secundaria && (
            <div className="flex items-center">
              <button
                type="button"
                aria-pressed={igualPrincipal}
                disabled={!principal}
                onClick={() => {
                  setIgualPrincipal((atual) => !atual);
                  setAbrirSecundaria(true);
                }}
                className="flex items-center gap-2 text-sm leading-4 disabled:cursor-not-allowed"
              >
                <span
                  aria-hidden
                  className={cn(
                    'size-4 rounded-full border-[1.5px] border-primary',
                    igualPrincipal && 'bg-primary',
                  )}
                />
                Igual à carteira principal
              </button>
              <button
                type="button"
                onClick={() => setAbrirSecundaria(true)}
                className="ml-2 text-base leading-4 font-medium text-texto-destaque"
              >
                Adicionar
              </button>
            </div>
          )}
        </div>
        {mostrarSecundaria ? (
          <div className="mt-6">
            <FormularioDeCarteira
              papel="secundaria"
              carteira={secundaria}
              valoresIniciais={valoresSecundaria}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm leading-[15px] text-muted-foreground">
            Você ainda não adicionou uma carteira secundária.
          </p>
        )}
      </section>
    </>
  );
}

export function PaginaCarteiras() {
  const usuarioId = useSessao()?.usuario.id;
  const consulta = useQuery({
    queryKey: ['usuario', usuarioId, 'carteiras'],
    queryFn: ({ signal }) => listarCarteiras(signal),
  });

  return (
    <LayoutConta>
      {consulta.isPending && (
        <div aria-busy="true" data-testid="carteiras-esqueleto" className="esqueleto h-[639px]" />
      )}
      {consulta.isError && (
        <div role="alert" data-testid="carteiras-erro">
          <p>Não foi possível carregar as carteiras.</p>
          <button
            type="button"
            onClick={() => void consulta.refetch()}
            className="mt-4 h-10 rounded-md bg-primary px-4 font-bold text-primary-foreground"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {consulta.data && <CarteirasCarregadas carteiras={consulta.data} />}
    </LayoutConta>
  );
}
