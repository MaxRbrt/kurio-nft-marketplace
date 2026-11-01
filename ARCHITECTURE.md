# Arquitetura

Um frontend real conversando com um backend falso que vive no navegador. Tudo acima da camada de rede é código de produção: trocar a URL por um backend real não muda componente nem hook.

```
Componentes React
      │  hooks
TanStack Query (cache)  ◄── eventos atualizam o cache ──┐
      │                                                 │
Axios (REST)                                   socket.io-client
══════╪═════════════ fronteira de rede ═════════════════╪══════
      ▼                                                 ▼
Handlers MSW ───────► Banco simulado ◄────────── Handler WebSocket
                      (localStorage)     muda dado e publica evento
```

- **Um único banco simulado:** REST e Socket.IO leem e escrevem nele, então nunca discordam.
- **O servidor simulado é a autoridade:** preço, total, estoque e estado do pedido vêm dele. A interface mostra e pede confirmação.
- **Sem caminho alternativo:** nada fora de `src/mocks` e `src/main.tsx` importa os mocks.

## Organização

```
src/
├─ main.tsx        sobe os mocks e só então importa a aplicação
├─ contracts/      schemas zod por domínio: a verdade dos dados, usada por app e mock
├─ lib/            cliente Axios e erros, tempo real, formatação de ETH
├─ components/     ícones do Figma, layout, formulário comum, shadcn (ui)
├─ features/       catalogo, compra, conta: api, hooks e componentes de cada domínio
├─ mocks/          banco, fixtures, handlers REST, socket, cenários, controle, painel
└─ routes/         rotas por arquivo do TanStack Router
```

## Contratos REST

Base `/api`. Valores em ETH são strings decimais, calculados com `big.js`. Quantidades são inteiras. Respostas são validadas com zod ao chegar.

| Recurso   | Rotas                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------- |
| Sessão    | `POST auth/cadastro`, `POST auth/login`, `GET auth/sessao`, `POST auth/logout`                        |
| NFTs      | `GET nfts` (busca, filtros, ordem, página), `GET nfts/:id`                                            |
| Favoritos | `GET favoritos`, `PUT` e `DELETE favoritos/:nftId`                                                    |
| Carrinho  | `GET carrinho`, `POST carrinho/itens`, `PATCH` e `DELETE carrinho/itens/:id`, `POST carrinho/mesclar` |
| Cotação   | `POST cotacoes` com `{ cupom?, rede? }`; devolve id, itens, valores e validade                        |
| Pedidos   | `POST pedidos` com o cabeçalho `Idempotency-Key`, `GET pedidos/:id`                                   |
| Perfil    | `GET` e `PATCH perfil`, `PUT perfil/avatar`, `PUT perfil/senha`                                       |
| Carteiras | `GET` e `POST carteiras`, `PATCH carteiras/:id`, `POST` e `DELETE carteiras/:id/conexao`              |

Visitante é identificado pelo cabeçalho `X-Visitante-Id`; sessão, por `Authorization: Bearer`. Carrinho e cotação aceitam os dois; pedidos, perfil, carteiras e favoritos exigem sessão.

**Erro único:** `{ erro: { codigo, mensagem, campos?, detalhes? } }`, convertido em `ErroApi` pelo interceptador. A interface decide pelo código.

| HTTP      | Código                                                                                                               | Reação                           |
| --------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 400, 422  | `VALIDACAO`, `CUPOM_INVALIDO`, `CUPOM_EXPIRADO`                                                                      | Erro no campo                    |
| 401       | `SESSAO_INVALIDA`, `SESSAO_EXPIRADA`                                                                                 | Vai ao login guardando o destino |
| 403, 404  | `SEM_PERMISSAO`, `NAO_ENCONTRADO`                                                                                    | Mensagem, sem dados              |
| 409       | `EMAIL_EM_USO`, `EDICAO_INDISPONIVEL`, `COTACAO_DESATUALIZADA`, `CONFLITO_IDEMPOTENCIA`, `CONEXAO_CARTEIRA_RECUSADA` | Tratamento próprio               |
| 5xx, rede | `FALHA_TRANSITORIA`                                                                                                  | Mensagem com nova tentativa      |

