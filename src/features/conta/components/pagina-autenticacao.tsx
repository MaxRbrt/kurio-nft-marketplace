import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useSyncExternalStore } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { IconeFechar } from '@/components/icones/icones';
import { PaginaInicial } from '@/features/catalogo/components/pagina-inicial';
import { cn } from '@/lib/utils';
import type { BuscaAutenticacao } from '../destino';
import { FormularioCadastro } from './formulario-cadastro';
import { FormularioLogin } from './formulario-login';

type Modo = 'login' | 'cadastro';

const CONSULTA_DESKTOP = '(min-width: 1024px)';

function useTelaDesktop() {
  return useSyncExternalStore(
    (avisar) => {
      const consulta = window.matchMedia(CONSULTA_DESKTOP);

      consulta.addEventListener('change', avisar);

      return () => consulta.removeEventListener('change', avisar);
    },
    () => window.matchMedia(CONSULTA_DESKTOP).matches,
  );
}

const TEXTOS: Record<Modo, { titulo: string; subtitulo: string }> = {
  login: {
    titulo: 'Entrar',
    subtitulo: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  },
  cadastro: {
    titulo: 'Criar conta',
    subtitulo: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
};

// ====================================================================
// 1. MODAL DO DESKTOP
// Nos frames, login e cadastro são abas de um modal sobre a tela inicial.
// O foco entra no próprio diálogo, sem destacar campo que o frame não
// destaca. Radix prende o foco e fecha com Esc; a rota segue própria.
// Em tela mais baixa que o frame, o modal cabe na tela e rola por dentro.
// O centro desconta a reserva da barra de rolagem e cai em pixel inteiro:
// em meio pixel, o texto do modal borra.
// ====================================================================
function ModalAutenticacao({ modo, busca, aoConcluir, aoFechar }: PropsConteudo) {
  const aba = (destino: Modo, rotulo: string) => (
    <Link
      to={destino === 'login' ? '/login' : '/cadastro'}
      search={busca}
      replace
      aria-current={modo === destino ? 'page' : undefined}
      className={cn(
        'text-xl leading-4 font-medium',
        modo === destino ? 'text-texto-destaque' : 'text-foreground',
      )}
    >
      {rotulo}
    </Link>
  );

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(evento) => {
          evento.preventDefault();
          (evento.currentTarget as HTMLElement | null)?.focus();
        }}
        data-testid="modal-autenticacao"
        className={cn(
          'left-[round(down,calc(50%-var(--removed-body-scroll-bar-size,0px)/2),1px)] block w-[500px] max-w-[500px] translate-y-0 gap-0 rounded-none bg-card p-0 ring-0 sm:max-w-[500px]',
          'overflow-y-auto',
          modo === 'login'
            ? 'top-[160px] max-h-[calc(100dvh-176px)] min-h-[min(600px,calc(100dvh-176px))]'
            : 'top-[158px] max-h-[calc(100dvh-174px)] min-h-[min(656px,calc(100dvh-174px))] rounded-lg',
        )}
      >
        <DialogClose
          aria-label="Fechar"
          className={cn(
            'absolute top-[11px] size-[18px] text-primary',
            modo === 'login' ? 'right-3' : 'right-[13px]',
          )}
        >
          <IconeFechar />
        </DialogClose>

        <div className="flex items-center justify-center gap-2 pt-12">
          {aba('login', 'Entrar')}
          <span aria-hidden className="h-5 w-px bg-texto-coral" />
          {aba('cadastro', 'Criar conta')}
        </div>

        <DialogTitle className="sr-only">{TEXTOS[modo].titulo}</DialogTitle>
        <DialogDescription className="mx-auto mt-10 w-[404px] text-center text-[13px] leading-4 text-foreground">
          {TEXTOS[modo].subtitulo}
        </DialogDescription>

        <div className="px-20 pt-6 pb-[43px]">
          {modo === 'login' ? (
            <FormularioLogin aoEntrar={aoConcluir} />
          ) : (
            <FormularioCadastro aoCriar={aoConcluir} />
          )}
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2.5 bg-primary" />
      </DialogContent>
    </Dialog>
  );
}

// ====================================================================
// 2. TELA DO MOBILE
// Nos frames mobile é tela inteira, com logotipo e sem barra inferior.
// ====================================================================
function TelaMobile({ modo, busca, aoConcluir }: PropsConteudo) {
  return (
    <main data-testid="tela-autenticacao" className="mx-auto w-full max-w-[414px] px-7 pb-6">
      <p className="pt-[127px] pl-[0.1em] text-center text-[32px] leading-[42px] font-bold tracking-[0.1em]">
        KURIO
      </p>
      <h1
        className={cn(
          'mt-[87px] text-center font-bold',
          modo === 'login' ? 'text-xl/4' : 'text-lg/4',
        )}
      >
        {modo === 'login' ? 'Entrar' : 'Criar perfil de colecionador'}
      </h1>
      <div className="mt-10">
        {modo === 'login' ? (
          <FormularioLogin aoEntrar={aoConcluir} />
        ) : (
          <FormularioCadastro aoCriar={aoConcluir} />
        )}
      </div>
      <p className="mt-10 text-center text-[15px] leading-5 text-muted-foreground">
        {modo === 'login' ? (
          <Link to="/cadastro" search={busca} replace>
            Novo na Kurio? Crie uma conta
          </Link>
        ) : (
          <Link to="/login" search={busca} replace>
            Já tem uma conta? Entre
          </Link>
        )}
      </p>
    </main>
  );
}

type PropsConteudo = {
  modo: Modo;
  busca: BuscaAutenticacao;
  aoConcluir: () => void;
  aoFechar: () => void;
};

// ====================================================================
// 3. ROTA DE LOGIN E CADASTRO
// No desktop, o modal abre sobre a Início real, que não muda ao abrir: fica
// inerte e fora da árvore acessível. No mobile, a tela é própria.
// ====================================================================
export function PaginaAutenticacao({ modo, busca }: { modo: Modo; busca: BuscaAutenticacao }) {
  const navigate = useNavigate();
  const router = useRouter();
  const desktop = useTelaDesktop();
  const aoConcluir = () => void navigate({ to: busca.redirect ?? '/' });
  const aoFechar = () => {
    if (router.history.canGoBack()) {
      router.history.back();

      return;
    }

    void navigate({ to: '/' });
  };
  const propriedades = { modo, busca, aoConcluir, aoFechar };

  if (!desktop) {
    return <TelaMobile {...propriedades} />;
  }

  return (
    <>
      <div aria-hidden inert>
        <PaginaInicial />
      </div>
      <ModalAutenticacao {...propriedades} />
    </>
  );
}
