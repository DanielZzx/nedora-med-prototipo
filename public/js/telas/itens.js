// Tela de itens: lista com saldo e formulário para cadastrar item novo.

import { chamarApi } from '../api.js'; // chamadas à API
import { criarCaixa, criarElemento, criarTabela, criarEtiqueta, mostrarAviso } from '../ui.js'; // ajudantes de tela

// Desenha a tela de itens dentro da área recebida
export default async function desenharItens(area) {
  const caixaLista = criarCaixa('Itens cadastrados'); // caixa da lista
  const caixaCadastro = criarCaixa('Cadastrar novo item'); // caixa do formulário
  area.append(caixaLista, caixaCadastro); // mostra as duas caixas

  // Busca a lista no servidor e redesenha a tabela
  async function atualizarLista() {
    const itens = await chamarApi('GET', '/api/itens'); // pede os itens com saldo
    caixaLista.querySelector('.tabela-area')?.remove(); // apaga a tabela antiga, se houver
    caixaLista.appendChild(criarTabela(
      ['Item', 'Categoria', 'Unidade', 'Mínimo', 'Saldo', 'Situação'],
      itens.map(item => [
        item.nome,
        item.categoria,
        item.unidade,
        item.estoqueMinimo,
        item.saldo,
        criarEtiqueta(item.abaixoDoMinimo ? 'Abaixo do mínimo' : 'Normal', item.abaixoDoMinimo ? 'alerta' : 'ok'),
      ]),
    ));
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
