# Arquitetura

> Documento em construção. As seções de contratos, sessão, carrinho, cache e tempo real entram ao fim da fase de compra.

## Desvios do Figma

O Figma define a identidade visual e a composição das telas. Cada tela é medida contra o frame nó a nó (posição, tamanho, fonte, entrelinha, espaçamento, cor, raio e borda), com tolerância de 0,5 px, e comparada pixel a pixel.

A regra é seguir o Figma. Só há desvio quando o próprio frame tem um erro evidente:

1. **Quebra função ou mostra dado errado:** corrigido.
2. **Desalinhamento que o usuário perceberia como defeito** (sobreposição, item fora do centro, espaçamento diferente entre itens iguais): uniformizado.
3. **Diferença invisível ou de 1 a 2 px:** reproduzida como está no frame.

| Tela                     | O que o frame mostra                                                                            | O que a aplicação faz                                                                                     | Motivo                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Início, desktop          | Cartão da 3ª linha, ao centro, sem nome e sem preço                                             | Todo cartão mostra nome e preço                                                                           | Sem nome e preço o cartão não informa o que é vendido             |
| Início, mobile           | Só o primeiro cartão tem o botão de favorito; nos outros ele fica escondido atrás do cartão     | Todo cartão tem favorito                                                                                  | O favorito é uma função do catálogo, não um enfeite de um cartão  |
| Início, mobile           | A 2ª linha repete "Emerald Ape #042" e "Sage Nomad #009" com outras artes                       | Cada cartão mostra o próprio NFT                                                                          | Repetir o nome com outra arte seria dado falso                    |
| Detalhe, mobile          | Edições "1/10, 1/10, 1/50, ABERTA"                                                              | Edições "1/1, 1/10, 1/50, ABERTA", como no desktop                                                        | Rótulo repetido faria comprar uma edição achando que é outra      |
| Início, desktop          | Seta de "Ordenar por" desenhada sobre as últimas letras de "recentemente"                       | Seta logo depois do valor, com o grupo alinhado à direita da grade                                        | Texto encoberto parece defeito                                    |
| Início, desktop e mobile | Cada arte em uma altura dentro do cartão (de 4 a 9 px de diferença); Cosmic Bloom com 224 x 286 | Arte centrada e do mesmo tamanho em todos os cartões                                                      | Cartões iguais com arte desalinhada parecem erro                  |
| Início, desktop          | Preço 12 px abaixo do nome na 1ª linha e 6 px nas demais                                        | 6 px em todas as linhas; a paginação compensa os 6 px, e as seções abaixo ficam na mesma posição do frame | Mesmo componente com espaçamentos diferentes                      |
| Início, desktop          | Segundo cartão de promoção com recuos de 35 e 39 px e texto de 252 px; o primeiro usa 30 e 263  | Os dois usam os recuos do primeiro                                                                        | Cartões gêmeos com alinhamentos diferentes                        |
| Detalhe, desktop         | "Mais desta coleção" com larguras de 219 e 220 px e artes em posições e tamanhos diferentes     | Cinco cartões de 219 px com arte de 212 px centrada                                                       | Mesma correção da grade da Início                                 |
| Login e Cadastro, mobile | Conteúdo dos botões "Continuar com Google/Facebook" 9 px à esquerda do centro                   | Conteúdo centrado                                                                                         | Item visivelmente fora do centro                                  |
| Início, mobile           | Foto de 58 px de outro NFT sobreposta à arte principal do destaque                              | Só a arte principal                                                                                       | Uma imagem cobrindo a outra parece erro                           |
| Início, mobile           | Vão de 4 px entre "Todos os NFTs" e "Novos lançamentos" e de 16 px até "Em alta"                | 16 px entre todas as abas                                                                                 | Itens iguais com vãos diferentes                                  |
| Início, desktop          | Botão "EXPLORAR" com o texto 4 px à esquerda do centro                                          | Texto centrado                                                                                            | Item visivelmente fora do centro                                  |
| Início, desktop          | "NFT EM DESTAQUE" à esquerda, com "OFERTA LIMITADA" centrado logo abaixo                        | Os dois centrados                                                                                         | Títulos do mesmo bloco desalinhados entre si                      |
| Início, desktop          | Artigos do diário terminam em x = 1264, e a página vai até 1320                                 | Quatro artigos de 282 px ocupam toda a largura, com a altura e as quebras de texto do frame               | Grade empurrada para a esquerda, sem alinhar com as outras seções |
| Rodapé, desktop          | "Enviar" 6 px e "METAMASK • ..." 4 px à direita do centro das caixas                            | Textos centrados                                                                                          | Item visivelmente fora do centro                                  |
| Cadastro, mobile         | Só o campo "Nome de usuário" com o texto de exemplo centrado                                    | Texto à esquerda, como nos outros campos                                                                  | Campos iguais com alinhamentos diferentes                         |
| Cabeçalho                | Divisória em Início, Login e Perfil; sem ela em Detalhe e Carrinho                              | Divisória em todas as telas                                                                               | Mesmo componente não muda de tela para tela                       |
| Carrinho, mobile         | Lixeira só no 3º cartão, sobre o botão "+"                                                      | Lixeira em todos os cartões, acima do "+"                                                                 | O botão ficava encoberto, e remover é função de todo item         |
| Carrinho, mobile         | Cada arte duplicada, com a de cima em `multiply` e deslocada até 2 px, o que escurece a imagem  | Uma imagem só, com as cores das outras telas                                                              | O mesmo NFT não pode mudar de cor entre telas                     |
| Carrinho, mobile         | Cartões em y = 88, 208, 330 e 450 (vãos de 20 e 22 px)                                          | Vão de 20 px entre todos                                                                                  | Lista dinâmica não tem posição própria por item                   |
| Carrinho, mobile         | Quantidade 6 px abaixo do centro dos botões                                                     | Quantidade centrada na linha dos botões                                                                   | Item visivelmente fora do centro                                  |

