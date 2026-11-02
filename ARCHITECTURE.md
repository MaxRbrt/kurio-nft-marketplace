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

O navegador desliga o service worker quando a aba fica parada, e o worker do MSW guarda só em memória as páginas ativas. Ao religar, ele não reconhece a página, e as chamadas iriam para a rede. Por isso, em `src/mocks/manter-ativos.ts`, cada chamada do Axios espera o worker confirmar o registro da página. Voltar à aba e interagir também registram, o que cobre o painel de cenários, que usa `fetch` direto. Uma resposta com corpo que não é JSON vira falha transitória, e a consulta tenta de novo.

O cookie store do MSW usa o `tough-cookie`, que pede o domínio registrável ao `tldts`, com a lista mundial de sufixos. Como a API simulada autentica por Bearer e não grava cookies, `vite.config.ts` troca esse pacote por `src/mocks/dominio-registravel.ts`, que usa os dois últimos rótulos do domínio.

## Lighthouse

Mediana de 3 medições por página e perfil em [`lighthouse/relatorios/resumo.md`](lighthouse/relatorios/resumo.md).

**As quatro metas são atingidas nas duas páginas e nos dois perfis, no modo padrão do Lighthouse, que simula rede e CPU.** Performance fica em 92 nas duas páginas no mobile, variando de 91 a 93 entre execuções, e em 99 no desktop. Accessibility, Best Practices e SEO ficam em 100. No mobile, LCP de cerca de 3,2 s, CLS 0,000 e TBT de até 103 ms.

A nota mobile começou em 84. Causas encontradas nos relatórios e corrigidas, medindo a cada passo:

| Causa                                                                                                                         | Correção                                                                                            | Início / detalhe |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------- |
| Situação inicial                                                                                                              |                                                                                                     | 83 / 84          |
| Pacote dos mocks com 164 KB, a maior parte a lista mundial de sufixos de domínio (`tldts`), usada só pelo cookie store do MSW | Substituto leve por alias, pois a simulação autentica por Bearer. O pacote caiu para 54 KB          | 89 / 89          |
| Tela em branco até o JavaScript montar a aplicação                                                                            | Abertura com a marca no próprio HTML. FCP de 2,2 s para cerca de 1,3 s                              | 91 / 90          |
| Imagem de 960 px da galeria desktop, escondida no celular, baixada com prioridade                                             | `sizes` de 1 px no layout em que a imagem não aparece. Sem efeito na nota, 47 KB a menos no detalhe | 91 / 90          |
| 9 arquivos de contratos e validação, compartilhados entre mocks e aplicação                                                   | Agrupados em um só. LCP do início de 3,4 s para 3,2 s, e do detalhe de 3,6 s para 3,3 s             | 92 / 91          |
| Skeleton do detalhe mobile em outra posição que o conteúdo final                                                              | Skeleton com as medidas do layout real. CLS de 0,039 para 0,000                                     | 92 / 91          |

Nada foi retirado da aplicação para medir: a auditoria roda com mocks, tempo real, fontes e imagens da entrega, e as mudanças valem para o build publicado.

Limites que continuam:

- O LCP mobile segue acima dos 2,5 s recomendados. O pacote do MSW precisa subir antes da aplicação, para a primeira requisição já ser interceptada e o `socket.io-client` capturar o WebSocket certo. É um custo da demonstração: com um backend real, esse pacote não existe.
- O relatório ainda aponta cerca de 290 ms de CSS bloqueando a renderização e 32 KiB de JavaScript sem uso no pacote dos mocks.
- Testado e descartado: pré-carregar os pacotes com `modulepreload` piorou a nota de 84 para 81.
- A nota depende da máquina e do modo de medir. Tudo abaixo vale para `localhost`, em um PC de 16 núcleos. No modo padrão, mobile 92. Com rede e CPU limitadas de verdade (`throttlingMethod: 'devtools'`), mobile 72 (início) e 82 (detalhe), com LCP de 4,4 e 4,1 s e TBT de 444 e 187 ms. Com a máquina ocupada por outra carga, o modo padrão cai para 60 e 58, e a limitação real, para cerca de 50 a 60. O resultado em uma máquina mais lenta pode ficar abaixo da meta.
- Depois que o service worker do MSW assume, os arquivos da aplicação aparecem com 0 KB nos relatórios, então a simulação não conta o peso deles.

