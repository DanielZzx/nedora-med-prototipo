// Tabela de rotas da API: liga cada endereço (ex.: GET /api/itens) à regra correspondente.

const { ErroRegra } = require('../utils/erros'); // erro com status HTTP
const { PERFIS } = require('../servicos/autenticacaoService'); // lista de perfis, enviada para a tela de usuários

// Compara um modelo de rota (ex.: /api/itens/:id/lotes) com o caminho real.
// Devolve os parâmetros encontrados (ex.: { id: 'i-dipirona' }) ou null se não combinar.
function casarCaminho(modelo, caminho) {
  const pedacosModelo = modelo.split('/'); // divide o modelo nas barras
  const pedacosCaminho = caminho.split('/'); // divide o caminho real nas barras
  if (pedacosModelo.length !== pedacosCaminho.length) return null; // quantidades diferentes: não combina

  const parametros = {}; // guarda os valores dos parâmetros
  for (let i = 0; i < pedacosModelo.length; i++) { // percorre cada pedaço
    if (pedacosModelo[i].startsWith(':')) { // pedaço com : é um parâmetro
      parametros[pedacosModelo[i].slice(1)] = decodeURIComponent(pedacosCaminho[i]); // guarda o valor
    } else if (pedacosModelo[i] !== pedacosCaminho[i]) { // pedaço fixo diferente
      return null; // não combina
    }
  }
  return parametros; // combina: devolve os parâmetros
}

// Pega o token do cabeçalho "Authorization: Bearer <token>"
function extrairToken(cabecalhos) {
  const cabecalho = cabecalhos.authorization || ''; // o Node deixa os nomes de cabeçalho em minúsculas
  return cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null; // remove "Bearer " do começo
}

// Monta o roteador com os serviços e devolve a função que trata cada requisição da API
function criarRoteador(servicos) {
  const { autenticacao, estoque, ocr } = servicos; // serviços usados pelas rotas

  const rotas = [
    { // login: a única rota que não exige token
      metodo: 'POST', caminho: '/api/login', publica: true,
      executar: ({ corpo }) => ({ status: 200, dados: autenticacao.entrar(corpo.usuario, corpo.senha) }),
    },
    { // lista de usuários (só Administrador)
      metodo: 'GET', caminho: '/api/usuarios', perfis: ['Administrador'],
      executar: () => ({ status: 200, dados: { usuarios: autenticacao.listarUsuarios(), perfis: PERFIS } }),
    },
    { // cadastro de usuário (só Administrador)
      metodo: 'POST', caminho: '/api/usuarios', perfis: ['Administrador'],
      executar: ({ corpo }) => ({ status: 201, dados: autenticacao.cadastrarUsuario(corpo) }),
    },
    { // painel com contadores e alertas
      metodo: 'GET', caminho: '/api/painel',
      executar: () => ({ status: 200, dados: estoque.painel() }),
    },
    { // lista de itens com saldo
      metodo: 'GET', caminho: '/api/itens',
      executar: () => ({ status: 200, dados: estoque.listarItens() }),
    },
    { // cadastro de item
      metodo: 'POST', caminho: '/api/itens',
      executar: ({ corpo }) => ({ status: 201, dados: estoque.cadastrarItem(corpo) }),
    },
    { // lotes com saldo de um item
      metodo: 'GET', caminho: '/api/itens/:id/lotes',
      executar: ({ params }) => ({ status: 200, dados: estoque.listarLotes(params.id) }),
    },
    { // lista de locais
      metodo: 'GET', caminho: '/api/locais',
      executar: () => ({ status: 200, dados: estoque.listarLocais() }),
    },
    { // entrada de lote; o usuário logado vem do token, nunca do corpo da requisição
      metodo: 'POST', caminho: '/api/entradas',
      executar: ({ corpo, usuario }) => ({ status: 201, dados: estoque.registrarEntrada({ ...corpo, usuario }) }),
    },
    { // saída de itens (fica pendente)
      metodo: 'POST', caminho: '/api/saidas',
      executar: ({ corpo, usuario }) => ({ status: 201, dados: estoque.registrarSaida({ ...corpo, usuario }) }),
    },
    { // saídas aguardando decisão
      metodo: 'GET', caminho: '/api/saidas/pendentes',
      executar: ({ usuario }) => ({ status: 200, dados: estoque.listarPendentes(usuario) }),
    },
    { // confirma uma saída
      metodo: 'POST', caminho: '/api/movimentacoes/:id/confirmar',
      executar: ({ params, usuario }) => ({ status: 200, dados: estoque.confirmarSaida(params.id, usuario) }),
    },
    { // recusa uma saída, com motivo
      metodo: 'POST', caminho: '/api/movimentacoes/:id/recusar',
      executar: ({ params, corpo, usuario }) => ({ status: 200, dados: estoque.recusarSaida(params.id, corpo.motivo, usuario) }),
    },
    { // histórico, com busca opcional
      metodo: 'GET', caminho: '/api/movimentacoes',
      executar: ({ query }) => ({ status: 200, dados: estoque.listarMovimentacoes(query.get('busca') || '') }),
    },
    { // leitura de receita: texto + sugestões de itens do estoque
      metodo: 'POST', caminho: '/api/ocr',
      executar: async ({ corpo }) => ({ status: 200, dados: await ocr.lerReceita(corpo.imagemBase64, estoque.listarItens()) }),
    },
  ];

  // Trata uma requisição já separada em método, caminho, cabeçalhos, corpo e query
  return async function tratarRequisicao({ metodo, caminho, cabecalhos, corpo, query }) {
    for (const rota of rotas) { // procura a primeira rota que combina
      if (rota.metodo !== metodo) continue; // método diferente: pula
      const params = casarCaminho(rota.caminho, caminho); // tenta casar o caminho
      if (!params) continue; // não combinou: pula

      let usuario = null; // usuário logado (null nas rotas públicas)
      if (!rota.publica) { // rota protegida: exige login
        usuario = autenticacao.usuarioPorToken(extrairToken(cabecalhos)); // acha o dono do token
        if (!usuario) throw new ErroRegra('Faça login para continuar.', 401); // sem token válido
      }
      if (rota.perfis && !rota.perfis.includes(usuario.perfil)) { // perfil sem permissão
        throw new ErroRegra('Somente o Administrador pode acessar esta função.', 403);
      }
      return rota.executar({ params, corpo, query, usuario }); // executa a regra da rota
    }
    throw new ErroRegra('Rota não encontrada.', 404); // nenhuma rota combinou
  };
}

module.exports = { criarRoteador }; // exporta a função que monta o roteador
