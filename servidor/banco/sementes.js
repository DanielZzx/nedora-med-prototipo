// Dados de exemplo gravados na primeira execução. As validades são calculadas a partir de hoje.

const { gerarSal, gerarHash } = require('../utils/seguranca'); // funções para criar senhas protegidas
const { hojeISO, somarDias } = require('../utils/datas'); // funções de data

// Cria um usuário com a senha já transformada em hash (o login é o nome de usuário)
function criarUsuario(id, nome, usuario, senha, perfil) {
  const sal = gerarSal(); // sal aleatório só para este usuário
  return { id, nome, usuario, perfil, sal, senhaHash: gerarHash(senha, sal) }; // guarda o hash, nunca a senha
}

// Monta o banco inicial com usuários, locais, itens, lotes e movimentações
function criarDadosIniciais() {
  const hoje = hojeISO(); // data de hoje, usada para calcular validades

  return {
    usuarios: [ // o admin cria os demais usuários pela tela Usuários
      criarUsuario('u-ana', 'Ana Souza', 'admin', '123', 'Administrador'),
      criarUsuario('u-carla', 'Carla Lima', 'enfermeira', '123', 'Enfermeiro'),
      criarUsuario('u-bruno', 'Bruno Alves', 'tecnico', '123', 'Técnico de enfermagem'),
      criarUsuario('u-marcos', 'Dr. Marcos', 'medico', '123', 'Médico'),
      criarUsuario('u-lucas', 'Lucas Pires', 'auxiliar', '123', 'Auxiliar'),
    ],

    locais: [
      { id: 'loc-almox', nome: 'Almoxarifado', refrigerado: false },
      { id: 'loc-sala', nome: 'Sala de procedimentos', refrigerado: false },
      { id: 'loc-geladeira', nome: 'Geladeira', refrigerado: true },
    ],

    itens: [
      { id: 'i-dipirona', nome: 'Dipirona 500 mg', categoria: 'Medicamento', unidade: 'comprimido', estoqueMinimo: 20, termolabil: false },
      { id: 'i-insulina', nome: 'Insulina NPH', categoria: 'Medicamento', unidade: 'frasco', estoqueMinimo: 5, termolabil: true },
      { id: 'i-ondansetrona', nome: 'Ondansetrona 4 mg', categoria: 'Medicamento', unidade: 'comprimido', estoqueMinimo: 10, termolabil: false },
      { id: 'i-seringa', nome: 'Seringa 10 mL', categoria: 'Material', unidade: 'unidade', estoqueMinimo: 50, termolabil: false },
      { id: 'i-gaze', nome: 'Gaze estéril', categoria: 'Material', unidade: 'pacote', estoqueMinimo: 10, termolabil: false },
    ],

    lotes: [
      { id: 'l-dip-1', itemId: 'i-dipirona', numero: 'DIP-001', validade: somarDias(hoje, 20), localId: 'loc-almox', quantidade: 35 },
      { id: 'l-dip-2', itemId: 'i-dipirona', numero: 'DIP-002', validade: somarDias(hoje, 300), localId: 'loc-sala', quantidade: 60 },
      { id: 'l-ins-1', itemId: 'i-insulina', numero: 'INS-010', validade: somarDias(hoje, 120), localId: 'loc-geladeira', quantidade: 6 },
      { id: 'l-ins-2', itemId: 'i-insulina', numero: 'INS-009', validade: somarDias(hoje, -5), localId: 'loc-geladeira', quantidade: 2 },
      { id: 'l-ond-1', itemId: 'i-ondansetrona', numero: 'ONDA-007', validade: somarDias(hoje, 200), localId: 'loc-almox', quantidade: 12 },
      { id: 'l-ser-1', itemId: 'i-seringa', numero: 'SER-100', validade: somarDias(hoje, 500), localId: 'loc-almox', quantidade: 30 },
      { id: 'l-gaz-1', itemId: 'i-gaze', numero: 'GAZ-007', validade: somarDias(hoje, 400), localId: 'loc-almox', quantidade: 8 },
    ],

    movimentacoes: [
      { // uma saída pendente de dipirona, para aparecer na tela de confirmação
        id: 'm-1', data: new Date().toISOString(), tipo: 'Saída', itemId: 'i-dipirona', loteId: 'l-dip-1',
        numeroLote: 'DIP-001', quantidade: 5, origem: 'Almoxarifado', destino: 'Procedimento',
        responsavelId: 'u-bruno', situacao: 'Pendente', confirmadoPorId: null, motivo: null,
      },
    ],
  };
}

module.exports = { criarDadosIniciais }; // exporta a função que cria os dados iniciais
