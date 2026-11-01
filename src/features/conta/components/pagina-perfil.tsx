import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  CampoRotulado,
  Entrada,
  EntradaSenha,
  Seletor,
} from '@/components/formulario/campos-formulario';
import { IconeAvatarImagem } from '@/components/icones/icones';
import { entradaSenhaSchema, type Perfil } from '@/contracts/conta/perfil';
import { ErroApi } from '@/lib/api/erros';
import { alterarSenha, obterPerfil, salvarAvatar, salvarPerfil } from '../api/perfil';
import { CHAVE_SESSAO } from '../api/sessao';
import { OPCOES_SUFIXO_ENS, separarEns, SUFIXOS_ENS } from '../ens';
import { useSessao } from '../usar-sessao';
import { LayoutConta } from './layout-conta';

const TAMANHO_MAXIMO_AVATAR = 2 * 1024 * 1024;
const obrigatorio = (mensagem: string) => z.string().trim().min(1, mensagem);

// ====================================================================
// 1. VALIDAÇÃO
// Obrigatórios seguem os asteriscos do frame. A troca de senha só entra
// em jogo com a senha nova preenchida: o navegador costuma preencher a
// atual sozinho, e isso não pode impedir de salvar o perfil.
// ====================================================================
const formularioPerfilSchema = z
  .object({
    nomeExibicao: obrigatorio('Informe o nome de exibição'),
    nomeUsuario: z.string().trim().min(3, 'Informe ao menos 3 caracteres'),
    email: z.email('E-mail inválido'),
    nomeEns: obrigatorio('Informe o nome ENS'),
    sufixoEns: z.enum(SUFIXOS_ENS),
    apelidoCarteira: obrigatorio('Informe o apelido da carteira'),
    senhaAtual: z.string(),
    novaSenha: z.string(),
    confirmarNovaSenha: z.string(),
  })
  .superRefine(({ senhaAtual, novaSenha, confirmarNovaSenha }, contexto) => {
    if (!novaSenha && !confirmarNovaSenha) {
      return;
    }

    const leitura = entradaSenhaSchema.safeParse({ senhaAtual, novaSenha, confirmarNovaSenha });

    leitura.error?.issues.forEach((problema) => contexto.addIssue({ ...problema, code: 'custom' }));
  });
type FormularioPerfil = z.infer<typeof formularioPerfilSchema>;

// ====================================================================
// 2. AVATAR
// A imagem vira data URL, pois não há armazenamento de arquivos na
// simulação. Tipo e tamanho são conferidos antes de enviar.
// ====================================================================
function lerArquivo(arquivo: File) {
  return new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    leitor.readAsDataURL(arquivo);
  });
}

function CampoAvatar({ perfil }: { perfil: Perfil }) {
  const clienteConsultas = useQueryClient();
  const usuarioId = useSessao()?.usuario.id;
  const seletorArquivo = useRef<HTMLInputElement>(null);
  const envio = useMutation({
    mutationFn: salvarAvatar,
    onSuccess: async (atualizado) => {
      clienteConsultas.setQueryData(['usuario', usuarioId, 'perfil'], atualizado);
      await clienteConsultas.invalidateQueries({ queryKey: CHAVE_SESSAO });
      toast.success(atualizado.avatarUrl ? 'Avatar atualizado.' : 'Avatar removido.');
    },
    onError: (erro) => {
      toast.error(erro instanceof ErroApi ? erro.message : 'Não foi possível salvar o avatar.');
    },
  });

  async function aoEscolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];

    evento.target.value = '';

    if (!arquivo) {
      return;
    }

    if (!arquivo.type.startsWith('image/') || arquivo.size > TAMANHO_MAXIMO_AVATAR) {
      toast.error('Escolha uma imagem de até 2 MB.');

      return;
    }

    envio.mutate(await lerArquivo(arquivo));
  }

  return (
    <div className="flex h-[75px] flex-col">
      <p className="text-[15px] leading-[15px]">Avatar</p>
      <div className="mt-2.5 flex h-[50px] items-center">
        <span className="flex size-[50px] items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-primary">
          {perfil.avatarUrl ? (
            <img
              data-testid="avatar-imagem"
              src={perfil.avatarUrl}
              alt="Avatar atual"
              className="size-full object-cover"
            />
          ) : (
            <IconeAvatarImagem />
          )}
        </span>
        <input
          ref={seletorArquivo}
          type="file"
          accept="image/*"
          aria-label="Escolher imagem do avatar"
          className="sr-only"
          onChange={(evento) => void aoEscolherArquivo(evento)}
        />
        <button
          type="button"
          disabled={envio.isPending}
          onClick={() => seletorArquivo.current?.click()}
          className="ml-6 h-10 w-[98px] rounded-[3px] bg-primary text-sm leading-4 font-bold text-primary-foreground hover:bg-primaria-clara disabled:opacity-50"
        >
          Alterar
        </button>
        <button
          type="button"
          disabled={envio.isPending || !perfil.avatarUrl}
          onClick={() => envio.mutate(null)}
          className="ml-5 text-sm leading-4 disabled:cursor-not-allowed"
        >
          Remover
        </button>
      </div>
    </div>
  );
}

