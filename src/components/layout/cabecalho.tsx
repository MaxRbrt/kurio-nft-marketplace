import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import { obterCarrinho } from '@/features/compra/api/carrinho';
import { BuscaDesktop } from '@/features/catalogo/components/busca-desktop';
import { useSessao } from '@/features/conta/usar-sessao';
import { IconeCarrinho, IconeEntrar } from '../icones/icones';
import { AcaoIndisponivel } from './acao-indisponivel';

const LINKS_INDISPONIVEIS = [
  { rotulo: 'Mercado', largura: 'w-[68px]' },
  { rotulo: 'Criadores', largura: 'w-[87px]' },
  { rotulo: 'Aprenda', largura: 'w-[68px]' },
];

// ====================================================================
// 1. CABEÇALHO
// Medidas do frame Desktop / Início: 1200 de largura, 45 de altura e
// divisória de 0,3 px com a aba ativa sobre ela. A contagem do carrinho
// soma as quantidades vindas da API.
// ====================================================================
export function Cabecalho() {
  const sessao = useSessao();
  const { pathname } = useLocation();
  const inicioAtivo = ['/', '/login', '/cadastro'].includes(pathname);
  const { data: carrinho } = useQuery({
    queryKey: ['carrinho', sessao?.usuario.id ?? 'visitante'],
    queryFn: ({ signal }) => obterCarrinho(signal),
  });
  const totalItens = carrinho?.itens.reduce((total, item) => total + item.quantidade, 0) ?? 0;
  const rotuloCarrinho = totalItens > 0 ? `Carrinho, ${totalItens} itens` : 'Carrinho, nenhum item';

  return (
    <header className="mx-auto mt-6 hidden w-full max-w-[1200px] px-4 lg:block xl:px-0">
      <div className="flex h-[45px] items-start justify-between">
        <Link
          to="/"
          data-testid="cabecalho-logo"
          className="flex h-[34px] w-[160px] items-center text-sm font-bold tracking-[0.1em] text-foreground"
        >
          KURIO
        </Link>

        <nav aria-label="Principal" data-testid="cabecalho-nav" className="flex gap-10">
          <Link
            to="/"
            aria-current={inicioAtivo ? 'page' : undefined}
            className={`relative h-[45px] w-[58px] text-base leading-[21px] ${
              inicioAtivo
                ? "font-bold text-texto-destaque after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[3px] after:bg-primary after:content-['']"
                : 'text-foreground'
            }`}
          >
            Início
          </Link>
          {LINKS_INDISPONIVEIS.map(({ rotulo, largura }) => (
            <AcaoIndisponivel
              key={rotulo}
              className={`${largura} cursor-not-allowed self-start text-left text-base leading-[21px] text-foreground`}
            >
              {rotulo}
            </AcaoIndisponivel>
          ))}
        </nav>

        <div data-testid="cabecalho-acoes" className="flex h-[35px] items-center gap-7">
          <BuscaDesktop />

          <Link to="/carrinho" aria-label={rotuloCarrinho} className="relative h-6 w-[31px]">
            <IconeCarrinho className="text-foreground" />
            {totalItens > 0 && (
              <span
                data-testid="cabecalho-badge"
                className="absolute top-0 left-[15px] flex size-4 items-center justify-center rounded-full border-2 border-background bg-primary text-[10px] font-medium text-primary-foreground"
              >
                {totalItens}
              </span>
            )}
          </Link>

          {sessao ? (
            <Link
              to="/perfil"
              aria-label={`Perfil de ${sessao.usuario.nomeExibicao}`}
              data-testid="cabecalho-conta"
              className="flex size-[35px] items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground"
            >
              {sessao.usuario.nomeExibicao.charAt(0).toUpperCase()}
            </Link>
          ) : (
            <Link
              to="/login"
              data-testid="cabecalho-entrar"
              className="flex h-[35px] w-[100px] items-center justify-center gap-1 rounded-md bg-primary text-base font-medium text-primary-foreground hover:bg-primaria-clara"
            >
              <IconeEntrar />
              Entrar
            </Link>
          )}
        </div>
      </div>
      <div className="h-px bg-primary/30" />
    </header>
  );
}
