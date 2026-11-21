// Tela de pendências: confirma ou recusa as saídas que aguardam decisão.

import { chamarApi } from '../api.js'; // chamadas à API
import { criarCaixa, criarElemento, criarTabela, criarEtiqueta, formatarDataHora, mostrarAviso } from '../ui.js'; // ajudantes de tela

// Desenha a tela de pendências dentro da área recebida
export default async function desenharPendencias(area) {
  const caixa = criarCaixa('Saídas aguardando confirmação'); // caixa com título
  area.appendChild(caixa); // mostra a caixa

  // Cria os botões Confirmar e Recusar de uma linha
  function criarBotoesAcao(id) {
    const grupo = criarElemento('div', 'botoes'); // área com os dois botões
    const botaoConfirmar = criarElemento('button', 'botao pequeno', 'Confirmar'); // botão confirmar
    botaoConfirmar.type = 'button'; // não envia formulário
    botaoConfirmar.addEventListener('click', () => decidir(`/api/movimentacoes/${id}/confirmar`, {}));
    const botaoRecusar = criarElemento('button', 'botao pequeno secundario', 'Recusar'); // botão recusar
    botaoRecusar.type = 'button'; // não envia formulário
    botaoRecusar.addEventListener('click', () => {
      const motivo = prompt('Escreva o motivo da recusa:'); // pede o motivo
      if (motivo === null) return; // o usuário cancelou
      decidir(`/api/movimentacoes/${id}/recusar`, { motivo }); // envia a recusa com o motivo
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
        mov.podeConfirmar ? criarBotoesAcao(mov.id) : criarEtiqueta('Sem permissão', 'alerta'), // botões só para quem pode
      ]),
    ));
  }

  await atualizarLista(); // carrega a lista ao abrir a tela
}
