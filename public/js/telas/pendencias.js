// Tela de pendências: confirma ou recusa as saídas que aguardam decisão.

import { chamarApi } from '../api.js'; // chamadas à API
import { criarCaixa, criarElemento, criarTabela, criarEtiqueta, formatarDataHora, mostrarAviso, pedirMotivo } from '../ui.js'; // ajudantes de tela

// Desenha a tela de pendências dentro da área recebida
export default async function desenharPendencias(area) {
  const caixa = criarCaixa('Saídas aguardando confirmação'); // caixa com título
  area.appendChild(caixa); // mostra a caixa

  // Cria os botões Confirmar e Recusar de uma linha
  function criarBotoesAcao(mov) {
    const grupo = criarElemento('div', 'botoes'); // área com os dois botões
    const botaoConfirmar = criarElemento('button', 'botao pequeno', 'Confirmar'); // botão confirmar
    botaoConfirmar.type = 'button'; // não envia formulário
    botaoConfirmar.addEventListener('click', () => decidir(`/api/movimentacoes/${mov.id}/confirmar`, {})); // confirma a saída
    const botaoRecusar = criarElemento('button', 'botao pequeno secundario', 'Recusar'); // botão recusar
    botaoRecusar.type = 'button'; // não envia formulário
    botaoRecusar.addEventListener('click', async () => { // ao clicar em recusar...
      const recusou = await pedirMotivo({ // abre o diálogo de recusa
        titulo: 'Recusar saída', // título do diálogo
        linhas: [ // resumo da saída escolhida
          `Item: ${mov.itemNome}`,
          `Lote: ${mov.numeroLote} · Quantidade: ${mov.quantidade}`,
          `Destino: ${mov.destino}`,
          `Solicitada em ${formatarDataHora(mov.data)} por ${mov.responsavelNome}`,
        ],
        rotulo: 'Motivo da recusa', // rótulo do campo
        textoBotao: 'Confirmar recusa', // texto do botão principal
        aviso: 'A quantidade voltará ao lote.', // aviso fixo
        aoConfirmar: motivo => chamarApi('POST', `/api/movimentacoes/${mov.id}/recusar`, { motivo }), // recusa a saída
      });
      if (!recusou) return; // o usuário cancelou
      mostrarAviso(caixa, 'Saída recusada.', 'ok'); // confirma para o usuário
      try {
        await atualizarLista(); // atualiza a tabela
      } catch (erro) {
        mostrarAviso(caixa, erro.message, 'erro'); // mostra erro ao atualizar
      }
    });
    grupo.append(botaoConfirmar, botaoRecusar); // junta os botões
    return grupo; // devolve o grupo
  }

  // Envia a decisão para a API e atualiza a lista
  async function decidir(caminho, corpo) {
    try {
      await chamarApi('POST', caminho, corpo); // envia confirmação ou recusa
      mostrarAviso(caixa, 'Decisão registrada.', 'ok'); // confirma para o usuário
      await atualizarLista(); // atualiza a tabela
    } catch (erro) {
      mostrarAviso(caixa, erro.message, 'erro'); // mostra o erro (ex.: sem permissão)
    }
  }

  // Busca as pendências e redesenha a tabela
  async function atualizarLista() {
    const pendentes = await chamarApi('GET', '/api/saidas/pendentes'); // pede as saídas pendentes
    caixa.querySelector('.tabela-area')?.remove(); // apaga a tabela antiga, se houver
    caixa.appendChild(criarTabela(
      ['Data e hora', 'Item', 'Lote', 'Qtd.', 'Destino', 'Solicitado por', 'Quem confirma', 'Ação'],
      pendentes.map(mov => [
        formatarDataHora(mov.data),
        mov.itemNome,
        mov.numeroLote,
        mov.quantidade,
        mov.destino,
        mov.responsavelNome,
        mov.perfisQueConfirmam.join(' ou '), // mostra quem pode confirmar
        mov.podeConfirmar ? criarBotoesAcao(mov) : criarEtiqueta('Sem permissão', 'alerta'), // botões só para quem pode
      ]),
    ));
  }

  await atualizarLista(); // carrega a lista ao abrir a tela
}