Já feito antes: divisão por rota, imagens WebP com `srcset`, pré-carregamento da imagem principal, fonte local e dimensões reservadas para evitar deslocamento.

## Limitações e decisões de UX

- Contraste: o axe não aponta violação em 10 telas, em 414, 768 e 1440 px, mas não decide texto sobre gradiente. Esses 26 casos foram medidos por pixel. Ficam abaixo de 4,5:1, em parte da área, com as cores do frame: no destaque mobile, "Descubra NFTs selecionados" (de 2,8 a 4,4), "Bem-vindo à Kurio" e o título (a partir de 4,1), e "EXPLORAR" no limite; no carrinho mobile, "Aplicar" (de 2,8 a 3,7).
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

| Tela                      | O que o frame mostra                                                                            | O que a aplicação faz                                                                                     | Motivo                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Início, desktop           | Cartão da 3ª linha, ao centro, sem nome e sem preço                                             | Todo cartão mostra nome e preço                                                                           | Sem nome e preço o cartão não informa o que é vendido             |
| Início, mobile            | Só o primeiro cartão tem o botão de favorito; nos outros ele fica escondido atrás do cartão     | Todo cartão tem favorito, alinhado ao topo da arte, como no 1º cartão                                     | O favorito é uma função do catálogo, não um enfeite de um cartão  |
| Início, mobile            | A 2ª linha repete "Emerald Ape #042" e "Sage Nomad #009" com outras artes                       | Cada cartão mostra o próprio NFT                                                                          | Repetir o nome com outra arte seria dado falso                    |
| Detalhe, mobile           | Edições "1/10, 1/10, 1/50, ABERTA"                                                              | Edições "1/1, 1/10, 1/50, ABERTA", como no desktop                                                        | Rótulo repetido faria comprar uma edição achando que é outra      |
| Início, desktop           | Seta de "Ordenar por" desenhada sobre as últimas letras de "recentemente"                       | Seta logo depois do valor, com o grupo alinhado à direita da grade                                        | Texto encoberto parece defeito                                    |
| Início, desktop e mobile  | Cada arte em uma altura dentro do cartão (de 4 a 9 px de diferença); Cosmic Bloom com 224 x 286 | Arte centrada e do mesmo tamanho em todos os cartões                                                      | Cartões iguais com arte desalinhada parecem erro                  |
| Início, desktop           | Preço 12 px abaixo do nome na 1ª linha e 6 px nas demais                                        | 6 px em todas as linhas; a paginação compensa os 6 px, e as seções abaixo ficam na mesma posição do frame | Mesmo componente com espaçamentos diferentes                      |
| Início, desktop           | Segundo cartão de promoção com recuos de 35 e 39 px e texto de 252 px; o primeiro usa 30 e 263  | Os dois usam os recuos do primeiro                                                                        | Cartões gêmeos com alinhamentos diferentes                        |
| Detalhe, desktop          | "Mais desta coleção" com larguras de 219 e 220 px e artes em posições e tamanhos diferentes     | Cinco cartões de 219 px com arte de 212 px centrada                                                       | Mesma correção da grade da Início                                 |
| Login e Cadastro, mobile  | Conteúdo dos botões "Continuar com Google/Facebook" 9 px à esquerda do centro                   | Conteúdo centrado                                                                                         | Item visivelmente fora do centro                                  |
| Login e Cadastro, desktop | Atrás do modal, composição diferente da Início                                                  | Atrás do modal fica a Início real, sem mudar nada ao abrir                                                | Abrir o login mudava a página inteira atrás do modal              |
| Início, mobile            | Foto de 58 px de outro NFT sobreposta à arte principal do destaque                              | Só a arte principal                                                                                       | Uma imagem cobrindo a outra parece erro                           |
| Início, mobile            | Vão de 4 px entre "Todos os NFTs" e "Novos lançamentos" e de 16 px até "Em alta"                | 16 px entre todas as abas                                                                                 | Itens iguais com vãos diferentes                                  |
| Início, desktop           | Botão "EXPLORAR" com o texto 4 px à esquerda do centro                                          | Texto centrado                                                                                            | Item visivelmente fora do centro                                  |
| Início, desktop           | "NFT EM DESTAQUE" à esquerda, com "OFERTA LIMITADA" centrado logo abaixo                        | Os dois centrados                                                                                         | Títulos do mesmo bloco desalinhados entre si                      |
| Início, desktop           | Artigos do diário terminam em x = 1264, e a página vai até 1320                                 | Quatro artigos de 282 px ocupam toda a largura, com a altura e as quebras de texto do frame               | Grade empurrada para a esquerda, sem alinhar com as outras seções |
| Rodapé, desktop           | "Enviar" 6 px e "METAMASK • ..." 4 px à direita do centro das caixas                            | Textos centrados                                                                                          | Item visivelmente fora do centro                                  |
| Cadastro, mobile          | Só o campo "Nome de usuário" com o texto de exemplo centrado                                    | Texto à esquerda, como nos outros campos                                                                  | Campos iguais com alinhamentos diferentes                         |
| Carrinho, mobile          | Lixeira só no 3º cartão, sobre o botão "+"                                                      | Lixeira em todos os cartões, acima do "+"                                                                 | O botão ficava encoberto, e remover é função de todo item         |
| Carrinho, mobile          | Cada arte duplicada, com a de cima em `multiply` e deslocada até 2 px, o que escurece a imagem  | Uma imagem só, com as cores das outras telas                                                              | O mesmo NFT não pode mudar de cor entre telas                     |
| Carrinho, mobile          | Cartões em y = 88, 208, 330 e 450 (vãos de 20 e 22 px)                                          | Vão de 20 px entre todos                                                                                  | Lista dinâmica não tem posição própria por item                   |
| Pagamento, desktop        | Linhas de "Seus NFTs" com artes de 70, 66 e 65 px e textos e valores em posições diferentes     | Todas as linhas como a primeira: arte de 70 px e valores alinhados                                        | Mesmo componente com medidas diferentes                           |
| Pagamento, desktop        | "Total" recuado (957 a 1278) e "Taxa estimada" centrada, fora do alinhamento dos outros valores | Total de ponta a ponta e "Taxa estimada" à direita, como no Carrinho                                      | Valores de uma mesma lista desalinhados                           |
| Pagamento, desktop        | "Carteira e rede" centrado, com os outros títulos de seção à esquerda                           | À esquerda, como no mobile                                                                                | Títulos iguais com alinhamentos diferentes                        |
| Pagamento, desktop        | 1ª opção de carteira mostra o selo com as três marcas; opções com recuos diferentes (927 e 931) | 1ª opção é "WalletConnect", como no mobile; recuos e altura do texto iguais nas três                      | Opção sem nome não diz o que se escolhe                           |
| Pagamento, desktop        | Texto de exemplo de endereço com recuo de 22 px; os demais campos usam 12 px                    | 12 px em todos os campos                                                                                  | Campos iguais com alinhamentos diferentes                         |
| Pagamento, mobile         | Só a seleção de carteira, sem os campos que o desktop exige                                     | Os mesmos campos abrem em uma folha quando falta dado obrigatório                                         | O enunciado exige validar os campos, e o pedido depende deles     |
| Confirmação               | Linhas de itens com artes de 70, 66 e 65 px; "16.11 ETH" passa da borda da tabela (970 x 965)   | Todas com arte de 70 px e valores alinhados à direita da tabela                                           | Mesmo componente com medidas diferentes e valor fora da grade     |
| Confirmação               | Só o estado confirmado                                                                          | Pendente e recusado no mesmo modal, sem transação nem recibo                                              | O enunciado exige os três estados                                 |
| Perfil e Carteiras        | Textos do menu começam em x = 170, 168, 166 e 164, conforme a linha                             | Todos em x = 166                                                                                          | Itens iguais com recuos diferentes                                |
| Perfil                    | Texto do botão "Alterar" 5 px à direita do centro                                               | Texto centrado                                                                                            | Item visivelmente fora do centro                                  |
| Carteiras                 | Título "Carteira principal" cortado na parte de baixo das letras                                | Título inteiro, na mesma posição                                                                          | Texto cortado parece erro                                         |
| Cabeçalho                 | Só mostra "Entrar", inclusive nas telas de conta                                                | Com sessão, avatar no lugar do botão; o menu central não muda de posição                                  | Mostrar "Entrar" a quem já entrou seria informação errada         |
| Carrinho, mobile          | Quantidade 6 px abaixo do centro dos botões                                                     | Quantidade centrada na linha dos botões                                                                   | Item visivelmente fora do centro                                  |
| Carrinho, mobile          | Subtotal 8.92 ETH e total 8.936 ETH, com itens que somam 8.14 ETH                               | Subtotal 8.14 ETH e total 8.156 ETH, calculados dos itens                                                 | Total diferente da soma seria dado errado                         |
| Início, desktop           | Contagens das coleções (33, 12, 65...) e das raridades (119, 78, 86)                            | Contagem real do catálogo simulado: 4 por coleção e 12 por raridade                                       | Prometer 33 itens e listar 4 ao filtrar seria dado errado         |
| Início, desktop           | "Arte digital" em laranja, como se estivesse selecionada, com a grade mostrando todos os NFTs   | Laranja só com o filtro ativo; sem filtro, a cor normal                                                   | Destaque sem filtro aplicado informa um estado falso              |
| Início, desktop           | Segundo cartão de promoção corta a última palavra: "...que definem a"                           | Frase inteira: "...que definem a cultura."                                                                | Texto cortado parece erro                                         |
| Carteiras                 | "Adicionar" da carteira secundária termina 6 px antes da margem usada pelo "Adicionar" de cima  | Os dois terminam na mesma margem direita                                                                  | Ações iguais desalinhadas entre si                                |
| Formulários               | Asterisco colado ao rótulo na maioria dos campos e a 4 px em "Rede" e "Nome ENS"                | Asterisco colado ao rótulo em todos os campos                                                             | Campos iguais com espaçamentos diferentes                         |
| Cabeçalho                 | Menu central 7 px acima do logo e dos botões                                                    | Menu 7 px abaixo, centrado com logo e botões; o traço da aba ativa não muda                               | Itens da mesma barra desalinhados na vertical                     |
| Início, desktop           | Arcos laranja cortados sobre a arte dos dois cartões de promoção                                | Sem os arcos                                                                                              | Parecem colocados por engano e cobrem a arte                      |
| Início, desktop           | Seletor do destaque em y = 500                                                                  | 16 px mais abaixo, em y = 516                                                                             | Comentário: muito perto, as animações podem cobri-lo              |

