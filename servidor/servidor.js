// Ponto de entrada do back-end: sobe o servidor Express, entrega as telas e responde a API.

const express = require('express'); // framework web usado para rotas, corpo e arquivos estáticos
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

// Cria o banco e os serviços uma única vez, e todos usam o mesmo banco
const banco = new Banco(CAMINHO_BANCO, criarDadosIniciais);
const servicos = {
  autenticacao: new AutenticacaoService(banco),
  estoque: new EstoqueService(banco),
  ocr: new OcrService(),
};

const app = express(); // cria a aplicação Express
app.disable('x-powered-by'); // não anuncia o framework no cabeçalho da resposta

// Lê o corpo JSON das requisições até o limite definido e o deixa em req.body
app.use(express.json({ limit: LIMITE_CORPO }));

// Garante que req.body sempre seja um objeto, mesmo em requisições sem corpo
app.use((requisicao, resposta, proximo) => {
  requisicao.body = requisicao.body || {}; // corpo ausente vira objeto vazio
  proximo(); // segue para a próxima etapa
});

// Liga as rotas da API ao endereço /api
app.use('/api', criarRoteador(servicos));

// Responde 404 em JSON para endereços de API que não existem
app.use('/api', (requisicao, resposta) => {
  resposta.status(404).json({ erro: 'Rota não encontrada.' }); // mesmo formato usado pelas rotas
});

// Entrega as telas, o CSS e o JavaScript da pasta pública
app.use(express.static(PASTA_PUBLICA));

// Responde 404 em JSON para arquivos que não existem
app.use((requisicao, resposta) => {
  resposta.status(404).json({ erro: 'Arquivo não encontrado.' }); // mesmo formato usado pelas rotas
});

// Tratamento central de erros: mantém o formato { erro: '...' } esperado pelo front-end
app.use((erro, requisicao, resposta, proximo) => { // proximo é obrigatório para o Express reconhecer o middleware de erro
  if (erro instanceof ErroRegra) { // erro previsto: mostra a mensagem com o status certo
    resposta.status(erro.status).json({ erro: erro.message }); // devolve o erro de regra
    return;
  }
  if (erro.type === 'entity.parse.failed') { // JSON mal formado enviado no corpo
    resposta.status(400).json({ erro: 'JSON inválido.' }); // mesmo aviso da versão anterior
    return;
  }
  if (erro.type === 'entity.too.large') { // corpo maior que o limite permitido
    resposta.status(413).json({ erro: 'Corpo da requisição muito grande.' }); // mesmo aviso da versão anterior
    return;
  }
  console.error('Erro inesperado:', erro); // erro inesperado: registra no terminal
  resposta.status(500).json({ erro: 'Erro interno do servidor.' }); // avisa de forma genérica
});

app.listen(PORTA, () => { // começa a escutar a porta
  console.log(`Nedora Med rodando em http://localhost:${PORTA}`); // avisa no terminal
});
