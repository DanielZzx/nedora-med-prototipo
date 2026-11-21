// Regras de negócio do estoque: cadastros, entradas, saídas pelo método FEFO, confirmações e alertas.

const { gerarId } = require('../utils/seguranca'); // gera ids únicos
const { ErroRegra } = require('../utils/erros'); // erro com status HTTP
const { hojeISO, diasEntre, formatarBR } = require('../utils/datas'); // funções de data

const DIAS_ALERTA_VENCIMENTO = 30; // com quantos dias de antecedência o sistema avisa sobre vencimento
const MOVIMENTACOES_NO_PAINEL = 8; // quantas movimentações aparecem no painel

class EstoqueService { // serviço que concentra as regras do estoque
  constructor(banco) { // recebe o banco simulado
    this.banco = banco; // guarda a referência
  }

  // ---------- Consultas básicas ----------

  lotesComSaldo(itemId) { // lotes de um item com quantidade maior que zero
    return this.banco.listar('lotes') // pega todos os lotes
      .filter(lote => lote.itemId === itemId && lote.quantidade > 0) // mesmo item e com saldo
      .sort((a, b) => a.validade.localeCompare(b.validade)); // ordena do que vence antes para o que vence depois
  }

  lotesUtilizaveis(itemId) { // lotes que podem sair (FEFO): sem os vencidos
    const hoje = hojeISO(); // data de hoje
    return this.lotesComSaldo(itemId).filter(lote => lote.validade >= hoje); // mantém só os que não venceram
  }

  saldoDoItem(itemId) { // soma o saldo utilizável de um item
    return this.lotesUtilizaveis(itemId).reduce((total, lote) => total + lote.quantidade, 0); // soma as quantidades
  }

  situacaoDoLote(lote) { // diz se o lote está vencido, perto de vencer ou normal
    const hoje = hojeISO(); // data de hoje
    if (lote.validade < hoje) return { texto: 'Vencido, bloqueado', tipo: 'critico' }; // já venceu
    const dias = diasEntre(hoje, lote.validade); // quantos dias faltam
    if (dias <= DIAS_ALERTA_VENCIMENTO) return { texto: `Vence em ${dias} dias`, tipo: 'alerta' }; // perto de vencer
    return { texto: 'Normal', tipo: 'ok' }; // situação normal
  }

  perfisQueConfirmam(item) { // quais perfis podem confirmar a retirada deste item
    if (item.categoria === 'Medicamento') return ['Médico']; // medicamento: só o médico
    return ['Técnico de enfermagem', 'Enfermeiro']; // material: técnico ou enfermeiro
  }

  nomeDoItem(itemId) { // nome de um item pelo id
    const item = this.banco.buscarPorId('itens', itemId); // procura o item
    return item ? item.nome : '—'; // devolve o nome ou um traço
  }

  nomeDoLocal(localId) { // nome de um local pelo id
    const local = this.banco.buscarPorId('locais', localId); // procura o local
    return local ? local.nome : '—'; // devolve o nome ou um traço
  }

  nomeDoUsuario(usuarioId) { // nome de um usuário pelo id
    const usuario = usuarioId ? this.banco.buscarPorId('usuarios', usuarioId) : null; // procura só se houver id
    return usuario ? usuario.nome : '—'; // devolve o nome ou um traço
  }

  listarLocais() { // todos os locais de armazenamento
    return this.banco.listar('locais'); // devolve a tabela de locais
  }

  listarItens() { // todos os itens com saldo e alerta de estoque mínimo
    return this.banco.listar('itens').map(item => { // para cada item...
      const saldo = this.saldoDoItem(item.id); // calcula o saldo
      return { ...item, saldo, abaixoDoMinimo: saldo < item.estoqueMinimo }; // junta tudo com o alerta
    });
  }

  listarLotes(itemId) { // lotes com saldo de um item, prontos para a tela
    return this.lotesComSaldo(itemId).map(lote => ({ // para cada lote...
      id: lote.id,
      numero: lote.numero,
      validade: lote.validade,
      local: this.nomeDoLocal(lote.localId), // troca o id do local pelo nome
      quantidade: lote.quantidade,
      situacao: this.situacaoDoLote(lote), // inclui se está vencido ou perto de vencer
    }));
  }

