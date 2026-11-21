// Tela de entrada: registra a chegada de um lote no estoque.

import { chamarApi } from '../api.js'; // chamadas à API
import { criarCaixa, criarElemento, mostrarAviso, preencherSelect } from '../ui.js'; // ajudantes de tela

// Desenha a tela de entrada dentro da área recebida
export default async function desenharEntrada(area) {
  const itens = await chamarApi('GET', '/api/itens'); // lista de itens para o select
  const locais = await chamarApi('GET', '/api/locais'); // lista de locais para o select

  const caixa = criarCaixa('Registrar entrada'); // caixa com título
  area.appendChild(caixa); // mostra a caixa

  // Formulário fixo (sem dados do usuário dentro do HTML)
  const formulario = criarElemento('form', 'formulario');
  formulario.innerHTML = `
    <label>Item <select name="itemId" required></select></label>
    <div class="duas-colunas">
      <label>Número do lote <input name="numeroLote" required></label>
      <label>Validade <input name="validade" type="date" required></label>
    </div>
    <div class="duas-colunas">
      <label>Quantidade <input name="quantidade" type="number" min="1" required></label>
      <label>Local <select name="localId" required></select></label>
    </div>
    <div class="botoes"><button class="botao" type="submit">Registrar entrada</button></div>`;
  caixa.appendChild(formulario); // coloca o formulário na caixa

  // Preenche os selects com os dados vindos da API
  preencherSelect(formulario.querySelector('[name="itemId"]'),
    itens.map(item => ({ valor: item.id, texto: item.nome })), 'Escolha o item');
  preencherSelect(formulario.querySelector('[name="localId"]'),
    locais.map(local => ({ valor: local.id, texto: local.refrigerado ? `${local.nome} (refrigerado)` : local.nome })), 'Escolha o local');

  // Ao enviar: manda a entrada para a API
  formulario.addEventListener('submit', async evento => {
    evento.preventDefault(); // impede o recarregamento
    const dados = Object.fromEntries(new FormData(formulario)); // lê os campos
    try {
      const mov = await chamarApi('POST', '/api/entradas', dados); // registra a entrada
      formulario.reset(); // limpa o formulário
      mostrarAviso(caixa, `Entrada registrada no lote ${mov.numeroLote}.`, 'ok'); // confirma
    } catch (erro) {
      mostrarAviso(caixa, erro.message, 'erro'); // mostra o erro
    }
  });
}
