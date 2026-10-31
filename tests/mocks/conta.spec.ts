import { expect, test } from '@playwright/test';
import { favoritosSchema } from '../../src/contracts/catalogo/favoritos';
import { respostaErroSchema } from '../../src/contracts/comum/erros';
import { carteiraSchema } from '../../src/contracts/conta/carteiras';
import { perfilSchema } from '../../src/contracts/conta/perfil';
import { sessaoSchema } from '../../src/contracts/conta/sessao';
import { ANA, BRUNO, chamarApi, entrar } from '../apoio/api';

const codigoErro = (corpo: unknown) => respostaErroSchema.parse(corpo).erro.codigo;

const novaCarteira = {
  papel: 'principal',
  nomeExibicao: 'Bruno',
  apelido: null,
  rede: 'polygon',
  nomePerfil: null,
  endereco: `0x${'b'.repeat(40)}`,
  carteiraSecundaria: null,
  tipo: 'coinbase',
  codigoIndicacao: null,
  email: null,
  nomeEns: null,
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');
  expect((await chamarApi(page, 'POST', '/api/__mock/resetar')).status).toBe(204);
});

test.describe('sessão', () => {
  test('login válido abre sessão sem expor dados da senha', async ({ page }) => {
    const { status, corpo } = await chamarApi(page, 'POST', '/api/auth/login', ANA);

    expect(status).toBe(200);
    expect(sessaoSchema.parse(corpo).usuario.email).toBe(ANA.email);
    expect(JSON.stringify(corpo)).not.toMatch(/hashSenha|sal-ana/);
  });

  test('login errado não revela se foi e-mail ou senha', async ({ page }) => {
    const senhaErrada = await chamarApi(page, 'POST', '/api/auth/login', {
      email: ANA.email,
      senha: 'incorreta',
    });
    const emailErrado = await chamarApi(page, 'POST', '/api/auth/login', {
      email: 'ninguem@kurio.test',
      senha: 'incorreta',
    });

    expect(senhaErrada.status).toBe(401);
    expect(codigoErro(senhaErrada.corpo)).toBe('CREDENCIAIS_INVALIDAS');
    expect(emailErrado.corpo).toEqual(senhaErrada.corpo);
  });

  test('sessão recupera após refresh, expira e sai no logout', async ({ page }) => {
    const token = await entrar(page, ANA);

    await page.reload();
    await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');

    const recuperada = await chamarApi(page, 'GET', '/api/auth/sessao', undefined, token);
    expect(recuperada.status).toBe(200);
    expect(sessaoSchema.parse(recuperada.corpo).usuario.email).toBe(ANA.email);

    await chamarApi(page, 'POST', '/api/__mock/sessoes/expirar');
    const expirada = await chamarApi(page, 'GET', '/api/auth/sessao', undefined, token);
    expect(expirada.status).toBe(401);
    expect(codigoErro(expirada.corpo)).toBe('SESSAO_EXPIRADA');

    const novoToken = await entrar(page, ANA);
    expect((await chamarApi(page, 'POST', '/api/auth/logout', undefined, novoToken)).status).toBe(
      204,
    );
    const aposLogout = await chamarApi(page, 'GET', '/api/auth/sessao', undefined, novoToken);
    expect(codigoErro(aposLogout.corpo)).toBe('SESSAO_INVALIDA');
  });

  test('cadastro cria conta, valida campos e trata conflito', async ({ page }) => {
    const entrada = {
      nomeUsuario: 'carla',
      email: 'Carla@Kurio.test',
      senha: 'senha-segura',
      confirmarSenha: 'senha-segura',
    };
    const criada = await chamarApi(page, 'POST', '/api/auth/cadastro', entrada);
    const repetida = await chamarApi(page, 'POST', '/api/auth/cadastro', {
      ...entrada,
      nomeUsuario: 'outra',
    });
    const nomeRepetido = await chamarApi(page, 'POST', '/api/auth/cadastro', {
      ...entrada,
      email: 'outra@kurio.test',
    });
    const invalida = await chamarApi(page, 'POST', '/api/auth/cadastro', {
      ...entrada,
      email: 'nova@kurio.test',
      nomeUsuario: 'nova',
      confirmarSenha: 'diferente',
    });

    expect(criada.status).toBe(201);
    expect(sessaoSchema.parse(criada.corpo).usuario.email).toBe('carla@kurio.test');
    expect(repetida.status).toBe(409);
    expect(respostaErroSchema.parse(repetida.corpo).erro.campos).toHaveProperty('email');
    expect(codigoErro(nomeRepetido.corpo)).toBe('NOME_USUARIO_EM_USO');
    expect(invalida.status).toBe(422);
    expect(respostaErroSchema.parse(invalida.corpo).erro.campos).toHaveProperty('confirmarSenha');

    const login = await chamarApi(page, 'POST', '/api/auth/login', {
      email: 'carla@kurio.test',
      senha: 'senha-segura',
    });
    expect(login.status).toBe(200);
  });

  test('rotas privadas recusam quem não tem sessão', async ({ page }) => {
    for (const caminho of ['/api/perfil', '/api/favoritos', '/api/carteiras']) {
      const { status, corpo } = await chamarApi(page, 'GET', caminho);

      expect(status).toBe(401);
      expect(codigoErro(corpo)).toBe('SESSAO_INVALIDA');
    }
  });
});

