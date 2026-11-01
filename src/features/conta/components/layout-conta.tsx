import { Link, useLocation } from '@tanstack/react-router';
import type { ComponentType, ReactNode } from 'react';
import {
  IconeMenuAtividade,
  IconeMenuBaixar,
  IconeMenuCompras,
  IconeMenuCoracao,
  IconeMenuLocal,
  IconeMenuSair,
  IconeMenuSuporte,
  IconeMenuUsuario,
} from '@/components/icones/icones';
import { AcaoIndisponivel } from '@/components/layout/acao-indisponivel';
import { cn } from '@/lib/utils';
import { useSair } from '../usar-sessao';

const LINKS = [
  { rotulo: 'Dados do perfil', para: '/perfil', Icone: IconeMenuUsuario },
  { rotulo: 'Carteiras', para: '/carteiras', Icone: IconeMenuLocal },
] as const;

const INDISPONIVEIS: Array<{ rotulo: string; Icone: ComponentType<{ className?: string }> }> = [
  { rotulo: 'Atividade', Icone: IconeMenuCompras },
  { rotulo: 'Lista de interesse', Icone: IconeMenuCoracao },
  { rotulo: 'Ofertas', Icone: IconeMenuAtividade },
  { rotulo: 'Arquivos baixados', Icone: IconeMenuBaixar },
  { rotulo: 'Suporte', Icone: IconeMenuSuporte },
];

const CLASSE_LINHA =
  'relative flex h-[45px] w-full items-center pl-[46px] text-left text-[15px] leading-[45px] text-texto-destaque';
const CLASSE_ICONE = 'absolute top-1/2 left-4 -translate-y-1/2 text-secundaria';

// ====================================================================
// 1. MENU DA CONTA
// Frame de 310 x 407. O recuo do texto é o mesmo em todas as linhas (ver
// ARCHITECTURE.md). Itens fora do escopo avisam em vez de aparentar sucesso.
// ====================================================================
function MenuConta() {
  const { pathname } = useLocation();
  const sair = useSair();

  return (
    <nav
      aria-label="Conta"
      data-testid="menu-conta"
      className="hidden h-[407px] w-[310px] shrink-0 bg-card pt-[18px] lg:block"
    >
      <p className="pl-2.5 text-lg leading-4 font-bold">Meu perfil</p>
      <ul className="mt-2.5">
        {LINKS.map(({ rotulo, para, Icone }) => {
          const ativo = pathname === para;

          return (
            <li key={para}>
              <Link
                to={para}
                aria-current={ativo ? 'page' : undefined}
                className={cn(
                  CLASSE_LINHA,
                  ativo &&
                    "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-primary before:content-['']",
                )}
              >
                <Icone className={CLASSE_ICONE} />
                {rotulo}
              </Link>
            </li>
          );
        })}
        {INDISPONIVEIS.map(({ rotulo, Icone }) => (
          <li key={rotulo}>
            <AcaoIndisponivel className={cn(CLASSE_LINHA, 'cursor-not-allowed')}>
              <Icone className={CLASSE_ICONE} />
              {rotulo}
            </AcaoIndisponivel>
          </li>
        ))}
      </ul>
      <div className="border-t border-primary/25 pt-2.5">
        <button
          type="button"
          onClick={() => sair.mutate()}
          className="relative block h-5 w-full pb-0.5 pl-[46px] text-left text-[15px] leading-[15px] font-bold text-texto-destaque"
        >
          <IconeMenuSair className="absolute top-0 left-4 text-primary" />
          Sair
        </button>
      </div>
    </nav>
  );
}

// ====================================================================
// 2. NAVEGAÇÃO DO MOBILE
// Sem frame: abas no padrão da Início, com o mesmo destaque e sublinhado.
// O espaço final reserva a barra inferior.
// ====================================================================
function AbasConta() {
  const { pathname } = useLocation();
  const sair = useSair();

  return (
    <nav
      aria-label="Conta"
      className="flex items-center gap-4 border-b border-primary/25 lg:hidden"
    >
      {LINKS.map(({ rotulo, para }) => (
        <Link
          key={para}
          to={para}
          aria-current={pathname === para ? 'page' : undefined}
          className={cn(
            'relative py-3 text-sm leading-4',
            pathname === para &&
              "font-bold text-texto-destaque after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary after:content-['']",
          )}
        >
          {rotulo}
        </Link>
      ))}
      <button
        type="button"
        onClick={() => sair.mutate()}
        className="ml-auto py-3 text-sm leading-4 font-bold text-texto-destaque"
      >
        Sair
      </button>
    </nav>
  );
}

export function LayoutConta({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 pt-6 pb-[150px] lg:mt-8 lg:flex lg:gap-7 lg:px-4 lg:pt-0 lg:pb-[253px] xl:px-0">
      <MenuConta />
      <AbasConta />
      <main className="mt-6 min-w-0 flex-1 lg:mt-0 lg:w-[862px]">{children}</main>
    </div>
  );
}
