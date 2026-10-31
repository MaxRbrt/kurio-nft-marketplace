import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { entradaLoginSchema, type EntradaLogin } from '@/contracts/conta/sessao';
import { ErroApi } from '@/lib/api/erros';
import { entrar } from '../api/sessao';
import { useAbrirSessao } from '../usar-sessao';
import { Campo, EntradasSociais } from './campos';

const MENSAGEM_FALHA = 'Não foi possível entrar. Tente novamente.';

// ====================================================================
// 1. FORMULÁRIO DE LOGIN
// Campos e textos dos frames. Validação local antes de enviar, e erro
// de credencial sem indicar se foi o e-mail ou a senha. Em sucesso, quem
// abriu o formulário decide para onde voltar.
// ====================================================================
export function FormularioLogin({ aoEntrar }: { aoEntrar: () => void }) {
  const abrirSessao = useAbrirSessao();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EntradaLogin>({ resolver: zodResolver(entradaLoginSchema) });

  const envio = useMutation({
    mutationFn: entrar,
    onSuccess: async (sessao) => {
      await abrirSessao(sessao);
      aoEntrar();
    },
    onError: (erro) => {
      setError('root', {
        message: erro instanceof ErroApi && erro.status === 401 ? erro.message : MENSAGEM_FALHA,
      });
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((dados) => envio.mutate(dados))}>
      <div className="flex flex-col gap-3">
        <Campo
          id="login-email"
          type="email"
          rotulo="E-mail"
          placeholder="contato@email.com"
          autoComplete="email"
          erro={errors.email?.message}
          {...register('email')}
        />
        <Campo
          id="login-senha"
          type="password"
          rotulo="Senha"
          placeholder="***********"
          autoComplete="current-password"
          alternarSenha="sempre"
          erro={errors.senha?.message}
          {...register('senha')}
        />
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          aria-disabled="true"
          title="Indisponível nesta versão"
          onClick={() => toast.info('Indisponível nesta versão')}
          className="cursor-not-allowed text-sm leading-4 text-texto-destaque"
        >
          Esqueceu a senha?
        </button>
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
        Entrar
      </button>

      <EntradasSociais espacamento="gap-4 lg:gap-3" />
    </form>
  );
}
