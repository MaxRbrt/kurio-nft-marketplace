// ====================================================================
// 1. AUDITORIA DE LAYOUT
// Roda dentro da página (page.evaluate), por isso não usa nada de fora
// da própria função. Mede o texto desenhado, não a caixa do elemento:
// um parágrafo largo com texto curto não conta como sobreposição. Até
// 4 px na vertical é a sobra da caixa da fonte, não glifo sobre glifo.
// Acusa texto cortado (por ele mesmo ou por um contêiner acima), texto sobre texto, imagem ou ícone, texto fora
// da tela ou colado na borda, placeholder que não cabe, controle
// espremido e rolagem lateral. Com um diálogo
// aberto, audita só o diálogo, que é o que a pessoa vê.
// ====================================================================
export function auditarLayout() {
  const larguraTela = window.innerWidth;
  const problemas: string[] = [];
  const dialogo = document.querySelector('[role="dialog"]');
  const raiz = dialogo ?? document.body;

  const visivel = (elemento: Element) => {
    const caixa = elemento.getBoundingClientRect();
    const temTamanho = caixa.width > 1 && caixa.height > 1;
    const exibido = elemento.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    return temTamanho && exibido;
  };

  const camadas = new Map<Element, Element | null>();
  const camadaFixa = (elemento: Element): Element | null => {
    if (camadas.has(elemento)) {
      return camadas.get(elemento) ?? null;
    }
    const posicao = getComputedStyle(elemento).position;
    const propria = posicao === 'fixed' || posicao === 'sticky';
    const pai = elemento.parentElement;
    const camada = propria ? elemento : pai ? camadaFixa(pai) : null;
    camadas.set(elemento, camada);
    return camada;
  };
  const mesmaCamada = (a: Element, b: Element) => camadaFixa(a) === camadaFixa(b);

  const dentroDeRolagemHorizontal = (elemento: Element) => {
    for (let atual = elemento.parentElement; atual; atual = atual.parentElement) {
      const rolagem = getComputedStyle(atual).overflowX;
      if (rolagem === 'auto' || rolagem === 'scroll') {
        return true;
      }
    }
    return false;
  };

  const caixaQueRecorta = (elemento: Element) => {
    for (
      let atual = elemento.parentElement;
      atual && atual !== document.body;
      atual = atual.parentElement
    ) {
      const estilo = getComputedStyle(atual);
      const recorta = [estilo.overflowX, estilo.overflowY].some((valor) =>
        ['hidden', 'clip'].includes(valor),
      );
      if (recorta) {
        return atual;
      }
    }
    return null;
  };

  const nome = (elemento: Element) => {
    const html = elemento as HTMLElement & { placeholder?: string };
    const texto = html.innerText || html.placeholder || elemento.getAttribute('alt') || '';
    return `${elemento.tagName.toLowerCase()} "${texto.trim().replace(/\s+/g, ' ').slice(0, 30)}"`;
  };

  const caixasDoTexto = (elemento: Element) => {
    const caixas: DOMRect[] = [];
    for (const no of elemento.childNodes) {
      const textoProprio = no.nodeType === Node.TEXT_NODE && no.textContent?.trim();
      if (!textoProprio) {
        continue;
      }
      const intervalo = document.createRange();
      intervalo.selectNodeContents(no);
      caixas.push(...[...intervalo.getClientRects()].filter((caixa) => caixa.width > 1));
    }
    return caixas;
  };

  const cruzamento = (a: DOMRect, b: DOMRect) => {
    const largura = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const altura = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return largura > 2 && altura > 4 ? `${Math.round(largura)}x${Math.round(altura)}` : null;
  };

  const temFundoProprio = (texto: Element, imagem: Element) => {
    for (let atual: Element | null = texto; atual; atual = atual.parentElement) {
      if (atual.contains(imagem)) {
        return false;
      }
      const estilo = getComputedStyle(atual);
      const corDeFundo = estilo.backgroundColor.match(/[\d.]+/g)?.map(Number) ?? [];
      const fundoOpaco = corDeFundo.length === 4 ? corDeFundo[3] > 0.5 : corDeFundo.length === 3;
      if (fundoOpaco || estilo.backgroundImage !== 'none') {
        return true;
      }
    }
    return false;
  };

  const todos = [...raiz.querySelectorAll('*')];
  const textos = todos
    .map((elemento) => ({ elemento, caixas: caixasDoTexto(elemento) }))
    .filter(({ elemento, caixas }) => caixas.length > 0 && visivel(elemento));
  const imagens = todos.filter((elemento) => elemento.tagName === 'IMG' && visivel(elemento));
  const icones = todos.filter((elemento) => {
    const caixa = elemento.getBoundingClientRect();
    const pequeno = caixa.width <= 64 && caixa.height <= 64;
    return elemento.tagName === 'svg' && pequeno && visivel(elemento);
  });

  // ====================================================================
  // 2. CORTES E SAÍDA DA TELA
  // Na altura, só conta corte maior que meia linha: menos que isso é a
  // sobra das letras descendentes, não uma linha escondida.
  // ====================================================================
  for (const { elemento, caixas } of textos) {
    const estilo = getComputedStyle(elemento);
    const cortaNaLargura = ['hidden', 'clip'].includes(estilo.overflowX);
    const cortaNaAltura = ['hidden', 'clip'].includes(estilo.overflowY);
    const passouNaLargura = elemento.scrollWidth > elemento.clientWidth + 1;
    const entrelinha = parseFloat(estilo.lineHeight) || parseFloat(estilo.fontSize) * 1.2;
    const passouNaAltura = elemento.scrollHeight - elemento.clientHeight > entrelinha / 2;

    if (cortaNaLargura && passouNaLargura) {
      problemas.push(`TEXTO CORTADO ${nome(elemento)}`);
    }
    if (cortaNaAltura && passouNaAltura) {
      problemas.push(`TEXTO CORTADO NA ALTURA ${nome(elemento)}`);
    }

    const foraDaTela = caixas.some((caixa) => caixa.right > larguraTela + 0.5 || caixa.left < -0.5);
    if (foraDaTela && !dentroDeRolagemHorizontal(elemento)) {
      problemas.push(`TEXTO FORA DA TELA ${nome(elemento)}`);
    }

    const recorte = caixaQueRecorta(elemento);
    if (recorte) {
      const limite = recorte.getBoundingClientRect();
      const cortado = caixas.some(
        (caixa) =>
          caixa.right > limite.right + 1 ||
          caixa.left < limite.left - 1 ||
          caixa.bottom > limite.bottom + 1 ||
          caixa.top < limite.top - 1,
      );
      if (cortado) {
        problemas.push(`TEXTO CORTADO PELO CONTÊINER ${nome(elemento)}`);
      }
    }
  }

  // ====================================================================
  // 3. SOBREPOSIÇÕES
  // Selo com fundo próprio sobre arte ou ícone (RARO, contador do
  // carrinho) é intencional e fica fora. Painel fixo (barra inferior,
  // resumo do carrinho) é comparado só com o que está nele: o conteúdo
  // que rola por baixo não conta.
  // ====================================================================
  textos.forEach((atual, indice) => {
    for (const anterior of textos.slice(0, indice)) {
      const parentes =
        atual.elemento.contains(anterior.elemento) || anterior.elemento.contains(atual.elemento);
      if (parentes || !mesmaCamada(atual.elemento, anterior.elemento)) {
        continue;
      }
      for (const caixa of atual.caixas) {
        const encontro = anterior.caixas.map((outra) => cruzamento(caixa, outra)).find(Boolean);
        if (encontro) {
          problemas.push(
            `TEXTO SOBRE TEXTO ${nome(atual.elemento)} x ${nome(anterior.elemento)} ${encontro}`,
          );
          break;
        }
      }
    }

    for (const imagem of imagens) {
      if (!mesmaCamada(atual.elemento, imagem) || temFundoProprio(atual.elemento, imagem)) {
        continue;
      }
      const caixaImagem = imagem.getBoundingClientRect();
      const encontro = atual.caixas.map((caixa) => cruzamento(caixa, caixaImagem)).find(Boolean);
      if (encontro) {
        problemas.push(`TEXTO SOBRE IMAGEM ${nome(atual.elemento)} ${encontro}`);
      }
    }

    for (const icone of icones) {
      if (!mesmaCamada(atual.elemento, icone) || temFundoProprio(atual.elemento, icone)) {
        continue;
      }
      const caixaIcone = icone.getBoundingClientRect();
      const encontro = atual.caixas.map((caixa) => cruzamento(caixa, caixaIcone)).find(Boolean);
      if (encontro) {
        problemas.push(`ÍCONE SOBRE TEXTO ${nome(atual.elemento)} ${encontro}`);
      }
    }
  });

  // ====================================================================
  // 4. PLACEHOLDER QUE NÃO CABE
  // ====================================================================
  const regua = document.createElement('canvas').getContext('2d');
  const campos = todos.filter((elemento): elemento is HTMLInputElement => {
    const campo = elemento as HTMLInputElement;
    return elemento.tagName === 'INPUT' && Boolean(campo.placeholder) && !campo.value;
  });
  for (const campo of campos.filter(visivel)) {
    const estilo = getComputedStyle(campo);
    const espacoLivre =
      campo.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
    if (!regua) {
      break;
    }
    regua.font = `${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`;
    const espacamento = (parseFloat(estilo.letterSpacing) || 0) * campo.placeholder.length;
    const larguraTexto = regua.measureText(campo.placeholder).width + espacamento;
    if (larguraTexto > espacoLivre + 1) {
      problemas.push(`PLACEHOLDER CORTADO ${nome(campo)}`);
    }
  }

  // ====================================================================
  // 5. TEXTO COLADO NA BORDA
  // Dentro de uma caixa com borda visível (pílula, campo, botão), o texto
  // precisa ficar dentro da borda, com pelo menos 1 px de folga.
  // ====================================================================
  const caixaComBorda = (elemento: Element) => {
    for (let atual: Element | null = elemento; atual; atual = atual.parentElement) {
      const estilo = getComputedStyle(atual);
      const larguraBorda = parseFloat(estilo.borderRightWidth);
      const bordaVisivel = larguraBorda > 0 && !estilo.borderRightColor.endsWith(', 0)');
      if (bordaVisivel) {
        return { caixa: atual.getBoundingClientRect(), larguraBorda };
      }
      if (atual === raiz) {
        return null;
      }
    }
    return null;
  };

  for (const { elemento, caixas } of textos) {
    const contorno = caixaComBorda(elemento);
    if (!contorno) {
      continue;
    }
    const limiteDireito = contorno.caixa.right - contorno.larguraBorda - 1;
    const limiteEsquerdo = contorno.caixa.left + contorno.larguraBorda + 1;
    const colado = caixas.some(
      (caixa) => caixa.right > limiteDireito + 0.5 || caixa.left < limiteEsquerdo - 0.5,
    );
    if (colado) {
      problemas.push(`TEXTO NA BORDA ${nome(elemento)}`);
    }
  }

  // ====================================================================
  // 6. CONTROLE ESPREMIDO
  // Em contêiner flexível, um botão ou campo pode encolher abaixo da
  // própria altura para caber. A medida é refeita com flex-shrink: 0;
  // se ele crescer na altura, estava espremido. Na largura não conta:
  // campo com flex-1 encolhe de propósito. A medida mexe no layout por um
  // instante, e o Chrome ajusta a rolagem: ela é restaurada no fim.
  // ====================================================================
  const controles = todos.filter((elemento) => {
    const pai = elemento.parentElement;
    const controle = ['BUTTON', 'INPUT', 'TEXTAREA', 'A', 'IMG'].includes(elemento.tagName);
    const itemFlexivel = pai !== null && getComputedStyle(pai).display.includes('flex');
    return controle && itemFlexivel && visivel(elemento);
  });
  const rolaveis = [document.scrollingElement, ...document.querySelectorAll('[role="dialog"]')];
  const rolagensOriginais = rolaveis.map((rolavel) => rolavel?.scrollTop ?? 0);
  for (const controle of controles as HTMLElement[]) {
    const antes = controle.getBoundingClientRect();
    const encolhimentoOriginal = controle.style.flexShrink;
    controle.style.flexShrink = '0';
    const depois = controle.getBoundingClientRect();
    controle.style.flexShrink = encolhimentoOriginal;
    const cresceu = depois.height - antes.height > 2;
    if (cresceu) {
      problemas.push(
        `CONTROLE ESPREMIDO ${nome(controle)} ${Math.round(antes.height)}px de ${Math.round(depois.height)}px`,
      );
    }
  }

  // ====================================================================
  // 7. DIÁLOGO QUE NÃO CABE
  // Com diálogo aberto a página não rola: a caixa do diálogo precisa
  // caber na tela, rolando por dentro se o conteúdo for maior. Caixa que
  // passa da tela deixa o fim inalcançável, mesmo com rolagem interna.
  // ====================================================================
  if (dialogo) {
    const caixaDialogo = dialogo.getBoundingClientRect();
    const passaDaTela = caixaDialogo.bottom > window.innerHeight + 1 || caixaDialogo.top < -1;
    if (passaDaTela) {
      problemas.push(
        `DIÁLOGO FORA DA TELA ${Math.round(caixaDialogo.bottom)}px de ${window.innerHeight}px`,
      );
    }
  }

  rolaveis.forEach((rolavel, indice) => {
    rolavel?.scrollTo({ top: rolagensOriginais[indice], behavior: 'instant' });
  });

  if (document.documentElement.scrollWidth > larguraTela) {
    problemas.push(`ROLAGEM LATERAL ${document.documentElement.scrollWidth}px`);
  }

  return [...new Set(problemas)];
}

