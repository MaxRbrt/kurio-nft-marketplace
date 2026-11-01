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

const textoDoRascunho = z.string().optional().catch(undefined);
const rascunhoSchema = z.object({
  nomeExibicao: textoDoRascunho,
  nomeUsuario: textoDoRascunho,
  rede: formularioPagamentoSchema.shape.rede.optional().catch(undefined),
  nomePerfil: textoDoRascunho,
  endereco: textoDoRascunho,
  carteiraSecundaria: textoDoRascunho,
  tipo: formularioPagamentoSchema.shape.tipo.optional().catch(undefined),
  codigoIndicacao: textoDoRascunho,
  email: textoDoRascunho,
  sufixoEns: formularioPagamentoSchema.shape.sufixoEns.optional().catch(undefined),
  observacao: textoDoRascunho,
});
const chaveRascunho = (usuarioId: string) => `kurio:rascunho-pagamento:${usuarioId}`;

// ====================================================================
// 2. RASCUNHO DO FORMULÁRIO
// Em sessionStorage, para sessão expirada ou refresh não apagarem o que
// foi digitado. Não contém senha, e morre junto com a aba. Cada campo é
// lido por si: valor ainda incompleto volta como foi digitado, e campo
// estranho é ignorado sem perder os outros. Storage indisponível ou
// corrompido só desliga o rascunho, sem derrubar a tela.
// ====================================================================
function lerRascunho(usuarioId: string): Partial<FormularioPagamento> {
  try {
    const salvo = sessionStorage.getItem(chaveRascunho(usuarioId));
    const leitura = rascunhoSchema.safeParse(JSON.parse(salvo ?? '{}'));
    const campos = leitura.success ? Object.entries(leitura.data) : [];

    return Object.fromEntries(campos.filter(([, valor]) => valor !== undefined));
  } catch {
    return {};
  }
}

function guardarRascunho(usuarioId: string, valores: Partial<FormularioPagamento>) {
  try {
    sessionStorage.setItem(chaveRascunho(usuarioId), JSON.stringify(valores));
  } catch {
    return;
  }
}

// ====================================================================
// 3. VALORES INICIAIS
// Dados do perfil e da carteira principal, cobertos pelo rascunho. O
// endereço de carteira já cadastrada vem sempre da API: o pedido usa a
// carteira pelo id, e a tela não pode mostrar um endereço antigo.
// ====================================================================
function valoresIniciais(
  usuarioId: string,
  perfil: Perfil,
  carteiras: Carteira[],
): Partial<FormularioPagamento> {
  const principal = carteiras.find((carteira) => carteira.papel === 'principal') ?? carteiras[0];
  const rascunho = lerRascunho(usuarioId);
  const tipoEscolhido = rascunho.tipo ?? principal?.tipo;
  const cadastrada = carteiras.find((carteira) => carteira.tipo === tipoEscolhido);

  return {
    nomeExibicao: perfil.nomeExibicao,
    nomeUsuario: perfil.nomeUsuario,
    email: perfil.email,
    nomePerfil: principal?.nomePerfil ?? '',
    codigoIndicacao: principal?.codigoIndicacao ?? '',
    carteiraSecundaria: '',
    observacao: '',
    sufixoEns: '.eth',
    rede: principal?.rede,
    tipo: principal?.tipo,
    endereco: principal?.endereco ?? '',
    ...rascunho,
    ...(cadastrada && { endereco: cadastrada.endereco }),
  };
}

// ====================================================================
// 4. DADOS DA TELA
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

class ErroConexaoNova extends Error {}

// ====================================================================
// 5. CONEXÃO SIMULADA
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
// 6. FORMULÁRIO E CARTEIRA
// O tipo escolhido define a carteira: nas opções, no select e em "usar
// outra" é o mesmo estado. Tipo sem carteira cadastrada: o endereço fica
// editável, e a carteira é cadastrada na API ao prosseguir.
// ====================================================================
export function useFormularioPagamento(perfil: Perfil, carteiras: Carteira[]) {
  const clienteConsultas = useQueryClient();
  const usuarioId = useSessao()?.usuario.id ?? '';
  const formulario = useForm<FormularioPagamento>({
    resolver: zodResolver(formularioPagamentoSchema),
    defaultValues: valoresIniciais(usuarioId, perfil, carteiras),
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
        guardarRascunho(usuarioId, values);
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
  // 7. CARTEIRA DO PEDIDO
  // Devolve a carteira a usar. Papel livre: a primeira vira principal. Com
  // os dois papéis ocupados, o conflito da API aparece para o usuário.
  // Carteira nova é conectada antes de seguir, como as já cadastradas:
  // recusa interrompe e avisa.
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

      await conectarCarteira(criada.id).catch(() => {
        throw new ErroConexaoNova();
      });

      return { carteira: criada };
    } catch (erro) {
      if (erro instanceof ErroConexaoNova) {
        return {
          erro: 'Carteira cadastrada, mas a conexão foi recusada. Conecte e tente de novo.',
        };
      }

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
