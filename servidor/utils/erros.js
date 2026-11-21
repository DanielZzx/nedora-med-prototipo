// Erro com status HTTP: usado para avisar o front-end sobre regras de negócio, login e permissão.

class ErroRegra extends Error { // cria uma classe de erro que herda de Error
  constructor(mensagem, status = 400) { // recebe a mensagem e o código HTTP (padrão 400)
    super(mensagem); // envia a mensagem para o construtor de Error
    this.name = 'ErroRegra'; // dá um nome para identificar o erro
    this.status = status; // guarda o código HTTP que será devolvido
  }
}

module.exports = { ErroRegra }; // deixa a classe disponível para outros arquivos