### Mudanças depois de testar em celular real

| Tela                     | O que o frame mostra                               | O que a aplicação faz                                                  | Motivo                                                                             |
| ------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Início, mobile           | Coluna direita de cartões 32 px abaixo da esquerda | Colunas niveladas                                                      | Cartões da mesma linha desalinhados parecem defeito                                |
| Campos, em tela de toque | Texto digitado com 12 a 14 px                      | Texto digitado com 16 px; o texto de exemplo mantém o tamanho do frame | Abaixo de 16 px o iOS amplia a página ao focar. O zoom da página continua liberado |

### Larguras sem frame

Os frames têm 1440 px no desktop e 414 px no mobile, com medidas fixas. Nas larguras intermediárias, as medidas do frame viram teto: o layout é igual ao frame na largura dele e se adapta abaixo, sem cortar texto nem sobrepor elementos. O teste `tests/responsivo/telas.spec.ts` confere doze telas e estados (inclusive filtros, a folha do pagamento e o recibo) em 31 perfis de aparelho do Playwright, de 320 a 984 px e três deles deitados, e em desktop de 1024 x 768, 1280 x 800 e 1440 x 900, além de 720 x 450, que é a tela de 1440 x 900 com zoom de 200%; iPhone e iPad rodam no WebKit. Ele falha com texto cortado, sobreposto, colado na borda ou fora da tela, controle espremido, diálogo que não cabe na tela ou conteúdo atrás da barra inferior.

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
| Login e Cadastro              | abaixo de 1200 px          | Atrás do modal, a Início segue as próprias regras de largura, sem rolagem lateral                                                |
| Login e Cadastro              | abaixo de 900 px de altura | O modal limita a altura à tela e rola por dentro; em 900 px fica igual ao frame                                                  |
| Detalhe                       | todas                      | A pílula da nota parte dos 80 px do frame e cresce com o texto, sem encostar na borda                                            |
| Pagamento, mobile             | todas                      | Os campos da folha não encolhem para caber: a folha rola e o botão "Continuar" mantém 60 px                                      |
| Pagamento, mobile             | abaixo de 1024 px          | Texto de exemplo "ENS ou carteira (opcional)" na folha, como em Carteiras; "Trocar carteira" não encolhe e o título quebra linha |
| Início, mobile                | todas                      | Folha de filtros com 320 px, limitada à largura da tela                                                                          |

