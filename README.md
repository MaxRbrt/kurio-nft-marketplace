# KURIO: marketplace de NFTs

Solução do desafio de frontend da Jungle Gaming. O enunciado original está em [`docs/ENUNCIADO.md`](docs/ENUNCIADO.md); decisões, contratos e desvios do Figma, em [`ARCHITECTURE.md`](ARCHITECTURE.md).

- **Aplicação publicada:** https://kurio-nft-marketplace-nine.vercel.app
- **Stack:** React, TypeScript, TanStack Router e Query, Axios, Socket.IO, Tailwind CSS, shadcn/ui, MSW, Playwright e Lighthouse.

Toda a API e os eventos são simulados na camada de rede, com MSW. A aplicação roda sem backend nem serviço externo.

## Setup

Requer Node 24 e npm 11.

```bash
npm ci
npx playwright install chromium webkit
npm run dev
```

## Comandos

| Comando                | O que faz                                                     |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Desenvolvimento, com mocks                                    |
| `npm run build`        | Verificação de tipos e build otimizado                        |
| `npm run preview`      | Serve o build                                                 |
| `npm run typecheck`    | Verificação de tipos                                          |
| `npm run lint`         | oxlint                                                        |
| `npm run format:check` | Prettier                                                      |
| `npm run test:e2e`     | Todos os testes Playwright (sobe o build na porta 4173)       |
| `npm run test:visual`  | Só a regressão visual                                         |
| `npm run lighthouse`   | Auditoria completa, com relatórios em `lighthouse/relatorios` |

A porta 4173 precisa estar livre para os testes e a auditoria. Relatório HTML dos testes: `npx playwright show-report`. Traces das falhas ficam em `test-results`.

**Regressão visual:** as baselines em `tests/visual/regressao.spec.ts-snapshots` foram geradas no Windows, pois a renderização de fonte muda entre sistemas. Em outro sistema os testes visuais são pulados. Para gerar as próprias:

```bash
PLAYWRIGHT_VISUAL_QUALQUER_SISTEMA=1 npx playwright test tests/visual --update-snapshots
```

## Variáveis de ambiente

| Variável            | Valor  | Efeito                                           |
| ------------------- | ------ | ------------------------------------------------ |
| `VITE_ENABLE_MOCKS` | `true` | Liga os mocks. Já definida no `.env` versionado. |

## Credenciais fictícias

| Pessoa | E-mail             | Senha         | Situação                              |
| ------ | ------------------ | ------------- | ------------------------------------- |
| Ana    | `ana@kurio.test`   | `Kurio@2026a` | Duas carteiras cadastradas            |
| Bruno  | `bruno@kurio.test` | `Kurio@2026b` | Sem carteiras, para testar o cadastro |

Cupons: `KURIO10` é válido (10%), `GENESIS20` está expirado, e qualquer outro é inválido.

## Cenários e reset

Três formas, todas pela camada de rede:

1. **Painel:** abra qualquer tela com `?painel=1`, como `/nfts/nft-01?painel=1`. Ele fica fora das telas até ser pedido; `?painel=0` desliga.
2. **URL:** `?cenario=<nome>`, como `/?cenario=lento`.
3. **Rotas de controle:**

```bash
# no console do navegador, com a aplicação aberta
fetch('/api/__mock/resetar', { method: 'POST' })
fetch('/api/__mock/cenario', { method: 'POST', body: JSON.stringify({ nome: 'erro-500', vezes: 2 }) })
```

**Cenários:** `padrao`, `vazio`, `lento`, `latencia-variavel`, `fora-de-ordem`, `timeout`, `offline`, `erro-500`, `erro-403`, `sessao-expirada`, `preco-alterado`, `edicao-esgotada`, `pedido-timeout`, `pagamento-confirmado`, `pagamento-recusado`.

**Outras rotas de controle** (`POST /api/__mock/...`):

| Rota                         | Corpo                                             | Efeito                                  |
| ---------------------------- | ------------------------------------------------- | --------------------------------------- |
| `resetar`                    |                                                   | Restaura dados e cenário                |
| `nfts/:id`                   | `{ edicaoId?, preco?, disponivel? }`              | Muda o dado e publica `nft.updated`     |
| `eventos/nft-atualizado`     | evento completo                                   | Reenvia evento (duplicado ou antigo)    |
| `socket/derrubar`            |                                                   | Derruba a conexão, que reconecta        |
| `sessoes/expirar`            |                                                   | Expira as sessões                       |
| `pagamento`                  | `{ resolucao }`: `confirmar`, `recusar`, `manual` | Define o resultado dos próximos pedidos |
| `pedidos/:id/resolver`       | `{ estado }`: `confirmado`, `recusado`            | Resolve um pedido pendente              |
| `pedidos/timeout-no-proximo` |                                                   | Cria o próximo pedido e não responde    |
| `carteiras/recusar-conexao`  | `{ recusar }`                                     | Faz a carteira recusar a conexão        |

## Como reproduzir as falhas

Entre como Ana, adicione um NFT ao carrinho e vá ao pagamento. Use o painel (`?painel=1`):

- **Preço alterado durante a compra:** abra a revisão com "Confirmar compra" e clique em "Aumentar preço do Emerald Ape". A tela anuncia, o total muda e "Confirmar pedido" fica travado até aceitar os novos valores.
- **Edição esgotada:** "Esgotar o Emerald Ape". O carrinho avisa, e finalizar fica travado.
- **Pagamento recusado:** "Pagamento: recusar", e confirme. O modal mostra a recusa, e os itens continuam no carrinho.
- **Timeout com recuperação:** "Próximo pedido sem resposta", e confirme. Depois de 10 s a tela oferece nova tentativa, que recupera o mesmo pedido.
- **Queda com pedido pendente:** "Pagamento: manter pendente", confirme, "Derrubar o socket" e recarregue a página. O estado volta, sem outra compra. Resolva com `POST /api/__mock/pedidos/pedido-1/resolver`.
- **Sessão expirada no checkout:** "Expirar a sessão", e confirme. Depois do login, a compra continua com o que foi digitado.
- **Conexão recusada:** "Carteira recusa conexão", e escolha outra carteira.
- **Lentidão e falhas de rede:** selecione `lento`, `offline` ou `erro-500` no painel.

## Testes

Cobrem os 12 itens do enunciado, em Chromium, nos viewports desktop e mobile. A responsividade roda também no WebKit, com o perfil do iPhone 15, que reproduz o Safari:

| Pasta              | Conteúdo                                                                          |
| ------------------ | --------------------------------------------------------------------------------- |
| `tests/interface`  | Fluxos pela interface: catálogo, detalhe, conta, carrinho, compra, acessibilidade |
| `tests/visual`     | Regressão visual de início, detalhe, carrinho e pagamento                         |
| `tests/responsivo` | Oito telas de 320 a 1440 px sem texto cortado, sobreposto ou fora da tela         |
| `tests/mocks`      | Contratos da API simulada, idempotência e cenários                                |
| `tests/tempo-real` | Socket.IO: eventos, reconexão e heartbeat                                         |
| `tests/contratos`  | Schemas zod                                                                       |

## Lighthouse

Resultados, versões e condições em [`lighthouse/relatorios/resumo.md`](lighthouse/relatorios/resumo.md). Análise em `ARCHITECTURE.md`.
