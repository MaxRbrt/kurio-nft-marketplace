import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { redeSchema, type Rede } from '@/contracts/comum/valores';
import { tipoCarteiraSchema, type Carteira } from '@/contracts/conta/carteiras';
import type { Perfil } from '@/contracts/conta/perfil';
import {
  conectarCarteira,
  criarCarteira,
  desconectarCarteira,
  listarCarteiras,
} from '@/features/conta/api/carteiras';
import { obterPerfil } from '@/features/conta/api/perfil';
import { SUFIXOS_ENS } from '@/features/conta/ens';
import { useSessao } from '@/features/conta/usar-sessao';
import { ErroApi } from '@/lib/api/erros';

export const REDES: Array<{ valor: Rede; rotulo: string }> = [
  { valor: 'ethereum', rotulo: 'Ethereum' },
  { valor: 'polygon', rotulo: 'Polygon' },
  { valor: 'solana', rotulo: 'Solana' },
];
export const TIPOS_CARTEIRA = [
  { valor: 'walletconnect', rotulo: 'WalletConnect' },
  { valor: 'metamask', rotulo: 'MetaMask' },
  { valor: 'coinbase', rotulo: 'Coinbase Wallet' },
] as const;

const obrigatorio = (mensagem: string) => z.string().trim().min(1, mensagem);

// ====================================================================
// 1. CAMPOS DO LAYOUT
// Obrigatórios são os marcados com asterisco no frame. Rede e tipo vêm de
// listas, e o endereço segue a regra 0x do contrato das carteiras.
// ====================================================================
const formularioPagamentoSchema = z.object({
  nomeExibicao: obrigatorio('Informe o nome de exibição'),
  nomeUsuario: obrigatorio('Informe o nome de usuário'),
  rede: z.enum(redeSchema.options, { error: 'Selecione uma rede' }),
  nomePerfil: obrigatorio('Informe o nome do perfil'),
  endereco: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Endereço 0x inválido'),
  carteiraSecundaria: z.string().trim(),
  tipo: z.enum(tipoCarteiraSchema.options, { error: 'Selecione uma carteira' }),
  codigoIndicacao: obrigatorio('Informe o código de indicação'),
  email: z.email('E-mail inválido'),
  sufixoEns: z.enum(SUFIXOS_ENS),
  observacao: z.string().trim(),
});
export type FormularioPagamento = z.infer<typeof formularioPagamentoSchema>;

export const ORDEM_DOS_CAMPOS: Array<keyof FormularioPagamento> = [
  'nomeExibicao',
  'nomeUsuario',
  'rede',
  'nomePerfil',
  'endereco',
  'tipo',
  'codigoIndicacao',
  'email',
];

const rascunhoSchema = formularioPagamentoSchema.partial();
const chaveRascunho = (usuarioId: string) => `kurio:rascunho-pagamento:${usuarioId}`;

// ====================================================================
// 2. RASCUNHO DO FORMULÁRIO
// Em sessionStorage, para sessão expirada ou refresh não apagarem o que
// foi digitado. Não contém senha, e morre junto com a aba.
// ====================================================================
function lerRascunho(usuarioId: string) {
  const leitura = rascunhoSchema.safeParse(
    JSON.parse(sessionStorage.getItem(chaveRascunho(usuarioId)) ?? '{}'),
  );

  return leitura.success ? leitura.data : {};
}

function valoresIniciais(
  usuarioId: string,
  perfil: Perfil,
  carteira: Carteira | undefined,
): Partial<FormularioPagamento> {
  return {
    nomeExibicao: perfil.nomeExibicao,
    nomeUsuario: perfil.nomeUsuario,
    email: perfil.email,
    nomePerfil: carteira?.nomePerfil ?? '',
    codigoIndicacao: carteira?.codigoIndicacao ?? '',
    carteiraSecundaria: '',
    observacao: '',
    sufixoEns: '.eth',
    rede: carteira?.rede,
    tipo: carteira?.tipo,
    endereco: carteira?.endereco ?? '',
    ...lerRascunho(usuarioId),
  };
}

// ====================================================================
// 3. DADOS DA TELA
// Perfil e carteiras chegam antes do formulário: os valores iniciais vêm
// deles. A chave leva o usuário, e nada vaza entre contas.
// ====================================================================
export function useDadosPagamento() {
  const usuarioId = useSessao()?.usuario.id ?? '';
  const perfil = useQuery({
    queryKey: ['usuario', usuarioId, 'perfil'],
    queryFn: ({ signal }) => obterPerfil(signal),
  });
  const carteiras = useQuery({
    queryKey: ['usuario', usuarioId, 'carteiras'],
    queryFn: ({ signal }) => listarCarteiras(signal),
  });

  return { perfil, carteiras };
}