- O recibo no mobile deixa o nome do NFT quebrar linha, em vez de cortá-lo abaixo de 375 px.

### Pontos do arquivo verificados e mantidos

Os comentários deixados no arquivo do Figma foram usados como lista do que conferir. Cada um foi medido no frame: os que se confirmaram estão na tabela acima. Estes foram verificados e mantidos, por serem preferência de desenho ou por o frame estar coerente:

- Carrinho, desktop: a lixeira está centrada na própria caixa de 24 px, e os botões de quantidade são pílulas de 20 x 30 com raio cheio.
- Carrinho, mobile: botões de quantidade redondos, diferentes dos do desktop. Cada frame segue o seu desenho.
- Pagamento: a seta dos seletores fica a 28,5 px da borda nos dois seletores, de forma coerente.
- Confirmação: os rótulos "Taxa de rede" e "Total" começam em x = 644, alinhados entre si.
- Perfil: botão "Salvar" de 131 px e recuo da linha "Sair": o frame está coerente, e a mudança seria preferência.
- Perfil e Carteiras não têm frame mobile: usam abas no padrão da Início e os mesmos campos em uma coluna.
- "Lista de interesse" e os demais itens fora do escopo avisam que estão indisponíveis.
- Início, desktop: paginação com números e seta de próxima, como no frame; não há seta de voltar, e os números levam às páginas anteriores.
- Início, mobile: sublinhado da aba como no frame; o botão central da barra, "Escanear", está fora do escopo e avisa que está indisponível.
- Detalhe, desktop: posição do botão "Entrar" e miniaturas como no frame. Elas mostram a mesma arte e trocam a imagem principal.
- Detalhe, mobile: rótulos das edições em pílula, como no frame.
- Carrinho, desktop: distância da trilha até "NFTs" e fundo atrás das artes como no frame.
- Pagamento: espaçamentos de "Seus NFTs" seguem o frame, salvo os desvios da tabela acima.
- Cadastro: título "Criar conta" e subtítulo seguem o frame; o fundo escuro atrás do modal é o do frame, sem camada extra.
- Tema só escuro e sem frame mobile de Confirmação, Perfil e Carteiras nem frame de tablet: o arquivo não traz essas referências.
- Sem mudança por gosto: ordem das coleções, letras W, C e D nos serviços, controle deslizante de preço e fundo escuro atrás do modal, que reproduz o frame.

