// Tela do painel: cartões com contadores, alertas e últimas movimentações.

import { chamarApi } from '../api.js'; // função que faz a chamada à API
import { criarCaixa, criarElemento, criarTabela, criarEtiqueta, formatarDataHora, tipoDaSituacao } from '../ui.js'; // ajudantes de tela

// Desenha o painel dentro da área recebida
export default async function desenharPainel(area) {
  const dados = await chamarApi('GET', '/api/painel'); // pede o resumo ao servidor

  // ----- Cartões com os contadores -----
  const cartoes = criarElemento('div', 'cartoes'); // linha de cartões
  const contadores = [ // rótulo e número de cada cartão
    ['Abaixo do mínimo', dados.contadores.abaixoDoMinimo],
    ['Vencem em até 30 dias', dados.contadores.vencendo],
    ['Lotes vencidos (bloqueados)', dados.contadores.vencidos],
    ['Saídas aguardando confirmação', dados.contadores.pendentes],
  ];
  contadores.forEach(([rotulo, numero]) => { // cria um cartão por contador
    const cartao = criarElemento('div', 'cartao'); // o cartão
    cartao.appendChild(criarElemento('span', 'cartao-rotulo', rotulo)); // o rótulo
    cartao.appendChild(criarElemento('strong', 'cartao-numero', String(numero))); // o número
    cartoes.appendChild(cartao); // coloca na linha
  });
  area.appendChild(cartoes); // mostra os cartões

  // ----- Alertas -----
  const caixaAlertas = criarCaixa('Alertas'); // caixa com título
  caixaAlertas.appendChild(criarTabela(
    ['Tipo', 'Item', 'Lote', 'Detalhe'],
    dados.alertas.map(alerta => [
      criarEtiqueta(alerta.tipo, alerta.tipo === 'Vencido' ? 'critico' : 'alerta'), // etiqueta com cor
      alerta.itemNome,
      alerta.numeroLote,
      alerta.detalhe,
    ]),
  ));
  area.appendChild(caixaAlertas); // mostra a caixa

  // ----- Últimas movimentações -----
  const caixaMovimentacoes = criarCaixa('Últimas movimentações'); // caixa com título
  caixaMovimentacoes.appendChild(criarTabela(
    ['Data e hora', 'Tipo', 'Item', 'Lote', 'Qtd.', 'Responsável', 'Situação'],
    dados.ultimasMovimentacoes.map(mov => [
      formatarDataHora(mov.data),
      mov.tipo,
      mov.itemNome,
      mov.numeroLote,
      mov.quantidade,
      mov.responsavelNome,
      criarEtiqueta(mov.situacao, tipoDaSituacao(mov.situacao)), // cor de acordo com a situação
    ]),
  ));
  area.appendChild(caixaMovimentacoes); // mostra a caixa
}
