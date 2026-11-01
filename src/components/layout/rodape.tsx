import type { ReactNode } from 'react';
import {
  IconeFacebook,
  IconeInstagram,
  IconeLinkedin,
  IconeTwitter,
  IconeYoutube,
} from '../icones/icones';
import { AcaoIndisponivel } from './acao-indisponivel';

// ====================================================================
// 1. CONTEÚDO DO LAYOUT
// Textos exatos do frame. Nada do rodapé faz parte da entrega: todas as
// ações avisam que estão indisponíveis em vez de aparentar sucesso.
// ====================================================================
const SERVICOS = [
  {
    letra: 'W',
    titulo: 'Segurança da carteira',
    texto: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letra: 'C',
    titulo: 'Criadores em destaque',
    texto: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letra: 'D',
    titulo: 'Alertas de lançamentos',
    texto: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
];

const COLUNAS_LINKS = [
  {
    titulo: 'Meu perfil',
    itens: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'],
  },
  {
    titulo: 'Central de ajuda',
    itens: [
      'Central de ajuda',
      'Como comprar NFTs',
      'Carteira e segurança',
      'Política do mercado',
      'Denunciar item',
    ],
  },
  {
    titulo: 'Coleções',
    itens: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'],
  },
];

const REDES_SOCIAIS: Array<{ nome: string; icone: ReactNode; recuo: number }> = [
  { nome: 'Facebook', icone: <IconeFacebook />, recuo: 12 },
  { nome: 'Instagram', icone: <IconeInstagram />, recuo: 8 },
  { nome: 'Twitter', icone: <IconeTwitter />, recuo: 8 },
  { nome: 'LinkedIn', icone: <IconeLinkedin />, recuo: 8 },
  { nome: 'YouTube', icone: <IconeYoutube />, recuo: 6 },
];

// ====================================================================
// 2. RODAPÉ
// Medidas do frame Desktop / Início. Em 1200 px segue as colunas exatas;
// abaixo disso quebram, sem overflow. Botões sociais têm borda por fora
// e ícones no recuo de cada um no frame, sem centralizar.
// ====================================================================
export function Rodape() {
  return (
    <footer
      data-testid="rodape"
      className="mx-auto mt-24 hidden w-full max-w-[1200px] px-4 pb-6 lg:block xl:px-0"
    >
      <section
        data-testid="rodape-servicos"
        aria-label="Serviços e novidades"
        className="bg-card p-8 xl:h-[250px] xl:pb-4"
      >
        <div className="flex flex-wrap gap-y-8 xl:w-[1155px] xl:flex-nowrap">
          {SERVICOS.map((servico) => (
            <div
              key={servico.letra}
              className="w-full px-4 sm:w-1/2 xl:h-[202px] xl:w-[265.67px] xl:shrink-0 xl:border-r xl:border-primary"
            >
              <div className="flex size-[74px] items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {servico.letra}
              </div>
              <h2 className="mt-3 text-[17px] leading-4 font-bold text-foreground">
                {servico.titulo}
              </h2>
              <p className="mt-3 max-w-[204px] text-sm leading-[22px] text-muted-foreground">
                {servico.texto}
              </p>
            </div>
          ))}

          <form
            className="w-full px-4 xl:w-[357px] xl:shrink-0"
            onSubmit={(evento) => evento.preventDefault()}
          >
            <h2 className="text-lg leading-4 font-bold text-foreground xl:h-8">
              Antecipe-se ao próximo lançamento
            </h2>
            <div className="mt-4 flex h-10 items-center justify-between overflow-hidden rounded-md bg-secondary pl-3 shadow-[0_0_20px_rgba(10,6,4,0.45)] has-focus-visible:outline-2 has-focus-visible:outline-ring">
              <label htmlFor="rodape-email" className="sr-only">
                Seu e-mail
              </label>
              <input
                id="rodape-email"
                type="email"
                placeholder="digite seu e-mail..."
                className="min-w-0 flex-1 bg-transparent text-sm leading-4 text-foreground outline-none placeholder:text-secundaria"
              />
              <AcaoIndisponivel className="h-10 w-[85px] shrink-0 cursor-not-allowed bg-primary text-center text-lg leading-4 font-bold text-primary-foreground">
                Enviar
              </AcaoIndisponivel>
            </div>
            <p className="mt-3 text-[13px] leading-[22px] text-muted-foreground">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </form>
        </div>
      </section>

      <section
        data-testid="rodape-contato"
        aria-label="Contato"
        className="flex flex-wrap items-center gap-x-[92px] gap-y-4 bg-secondary p-8 xl:h-[88px] xl:flex-nowrap"
      >
        <p className="w-[211px] text-sm font-bold tracking-[0.1em] text-foreground">KURIO</p>
        <p className="w-[211px] text-sm leading-[22px] whitespace-pre text-foreground">
          {'Feito para colecionadores,\ncriadores e cultura'}
        </p>
        <p className="w-[211px] text-sm leading-[22px] text-foreground">contato@email.com</p>
        <p className="w-[228px] text-sm leading-[22px] text-foreground">+55 11 4002 8922</p>
      </section>

      <section
        data-testid="rodape-links"
        aria-label="Links"
        className="flex flex-wrap gap-x-[124px] gap-y-8 bg-card p-8 xl:h-[236px] xl:flex-nowrap"
      >
        {COLUNAS_LINKS.map((coluna) => (
          <div key={coluna.titulo} className="w-[179px]">
            <h2 className="text-lg leading-4 font-bold text-foreground">{coluna.titulo}</h2>
            <ul className="mt-2">
              {coluna.itens.map((item) => (
                <li key={item}>
                  <AcaoIndisponivel className="cursor-not-allowed text-left text-sm leading-[30px] text-foreground">
                    {item}
                  </AcaoIndisponivel>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="w-[228px]">
          <h2 className="text-lg leading-4 font-bold text-foreground">Redes sociais</h2>
          <ul className="mt-5 flex gap-2.5">
            {REDES_SOCIAIS.map((rede) => (
              <li key={rede.nome}>
                <AcaoIndisponivel
                  aria-label={rede.nome}
                  style={{ paddingLeft: rede.recuo }}
                  className="flex size-[30px] cursor-not-allowed items-start rounded pt-2 text-primary outline outline-primary"
                >
                  {rede.icone}
                </AcaoIndisponivel>
              </li>
            ))}
          </ul>

          <h2 className="mt-8 text-lg leading-4 font-bold text-foreground">
            Carteiras compatíveis
          </h2>
          <p className="mt-3 flex h-[26px] items-center justify-center rounded-md border border-borda-suave bg-secondary text-[9px] font-bold tracking-[0.1px] whitespace-pre text-texto-destaque">
            {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
          </p>
        </div>
      </section>

      <p className="mt-1.5 text-center text-sm leading-[30px] text-foreground">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  );
}