### Comentários do arquivo, um a um

O arquivo tem 62 comentários de outros candidatos, 2 deles vazios, agrupados aqui por assunto. Cada um foi conferido no frame. "Corrigido" tem linha nas tabelas de desvios ou em "Larguras sem frame"; "Mantido" foi medido e está coerente, ou é preferência de desenho; "Respondido" é uma pergunta resolvida pelo comportamento da aplicação.

| Tela               | Comentário                                       | Situação                                                                |
| ------------------ | ------------------------------------------------ | ----------------------------------------------------------------------- |
| Início, desktop    | Círculos colocados por engano                    | Corrigido: arcos removidos                                              |
| Início, desktop    | Frase termina em "cultura" e não aparece         | Corrigido: frase inteira                                                |
| Início, desktop    | Diário empurrado para a esquerda                 | Corrigido: ocupa toda a largura                                         |
| Início, desktop    | Fundo sai da imagem; fundo descentrado           | Corrigido: arte centrada nos cartões                                    |
| Início, desktop    | Falta de uniformidade na 2ª linha                | Corrigido: arte e distância do preço iguais                             |
| Início, desktop    | Falta de padding em "METAMASK"; centrar botão    | Corrigido: textos centrados no rodapé                                   |
| Início, desktop    | Falta margem em "Explorar"                       | Mantido: 4 px entre o texto e a seta, como no frame                     |
| Início, desktop    | Texto sem alinhamento em "NFT EM DESTAQUE"       | Corrigido: títulos centrados                                            |
| Início, desktop    | "EXPLORAR" fora do centro                        | Corrigido: texto centrado                                               |
| Início, desktop    | Seletor do destaque muito perto                  | Corrigido: 16 px abaixo                                                 |
| Início, desktop    | Divisória só em algumas telas                    | Mantido: cada tela como no frame; Detalhe, Carrinho e Pagamento não têm |
| Início, desktop    | Cartão com fundo de outra cor                    | Mantido: é o fundo do cartão no frame                                   |
| Início, desktop    | Coleções fora de ordem alfabética                | Mantido: ordem do frame                                                 |
| Início, desktop    | Filtros poderiam usar checkboxes                 | Mantido: filtros já são combináveis; seleção por cor e estado anunciado |
| Início, desktop    | Faixa de preço imprecisa                         | Mantido: controle do frame                                              |
| Início, desktop    | Letras em vez de ícones nos serviços             | Mantido: desenho do frame                                               |
| Início, desktop    | Botão de voltar na página 2                      | Respondido: números levam às páginas anteriores                         |
| Início, desktop    | Opções de ordenação                              | Respondido: recentes, menor preço, maior preço e nome                   |
| Início, mobile     | Imagem sobre o destaque                          | Corrigido: imagem removida                                              |
| Início, mobile     | Falta de margem nas abas                         | Corrigido: 16 px entre as abas                                          |
| Início, mobile     | Itens não nivelados                              | Corrigido: colunas niveladas                                            |
| Início, mobile     | O que faz o botão central                        | Respondido: "Escanear", fora do escopo, avisa que está indisponível     |
| Detalhe, desktop   | Margem não uniforme em "Entrar"                  | Mantido: 9 px de recuo dos dois lados                                   |
| Detalhe, desktop   | Container descentrado; falta de uniformidade     | Corrigido: cartões iguais em "Mais desta coleção"                       |
| Detalhe, desktop   | Miniaturas são variações?                        | Respondido: trocam a imagem principal, sem mudar dados                  |
| Detalhe, desktop   | "-" deveria desabilitar em 1                     | Respondido: desabilitado na quantidade 1                                |
| Detalhe, mobile    | Pílula das edições desnecessária                 | Mantido: desenho do frame                                               |
| Carrinho, desktop  | Textos desalinhados no rodapé                    | Mantido: mesmo rodapé das outras telas                                  |
| Carrinho, desktop  | Ícone da lixeira descentrado                     | Mantido: centrado na caixa de 24 px                                     |
| Carrinho, desktop  | Trilha muito perto de "NFTs"                     | Mantido: 12 px, como no frame                                           |
| Carrinho, desktop  | Botão de quantidade sem raio                     | Mantido: pílula de 20 x 30 com raio cheio                               |
| Carrinho, desktop  | Fundo atrás da arte diferente                    | Mantido: desenho do frame                                               |
| Carrinho, desktop  | Token diferente de Pagamento                     | Corrigido: um token por NFT                                             |
| Carrinho, mobile   | Falta de centralização; sem espaço para excluir  | Corrigido: quantidade centrada e lixeira acima do "+"                   |
| Carrinho, mobile   | Botões deveriam ser iguais aos do desktop        | Mantido: cada frame segue o seu desenho                                 |
| Pagamento, desktop | Falta centralizar a seta do seletor              | Mantido: seta centrada na altura e na mesma posição nos dois seletores  |
| Pagamento, desktop | Falta uniformizar a lista                        | Corrigido: linhas iguais                                                |
| Pagamento, desktop | Falta margem e padding nas carteiras             | Corrigido: recuos iguais nas opções                                     |
| Pagamento, mobile  | Formulário não aparece                           | Corrigido: campos abrem em folha                                        |
| Confirmação        | Textos mais à direita                            | Mantido: "Taxa de rede" e "Total" alinhados entre si                    |
| Confirmação        | Só o estado confirmado                           | Corrigido: pendente e recusado no mesmo modal                           |
| Login              | Melhorar a tipografia de "Listados recentemente" | Corrigido: texto não fica sob a seta                                    |
| Cadastro           | Menu desalinhado do logo                         | Corrigido: menu centrado com logo e botões                              |
| Cadastro           | Sem camada escura atrás do modal                 | Mantido: fundo reproduzido do frame                                     |
| Cadastro           | Centralizar abas; aproximar subtítulo            | Mantido: abas e subtítulo como no frame                                 |
| Cadastro, mobile   | Texto de exemplo centrado                        | Corrigido: à esquerda, como nos outros campos                           |
| Perfil             | Aumentar o recuo de "Sair"                       | Mantido: 12 px, coerente no frame                                       |
| Perfil             | Botão de largura total                           | Mantido: "Salvar" de 131 px                                             |
| Perfil             | Centrar "Alterar"                                | Corrigido: texto centrado                                               |
| Perfil             | ENS só existe em Ethereum                        | Mantido: seletor do frame                                               |
| Perfil             | "Entrar" continua após o login?                  | Corrigido: avatar com sessão                                            |
| Carteiras          | Ícone desproporcional ao botão                   | Mantido: ícone de 20 px em botão de 35 px, centrado                     |
| Arquivo            | Cores em hexadecimal e tema claro                | Mantido: o arquivo só traz tema escuro                                  |
| Arquivo            | Sem frames de tablet e de mobile em três telas   | Corrigido: adaptação em "Larguras sem frame"                            |