  // ---------- Cadastros ----------

  cadastrarItem(dados) { // cria um item novo
    const nome = String(dados.nome || '').trim(); // pega o nome sem espaços nas pontas
    if (!nome) throw new ErroRegra('Informe o nome do item.'); // nome obrigatório
    const item = { // monta o registro
      id: gerarId(), // id único
      nome, // nome limpo
      categoria: dados.categoria === 'Material' ? 'Material' : 'Medicamento', // só aceita as duas categorias
      unidade: String(dados.unidade || 'unidade').trim(), // unidade padrão se vier vazia
      estoqueMinimo: Math.max(0, Number(dados.estoqueMinimo) || 0), // não deixa ser negativo
      termolabil: Boolean(dados.termolabil), // verdadeiro ou falso
    };
    return this.banco.inserir('itens', item); // grava e devolve o item
  }

  // ---------- Movimentações ----------

  registrarMovimentacao({ tipo, item, lote, quantidade, origem, destino, usuario, situacao }) { // grava uma linha no histórico
    return this.banco.inserir('movimentacoes', { // cria o registro de movimentação
      id: gerarId(), // id único
      data: new Date().toISOString(), // data e hora do momento
      tipo, // Entrada ou Saída
      itemId: item.id, // item movimentado
      loteId: lote.id, // lote movimentado
      numeroLote: lote.numero, // número do lote, para facilitar a busca
      quantidade, // quantidade movimentada
      origem, // de onde saiu
      destino, // para onde foi
      responsavelId: usuario.id, // quem registrou
      situacao, // Concluída, Pendente, Confirmada ou Recusada
      confirmadoPorId: null, // ainda ninguém confirmou
      motivo: null, // sem motivo de recusa
    });
  }

  registrarEntrada({ itemId, numeroLote, validade, localId, quantidade, usuario }) { // recebe um lote no estoque
    const item = this.banco.buscarPorId('itens', itemId); // procura o item
    const local = this.banco.buscarPorId('locais', localId); // procura o local
    const qtd = Number(quantidade); // converte a quantidade para número
    const numero = String(numeroLote || '').trim(); // número do lote sem espaços
    const hoje = hojeISO(); // data de hoje

    if (!item) throw new ErroRegra('Escolha um item cadastrado.'); // item precisa existir
    if (!numero) throw new ErroRegra('Informe o número do lote.'); // número obrigatório
    if (!validade || validade < hoje) throw new ErroRegra('Lote sem validade ou vencido: não pode ser recebido.'); // validade válida
    if (!Number.isInteger(qtd) || qtd <= 0) throw new ErroRegra('A quantidade deve ser um número inteiro maior que zero.'); // quantidade válida
    if (!local) throw new ErroRegra('Escolha o local de armazenamento.'); // local obrigatório
    if (item.termolabil && !local.refrigerado) throw new ErroRegra('Item termolábil só pode ir para local refrigerado.'); // regra de temperatura

    const existente = this.banco.listar('lotes').find(lote => // procura o mesmo lote no mesmo local
      lote.itemId === itemId && lote.numero === numero && lote.localId === localId && lote.validade === validade);
    let lote; // guarda o lote que vai ser usado na movimentação
    if (existente) { // o lote já existe
      this.banco.atualizar('lotes', existente.id, { quantidade: existente.quantidade + qtd }); // soma a quantidade
      lote = existente; // usa o lote existente
    } else { // lote novo
      lote = this.banco.inserir('lotes', { id: gerarId(), itemId, numero, validade, localId, quantidade: qtd }); // cria o lote
    }

    return this.registrarMovimentacao({ tipo: 'Entrada', item, lote, quantidade: qtd, origem: 'Fornecedor', destino: local.nome, usuario, situacao: 'Concluída' }); // registra no histórico
  }