### Pontos do arquivo verificados e mantidos

Os comentários deixados no arquivo do Figma foram usados como lista do que conferir. Cada um foi medido no frame: os que se confirmaram estão na tabela acima. Estes foram verificados e mantidos, por serem preferência de desenho ou por o frame estar coerente:

- Início, mobile: as duas colunas de cartões têm deslocamento constante de 32 px. É um desenho escalonado, não um desnível.
- Início, desktop: os arcos laranja aparecem nos dois cartões de promoção, na mesma posição. É um detalhe decorativo.
- Carrinho, desktop: a lixeira está centrada na própria caixa de 24 px, e os botões de quantidade são pílulas de 20 x 30 com raio cheio.
- Carrinho, mobile: botões de quantidade redondos, diferentes dos do desktop. Cada frame segue o seu desenho.
- Sem mudança por gosto: ordem das coleções, letras W, C e D nos serviços, controle deslizante de preço e fundo escuro atrás do modal, que reproduz o frame.

### Reproduzidos como estão no frame

- O fundo atrás do modal de Login e Cadastro no desktop é uma composição própria do frame, diferente da Início. Ele é reproduzido a partir dos nós do frame, como elemento decorativo, inerte e fora da árvore acessível.
- A Início desktop não mostra o selo RARO; os frames de Login e o mobile mostram, e cada tela segue o seu frame.
- Textos e rótulos ficam como desenhados, inclusive "Contrato" e "Direitos autorais" trocados no Detalhe.
- Violet Nomad aparece com o token #0009 no Carrinho e #0314 no Pagamento. Um NFT tem um token só, e a aplicação usa #0314 nas duas telas.
- Linhas de 0,3 px do frame são renderizadas como 1 px com 25% de opacidade, que é o resultado visual do Figma.

### Ajustes de acessibilidade

- Ao abrir o modal de Login ou Cadastro, o foco vai para o próprio diálogo, e não para um campo: o frame de Cadastro não destaca campo nenhum. A borda laranja da senha no frame de Login é o estado de foco.
- O olho de "mostrar senha" no estado visível não tem desenho no Figma e usa um ícone de biblioteca no mesmo tamanho.