### Assets

As quatro artes dos NFTs vêm do arquivo do Figma, convertidas para WebP em 320, 640 e 960 px de largura, e são reutilizadas pelos NFTs do catálogo simulado. Os ícones dos frames são SVGs exportados deles. Ícones sem frame, como o olho de "senha visível" e os internos dos componentes shadcn/ui, vêm do `lucide-react`. A fonte é Roboto Mono, servida localmente pelo pacote `@fontsource-variable/roboto-mono`. Nenhum asset do arquivo foi trocado por outro.

### Reproduzidos como estão no frame

- A Início desktop não mostra o selo RARO; o frame mobile mostra, e cada tela segue o seu frame.
- Textos e rótulos ficam como desenhados, inclusive "Contrato" e "Direitos autorais" trocados no Detalhe.
- Violet Nomad aparece com o token #0009 no Carrinho e #0314 no Pagamento. Um NFT tem um token só, e a aplicação usa #0314 nas duas telas.
- Linhas de 0,3 px do frame são renderizadas como 1 px com 25% de opacidade, que é o resultado visual do Figma.

### Estados sem frame

- Abertura: até o JavaScript montar a aplicação, o HTML mostra só a marca "KURIO" centrada no fundo escuro, sem ocupar layout depois de montar. Se um pacote não baixar ou a inicialização passar de 15 s, ela vira um aviso com "Tentar de novo".
- Revisão antes do envio: modal no padrão da Confirmação, exigido pelo enunciado.
- Conexão da carteira: "Desconectar", "Conectar" e a recusa aparecem na opção escolhida, no desktop, e no menu de três pontos, no mobile.
- Campos obrigatórios seguem os asteriscos do frame, inclusive "Código de indicação".