  registrarSaida({ itemId, numeroLote, quantidade, destino, usuario }) { // retira itens do estoque; a saída fica pendente
    const item = this.banco.buscarPorId('itens', itemId); // procura o item
    const qtd = Number(quantidade); // converte a quantidade
    const destinoLimpo = String(destino || '').trim(); // destino sem espaços

    if (!item) throw new ErroRegra('Escolha um item.'); // item obrigatório
    if (!Number.isInteger(qtd) || qtd <= 0) throw new ErroRegra('A quantidade deve ser um número inteiro maior que zero.'); // quantidade válida
    if (!destinoLimpo) throw new ErroRegra('Informe o destino ou o motivo.'); // destino obrigatório

    let lotes = this.lotesUtilizaveis(itemId); // lotes na ordem FEFO, sem os vencidos
    if (numeroLote) { // o usuário escolheu um lote específico
      lotes = lotes.filter(lote => lote.numero === numeroLote); // usa só esse lote
      if (lotes.length === 0) throw new ErroRegra('Este lote está vencido ou sem saldo: bloqueado.', 409); // bloqueado
    }

    const saldo = lotes.reduce((total, lote) => total + lote.quantidade, 0); // soma o saldo disponível
    if (qtd > saldo) throw new ErroRegra(`Saldo insuficiente. Disponível: ${saldo}.`, 409); // não tem o suficiente

    const movimentacoes = []; // guarda as saídas criadas, uma por lote usado
    let restante = qtd; // quanto ainda falta retirar
    for (const lote of lotes) { // percorre os lotes na ordem FEFO
      if (restante === 0) break; // já retirou tudo
      const retirada = Math.min(lote.quantidade, restante); // tira o que o lote tem, até o necessário
      this.banco.atualizar('lotes', lote.id, { quantidade: lote.quantidade - retirada }); // baixa do saldo do lote
      restante -= retirada; // diminui o que falta
      movimentacoes.push(this.registrarMovimentacao({ // registra a saída deste lote
        tipo: 'Saída', item, lote, quantidade: retirada,
        origem: this.nomeDoLocal(lote.localId), destino: destinoLimpo, usuario, situacao: 'Pendente',
      }));
    }
    return movimentacoes; // devolve as saídas criadas
  }

  // ---------- Confirmação e recusa ----------

  buscarSaidaPendente(movimentacaoId, usuario) { // acha uma saída pendente e confere se o usuário pode decidir
    const mov = this.banco.buscarPorId('movimentacoes', movimentacaoId); // procura a movimentação
    if (!mov) throw new ErroRegra('Movimentação não encontrada.', 404); // não existe
    if (mov.situacao !== 'Pendente') throw new ErroRegra('Esta saída não está mais pendente.', 409); // já foi decidida
    const item = this.banco.buscarPorId('itens', mov.itemId); // item da movimentação
    const permitidos = this.perfisQueConfirmam(item); // perfis que podem decidir
    if (!permitidos.includes(usuario.perfil)) { // o perfil do usuário não está na lista
      throw new ErroRegra(`Somente ${permitidos.join(' ou ')} pode confirmar esta retirada.`, 403); // sem permissão
    }
    return mov; // devolve a movimentação
  }

  confirmarSaida(movimentacaoId, usuario) { // confirma a retirada
    const mov = this.buscarSaidaPendente(movimentacaoId, usuario); // valida antes
    return this.banco.atualizar('movimentacoes', mov.id, { situacao: 'Confirmada', confirmadoPorId: usuario.id }); // marca como confirmada
  }

  recusarSaida(movimentacaoId, motivo, usuario) { // recusa a retirada e devolve a quantidade ao lote
    const mov = this.buscarSaidaPendente(movimentacaoId, usuario); // valida antes
    const motivoLimpo = String(motivo || '').trim(); // motivo sem espaços
    if (!motivoLimpo) throw new ErroRegra('Escreva o motivo da recusa.'); // motivo obrigatório
    const lote = this.banco.buscarPorId('lotes', mov.loteId); // lote que tinha dado baixa
    if (lote) this.banco.atualizar('lotes', lote.id, { quantidade: lote.quantidade + mov.quantidade }); // devolve a quantidade
    return this.banco.atualizar('movimentacoes', mov.id, { situacao: 'Recusada', confirmadoPorId: usuario.id, motivo: motivoLimpo }); // marca como recusada
  }

  // ---------- Listas e painel ----------