test.describe('favoritos', () => {
  test('persistem por usuário, sem vazar para outro', async ({ page }) => {
    const ana = await entrar(page, ANA);
    const bruno = await entrar(page, BRUNO);

    await chamarApi(page, 'PUT', '/api/favoritos/nft-01', undefined, ana);
    const repetido = await chamarApi(page, 'PUT', '/api/favoritos/nft-01', undefined, ana);
    expect(favoritosSchema.parse(repetido.corpo).nftIds).toEqual(['nft-01']);

    await page.reload();
    await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');

    const daAna = await chamarApi(page, 'GET', '/api/favoritos', undefined, ana);
    const doBruno = await chamarApi(page, 'GET', '/api/favoritos', undefined, bruno);
    expect(favoritosSchema.parse(daAna.corpo).nftIds).toEqual(['nft-01']);
    expect(favoritosSchema.parse(doBruno.corpo).nftIds).toEqual([]);

    const removido = await chamarApi(page, 'DELETE', '/api/favoritos/nft-01', undefined, ana);
    expect(favoritosSchema.parse(removido.corpo).nftIds).toEqual([]);
  });

  test('NFT inexistente devolve 404', async ({ page }) => {
    const ana = await entrar(page, ANA);
    const { status } = await chamarApi(page, 'PUT', '/api/favoritos/nao-existe', undefined, ana);

    expect(status).toBe(404);
  });
});

test.describe('perfil', () => {
  test('edição e avatar persistem, com validação e conflito', async ({ page }) => {
    const ana = await entrar(page, ANA);
    const dados = {
      nomeExibicao: 'Ana Silva',
      nomeUsuario: 'ana.colecionadora',
      email: ANA.email,
      nomeEns: 'ana',
      apelidoCarteira: 'Principal',
    };

    const editado = await chamarApi(page, 'PATCH', '/api/perfil', dados, ana);
    const avatar = await chamarApi(
      page,
      'PUT',
      '/api/perfil/avatar',
      { avatarUrl: 'data:image/png;base64,AAAA' },
      ana,
    );
    const avatarInvalido = await chamarApi(
      page,
      'PUT',
      '/api/perfil/avatar',
      { avatarUrl: 'https://externo.test/a.png' },
      ana,
    );
    const invalido = await chamarApi(page, 'PATCH', '/api/perfil', { ...dados, email: 'x' }, ana);
    const conflito = await chamarApi(
      page,
      'PATCH',
      '/api/perfil',
      { ...dados, email: BRUNO.email },
      ana,
    );

    expect(perfilSchema.parse(editado.corpo).nomeExibicao).toBe('Ana Silva');
    expect(perfilSchema.parse(avatar.corpo).avatarUrl).toContain('data:image/png');
    expect(avatarInvalido.status).toBe(422);
    expect(respostaErroSchema.parse(invalido.corpo).erro.campos).toHaveProperty('email');
    expect(codigoErro(conflito.corpo)).toBe('EMAIL_EM_USO');

    await page.reload();
    await expect(page.getByTestId('socket-estado')).toHaveText('Conectado');

    const relido = await chamarApi(page, 'GET', '/api/perfil', undefined, ana);
    expect(perfilSchema.parse(relido.corpo).nomeExibicao).toBe('Ana Silva');
    expect(JSON.stringify(relido.corpo)).not.toContain('hashSenha');
  });

  test('troca de senha confere a atual e passa a valer', async ({ page }) => {
    const ana = await entrar(page, ANA);
    const incorreta = await chamarApi(
      page,
      'PUT',
      '/api/perfil/senha',
      { senhaAtual: 'errada', novaSenha: 'Nova@Senha1', confirmarNovaSenha: 'Nova@Senha1' },
      ana,
    );
    const correta = await chamarApi(
      page,
      'PUT',
      '/api/perfil/senha',
      { senhaAtual: ANA.senha, novaSenha: 'Nova@Senha1', confirmarNovaSenha: 'Nova@Senha1' },
      ana,
    );

    expect(codigoErro(incorreta.corpo)).toBe('SENHA_INCORRETA');
    expect(respostaErroSchema.parse(incorreta.corpo).erro.campos).toHaveProperty('senhaAtual');
    expect(correta.status).toBe(204);
    expect((await chamarApi(page, 'POST', '/api/auth/login', ANA)).status).toBe(401);
    expect(
      (
        await chamarApi(page, 'POST', '/api/auth/login', {
          email: ANA.email,
          senha: 'Nova@Senha1',
        })
      ).status,
    ).toBe(200);
  });
});