### Início atrás do modal de login

Os frames de Login e Cadastro desenham atrás do modal uma composição diferente da Início: arte 20 px acima, filtros 70 px acima, outras contagens e selo RARO. Copiada, ela mudava a página inteira ao abrir o login. Por isso, atrás do modal fica a Início real, inerte e fora da árvore acessível, e o link "Entrar" do cabeçalho mantém a posição da rolagem. Vindo de um filtro, de outra página ou de um favorito, o fundo é a Início padrão, sem o filtro.

Ao abrir o modal, a barra de rolagem some e a página reserva o espaço dela. O modal desconta metade dessa reserva, para ficar centrado na Início, e arredonda o centro para o pixel inteiro, pois em meio pixel o texto borra.

### Ajustes de acessibilidade

- O seletor de sufixo ENS não tem rótulo próprio no frame e recebe o nome acessível "Sufixo do nome ENS".
- "Taxa estimada" fica dentro da lista de valores como par de termo e descrição, com o termo só para leitores de tela.
- Em tela de toque, o texto digitado nos campos usa 16 px, para o iOS não ampliar a página ao focar (ver "Mudanças depois de testar em celular real").
- Ao abrir o modal de Login ou Cadastro, o foco vai para o próprio diálogo, e não para um campo: o frame de Cadastro não destaca campo nenhum. A borda laranja da senha no frame de Login é o estado de foco.
- O olho de "mostrar senha" no estado visível não tem desenho no Figma e usa um ícone de biblioteca no mesmo tamanho.
