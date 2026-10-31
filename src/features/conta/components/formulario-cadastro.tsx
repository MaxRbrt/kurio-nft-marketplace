import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { entradaCadastroSchema, type EntradaCadastro } from '@/contracts/conta/sessao';
import { ErroApi } from '@/lib/api/erros';
import { cadastrar } from '../api/sessao';
import { useAbrirSessao } from '../usar-sessao';
import { Campo, EntradasSociais } from './campos';

const MENSAGEM_FALHA = 'Não foi possível criar a conta. Tente novamente.';

// ====================================================================
// 1. FORMULÁRIO DE CADASTRO
// Conflito da API, como e-mail em uso, aparece no próprio campo. Falha
// sem campo vira mensagem geral, e os dados digitados continuam ali.
// ====================================================================
export function FormularioCadastro({ aoCriar }: { aoCriar: () => void }) {
  const abrirSessao = useAbrirSessao();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EntradaCadastro>({ resolver: zodResolver(entradaCadastroSchema) });

  const envio = useMutation({
    mutationFn: cadastrar,
    onSuccess: async (sessao) => {
      await abrirSessao(sessao);
      aoCriar();
    },
    onError: (erro) => {
      const campos = erro instanceof ErroApi ? Object.entries(erro.campos) : [];

      if (campos.length === 0) {
        setError('root', { message: MENSAGEM_FALHA });
      }

      for (const [campo, mensagem] of campos) {
        setError(campo as keyof EntradaCadastro, { message: mensagem }, { shouldFocus: true });
      }
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((dados) => envio.mutate(dados))}>
      <div className="flex flex-col gap-3">
        <Campo
          id="cadastro-usuario"
          rotulo="Nome de usuário"
          placeholder="Nome de usuário"
          autoComplete="username"
          className="max-lg:placeholder:text-center"
          erro={errors.nomeUsuario?.message}
          {...register('nomeUsuario')}
        />
        <Campo
          id="cadastro-email"
          type="email"
          rotulo="E-mail"
          placeholder="Digite seu e-mail"
          autoComplete="email"
          erro={errors.email?.message}
          {...register('email')}
        />
        <Campo
          id="cadastro-senha"
          type="password"
          rotulo="Senha"
          placeholder="Senha"
          autoComplete="new-password"
          alternarSenha="sempre"
          erro={errors.senha?.message}
          {...register('senha')}
        />
        <Campo
          id="cadastro-confirmar"
          type="password"
          rotulo="Confirmar senha"
          placeholder="Confirmar senha"
          autoComplete="new-password"
          alternarSenha="mobile"
          erro={errors.confirmarSenha?.message}
          {...register('confirmarSenha')}
        />
      </div>

      {errors.root?.message && (
        <p role="alert" className="mt-3 text-sm leading-5 text-texto-coral">
          {errors.root.message}
        </p>
      )}

      <button
        type="submit"
        disabled={envio.isPending}
        className="mt-10 h-[60px] w-full rounded-[10px] bg-primary text-base leading-4 font-bold text-primary-foreground hover:bg-primaria-clara disabled:opacity-60 lg:mt-6 lg:h-[45px] lg:rounded-[5px]"
      >
        <span className="lg:hidden">Criar perfil</span>
        <span className="hidden lg:inline">Criar conta</span>
      </button>

      <EntradasSociais espacamento="gap-4" />
    </form>
  );
}
