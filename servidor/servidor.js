// Ponto de entrada do back-end: sobe o servidor HTTP, entrega as telas e responde a API.

const http = require('http'); // módulo nativo para criar um servidor web
const fs = require('fs'); // módulo para ler arquivos do disco
const path = require('path'); // módulo para montar caminhos de arquivos com segurança
const { Banco } = require('./banco/banco'); // banco simulado em arquivo JSON
const { criarDadosIniciais } = require('./banco/sementes'); // dados de exemplo da primeira execução
const { AutenticacaoService } = require('./servicos/autenticacaoService'); // regras de login
const { EstoqueService } = require('./servicos/estoqueService'); // regras do estoque
const { OcrService } = require('./servicos/ocrService'); // leitura de receitas
const { criarRoteador } = require('./rotas/rotas'); // monta as rotas da API
const { ErroRegra } = require('./utils/erros'); // erro com status HTTP

const PORTA = process.env.PORTA || 3000; // porta do servidor; usa 3000 se não houver variável
const CAMINHO_BANCO = path.join(__dirname, '..', 'dados', 'banco.json'); // arquivo que guarda os dados
const PASTA_PUBLICA = path.join(__dirname, '..', 'public'); // pasta com o front-end
const LIMITE_CORPO = 7 * 1024 * 1024; // tamanho máximo do corpo da requisição: 7 MB
const TIPOS_ARQUIVO = { // tipo de conteúdo de cada extensão
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// Cria o banco e os serviços uma única vez, e todos usam o mesmo banco
const banco = new Banco(CAMINHO_BANCO, criarDadosIniciais);
const servicos = {
  autenticacao: new AutenticacaoService(banco),
  estoque: new EstoqueService(banco),
  ocr: new OcrService(),
};
const tratarRequisicao = criarRoteador(servicos); // função que responde às rotas da API

// Lê o corpo da requisição inteiro e devolve o objeto JSON
function lerCorpo(requisicao) {
  return new Promise((resolver, rejeitar) => { // promessa: resolve com o corpo ou rejeita com erro
    const pedacos = []; // guarda os pedaços (Buffers) que chegam
    let tamanho = 0; // soma o tamanho recebido até agora
    requisicao.on('data', pedaco => { // chamado a cada pedaço recebido
      tamanho += pedaco.length; // soma o tamanho
      if (tamanho > LIMITE_CORPO) { // passou do limite
        rejeitar(new ErroRegra('Corpo da requisição muito grande.', 413)); // avisa com erro 413
        requisicao.destroy(); // corta a conexão
        return;
      }
      pedacos.push(pedaco); // guarda o pedaço
    });
    requisicao.on('end', () => { // chamado quando terminou de receber tudo
      const texto = Buffer.concat(pedacos).toString('utf8'); // junta os pedaços e converte para texto
      try {
        resolver(texto ? JSON.parse(texto) : {}); // vazio vira objeto vazio
      } catch (erro) {
        rejeitar(new ErroRegra('JSON inválido.', 400)); // texto mal formado
      }
    });
    requisicao.on('error', rejeitar); // repassa erros de conexão
  });
}

// Envia uma resposta em JSON com o status indicado
function enviarJson(resposta, status, dados) {
  resposta.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); // status e tipo
  resposta.end(JSON.stringify(dados)); // envia o objeto convertido em texto
}

// Entrega um arquivo da pasta pública (telas, CSS e JavaScript)
function servirArquivo(caminhoUrl, resposta) {
  const pedido = caminhoUrl === '/' ? '/index.html' : caminhoUrl; // a raiz abre o index.html
  const caminhoArquivo = path.normalize(path.join(PASTA_PUBLICA, pedido)); // monta o caminho completo
  if (!caminhoArquivo.startsWith(PASTA_PUBLICA)) { // impede acessar arquivos fora da pasta pública
    enviarJson(resposta, 403, { erro: 'Acesso negado.' });
    return;
  }
  fs.readFile(caminhoArquivo, (erro, conteudo) => { // lê o arquivo de forma assíncrona
    if (erro) { // não existe ou não pode ser lido
      enviarJson(resposta, 404, { erro: 'Arquivo não encontrado.' });
      return;
    }
    const tipo = TIPOS_ARQUIVO[path.extname(caminhoArquivo)] || 'application/octet-stream'; // tipo pela extensão
    resposta.writeHead(200, { 'Content-Type': tipo }); // status 200 com o tipo certo
    resposta.end(conteudo); // envia o arquivo
  });
}

// Recebe cada requisição: se for da API, trata; se não, entrega o arquivo
async function atenderRequisicao(requisicao, resposta) {
  const url = new URL(requisicao.url, 'http://localhost'); // separa o caminho dos parâmetros
  if (!url.pathname.startsWith('/api/')) { // não é da API
    servirArquivo(url.pathname, resposta); // entrega a tela ou o arquivo
    return;
  }
  try {
    const corpo = await lerCorpo(requisicao); // lê o JSON enviado
    const resultado = await tratarRequisicao({ // chama o roteador
      metodo: requisicao.method,
      caminho: url.pathname,
      cabecalhos: requisicao.headers,
      corpo,
      query: url.searchParams,
    });
    enviarJson(resposta, resultado.status, resultado.dados); // resposta de sucesso
  } catch (erro) {
    if (erro instanceof ErroRegra) { // erro previsto: mostra a mensagem com o status certo
      enviarJson(resposta, erro.status, { erro: erro.message });
    } else { // erro inesperado: registra no terminal e avisa de forma genérica
      console.error('Erro inesperado:', erro);
      enviarJson(resposta, 500, { erro: 'Erro interno do servidor.' });
    }
  }
}

http.createServer(atenderRequisicao).listen(PORTA, () => { // cria o servidor e começa a escutar a porta
  console.log(`Nedora Med rodando em http://localhost:${PORTA}`); // avisa no terminal
});