  formatarMovimentacao(mov) { // transforma a movimentação gravada em dados prontos para a tela
    return {
      id: mov.id,
      data: mov.data,
      tipo: mov.tipo,
      itemNome: this.nomeDoItem(mov.itemId), // troca o id pelo nome
      numeroLote: mov.numeroLote,
      quantidade: mov.quantidade,
      origem: mov.origem,
      destino: mov.destino,
      responsavelNome: this.nomeDoUsuario(mov.responsavelId), // quem registrou
      confirmadoPorNome: this.nomeDoUsuario(mov.confirmadoPorId), // quem confirmou
      situacao: mov.situacao,
      motivo: mov.motivo,
    };
  }

  listarMovimentacoes(busca = '') { // histórico, do mais novo para o mais antigo, com busca por item ou lote
    const termo = busca.trim().toLowerCase(); // termo em minúsculas
    return this.banco.listar('movimentacoes')
      .filter(mov => { // mantém quem combina com a busca
        const nome = this.nomeDoItem(mov.itemId).toLowerCase(); // nome do item em minúsculas
        return nome.includes(termo) || mov.numeroLote.toLowerCase().includes(termo); // acha no nome ou no lote
      })
      .sort((a, b) => b.data.localeCompare(a.data)) // mais recente primeiro
      .map(mov => this.formatarMovimentacao(mov)); // formata cada uma
  }

  listarPendentes(usuario) { // saídas aguardando decisão, com indicação se este usuário pode decidir
    return this.banco.listar('movimentacoes')
      .filter(mov => mov.situacao === 'Pendente') // só as pendentes
      .sort((a, b) => a.data.localeCompare(b.data)) // as mais antigas primeiro
      .map(mov => {
        const item = this.banco.buscarPorId('itens', mov.itemId); // item da saída
        const permitidos = this.perfisQueConfirmam(item); // perfis que podem decidir
        return { // junta os dados da saída com as permissões
          ...this.formatarMovimentacao(mov),
          perfisQueConfirmam: permitidos,
          podeConfirmar: permitidos.includes(usuario.perfil), // true ou false para este usuário
        };
      });
  }

  painel() { // resumo para a tela inicial
    const hoje = hojeISO(); // data de hoje
    const itens = this.listarItens(); // itens com saldo
    const lotesComSaldo = this.banco.listar('lotes').filter(lote => lote.quantidade > 0); // lotes com quantidade
    const vencidos = lotesComSaldo.filter(lote => lote.validade < hoje); // já venceram
    const vencendo = lotesComSaldo.filter(lote => // vão vencer dentro do prazo de alerta
      lote.validade >= hoje && diasEntre(hoje, lote.validade) <= DIAS_ALERTA_VENCIMENTO);
    const abaixoDoMinimo = itens.filter(item => item.abaixoDoMinimo); // itens com saldo baixo
    const pendentes = this.banco.listar('movimentacoes').filter(mov => mov.situacao === 'Pendente'); // aguardando decisão

    const alertas = [ // junta todos os alertas em uma lista só
      ...vencidos.map(lote => ({
        tipo: 'Vencido', itemNome: this.nomeDoItem(lote.itemId), numeroLote: lote.numero,
        detalhe: `Venceu em ${formatarBR(lote.validade)}`,
      })),
      ...vencendo.map(lote => ({
        tipo: 'Vence em breve', itemNome: this.nomeDoItem(lote.itemId), numeroLote: lote.numero,
        detalhe: `Vence em ${formatarBR(lote.validade)}`,
      })),
      ...abaixoDoMinimo.map(item => ({
        tipo: 'Estoque baixo', itemNome: item.nome, numeroLote: '—',
        detalhe: `Saldo ${item.saldo} (mínimo ${item.estoqueMinimo})`,
      })),
    ];

    return {
      contadores: { // números dos cartões
        abaixoDoMinimo: abaixoDoMinimo.length,
        vencendo: vencendo.length,
        vencidos: vencidos.length,
        pendentes: pendentes.length,
      },
      alertas,
      ultimasMovimentacoes: this.listarMovimentacoes().slice(0, MOVIMENTACOES_NO_PAINEL), // as mais recentes
    };
  }
}

module.exports = { EstoqueService }; // exporta o serviço
