// Tela de saída: escolhe item e lote, registra a retirada e pode ler uma receita pela Google Vision.

import { chamarApi } from '../api.js'; // chamadas à API
import { criarCaixa, criarElemento, criarTabela, criarEtiqueta, formatarData, mostrarAviso, preencherSelect } from '../ui.js'; // ajudantes de tela

// Desenha a tela de saída dentro da área recebida
export default async function desenharSaida(area) {
  const itens = await chamarApi('GET', '/api/itens'); // lista de itens para o select

  const caixaOcr = criarCaixa('Ler receita (opcional)'); // caixa da leitura
  const caixaSaida = criarCaixa('Registrar saída'); // caixa do formulário
  area.append(caixaOcr, caixaSaida); // mostra as duas caixas

  // ---------- Formulário de saída ----------
  const formulario = criarElemento('form', 'formulario');
  formulario.innerHTML = `
    <label>Item <select name="itemId" required></select></label>
    <label>Lote <select name="numeroLote"></select></label>
    <p class="nota">No automático, sai primeiro o lote que vence antes (FEFO). Lotes vencidos ficam bloqueados.</p>
    <div class="duas-colunas">
      <label>Quantidade <input name="quantidade" type="number" min="1" required></label>
      <label>Destino ou motivo <input name="destino" required></label>
    </div>
    <div class="botoes"><button class="botao" type="submit">Registrar saída</button></div>`;
  caixaSaida.appendChild(formulario); // coloca o formulário na caixa

  const selectItem = formulario.querySelector('[name="itemId"]'); // select do item
  const selectLote = formulario.querySelector('[name="numeroLote"]'); // select do lote
  const campoQuantidade = formulario.querySelector('[name="quantidade"]'); // campo da quantidade
  const areaLotes = criarElemento('div'); // área onde aparece a tabela de lotes
  caixaSaida.appendChild(areaLotes); // mostra a área
  preencherSelect(selectItem, itens.map(item => ({ valor: item.id, texto: item.nome })), 'Escolha o item');

  // Mostra os lotes do item escolhido e preenche o select de lote
  async function carregarLotes() {
    areaLotes.replaceChildren(); // apaga a tabela anterior
    if (!selectItem.value) { // nenhum item escolhido
      preencherSelect(selectLote, [], 'Automático (FEFO)'); // só a opção automática
      return;
    }
    const lotes = await chamarApi('GET', `/api/itens/${selectItem.value}/lotes`); // lotes com saldo do item
    const utilizaveis = lotes.filter(lote => lote.situacao.tipo !== 'critico'); // vencidos não podem sair
    preencherSelect(selectLote, utilizaveis.map(lote => ({
      valor: lote.numero,
      texto: `${lote.numero} · vence ${formatarData(lote.validade)} · ${lote.local} · ${lote.quantidade} un.`,
    })), 'Automático (FEFO)');
    areaLotes.appendChild(criarTabela(
      ['Lote', 'Validade', 'Local', 'Qtd.', 'Situação'],
      lotes.map(lote => [
        lote.numero,
        formatarData(lote.validade),
        lote.local,
        lote.quantidade,
        criarEtiqueta(lote.situacao.texto, lote.situacao.tipo),
      ]),
    ));
  }

  selectItem.addEventListener('change', carregarLotes); // ao trocar o item, recarrega os lotes

  // Ao enviar: registra a saída (ela fica pendente até confirmação)
  formulario.addEventListener('submit', async evento => {
    evento.preventDefault(); // impede o recarregamento
    const dados = Object.fromEntries(new FormData(formulario)); // lê os campos
    try {
      const movimentacoes = await chamarApi('POST', '/api/saidas', dados); // registra a saída
      formulario.reset(); // limpa o formulário
      mostrarAviso(caixaSaida, `Saída registrada em ${movimentacoes.length} lote(s). Aguarda confirmação.`, 'ok');
      await carregarLotes(); // atualiza a tabela de lotes
    } catch (erro) {
      mostrarAviso(caixaSaida, erro.message, 'erro'); // mostra o erro
    }
  });

  // ---------- Leitura de receita (OCR) ----------
  caixaOcr.appendChild(criarElemento('p', 'nota', 'Envie a foto da receita. O sistema sugere itens, mas você confere antes de usar.'));
  const campoArquivo = criarElemento('input'); // campo para escolher a imagem
  campoArquivo.type = 'file'; // tipo arquivo
  campoArquivo.accept = 'image/*'; // só aceita imagens
  const areaSugestoes = criarElemento('div', 'lista-sugestoes'); // onde as sugestões aparecem
  const areaTexto = criarElemento('pre', 'texto-ocr'); // onde o texto lido aparece
  caixaOcr.append(campoArquivo, areaSugestoes, areaTexto); // mostra campo, sugestões e texto

  // Mostra uma lista de sugestões; cada uma tem um botão "usar" que preenche o formulário
  function mostrarSugestoes(sugestoes) {
    areaSugestoes.replaceChildren(); // apaga as sugestões anteriores
    if (sugestoes.length === 0) { // nenhum item do estoque apareceu no texto
      areaSugestoes.appendChild(criarElemento('p', 'nota', 'Nenhum item do estoque foi reconhecido. Escolha o item manualmente.'));
      return;
    }
    sugestoes.forEach(sugestao => {
      const cartao = criarElemento('div', 'sugestao'); // um cartão por sugestão
      const topo = criarElemento('div', 'sugestao-topo'); // nome e confiança na mesma linha
      topo.append(
        criarElemento('strong', '', sugestao.nome),
        criarEtiqueta(sugestao.confianca === 'alta' ? 'Confiança alta' : 'Confiança média', sugestao.confianca === 'alta' ? 'ok' : 'alerta'),
      );
      const quantidade = sugestao.quantidade // se a quantidade foi lida, mostra; senão avisa
        ? `Quantidade lida: ${sugestao.quantidade}`
        : 'Quantidade não lida: preencha manualmente';
      const botao = criarElemento('button', 'botao secundario pequeno', 'Usar'); // botão para aceitar a sugestão
      botao.type = 'button'; // não envia formulário
      botao.addEventListener('click', async () => {
        selectItem.value = sugestao.itemId; // seleciona o item
        await carregarLotes(); // carrega os lotes dele
        if (sugestao.quantidade) campoQuantidade.value = sugestao.quantidade; // preenche a quantidade lida
        mostrarAviso(caixaOcr, `${sugestao.nome} selecionado. Confira o lote, a quantidade e o destino antes de registrar.`, 'ok');
      });
      cartao.append(topo, criarElemento('span', 'nota', quantidade), criarElemento('span', 'nota trecho', `Linha da receita: “${sugestao.trecho}”`), botao);
      areaSugestoes.appendChild(cartao); // coloca o cartão na lista
    });
  }

  // Ao escolher uma imagem: envia para a API e mostra o texto e as sugestões
  campoArquivo.addEventListener('change', async () => {
    const arquivo = campoArquivo.files[0]; // primeiro arquivo escolhido
    if (!arquivo) return; // nada escolhido
    areaSugestoes.replaceChildren(); // limpa a leitura anterior
    try {
      const imagemBase64 = await lerComoBase64(arquivo); // converte a imagem para texto base64
      const resultado = await chamarApi('POST', '/api/ocr', { imagemBase64 }); // pede a leitura
      areaTexto.textContent = resultado.texto || 'Nenhum texto encontrado na imagem.'; // mostra o texto lido
      mostrarSugestoes(resultado.sugestoes); // mostra as sugestões do estoque
    } catch (erro) {
      mostrarAviso(caixaOcr, erro.message, 'erro'); // mostra o erro (ex.: OCR não configurado)
    }
  });
}

// Lê um arquivo e devolve só o conteúdo em base64, sem o prefixo "data:..."
function lerComoBase64(arquivo) {
  return new Promise((resolver, rejeitar) => { // promessa que resolve com o texto base64
    const leitor = new FileReader(); // leitor de arquivos do navegador
    leitor.onload = () => resolver(String(leitor.result).split(',')[1]); // pega a parte depois da vírgula
    leitor.onerror = () => rejeitar(new Error('Não foi possível ler o arquivo da imagem.')); // erro de leitura
    leitor.readAsDataURL(arquivo); // começa a ler como data URL
  });
}