test.describe('carteiras', () => {
  test('cadastro, papel único, validação e edição', async ({ page }) => {
    const bruno = await entrar(page, BRUNO);
    const vazia = await chamarApi(page, 'GET', '/api/carteiras', undefined, bruno);
    const criada = await chamarApi(page, 'POST', '/api/carteiras', novaCarteira, bruno);
    const repetida = await chamarApi(page, 'POST', '/api/carteiras', novaCarteira, bruno);
    const invalida = await chamarApi(
      page,
      'POST',
      '/api/carteiras',
      { ...novaCarteira, papel: 'secundaria', endereco: '0x123' },
      bruno,
    );
    const carteira = carteiraSchema.parse(criada.corpo);
    const editada = await chamarApi(
      page,
      'PATCH',
      `/api/carteiras/${carteira.id}`,
      { ...novaCarteira, apelido: 'Minha' },
      bruno,
    );

    expect(vazia.corpo).toEqual([]);
    expect(criada.status).toBe(201);
    expect(respostaErroSchema.parse(repetida.corpo).erro.campos).toHaveProperty('papel');
    expect(respostaErroSchema.parse(invalida.corpo).erro.campos).toHaveProperty('endereco');
    expect(carteiraSchema.parse(editada.corpo).apelido).toBe('Minha');
    expect(JSON.stringify(criada.corpo)).not.toContain('usuarioId');
  });

  test('um usuário não acessa carteira do outro', async ({ page }) => {
    const bruno = await entrar(page, BRUNO);
    const ana = await entrar(page, ANA);
    const alheia = 'carteira-ana-principal';
    const edicao = await chamarApi(page, 'PATCH', `/api/carteiras/${alheia}`, novaCarteira, bruno);
    const conexao = await chamarApi(
      page,
      'POST',
      `/api/carteiras/${alheia}/conexao`,
      undefined,
      bruno,
    );
    const lista = await chamarApi(page, 'GET', '/api/carteiras', undefined, ana);

    expect(edicao.status).toBe(403);
    expect(codigoErro(edicao.corpo)).toBe('SEM_PERMISSAO');
    expect(conexao.status).toBe(403);
    expect(lista.corpo).toHaveLength(2);
    expect(carteiraSchema.parse(lista.corpo[0]).nomeExibicao).toBe('Ana Colecionadora');
  });

  test('conexão simulada: conecta, recusa e desconecta', async ({ page }) => {
    const ana = await entrar(page, ANA);
    const caminho = '/api/carteiras/carteira-ana-principal/conexao';
    const conectada = await chamarApi(page, 'POST', caminho, undefined, ana);

    await chamarApi(page, 'POST', '/api/__mock/carteiras/recusar-conexao', { recusar: true });
    const recusada = await chamarApi(page, 'POST', caminho, undefined, ana);
    await chamarApi(page, 'POST', '/api/__mock/carteiras/recusar-conexao', { recusar: false });
    const desconectada = await chamarApi(page, 'DELETE', caminho, undefined, ana);

    expect(conectada.corpo.estado).toBe('conectada');
    expect(codigoErro(recusada.corpo)).toBe('CONEXAO_CARTEIRA_RECUSADA');
    expect(desconectada.corpo.estado).toBe('desconectada');
  });
});