## Eventos Socket.IO

Envelope: `{ idEvento, tipo, recurso: { tipo, id }, versao, ocorridoEm, dados }`.

| Evento          | Dados                            | Quem recebe                                                |
| --------------- | -------------------------------- | ---------------------------------------------------------- |
| `nft.updated`   | `preco`, `disponivel`, `edicoes` | Todas as conexões                                          |
| `order.updated` | `usuarioId`, `estado`            | Só a conexão do dono, identificada por `session.subscribe` |

**Transporte e limites nos mocks:** o `@mswjs/socket.io-binding` 0.2.0 traduz o protocolo sobre o WebSocket interceptado, e o `socket.io-client` real roda inteiro. Limitações:

- Só WebSocket, namespace padrão, sem rooms nem acks, e `sid` fixo. O mock mantém um mapa próprio de conexão para usuário.
- A API do pacote no npm (`toSocketIo`) difere da documentação do GitHub.
- O pacote anuncia heartbeat e não o cumpre: sem tratamento, a conexão cairia a cada 30 s. O handler envia o ping do Engine.IO a cada 25 s.
- O link do MSW usa só a origem, pois o MSW remove `/socket.io/` da URL antes de comparar.
- `socket.io-client` guarda a classe `WebSocket` ao carregar: por isso a aplicação é importada só depois dos mocks.
- Duas abas têm cópias separadas do banco em memória, e eventos não atravessam abas.

## Sessão

- Token em `localStorage` para recuperar a sessão após refresh. **Só na simulação:** em produção seria cookie `httpOnly`, pois `localStorage` é legível por XSS. Senhas ficam com hash SHA-256 e sal; em servidor real seria argon2 ou bcrypt.
- Rotas privadas checam a sessão em `beforeLoad`: a tela nunca chega a montar nem dispara consultas. Sem sessão, vai a `/login?redirect=<destino>`, e `redirect` só aceita caminho interno.
- 401 durante o uso é tratado uma vez pelo interceptador, guardando o destino. O rascunho do pagamento fica em `sessionStorage`, e a tentativa de compra em aberto é retomada após o login.
- Logout e troca de usuário: cancela consultas, apaga o token, remove os dados privados do cache e encerra o socket da sessão.

## Carrinho

Vive na API, inclusive para visitante, então existe um único caminho de código e o refresh já funciona. Ao entrar, `carrinho/mesclar` junta os carrinhos, somando quantidades limitadas ao disponível.

Quantidade e remoção não usam atualização otimista, pois só o servidor confirma o estoque. Subtotal, desconto, taxa e total vêm da cotação, e o cliente não recalcula nada. O cupom fica na URL (`?cupom=`), sobrevive a refresh e segue para o pagamento. Cupom recusado na URL não entra no resumo nem no link de finalizar.

## Compra e idempotência

Fluxo: carrinho, pagamento (validação e carteira conectada), revisão com cotação recém-buscada, envio, pedido pendente, confirmado ou recusado.

- **Duas proteções contra cotação velha:** o evento recalcula o resumo e a revisão trava "Confirmar pedido" até aceitar os novos valores; e o servidor recusa com `COTACAO_DESATUALIZADA` mesmo que o evento não chegue.
- **Chave de idempotência:** gerada e gravada em `localStorage` antes do envio, por usuário, junto com o corpo. Reenviar usa o mesmo corpo, pois uma cotação nova mudaria o conteúdo e geraria conflito.