// ====================================================================
// 4. CONEXÃO SIMULADA
// A cada carteira escolhida, tenta conectar pela API. O estado vem só da
// resposta: recusa fica visível e pode ser repetida, e finalizar exige
// carteira conectada.
// ====================================================================
function useConexaoCarteira(carteiraId: string | undefined) {
  const conexao = useMutation({
    mutationFn: ({ id, acao }: { id: string; acao: 'conectar' | 'desconectar' }) =>
      acao === 'conectar' ? conectarCarteira(id) : desconectarCarteira(id),
  });
  const { mutate } = conexao;

  useEffect(() => {
    if (carteiraId) {
      mutate({ id: carteiraId, acao: 'conectar' });
    }
  }, [carteiraId, mutate]);

  const estado = conexao.isPending
    ? 'conectando'
    : conexao.isError
      ? 'recusada'
      : (conexao.data?.estado ?? 'desconectada');

  return {
    estado,
    conectada: estado === 'conectada',
    mensagemErro: conexao.error instanceof ErroApi ? conexao.error.message : null,
    conectar: () => carteiraId && mutate({ id: carteiraId, acao: 'conectar' }),
    desconectar: () => carteiraId && mutate({ id: carteiraId, acao: 'desconectar' }),
  };
}

// ====================================================================
// 5. FORMULÁRIO E CARTEIRA
// O tipo escolhido define a carteira: nas opções, no select e em "usar
// outra" é o mesmo estado. Tipo sem carteira cadastrada: o endereço fica
// editável, e a carteira é cadastrada na API ao prosseguir.
// ====================================================================
export function useFormularioPagamento(perfil: Perfil, carteiras: Carteira[]) {
  const clienteConsultas = useQueryClient();
  const usuarioId = useSessao()?.usuario.id ?? '';
  const principal = carteiras.find((carteira) => carteira.papel === 'principal') ?? carteiras[0];
  const formulario = useForm<FormularioPagamento>({
    resolver: zodResolver(formularioPagamentoSchema),
    defaultValues: valoresIniciais(usuarioId, perfil, principal),
    shouldFocusError: false,
  });
  const { control, setValue, getValues, subscribe } = formulario;
  const tipo = useWatch({ control, name: 'tipo' });
  const rede = useWatch({ control, name: 'rede' });
  const carteira = carteiras.find((candidata) => candidata.tipo === tipo);
  const conexao = useConexaoCarteira(carteira?.id);

  useEffect(() => {
    return subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        sessionStorage.setItem(chaveRascunho(usuarioId), JSON.stringify(values));
      },
    });
  }, [subscribe, usuarioId]);

  function escolherTipo(novoTipo: FormularioPagamento['tipo']) {
    const encontrada = carteiras.find((candidata) => candidata.tipo === novoTipo);
    const opcoes = { shouldValidate: formulario.formState.isSubmitted, shouldDirty: true };

    setValue('tipo', novoTipo, opcoes);
    setValue('endereco', encontrada?.endereco ?? '', opcoes);

    if (encontrada) {
      setValue('rede', encontrada.rede, opcoes);
    }
  }

  const outraCarteira = carteiras.find((candidata) => candidata.tipo !== tipo);

  const cadastro = useMutation({
    mutationFn: criarCarteira,
    onSuccess: () =>
      clienteConsultas.invalidateQueries({ queryKey: ['usuario', usuarioId, 'carteiras'] }),
  });

  // ==================================================================
  // 6. CARTEIRA DO PEDIDO
  // Devolve a carteira a usar. Papel livre: a primeira vira principal. Com
  // os dois papéis ocupados, o conflito da API aparece para o usuário.
  // ==================================================================
  async function garantirCarteira(): Promise<{ carteira: Carteira } | { erro: string }> {
    if (carteira) {
      return { carteira };
    }

    const dados = getValues();
    const papelOcupado = carteiras.some((candidata) => candidata.papel === 'principal');

    try {
      const criada = await cadastro.mutateAsync({
        papel: papelOcupado ? 'secundaria' : 'principal',
        nomeExibicao: dados.nomeExibicao,
        apelido: papelOcupado ? 'Reserva' : 'Principal',
        rede: dados.rede,
        nomePerfil: dados.nomePerfil,
        endereco: dados.endereco,
        carteiraSecundaria: dados.carteiraSecundaria || null,
        tipo: dados.tipo,
        codigoIndicacao: dados.codigoIndicacao,
        email: dados.email,
        nomeEns: dados.nomeUsuario,
      });

      return { carteira: criada };
    } catch (erro) {
      const campos = erro instanceof ErroApi ? Object.values(erro.campos) : [];

      return { erro: campos[0] ?? 'Não foi possível cadastrar a carteira.' };
    }
  }

  return {
    formulario,
    tipo,
    rede,
    carteira,
    outraCarteira,
    conexao,
    escolherTipo,
    garantirCarteira,
  };
}

export type EstadoPagamento = ReturnType<typeof useFormularioPagamento>;
