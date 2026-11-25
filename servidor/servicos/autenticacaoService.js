// Regras de login e de usuários: confere a senha, controla as sessões e cadastra usuários.
// O login é feito com um nome de usuário (não com e-mail). Quem cadastra é o Administrador.

const { conferirSenha, gerarToken, gerarSal, gerarHash, gerarId } = require('../utils/seguranca'); // funções de senha, token e id
const { ErroRegra } = require('../utils/erros'); // erro com status HTTP

const PERFIS = ['Auxiliar', 'Técnico de enfermagem', 'Enfermeiro', 'Médico', 'Administrador']; // perfis aceitos
const TAMANHO_MINIMO_SENHA = 4; // menor tamanho aceito para senha
const FORMATO_USUARIO = /^[a-z0-9._-]{3,20}$/; // 3 a 20 caracteres: letras minúsculas, números, ponto, traço e underline

// Deixa o nome de usuário sempre em minúsculas e sem espaços nas pontas
function normalizarUsuario(valor) {
  return String(valor || '').trim().toLowerCase(); // converte e limpa
}

// Dados do usuário que podem ir para o navegador (sem senha e sem sal)
function dadosPublicos(usuario) {
  return { id: usuario.id, nome: usuario.nome, usuario: usuario.usuario, perfil: usuario.perfil }; // só os campos seguros
}

class AutenticacaoService { // serviço de login e de usuários
  constructor(banco) { // recebe o banco para ler e gravar usuários
    this.banco = banco; // guarda a referência
    this.sessoes = new Map(); // guarda token -> id do usuário (somem quando o servidor reinicia)
  }

  entrar(usuario, senha) { // tenta fazer login com nome de usuário e senha
    const login = normalizarUsuario(usuario); // limpa o nome digitado
    const encontrado = this.banco.listar('usuarios').find(u => u.usuario === login); // procura o usuário
    if (!encontrado || !conferirSenha(String(senha || ''), encontrado.sal, encontrado.senhaHash)) { // não achou ou senha errada
      throw new ErroRegra('Usuário ou senha incorretos.', 401); // mensagem genérica
    }
    const token = gerarToken(); // cria um token novo
    this.sessoes.set(token, encontrado.id); // liga o token ao usuário
    return { token, usuario: dadosPublicos(encontrado) }; // devolve o token e os dados do usuário
  }

  usuarioPorToken(token) { // descobre quem é o dono de um token
    const usuarioId = token ? this.sessoes.get(token) : null; // procura o id ligado ao token
    if (!usuarioId) return null; // token inexistente
    return this.banco.buscarPorId('usuarios', usuarioId); // devolve o usuário completo, uso interno
  }

  validarSenha(usuario, senha) { // confere a senha do usuário logado antes de uma ação sensível
    if (!usuario || !conferirSenha(String(senha || ''), usuario.sal, usuario.senhaHash)) { // senha ausente ou errada
      throw new ErroRegra('Senha do Administrador incorreta.', 403); // bloqueia a ação
    }
  }

  listarUsuarios() { // lista de usuários sem dados sensíveis
    return this.banco.listar('usuarios').map(dadosPublicos); // aplica a limpeza em cada um
  }

  cadastrarUsuario({ usuario, nome, senha, perfil }) { // cria um usuário novo (só o Administrador chama isto)
    const login = normalizarUsuario(usuario); // nome de usuário limpo
    if (!FORMATO_USUARIO.test(login)) { // confere o formato
      throw new ErroRegra('Usuário: use de 3 a 20 letras minúsculas, números, ponto, traço ou underline.');
    }
    if (!String(nome || '').trim()) throw new ErroRegra('Informe o nome da pessoa.'); // nome obrigatório
    if (!PERFIS.includes(perfil)) throw new ErroRegra('Escolha um perfil válido.'); // perfil precisa existir
    if (String(senha || '').length < TAMANHO_MINIMO_SENHA) { // senha curta demais
      throw new ErroRegra(`A senha provisória precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
    }
    if (this.banco.listar('usuarios').some(u => u.usuario === login)) { // nome já usado
      throw new ErroRegra('Já existe um usuário com este nome de usuário.', 409);
    }

    const sal = gerarSal(); // sal novo para esta senha
    const novo = this.banco.inserir('usuarios', { // grava o usuário com a senha protegida
      id: gerarId(),
      nome: String(nome).trim(),
      usuario: login,
      perfil,
      sal,
      senhaHash: gerarHash(String(senha), sal),
    });
    return dadosPublicos(novo); // devolve sem a senha
  }
}

module.exports = { AutenticacaoService, PERFIS }; // exporta o serviço e a lista de perfis