// ====================================================================
// 8. CONTEÚDO ESCONDIDO SOB A BARRA INFERIOR
// Chamada com a página rolada até o fim: nada pode ficar atrás da barra.
// Com folha aberta não se aplica: a página fica parada atrás dela.
// ====================================================================
export function auditarFimDaPagina() {
  const barra = document.querySelector('nav[aria-label="Navegação inferior"]');
  const folhaAberta = document.querySelector('[role="dialog"]');
  if (!barra || !barra.checkVisibility() || folhaAberta) {
    return [];
  }

  const topoDaBarra = barra.getBoundingClientRect().top;
  const problemas: string[] = [];
  const alvos = document.querySelectorAll('main a, main button, main input, main p, main h2');

  for (const alvo of alvos) {
    const caixa = alvo.getBoundingClientRect();
    const atras = caixa.bottom > topoDaBarra + 1 && caixa.top < window.innerHeight;
    if (atras && caixa.height > 1 && alvo.checkVisibility()) {
      const texto = (alvo as HTMLElement).innerText.trim().slice(0, 30);
      const posicao = `${Math.round(caixa.top)}-${Math.round(caixa.bottom)} barra ${Math.round(topoDaBarra)} rolagem ${Math.round(scrollY)}/${document.documentElement.scrollHeight - innerHeight}`;
      problemas.push(`ESCONDIDO SOB A BARRA ${alvo.tagName.toLowerCase()} "${texto}" ${posicao}`);
    }
  }

  return problemas;
}
