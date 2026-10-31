import { http, HttpResponse } from 'msw';
import { entradaCadastroSchema, entradaLoginSchema, sessaoSchema } from '@/contracts/conta/sessao';
import { lerBanco, salvarBanco } from '../../banco/estado';
import { gerarHashSenha } from '../../banco/senhas';
import type { UsuarioBanco } from '../../fixtures/usuarios';
import { autenticar, lerToken } from './autenticacao';
import { lerCorpo, responderErro } from '../respostas';

const DURACAO_SESSAO_MS = 60 * 60 * 1000;

// ====================================================================
// 1. CRIAÇÃO DA SESSÃO
// O schema remove sal e hash da resposta: nada ligado à senha sai da
// API, nem por engano.
// ====================================================================
function abrirSessao(usuario: UsuarioBanco) {
  const token = crypto.randomUUID();
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_MS).toISOString();

  lerBanco().sessoes[token] = { usuarioId: usuario.id, expiraEm };
  salvarBanco();

  return sessaoSchema.parse({ token, expiraEm, usuario });
}

// ====================================================================
// 2. HANDLERS
// Conflito de cadastro aponta o campo em uso. Login errado não revela
// se o problema foi o e-mail ou a senha.
// ====================================================================
export const handlersSessao = [
  http.post('/api/auth/cadastro', async ({ request }) => {
    const leitura = await lerCorpo(request, entradaCadastroSchema);

    if ('erro' in leitura) {
      return leitura.erro;
    }

    const { nomeUsuario, senha } = leitura.dados;
    const email = leitura.dados.email.toLowerCase();
    const banco = lerBanco();

    if (banco.usuarios.some((usuario) => usuario.email === email)) {
      return responderErro(409, 'EMAIL_EM_USO', 'E-mail já cadastrado', {
        email: 'E-mail já cadastrado',
      });
    }

    if (banco.usuarios.some((usuario) => usuario.nomeUsuario === nomeUsuario)) {
      return responderErro(409, 'NOME_USUARIO_EM_USO', 'Nome de usuário em uso', {
        nomeUsuario: 'Nome de usuário em uso',
      });
    }

    const sal = crypto.randomUUID();
    const usuario: UsuarioBanco = {
      id: `usuario-${crypto.randomUUID()}`,
      nomeUsuario,
      email,
      nomeExibicao: nomeUsuario,
      avatarUrl: null,
      nomeEns: null,
      apelidoCarteira: null,
      sal,
      hashSenha: await gerarHashSenha(sal, senha),
    };

    banco.usuarios.push(usuario);

    return HttpResponse.json(abrirSessao(usuario), { status: 201 });
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const leitura = await lerCorpo(request, entradaLoginSchema);

    if ('erro' in leitura) {
      return leitura.erro;
    }

    const email = leitura.dados.email.toLowerCase();
    const usuario = lerBanco().usuarios.find((candidato) => candidato.email === email);
    const hash = usuario ? await gerarHashSenha(usuario.sal, leitura.dados.senha) : null;

    if (!usuario || hash !== usuario.hashSenha) {
      return responderErro(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos');
    }

    return HttpResponse.json(abrirSessao(usuario));
  }),

  http.get('/api/auth/sessao', ({ request }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const token = lerToken(request) ?? '';

    return HttpResponse.json(
      sessaoSchema.parse({
        token,
        expiraEm: lerBanco().sessoes[token].expiraEm,
        usuario: sessao.usuario,
      }),
    );
  }),

  http.post('/api/auth/logout', ({ request }) => {
    const token = lerToken(request);

    if (token) {
      delete lerBanco().sessoes[token];
      salvarBanco();
    }

    return new HttpResponse(null, { status: 204 });
  }),
];