| Caso                     | O que acontece                                                       |
| ------------------------ | -------------------------------------------------------------------- |
| Clique repetido          | Botão trava com o envio em andamento, e a chave é a mesma            |
| Timeout após criar       | Nova tentativa traz o mesmo pedido                                   |
| Refresh no meio          | Ao abrir o pagamento, a tentativa aberta é retomada, sem nova compra |
| Recusa do servidor (4xx) | Nenhum pedido foi criado: a chave sai                                |
| Pedido terminal          | A chave sai, e uma compra nova usa outra                             |

- **Recibo:** o pedido guarda uma cópia de nomes, preços e taxas. Mudanças no catálogo não o alteram. O tipo `Pedido` só tem transação no estado confirmado, e a tela não mostra recibo em outro estado.
- **Depois da confirmação:** só os itens e quantidades comprados saem do carrinho.

## Cache e retries

| Dado              | Chave                                        | `staleTime`           |
| ----------------- | -------------------------------------------- | --------------------- |
| Lista de NFTs     | `['nfts', 'lista', busca]`                   | 30 s                  |
| Detalhe           | `['nfts', 'detalhe', id]`                    | 30 s                  |
| Sessão            | `['sessao']`                                 | 5 min                 |
| Carrinho          | `['carrinho', usuarioId ou 'visitante']`     | 30 s                  |
| Cotação           | `['carrinho', dono, 'cotacao', cupom, rede]` | 0                     |
| Favoritos         | `['usuario', id, 'favoritos']`               | 1 min                 |
| Perfil, carteiras | `['usuario', id, 'perfil' ou 'carteiras']`   | 30 s                  |
| Pedido            | `['usuario', id, 'pedidos', pedidoId]`       | 0; terminal, infinito |

A chave contém tudo de que a resposta depende, o que isola usuários e parâmetros. Consultas repetem até 2 vezes, só em falha transitória: 4xx daria o mesmo resultado. Mutations não repetem sozinhas. Respostas obsoletas são descartadas pela chave e canceladas pelo `signal`. Atualização otimista com rollback: favoritos. Pedido pendente faz consulta periódica de 5 s só sem socket.

## Reconciliação entre REST e Socket.IO

Processamento de cada evento (`lib/tempo-real/processador.ts`), sempre nesta ordem:

1. Valida com zod. Inválido é descartado.
2. `idEvento` já visto: descarta, para não reaplicar efeitos.
3. `versao` menor ou igual à conhecida: descarta, para não regredir.
4. Cancela consultas em andamento, cuja resposta seria anterior à mudança.
5. Atualiza o cache de lista e detalhe.
6. Invalida carrinho e cotação, e anuncia em `aria-live` e toast.

`order.updated` confere o dono contra a sessão atual, e pedido terminal não muda. Ao reconectar, eventos perdidos não voltam: lista, detalhe, carrinho e pedidos ativos são relidos pela API, que é a verdade. O socket é único por sessão e sai junto com ela, liberando os listeners.

## Mocks

Banco em memória salvo em `localStorage` (`kurio:banco:v3`), validado ao carregar. Ao mudar a forma dos dados, a versão da chave sobe. `resetar` restaura tudo. Toda alteração de NFT passa por uma função central, que muda o dado, sobe a versão, salva e publica o evento. Cenários são determinísticos, sem `Math.random`. O painel (`?painel=1`) usa as mesmas rotas de controle e não toca em estado da interface.

## Lighthouse

Mediana de 3 medições por página e perfil em [`lighthouse/relatorios/resumo.md`](lighthouse/relatorios/resumo.md).

Desktop atinge as quatro metas. **Performance no mobile fica abaixo de 90.** LCP e FCP são a causa, com CLS e TBT dentro do esperado:

- O pacote do MSW e do Socket.IO (cerca de 164 KB) precisa subir antes da aplicação, para a primeira requisição já ser interceptada e o `socket.io-client` capturar o WebSocket certo. Sob a rede simulada de 4G lenta, isso atrasa a primeira pintura. É um custo só da demonstração: com um backend real, esse pacote não existe.
- O enunciado pede a auditoria com os mocks e sem simplificações, então o pacote fica na medição.
- Testado e descartado: pré-carregar os pacotes com `modulepreload` piorou a nota de 84 para 81.

