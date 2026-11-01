import Big from 'big.js';
import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import type { Categoria } from '@/contracts/catalogo/nfts';
import type { Rede } from '@/contracts/comum/valores';
import {
  PRECO_MAXIMO_LAYOUT,
  PRECO_MINIMO_LAYOUT,
  ROTULOS_CATEGORIA,
  ROTULOS_REDE,
} from '../busca';
import { useFiltrosCatalogo, useListaNfts } from '../usar-catalogo';

// ====================================================================
// 1. ESCALA DO CONTROLE DE PREÇO
// O frame desenha o puxador de 12,30 ETH em x = 337, a três quartos da
// trilha. O teto da escala mantém essa posição, mas o valor para em
// 12,30: arrastar além disso não cria preço fora da faixa do layout.
// ====================================================================
const TETO_CONTROLE = 16.01;
const PASSO_PRECO = 0.01;
const PRECO_MAXIMO = Number(PRECO_MAXIMO_LAYOUT);
const PRECO_MINIMO = Number(PRECO_MINIMO_LAYOUT);

function limitarFaixa([minimo, maximo]: number[]) {
  return [Math.min(minimo, PRECO_MAXIMO - PASSO_PRECO), Math.min(maximo, PRECO_MAXIMO)];
}

function formatarPreco(valor: string) {
  return new Big(valor).toFixed(2).replace('.', ',');
}

function alternar<Item>(lista: Item[] | undefined, item: Item) {
  const atual = lista ?? [];
  const nova = atual.includes(item) ? atual.filter((valor) => valor !== item) : [...atual, item];

  return nova.length > 0 ? nova : undefined;
}

type PropsLinhaFiltro = {
  rotulo: string;
  contagem: number | undefined;
  ativo: boolean;
  contagemNegrito?: boolean;
  aoAlternar: () => void;
};

function LinhaFiltro({ rotulo, contagem, ativo, contagemNegrito, aoAlternar }: PropsLinhaFiltro) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoAlternar}
      className={`flex h-10 w-full items-center justify-between pl-3 text-[15px] leading-10 ${
        ativo ? 'text-texto-destaque underline' : 'text-muted-foreground'
      } hover:text-texto-destaque`}
    >
      <span>{rotulo}</span>
      <span className={contagemNegrito || ativo ? 'font-bold' : ''}>({contagem ?? '–'})</span>
    </button>
  );
}

// ====================================================================
// 2. FILTROS
// Combináveis, todos na URL. O preço só vale ao clicar em Aplicar, como
// no botão do layout. As contagens vêm das facetas da API.
// ====================================================================
export function PainelFiltros() {
  const { busca, alterarFiltros } = useFiltrosCatalogo();
  const { data } = useListaNfts();
  const [faixa, setFaixa] = useState(() =>
    limitarFaixa([
      Number(busca.precoMinimo ?? PRECO_MINIMO),
      Number(busca.precoMaximo ?? PRECO_MAXIMO),
    ]),
  );
  const categorias = Object.keys(ROTULOS_CATEGORIA) as Categoria[];
  const redes = Object.keys(ROTULOS_REDE) as Rede[];
  const minimo = faixa[0].toFixed(2);
  const maximo = faixa[1].toFixed(2);

  return (
    <div className="flex flex-col gap-10 bg-card p-5">
      <section aria-labelledby="filtro-colecoes">
        <h2 id="filtro-colecoes" className="text-lg leading-4 font-bold">
          Coleções
        </h2>
        <ul className="mt-3">
          {categorias.map((categoria) => (
            <li key={categoria} className="pr-3">
              <LinhaFiltro
                rotulo={ROTULOS_CATEGORIA[categoria]}
                contagem={data?.facetas.categorias[categoria]}
                ativo={busca.categorias?.includes(categoria) ?? false}
                contagemNegrito
                aoAlternar={() =>
                  alterarFiltros({ categorias: alternar(busca.categorias, categoria) })
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="filtro-preco">
        <h2 id="filtro-preco" className="text-lg leading-4 font-bold">
          Faixa de preço
        </h2>
        <div className="mt-3 pl-3">
          <Slider
            role="group"
            aria-label="Faixa de preço em ETH"
            rotulosPuxadores={['Preço mínimo em ETH', 'Preço máximo em ETH']}
            className="h-[21px]"
            min={PRECO_MINIMO}
            max={TETO_CONTROLE}
            step={PASSO_PRECO}
            minStepsBetweenThumbs={1}
            value={faixa}
            onValueChange={(valores) => setFaixa(limitarFaixa(valores))}
          />
          <p className="mt-3 text-[15px] leading-5">
            Preço: {formatarPreco(minimo)} - {formatarPreco(maximo)} ETH
          </p>
          <button
            type="button"
            onClick={() => alterarFiltros({ precoMinimo: minimo, precoMaximo: maximo })}
            className="mt-3 h-9 w-[92px] rounded-md bg-primary text-base leading-5 font-bold text-primary-foreground hover:bg-primaria-clara"
          >
            Aplicar
          </button>
        </div>
      </section>

      <section aria-labelledby="filtro-rede">
        <h2 id="filtro-rede" className="text-lg leading-4 font-bold">
          Rede
        </h2>
        <ul className="mt-3">
          {redes.map((rede) => (
            <li key={rede}>
              <LinhaFiltro
                rotulo={ROTULOS_REDE[rede]}
                contagem={data?.facetas.redes[rede]}
                ativo={busca.redes?.includes(rede) ?? false}
                aoAlternar={() => alterarFiltros({ redes: alternar(busca.redes, rede) })}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
