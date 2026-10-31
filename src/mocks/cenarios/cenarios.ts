import { z } from 'zod';
import { lerBanco, salvarBanco } from '../banco/estado';

// ====================================================================
// 1. CENÁRIOS DISPONÍVEIS
// Lista fechada, para teste e demonstração reproduzirem sempre o mesmo
// comportamento. Nome desconhecido é recusado.
// ====================================================================
export const cenarioSchema = z.object({
  nome: z.enum([
    'padrao',
    'vazio',
    'lento',
    'latencia-variavel',
    'fora-de-ordem',
    'timeout',
    'offline',
    'erro-500',
    'erro-403',
    'sessao-expirada',
    'preco-alterado',
    'edicao-esgotada',
    'pedido-timeout',
    'pagamento-confirmado',
    'pagamento-recusado',
  ]),
  vezes: z.number().int().positive().nullable().default(null),
  rota: z.string().nullable().default(null),
});
export type Cenario = z.infer<typeof cenarioSchema>;

const CENARIO_PADRAO: Cenario = { nome: 'padrao', vezes: null, rota: null };

// ====================================================================
// 2. SELEÇÃO
// Cenários de pagamento só ajustam o banco. Os demais agem a cada
// requisição, e "vezes" permite falhar e depois recuperar.
// ====================================================================
export function definirCenario(cenario: Cenario) {
  const banco = lerBanco();

  banco.cenario = cenario;

  if (cenario.nome === 'pagamento-confirmado') {
    banco.resolucaoPagamento = 'confirmar';
  }

  if (cenario.nome === 'pagamento-recusado') {
    banco.resolucaoPagamento = 'recusar';
  }

  if (cenario.nome === 'pedido-timeout') {
    banco.timeoutNoProximoPedido = true;
  }

  salvarBanco();
}

export function consumirUso() {
  const banco = lerBanco();
  const { vezes } = banco.cenario;

  if (vezes === null) {
    return;
  }

  banco.cenario = vezes > 1 ? { ...banco.cenario, vezes: vezes - 1 } : CENARIO_PADRAO;
  salvarBanco();
}

export function aplicarCenarioDaUrl() {
  const nome = new URLSearchParams(location.search).get('cenario');
  const leitura = cenarioSchema.safeParse({ nome });

  if (leitura.success) {
    definirCenario(leitura.data);
  }
}