Já feito: divisão por rota, imagens WebP com `srcset`, pré-carregamento da imagem principal, fonte local e dimensões reservadas para evitar deslocamento.

## Limitações e decisões de UX

- Blockchain, extensões de carteira e pagamentos são simulados. Transação e link do Etherscan são fictícios.
- Itens fora do escopo (Atividade, Ofertas, links editoriais, newsletter, redes sociais, "Mercado") avisam que estão indisponíveis, sem aparentar sucesso.
- "Lista de interesse" não tem frame próprio e também avisa. Os favoritos persistem e aparecem nos cartões e no detalhe.
- Abaixo de 1024 px vale o desenho mobile. Tablet usa a coluna mobile centrada em 414 px, pois não há frame.
- Filtro selecionado usa sublinhado além da cor, para não depender só dela.
- Abaixo de 414 px, a arte do destaque e o vão das abas encolhem, e o texto mantém a largura. Em 414 px ficam como no frame.
- Nomes longos quebram em até 2 linhas no mobile, para o número do NFT não sumir. "Golden Frequency #071" ocupa 2 linhas em 414 px.
- Entre 480 e 1023 px, a arte do cartão ocupa a largura dele.
- O carrinho desktop troca "ID do token" por "Edição" só quando o mesmo NFT aparece em duas edições.
- Filtrar mantém a posição da tela; trocar de página volta ao início do catálogo.
- "Ver no Etherscan" é o texto do frame para Ethereum. Em Polygon e Solana, o botão e o link simulado usam Polygonscan e Solscan.
- Fechar o login volta à tela de origem. Em acesso direto, vai à Início.

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
| Pagamento, desktop       | Linhas de "Seus NFTs" com artes de 70, 66 e 65 px e textos e valores em posições diferentes     | Todas as linhas como a primeira: arte de 70 px e valores alinhados                                        | Mesmo componente com medidas diferentes                           |
| Pagamento, desktop       | "Total" recuado (957 a 1278) e "Taxa estimada" centrada, fora do alinhamento dos outros valores | Total de ponta a ponta e "Taxa estimada" à direita, como no Carrinho                                      | Valores de uma mesma lista desalinhados                           |
| Pagamento, desktop       | "Carteira e rede" centrado, com os outros títulos de seção à esquerda                           | À esquerda, como no mobile                                                                                | Títulos iguais com alinhamentos diferentes                        |
| Pagamento, desktop       | 1ª opção de carteira mostra o selo com as três marcas; opções com recuos diferentes (927 e 931) | 1ª opção é "WalletConnect", como no mobile; recuos e altura do texto iguais nas três                      | Opção sem nome não diz o que se escolhe                           |
| Pagamento, desktop       | Texto de exemplo de endereço com recuo de 22 px; os demais campos usam 12 px                    | 12 px em todos os campos                                                                                  | Campos iguais com alinhamentos diferentes                         |
| Pagamento, mobile        | Só a seleção de carteira, sem os campos que o desktop exige                                     | Os mesmos campos abrem em uma folha quando falta dado obrigatório                                         | O enunciado exige validar os campos, e o pedido depende deles     |
| Confirmação              | Linhas de itens com artes de 70, 66 e 65 px; "16.11 ETH" passa da borda da tabela (970 x 965)   | Todas com arte de 70 px e valores alinhados à direita da tabela                                           | Mesmo componente com medidas diferentes e valor fora da grade     |
| Confirmação              | Só o estado confirmado                                                                          | Pendente e recusado no mesmo modal, sem transação nem recibo                                              | O enunciado exige os três estados                                 |
| Perfil e Carteiras       | Textos do menu começam em x = 170, 168, 166 e 164, conforme a linha                             | Todos em x = 166                                                                                          | Itens iguais com recuos diferentes                                |
| Perfil                   | Texto do botão "Alterar" 5 px à direita do centro                                               | Texto centrado                                                                                            | Item visivelmente fora do centro                                  |
| Carteiras                | Título "Carteira principal" cortado na parte de baixo das letras                                | Título inteiro, na mesma posição                                                                          | Texto cortado parece erro                                         |
| Cabeçalho                | Só mostra "Entrar", inclusive nas telas de conta                                                | Com sessão, avatar no lugar do botão; o menu central não muda de posição                                  | Mostrar "Entrar" a quem já entrou seria informação errada         |
| Carrinho, mobile         | Quantidade 6 px abaixo do centro dos botões                                                     | Quantidade centrada na linha dos botões                                                                   | Item visivelmente fora do centro                                  |

