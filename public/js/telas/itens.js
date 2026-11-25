// Tela de itens: lista com saldo e formulário para cadastrar item novo.

import { chamarApi } from '../api.js'; // chamadas à API
import { criarCaixa, criarElemento, criarTabela, criarEtiqueta, formatarData, mostrarAviso, pedirMotivo, preencherSelect } from '../ui.js'; // ajudantes de tela

// Desenha a tela de itens dentro da área recebida
export default async function desenharItens(area, usuario) {
  const souAdministrador = usuario?.perfil === 'Administrador'; // só o Administrador pode excluir itens
  const caixaLista = criarCaixa('Itens cadastrados'); // caixa da lista
  const caixaLotes = criarCaixa('Lotes do item'); // caixa para consultar os lotes
  const caixaCadastro = criarCaixa('Cadastrar novo item'); // caixa do formulário
  area.append(caixaLista, caixaLotes, caixaCadastro); // mostra as três caixas

  // Seletor de item e área onde a tabela de lotes aparece
  const rotuloItem = criarElemento('label', '', 'Item'); // rótulo do seletor
  const selecaoItem = criarElemento('select'); // seletor de item
  rotuloItem.appendChild(selecaoItem); // coloca o seletor dentro do rótulo
  const areaLotes = criarElemento('div'); // área da tabela de lotes
  caixaLotes.append(rotuloItem, areaLotes); // coloca seletor e área na caixa

  // Cria o botão de excluir de uma linha (só aparece para o Administrador)
  function criarBotaoExcluir(item) {
    const botao = criarElemento('button', 'botao pequeno perigo', 'Excluir'); // botão pequeno de ação destrutiva
    botao.type = 'button'; // não envia formulário
    botao.addEventListener('click', async () => { // ao clicar no botão...
      const excluiu = await pedirMotivo({ // abre o diálogo de confirmação com senha
        titulo: 'Excluir item', // título do diálogo
        linhas: [ // resumo do item escolhido
          `Item: ${item.nome}`,
          `Categoria: ${item.categoria} · Unidade: ${item.unidade}`,
          `Saldo atual: ${item.saldo}`,
        ],
        textoBotao: 'Excluir item', // texto do botão principal
        aviso: 'Esta ação não pode ser desfeita. Os lotes e as movimentações deste item também serão excluídos do histórico.', // aviso fixo
        exigirMotivo: false, // exclusão não pede motivo
        exigirSenha: true, // confirma com a senha do Administrador logado
        aoConfirmar: (_, senha) => chamarApi('DELETE', `/api/itens/${item.id}`, { senha }), // apaga o item e o histórico dele
      });
      if (!excluiu) return; // o usuário cancelou
      mostrarAviso(caixaLista, 'Item, lotes e movimentações excluídos.', 'ok'); // confirma para o usuário
      await atualizarLista(); // atualiza a tabela
    });
    return botao; // devolve o botão pronto
  }

  // Mostra os lotes do item escolhido no seletor
  async function carregarLotes() {
    areaLotes.replaceChildren(); // apaga a tabela antiga
    if (!selecaoItem.value) return; // nenhum item escolhido: nada a mostrar
    const lotes = await chamarApi('GET', `/api/itens/${selecaoItem.value}/lotes`); // busca os lotes do item
    areaLotes.appendChild(criarTabela(
      ['Lote', 'Validade', 'Local', 'Quantidade', 'Situação'],
      lotes.map(lote => [
        lote.numero,
        formatarData(lote.validade),
        lote.local,
        lote.quantidade,
        criarEtiqueta(lote.situacao.texto, lote.situacao.tipo),
      ]),
    ));
  }

  selecaoItem.addEventListener('change', () => { // ao trocar o item...
    carregarLotes().catch(erro => mostrarAviso(caixaLotes, erro.message, 'erro')); // mostra erro, se falhar
  });

  // Busca a lista no servidor e redesenha a tabela
  async function atualizarLista() {
    const itens = await chamarApi('GET', '/api/itens'); // pede os itens com saldo
    caixaLista.querySelector('.tabela-area')?.remove(); // apaga a tabela antiga, se houver

    const colunas = ['Item', 'Categoria', 'Unidade', 'Mínimo', 'Saldo', 'Situação']; // colunas comuns
    if (souAdministrador) colunas.push('Ação'); // coluna de exclusão só para o Administrador

    caixaLista.appendChild(criarTabela(
      colunas,
      itens.map(item => {
        const valores = [
          item.nome,
          item.categoria,
          item.unidade,
          item.estoqueMinimo,
          item.saldo,
          criarEtiqueta(item.abaixoDoMinimo ? 'Abaixo do mínimo' : 'Normal', item.abaixoDoMinimo ? 'alerta' : 'ok'),
        ];
        if (souAdministrador) valores.push(criarBotaoExcluir(item)); // botão na última coluna
        return valores;
      }),
    ));

    // Atualiza o seletor de itens, mantendo a escolha quando o item ainda existir
    const escolhido = selecaoItem.value;
    preencherSelect(selecaoItem, itens.map(item => ({ valor: item.id, texto: item.nome })), 'Escolha o item');
    if (itens.some(item => item.id === escolhido)) selecaoItem.value = escolhido; // restaura a escolha
    else if (itens.length > 0) selecaoItem.value = itens[0].id; // mostra os lotes do primeiro item por padrão
    await carregarLotes(); // recarrega os lotes do item escolhido (ou limpa a área)
  }

  // Formulário de cadastro (o HTML aqui é fixo, sem dados do usuário)
  const formulario = criarElemento('form', 'formulario');
  formulario.innerHTML = `
    <label>Nome do item <input name="nome" required></label>
    <label>Categoria
      <select name="categoria">
        <option value="Medicamento">Medicamento</option>
        <option value="Material">Material</option>
      </select>
    </label>
    <label>Unidade <input name="unidade" placeholder="comprimido, frasco, pacote..."></label>
    <label>Estoque mínimo <input name="estoqueMinimo" type="number" min="0" value="0"></label>
    <label class="linha-check"><input name="termolabil" type="checkbox"> Termolábil (precisa de geladeira)</label>
    <div class="botoes"><button class="botao" type="submit">Salvar item</button></div>`;
  caixaCadastro.appendChild(formulario); // coloca o formulário na caixa

  // Ao enviar: manda para a API, limpa o formulário e atualiza a lista
  formulario.addEventListener('submit', async evento => {
    evento.preventDefault(); // impede o recarregamento da página
    const dados = Object.fromEntries(new FormData(formulario)); // lê os campos como objeto
    dados.termolabil = formulario.querySelector('[name="termolabil"]').checked; // checkbox vira verdadeiro ou falso
    try {
      await chamarApi('POST', '/api/itens', dados); // cadastra o item
      formulario.reset(); // limpa o formulário
      mostrarAviso(caixaCadastro, 'Item cadastrado.', 'ok'); // confirma para o usuário
      await atualizarLista(); // atualiza a tabela
    } catch (erro) {
      mostrarAviso(caixaCadastro, erro.message, 'erro'); // mostra o erro
    }
  });

  await atualizarLista(); // preenche a lista ao abrir a tela
}
