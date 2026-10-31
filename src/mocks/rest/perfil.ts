import { http, HttpResponse } from 'msw';
import {
  entradaAvatarSchema,
  entradaPerfilSchema,
  entradaSenhaSchema,
  perfilSchema,
} from '@/contracts/conta/perfil';
import { lerBanco, salvarBanco } from '../banco/estado';
import { gerarHashSenha } from '../banco/senhas';
import { autenticar } from './autenticacao';
import { lerCorpo, responderErro } from './respostas';

// ====================================================================
// 1. PERFIL
// Alteração confirmada fica no banco e sobrevive ao refresh. E-mail e
// nome de usuário continuam únicos, ignorando o próprio dono.
// ====================================================================
export const handlersPerfil = [
  http.get('/api/perfil', ({ request }) => {
    const sessao = autenticar(request);

    return 'erro' in sessao ? sessao.erro : HttpResponse.json(perfilSchema.parse(sessao.usuario));
  }),

  http.patch('/api/perfil', async ({ request }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const leitura = await lerCorpo(request, entradaPerfilSchema);

    if ('erro' in leitura) {
      return leitura.erro;
    }

    const email = leitura.dados.email.toLowerCase();
    const outros = lerBanco().usuarios.filter((usuario) => usuario.id !== sessao.usuario.id);

    if (outros.some((usuario) => usuario.email === email)) {
      return responderErro(409, 'EMAIL_EM_USO', 'E-mail já cadastrado', {
        email: 'E-mail já cadastrado',
      });
    }

    if (outros.some((usuario) => usuario.nomeUsuario === leitura.dados.nomeUsuario)) {
      return responderErro(409, 'NOME_USUARIO_EM_USO', 'Nome de usuário em uso', {
        nomeUsuario: 'Nome de usuário em uso',
      });
    }

    Object.assign(sessao.usuario, leitura.dados, { email });
    salvarBanco();

    return HttpResponse.json(perfilSchema.parse(sessao.usuario));
  }),

  http.put('/api/perfil/avatar', async ({ request }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const leitura = await lerCorpo(request, entradaAvatarSchema);

    if ('erro' in leitura) {
      return leitura.erro;
    }

    sessao.usuario.avatarUrl = leitura.dados.avatarUrl;
    salvarBanco();

    return HttpResponse.json(perfilSchema.parse(sessao.usuario));
  }),

  // ==================================================================
  // 2. ALTERAÇÃO DE SENHA
  // Confere a senha atual e troca sal e hash juntos. Senha atual errada
  // aponta o próprio campo.
  // ==================================================================
  http.put('/api/perfil/senha', async ({ request }) => {
    const sessao = autenticar(request);

    if ('erro' in sessao) {
      return sessao.erro;
    }

    const leitura = await lerCorpo(request, entradaSenhaSchema);

    if ('erro' in leitura) {
      return leitura.erro;
    }

    const { sal, hashSenha } = sessao.usuario;

    if ((await gerarHashSenha(sal, leitura.dados.senhaAtual)) !== hashSenha) {
      return responderErro(422, 'SENHA_INCORRETA', 'Senha atual incorreta', {
        senhaAtual: 'Senha atual incorreta',
      });
    }

    const novoSal = crypto.randomUUID();
    sessao.usuario.sal = novoSal;
    sessao.usuario.hashSenha = await gerarHashSenha(novoSal, leitura.dados.novaSenha);
    salvarBanco();

    return new HttpResponse(null, { status: 204 });
  }),
];