### Larguras sem frame

Os frames têm 1440 px no desktop e 414 px no mobile, com medidas fixas. Nas larguras intermediárias, as medidas do frame viram teto: o layout é igual ao frame na largura dele e se adapta abaixo, sem cortar texto nem sobrepor elementos. O teste `tests/responsivo/telas.spec.ts` confere dez telas e estados (inclusive filtros e a folha do pagamento abertos) em 28 perfis de aparelho do Playwright, de 320 a 984 px, e em desktop de 1024 x 768, 1280 x 800 e 1440 x 900; iPhone e iPad rodam no WebKit. Ele falha com texto cortado, sobreposto, colado na borda ou fora da tela, controle espremido, diálogo que não cabe na tela ou conteúdo atrás da barra inferior.

| Tela                          | Largura                    | Adaptação                                                                                                                        |
| ----------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Perfil, Carteiras e Pagamento | todas                      | O seletor do sufixo ENS tem 78 px no mínimo, como no frame, e cresce para caber ".kurio.eth" sem a seta encobrir o texto         |
| Carteiras                     | abaixo de 1024 px          | Texto de exemplo "ENS ou carteira (opcional)"; o rótulo completo continua para leitores de tela                                  |
| Carrinho, mobile              | abaixo de 414 px           | Texto de exemplo do cupom "Código promocional"; rótulo longo do resumo quebra linha sem invadir a de baixo                       |
| Carrinho, mobile              | abaixo de 375 px           | A quantidade desce para uma linha própria no cartão; nome longo quebra linha em vez de ser cortado                               |
| Compra, mobile                | abaixo de 414 px           | Título do cabeçalho quebra em duas linhas dentro dos 44 px, em vez de sair da tela                                               |
| Pagamento, mobile             | todas                      | Marcador da opção de carteira preso a 16 px da borda direita, a mesma posição do frame em 414 px                                 |
| Início, mobile                | abaixo de 338 px           | Título do destaque diminui com a tela para não encostar na arte                                                                  |
| Início, mobile                | abaixo de 360 px           | As abas rolam, com a borda direita esmaecida para indicar que há mais                                                            |
| Início                        | todas                      | Nome do NFT quebra linha em vez de ser cortado                                                                                   |
| Início, mobile                | todas                      | Paginação centrada; o frame mobile termina antes dela                                                                            |
| Início, desktop               | 1024 px                    | Arte das promoções encolhe para não entrar na coluna do texto                                                                    |
| Detalhe, mobile               | abaixo de 375 px           | A descrição curta pode ocupar mais de três linhas sem invadir "Edição"                                                           |
| Detalhe, mobile               | abaixo de 414 px           | Nome do NFT que quebra linha usa entrelinha de 24 px, para as linhas não se tocarem                                              |
| Login e Cadastro              | abaixo de 1200 px          | O fundo decorativo fica centrado e recortado nas laterais, sem rolagem lateral                                                   |
| Login e Cadastro              | abaixo de 900 px de altura | O modal limita a altura à tela e rola por dentro; em 900 px fica igual ao frame                                                  |
| Detalhe                       | todas                      | A pílula da nota parte dos 80 px do frame e cresce com o texto, sem encostar na borda                                            |
| Pagamento, mobile             | todas                      | Os campos da folha não encolhem para caber: a folha rola e o botão "Continuar" mantém 60 px                                      |
| Pagamento, mobile             | abaixo de 1024 px          | Texto de exemplo "ENS ou carteira (opcional)" na folha, como em Carteiras; "Trocar carteira" não encolhe e o título quebra linha |
| Início, mobile                | todas                      | Folha de filtros com 320 px, limitada à largura da tela                                                                          |

