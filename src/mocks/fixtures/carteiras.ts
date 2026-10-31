import type { Carteira } from '@/contracts/conta/carteiras';

// ====================================================================
// 1. CARTEIRAS DAS FIXTURES
// Ana tem as duas do frame de pagamento mobile, principal e reserva.
// Bruno começa sem nenhuma, para exercitar o cadastro e o estado vazio.
// ====================================================================
export type CarteiraBanco = Carteira & { usuarioId: string };

export function criarCarteirasIniciais(): CarteiraBanco[] {
  return [
    {
      id: 'carteira-ana-principal',
      usuarioId: 'usuario-ana',
      papel: 'principal',
      nomeExibicao: 'Ana Colecionadora',
      apelido: 'Principal',
      rede: 'ethereum',
      nomePerfil: 'ana.colecionadora',
      endereco: '0xA91F00000000000000000000000000000000E82C',
      carteiraSecundaria: null,
      tipo: 'metamask',
      codigoIndicacao: null,
      email: 'ana@kurio.test',
      nomeEns: 'ana',
    },
    {
      id: 'carteira-ana-secundaria',
      usuarioId: 'usuario-ana',
      papel: 'secundaria',
      nomeExibicao: 'Ana Colecionadora',
      apelido: 'Reserva',
      rede: 'polygon',
      nomePerfil: 'ana.colecionadora',
      endereco: '0x7A4200000000000000000000000000000000019E',
      carteiraSecundaria: null,
      tipo: 'walletconnect',
      codigoIndicacao: null,
      email: 'ana@kurio.test',
      nomeEns: 'nova.kurio',
    },
  ];
}
