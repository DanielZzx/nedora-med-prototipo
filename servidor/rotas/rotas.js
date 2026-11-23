// Tabela de rotas da API: usa o Express para ligar cada endereço à regra correspondente.

const express = require('express'); // framework web usado para criar o roteador
const { ErroRegra } = require('../utils/erros'); // erro com status HTTP
const { PERFIS } = require('../servicos/autenticacaoService'); // lista de perfis, enviada para a tela de usuários

// Pega o token do cabeçalho "Authorization: Bearer <token>"
function extrairToken(cabecalhos) {
  const cabecalho = cabecalhos.authorization || ''; // o Node deixa os nomes de cabeçalho em minúsculas
  return cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null; // remove "Bearer " do começo
}

// Cria um middleware que exige login e coloca o usuário logado em req.usuario
function exigirLogin(autenticacao) {
  return (requisicao, resposta, proximo) => { // função chamada antes de cada rota protegida
    const usuario = autenticacao.usuarioPorToken(extrairToken(requisicao.headers)); // acha o dono do token
    if (!usuario) { // sem token válido
      proximo(new ErroRegra('Faça login para continuar.', 401)); // entrega o erro para o tratamento central
      return;
    }
    requisicao.usuario = usuario; // guarda o usuário para a rota usar
    proximo(); // segue para a rota
  };
}

// Cria um middleware que aceita somente os perfis informados
function exigirPerfis(perfis) {
  return (requisicao, resposta, proximo) => { // função chamada depois do login
    if (!perfis.includes(requisicao.usuario.perfil)) { // perfil sem permissão
      proximo(new ErroRegra('Somente o Administrador pode acessar esta função.', 403)); // erro de permissão
      return;
    }
    proximo(); // perfil permitido: segue para a rota
  };
}

// Monta o roteador do Express com os serviços e devolve o router pronto
function criarRoteador(servicos) {
  const { autenticacao, estoque, ocr } = servicos; // serviços usados pelas rotas
  const roteador = express.Router(); // cria o roteador da API
  const login = exigirLogin(autenticacao); // middleware de login reaproveitado nas rotas protegidas

  // login: a única rota que não exige token
  roteador.post('/login', (requisicao, resposta) => {
    resposta.json(autenticacao.entrar(requisicao.body.usuario, requisicao.body.senha)); // devolve token e usuário
  });

  // lista de usuários (só Administrador)
  roteador.get('/usuarios', login, exigirPerfis(['Administrador']), (requisicao, resposta) => {
    resposta.json({ usuarios: autenticacao.listarUsuarios(), perfis: PERFIS }); // usuários sem dados sensíveis
  });

  // cadastro de usuário (só Administrador)
  roteador.post('/usuarios', login, exigirPerfis(['Administrador']), (requisicao, resposta) => {
    resposta.status(201).json(autenticacao.cadastrarUsuario(requisicao.body)); // cria e devolve o usuário
  });

  // painel com contadores e alertas
  roteador.get('/painel', login, (requisicao, resposta) => {
    resposta.json(estoque.painel()); // dados do painel
  });

  // lista de itens com saldo
  roteador.get('/itens', login, (requisicao, resposta) => {
    resposta.json(estoque.listarItens()); // itens com saldo calculado
  });

  // cadastro de item
  roteador.post('/itens', login, (requisicao, resposta) => {
    resposta.status(201).json(estoque.cadastrarItem(requisicao.body)); // cria e devolve o item
  });

  // lotes com saldo de um item
  roteador.get('/itens/:id/lotes', login, (requisicao, resposta) => {
    resposta.json(estoque.listarLotes(requisicao.params.id)); // lotes do item pedido
  });

  // lista de locais
  roteador.get('/locais', login, (requisicao, resposta) => {
    resposta.json(estoque.listarLocais()); // locais de armazenamento
  });

  // entrada de lote; o usuário logado vem do token, nunca do corpo da requisição
  roteador.post('/entradas', login, (requisicao, resposta) => {
    const entrada = { ...requisicao.body, usuario: requisicao.usuario }; // corpo + usuário do token
    resposta.status(201).json(estoque.registrarEntrada(entrada)); // registra a entrada
  });

  // saída de itens (fica pendente)
  roteador.post('/saidas', login, (requisicao, resposta) => {
    const saida = { ...requisicao.body, usuario: requisicao.usuario }; // corpo + usuário do token
    resposta.status(201).json(estoque.registrarSaida(saida)); // registra a saída pendente
  });

  // saídas aguardando decisão
  roteador.get('/saidas/pendentes', login, (requisicao, resposta) => {
    resposta.json(estoque.listarPendentes(requisicao.usuario)); // pendentes conforme o perfil
  });

  // confirma uma saída
  roteador.post('/movimentacoes/:id/confirmar', login, (requisicao, resposta) => {
    resposta.json(estoque.confirmarSaida(requisicao.params.id, requisicao.usuario)); // confirma a saída
  });

  // recusa uma saída, com motivo
  roteador.post('/movimentacoes/:id/recusar', login, (requisicao, resposta) => {
    resposta.json(estoque.recusarSaida(requisicao.params.id, requisicao.body.motivo, requisicao.usuario)); // recusa com motivo
  });

  // estorna uma entrada lançada por engano (somente Administrador)
  roteador.post('/movimentacoes/:id/estornar', login, exigirPerfis(['Administrador']), (requisicao, resposta) => {
    resposta.json(estoque.estornarEntrada(requisicao.params.id, requisicao.body.motivo, requisicao.usuario)); // desfaz a entrada
  });

  // histórico, com busca opcional
  roteador.get('/movimentacoes', login, (requisicao, resposta) => {
    resposta.json(estoque.listarMovimentacoes(requisicao.query.busca || '')); // busca vazia devolve tudo
  });

  // leitura de receita: texto + sugestões de itens do estoque
  roteador.post('/ocr', login, async (requisicao, resposta) => {
    resposta.json(await ocr.lerReceita(requisicao.body.imagemBase64, estoque.listarItens())); // chama o OCR
  });

  return roteador; // devolve o roteador pronto para ser ligado em /api
}

module.exports = { criarRoteador }; // exporta a função que monta o roteador
