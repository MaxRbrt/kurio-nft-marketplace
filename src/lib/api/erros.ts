import axios from 'axios';
import { respostaErroSchema, type CodigoErro } from '@/contracts/comum/erros';

// ====================================================================
// 1. ERRO DA API
// Toda falha vira esta classe, e a interface decide pelo código. Queda
// de rede e timeout não têm resposta: viram falha transitória, status 0.
// ====================================================================
export class ErroApi extends Error {
  readonly status: number;
  readonly codigo: CodigoErro;
  readonly campos: Record<string, string>;
  readonly detalhes: unknown;

  constructor(
    status: number,
    codigo: CodigoErro,
    mensagem: string,
    campos: Record<string, string> = {},
    detalhes?: unknown,
  ) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.codigo = codigo;
    this.campos = campos;
    this.detalhes = detalhes;
  }

  get transitorio() {
    return this.codigo === 'FALHA_TRANSITORIA';
  }
}

// ====================================================================
// 2. CONVERSÃO
// Cancelamento segue como está, pois não é erro para o usuário. Resposta
// fora do contrato é tratada como falha transitória, sem quebrar a tela.
// ====================================================================
export function converterErro(erro: unknown): unknown {
  if (axios.isCancel(erro) || !axios.isAxiosError(erro)) {
    return erro;
  }

  const status = erro.response?.status ?? 0;
  const leitura = respostaErroSchema.safeParse(erro.response?.data);

  if (leitura.success) {
    const { codigo, mensagem, campos, detalhes } = leitura.data.erro;

    return new ErroApi(status, codigo, mensagem, campos, detalhes);
  }

  return new ErroApi(status, 'FALHA_TRANSITORIA', 'Não foi possível concluir. Tente novamente.');
}