// ====================================================================
// 3. FORMULÁRIO DO PERFIL
// Perfil e senha têm um botão só, como no frame. Salva o perfil e depois a
// senha: erro da API volta ao campo certo, e o que já foi salvo continua.
// ====================================================================
function FormularioPerfilCarregado({ perfil }: { perfil: Perfil }) {
  const clienteConsultas = useQueryClient();
  const usuarioId = useSessao()?.usuario.id;
  const {
    register,
    handleSubmit,
    control,
    setError,
    resetField,
    formState: { errors },
  } = useForm<FormularioPerfil>({
    resolver: zodResolver(formularioPerfilSchema),
    defaultValues: {
      nomeExibicao: perfil.nomeExibicao,
      nomeUsuario: perfil.nomeUsuario,
      email: perfil.email,
      apelidoCarteira: perfil.apelidoCarteira ?? '',
      ...separarEns(perfil.nomeEns),
      senhaAtual: '',
      novaSenha: '',
      confirmarNovaSenha: '',
    },
  });

  const envio = useMutation({
    mutationFn: async (dados: FormularioPerfil) => {
      const atualizado = await salvarPerfil({
        nomeExibicao: dados.nomeExibicao,
        nomeUsuario: dados.nomeUsuario,
        email: dados.email,
        nomeEns: `${dados.nomeEns}${dados.sufixoEns}`,
        apelidoCarteira: dados.apelidoCarteira,
      });

      clienteConsultas.setQueryData(['usuario', usuarioId, 'perfil'], atualizado);

      if (dados.novaSenha) {
        await alterarSenha({
          senhaAtual: dados.senhaAtual,
          novaSenha: dados.novaSenha,
          confirmarNovaSenha: dados.confirmarNovaSenha,
        });
      }
    },
    onSuccess: async () => {
      resetField('senhaAtual');
      resetField('novaSenha');
      resetField('confirmarNovaSenha');
      await clienteConsultas.invalidateQueries({ queryKey: CHAVE_SESSAO });
      toast.success('Perfil salvo.');
    },
    onError: (erro) => {
      const campos = erro instanceof ErroApi ? Object.entries(erro.campos) : [];

      campos.forEach(([campo, message], indice) =>
        setError(campo as keyof FormularioPerfil, { message }, { shouldFocus: indice === 0 }),
      );

      if (campos.length === 0) {
        toast.error('Não foi possível salvar o perfil. Tente novamente.');
      }
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((dados) => envio.mutate(dados))}>
      <h1 className="text-base leading-4 font-bold">Perfil do colecionador</h1>

      <div className="mt-8 grid grid-cols-1 gap-x-7 gap-y-6 xl:grid-cols-2">
        <CampoRotulado
          id="perfil-exibicao"
          rotulo="Nome de exibição"
          obrigatorio
          erro={errors.nomeExibicao?.message}
          classeRotulo="mb-2.5"
        >
          <Entrada
            id="perfil-exibicao"
            autoComplete="name"
            erro={errors.nomeExibicao?.message}
            {...register('nomeExibicao')}
          />
        </CampoRotulado>
        <CampoRotulado
          id="perfil-usuario"
          rotulo="Nome de usuário"
          obrigatorio
          erro={errors.nomeUsuario?.message}
          classeRotulo="mb-2.5"
        >
          <Entrada
            id="perfil-usuario"
            autoComplete="username"
            erro={errors.nomeUsuario?.message}
            {...register('nomeUsuario')}
          />
        </CampoRotulado>
        <CampoRotulado
          id="perfil-email"
          rotulo="E-mail"
          obrigatorio
          erro={errors.email?.message}
          classeRotulo="mb-2.5"
        >
          <Entrada
            id="perfil-email"
            type="email"
            autoComplete="email"
            erro={errors.email?.message}
            {...register('email')}
          />
        </CampoRotulado>
        <CampoRotulado
          id="perfil-ens"
          rotulo="Nome ENS"
          obrigatorio
          erro={errors.nomeEns?.message}
          classeRotulo="mb-2.5"
        >
          <div className="flex gap-2.5">
            <Seletor
              id="perfil-ens-sufixo"
              control={control}
              nome="sufixoEns"
              texto=".eth"
              opcoes={OPCOES_SUFIXO_ENS}
              classeCaixa="w-[78px] shrink-0 pr-0 pl-2.5 text-[15px]"
              classeSeta="right-[4px] size-5 text-foreground"
            />
            <Entrada id="perfil-ens" erro={errors.nomeEns?.message} {...register('nomeEns')} />
          </div>
        </CampoRotulado>
        <CampoRotulado
          id="perfil-apelido"
          rotulo="Apelido da carteira"
          obrigatorio
          erro={errors.apelidoCarteira?.message}
          classeRotulo="mb-2.5"
        >
          <Entrada
            id="perfil-apelido"
            erro={errors.apelidoCarteira?.message}
            {...register('apelidoCarteira')}
          />
        </CampoRotulado>
        <CampoAvatar perfil={perfil} />
      </div>

      <fieldset className="mt-8 xl:w-[417px]">
        <legend className="text-base leading-4 font-medium">Alterar senha</legend>
        <div className="mt-6 flex flex-col gap-6">
          <div>
            <label htmlFor="perfil-senha-atual" className="block text-[15px] leading-[15px]">
              Senha atual
            </label>
            <div className="mt-3">
              <EntradaSenha
                id="perfil-senha-atual"
                rotulo="senha atual"
                autoComplete="current-password"
                erro={errors.senhaAtual?.message}
                {...register('senhaAtual')}
              />
            </div>
            {errors.senhaAtual?.message && (
              <p id="perfil-senha-atual-erro" className="mt-1 text-sm leading-5 text-texto-coral">
                Erro: {errors.senhaAtual.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="perfil-nova-senha" className="block text-[15px] leading-[15px]">
              Nova senha
            </label>
            <div className="mt-3">
              <EntradaSenha
                id="perfil-nova-senha"
                rotulo="nova senha"
                autoComplete="new-password"
                erro={errors.novaSenha?.message}
                {...register('novaSenha')}
              />
            </div>
            {errors.novaSenha?.message && (
              <p id="perfil-nova-senha-erro" className="mt-1 text-sm leading-5 text-texto-coral">
                Erro: {errors.novaSenha.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="perfil-confirmar-senha" className="block text-[15px] leading-[15px]">
              Confirmar nova senha
            </label>
            <div className="mt-3">
              <EntradaSenha
                id="perfil-confirmar-senha"
                rotulo="confirmação da nova senha"
                autoComplete="new-password"
                erro={errors.confirmarNovaSenha?.message}
                {...register('confirmarNovaSenha')}
              />
            </div>
            {errors.confirmarNovaSenha?.message && (
              <p
                id="perfil-confirmar-senha-erro"
                className="mt-1 text-sm leading-5 text-texto-coral"
              >
                Erro: {errors.confirmarNovaSenha.message}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={envio.isPending}
        className="mt-8 h-10 w-[131px] rounded-[3px] bg-primary text-sm leading-4 font-bold text-primary-foreground hover:bg-primaria-clara disabled:opacity-50"
      >
        Salvar
      </button>
    </form>
  );
}

// ====================================================================
// 4. TELA DO PERFIL
// Skeleton na altura do formulário; falha oferece nova tentativa.
// ====================================================================
export function PaginaPerfil() {
  const usuarioId = useSessao()?.usuario.id;
  const consulta = useQuery({
    queryKey: ['usuario', usuarioId, 'perfil'],
    queryFn: ({ signal }) => obterPerfil(signal),
  });

  return (
    <LayoutConta>
      {consulta.isPending && (
        <div aria-busy="true" data-testid="perfil-esqueleto" className="esqueleto h-[726px]" />
      )}
      {consulta.isError && (
        <div role="alert" data-testid="perfil-erro">
          <p>Não foi possível carregar o perfil.</p>
          <button
            type="button"
            onClick={() => void consulta.refetch()}
            className="mt-4 h-10 rounded-md bg-primary px-4 font-bold text-primary-foreground"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {consulta.data && <FormularioPerfilCarregado perfil={consulta.data} />}
    </LayoutConta>
  );
}
