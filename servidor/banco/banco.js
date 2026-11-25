// Banco simulado: guarda as tabelas em um arquivo JSON no disco.
// No lugar de um PostgreSQL, este arquivo faz o papel de armazenamento (storage).

const fs = require('fs'); // lê e grava arquivos no disco
const path = require('path'); // monta caminhos de pastas com segurança

class Banco { // classe que representa o banco simulado
  constructor(caminhoArquivo, criarDadosIniciais) { // recebe onde guardar os dados e como criar os dados de exemplo
    this.caminhoArquivo = caminhoArquivo; // guarda o caminho do arquivo JSON
    this.dados = this.carregarDoDisco(criarDadosIniciais); // carrega os dados do disco (ou cria os de exemplo)
  }

  carregarDoDisco(criarDadosIniciais) { // lê o arquivo; se não existir, cria com os dados de exemplo
    if (!fs.existsSync(this.caminhoArquivo)) { // verifica se o arquivo ainda não foi criado
      this.dados = criarDadosIniciais(); // cria os dados de exemplo
      this.salvar(); // grava pela primeira vez
      return this.dados; // devolve os dados criados
    }
    const conteudo = fs.readFileSync(this.caminhoArquivo, 'utf8'); // lê o texto do arquivo
    return JSON.parse(conteudo); // transforma o texto em objeto
  }

  salvar() { // grava todas as tabelas no arquivo
    fs.mkdirSync(path.dirname(this.caminhoArquivo), { recursive: true }); // cria a pasta dados se ela não existir
    fs.writeFileSync(this.caminhoArquivo, JSON.stringify(this.dados, null, 2)); // grava em JSON legível
  }

  listar(tabela) { // devolve todos os registros de uma tabela
    return this.dados[tabela]; // devolve o array da tabela
  }

  buscarPorId(tabela, id) { // procura um registro pelo id
    return this.dados[tabela].find(registro => registro.id === id) || null; // achou ou devolve null
  }

  inserir(tabela, registro) { // adiciona um registro novo
    this.dados[tabela].push(registro); // coloca no fim da tabela
    this.salvar(); // grava no arquivo
    return registro; // devolve o registro criado
  }

  atualizar(tabela, id, campos) { // altera campos de um registro existente
    const registro = this.buscarPorId(tabela, id); // procura o registro
    if (!registro) return null; // não existe: devolve null
    Object.assign(registro, campos); // copia os campos novos para dentro do registro
    this.salvar(); // grava a alteração
    return registro; // devolve o registro alterado
  }

  remover(tabela, id) { // apaga um registro da tabela
    const posicao = this.dados[tabela].findIndex(registro => registro.id === id); // posição do registro
    if (posicao === -1) return null; // não existe: devolve null
    const [removido] = this.dados[tabela].splice(posicao, 1); // tira o registro do array
    this.salvar(); // grava a alteração no arquivo
    return removido; // devolve o registro removido
  }
}

module.exports = { Banco }; // exporta a classe Banco