### Pontos do arquivo verificados e mantidos

Os comentários deixados no arquivo do Figma foram usados como lista do que conferir. Cada um foi medido no frame: os que se confirmaram estão na tabela acima. Estes foram verificados e mantidos, por serem preferência de desenho ou por o frame estar coerente:

- Início, mobile: as duas colunas de cartões têm deslocamento constante de 32 px. É um desenho escalonado, não um desnível.
- Início, desktop: os arcos laranja aparecem nos dois cartões de promoção, na mesma posição. É um detalhe decorativo.
- Carrinho, desktop: a lixeira está centrada na própria caixa de 24 px, e os botões de quantidade são pílulas de 20 x 30 com raio cheio.
- Carrinho, mobile: botões de quantidade redondos, diferentes dos do desktop. Cada frame segue o seu desenho.
- Pagamento: a seta dos seletores fica a 28,5 px da borda nos dois seletores, de forma coerente.
- Confirmação: os rótulos "Taxa de rede" e "Total" começam em x = 644, alinhados entre si.
- Perfil: botão "Salvar" de 131 px e recuo da linha "Sair": o frame está coerente, e a mudança seria preferência.
- Perfil e Carteiras não têm frame mobile: usam abas no padrão da Início e os mesmos campos em uma coluna.
- "Lista de interesse" e os demais itens fora do escopo avisam que estão indisponíveis.
- Sem mudança por gosto: ordem das coleções, letras W, C e D nos serviços, controle deslizante de preço e fundo escuro atrás do modal, que reproduz o frame.

### Reproduzidos como estão no frame

- O fundo atrás do modal de Login e Cadastro no desktop é uma composição própria do frame, diferente da Início. Ele é reproduzido a partir dos nós do frame, como elemento decorativo, inerte e fora da árvore acessível. A única mudança é o "Ordenar por", recuado 30 px para o texto não ser cortado nem ficar sob a seta.
- A Início desktop não mostra o selo RARO; os frames de Login e o mobile mostram, e cada tela segue o seu frame.
- Textos e rótulos ficam como desenhados, inclusive "Contrato" e "Direitos autorais" trocados no Detalhe.
- Violet Nomad aparece com o token #0009 no Carrinho e #0314 no Pagamento. Um NFT tem um token só, e a aplicação usa #0314 nas duas telas.
- Linhas de 0,3 px do frame são renderizadas como 1 px com 25% de opacidade, que é o resultado visual do Figma.

### Estados sem frame

- Revisão antes do envio: modal no padrão da Confirmação, exigido pelo enunciado.
- Conexão da carteira: "Desconectar", "Conectar" e a recusa aparecem na opção escolhida, no desktop, e no menu de três pontos, no mobile.
- Campos obrigatórios seguem os asteriscos do frame, inclusive "Código de indicação".

### Ajustes de acessibilidade

- Ao abrir o modal de Login ou Cadastro, o foco vai para o próprio diálogo, e não para um campo: o frame de Cadastro não destaca campo nenhum. A borda laranja da senha no frame de Login é o estado de foco.
- O olho de "mostrar senha" no estado visível não tem desenho no Figma e usa um ícone de biblioteca no mesmo tamanho.
