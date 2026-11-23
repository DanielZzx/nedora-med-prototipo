// Tela de histórico: lista todas as movimentações, com busca por item ou lote.

import { chamarApi, lerSessao } from '../api.js'; // chamadas à API e sessão do usuário
import { criarCaixa, criarElemento, criarTabela, criarEtiqueta, formatarDataHora, tipoDaSituacao, mostrarAviso, pedirMotivo } from '../ui.js'; // ajudantes de tela

// Desenha a tela de histórico dentro da área recebida
export default async function desenharHistorico(area) {
  const caixa = criarCaixa('Movimentações'); // caixa com título
  const campoBusca = criarElemento('input'); // campo de busca
  campoBusca.type = 'search'; // tipo busca
  campoBusca.placeholder = 'Buscar por item ou número do lote'; // dica dentro do campo
  caixa.appendChild(campoBusca); // coloca o campo na caixa
  area.appendChild(caixa); // mostra a caixa

  const souAdministrador = lerSessao()?.usuario?.perfil === 'Administrador'; // só o Administrador pode estornar

  // Cria o botão de estorno de uma linha; fora das condições, mostra traço
  function criarBotaoEstornar(mov) {
    const podeEstornar = souAdministrador && mov.tipo === 'Entrada' && mov.situacao === 'Concluída'; // entrada ainda não estornada
    if (!podeEstornar) return '—'; // sem ação para esta linha
    const botao = criarElemento('button', 'botao pequeno secundario', 'Estornar'); // botão pequeno e secundário
    botao.type = 'button'; // não envia formulário
    botao.addEventListener('click', async () => { // ao clicar no botão...
      const estornou = await pedirMotivo({ // abre o diálogo de confirmação
        titulo: 'Estornar entrada', // título do diálogo
        linhas: [ // resumo da entrada escolhida
          `Item: ${mov.itemNome}`,
          `Lote: ${mov.numeroLote} · Quantidade: ${mov.quantidade}`,
          `Local da entrada: ${mov.destino}`,
          `Registrada em ${formatarDataHora(mov.data)} por ${mov.responsavelNome}`,
        ],
        rotulo: 'Motivo do estorno', // rótulo do campo
        textoBotao: 'Confirmar estorno', // texto do botão principal
        aviso: 'O estorno é total e não pode ser desfeito.', // aviso fixo
        aoConfirmar: motivo => chamarApi('POST', `/api/movimentacoes/${mov.id}/estornar`, { motivo }), // faz o estorno
      });
      if (!estornou) return; // o usuário cancelou
      mostrarAviso(caixa, 'Entrada estornada.', 'ok'); // confirma para o usuário
      await atualizarTabela(); // atualiza a tabela
    });
    return botao; // devolve o botão pronto
  }

  // Busca o histórico no servidor, usando o texto digitado, e redesenha a tabela
  async function atualizarTabela() {
    const termo = encodeURIComponent(campoBusca.value); // protege o texto para ir na URL
    const movimentacoes = await chamarApi('GET', `/api/movimentacoes?busca=${termo}`); // pede ao servidor
    caixa.querySelector('.tabela-area')?.remove(); // apaga a tabela antiga, se houver

    const colunas = ['Data e hora', 'Tipo', 'Item', 'Lote', 'Qtd.', 'Origem → destino', 'Responsável', 'Confirmado por', 'Situação']; // colunas comuns
    if (souAdministrador) colunas.push('Ação'); // coluna de estorno só para o Administrador

    caixa.appendChild(criarTabela(
      colunas,
      movimentacoes.map(mov => {
        const valores = [
          formatarDataHora(mov.data),
          mov.tipo,
          mov.itemNome,
          mov.numeroLote,
          mov.quantidade,
          `${mov.origem} → ${mov.destino}`,
          mov.responsavelNome,
          mov.confirmadoPorNome,
          criarEtiqueta(mov.situacao, tipoDaSituacao(mov.situacao)), // cor de acordo com a situação
        ];
        if (souAdministrador) valores.push(criarBotaoEstornar(mov)); // botão na última coluna
        return valores;
      }),
    ));
  }

  campoBusca.addEventListener('input', atualizarTabela); // atualiza a cada letra digitada
  await atualizarTabela(); // carrega ao abrir a tela
}
