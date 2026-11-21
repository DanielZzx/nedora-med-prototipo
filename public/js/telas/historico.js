// Tela de histórico: lista todas as movimentações, com busca por item ou lote.

import { chamarApi } from '../api.js'; // chamadas à API
import { criarCaixa, criarElemento, criarTabela, criarEtiqueta, formatarDataHora, tipoDaSituacao } from '../ui.js'; // ajudantes de tela

// Desenha a tela de histórico dentro da área recebida
export default async function desenharHistorico(area) {
  const caixa = criarCaixa('Movimentações'); // caixa com título
  const campoBusca = criarElemento('input'); // campo de busca
  campoBusca.type = 'search'; // tipo busca
  campoBusca.placeholder = 'Buscar por item ou número do lote'; // dica dentro do campo
  caixa.appendChild(campoBusca); // coloca o campo na caixa
  area.appendChild(caixa); // mostra a caixa

  // Busca o histórico no servidor, usando o texto digitado, e redesenha a tabela
  async function atualizarTabela() {
    const termo = encodeURIComponent(campoBusca.value); // protege o texto para ir na URL
    const movimentacoes = await chamarApi('GET', `/api/movimentacoes?busca=${termo}`); // pede ao servidor
    caixa.querySelector('.tabela-area')?.remove(); // apaga a tabela antiga, se houver
    caixa.appendChild(criarTabela(
      ['Data e hora', 'Tipo', 'Item', 'Lote', 'Qtd.', 'Origem → destino', 'Responsável', 'Confirmado por', 'Situação'],
      movimentacoes.map(mov => [
        formatarDataHora(mov.data),
        mov.tipo,
        mov.itemNome,
        mov.numeroLote,
        mov.quantidade,
        `${mov.origem} → ${mov.destino}`,
        mov.responsavelNome,
        mov.confirmadoPorNome,
        criarEtiqueta(mov.situacao, tipoDaSituacao(mov.situacao)), // cor de acordo com a situação
      ]),
    ));
  }

  campoBusca.addEventListener('input', atualizarTabela); // atualiza a cada letra digitada
  await atualizarTabela(); // carrega ao abrir a tela
}
